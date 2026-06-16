const STORAGE_KEY = "prompt-weaver-state-v2";
const EMPTY_VALUE = "未入力";
let serverConfig = globalThis.PROMPTWEAVER_SERVER || {};
const LAN_HOST_FALLBACK = serverConfig.lanHost || "192.168.11.4";

const promptTemplates = {
  image: {
    label: "画像生成",
    title: "画像生成プロンプト",
    outputTone: "structured",
    items: [
      ["目的・用途", "例: 広告バナー、SNS投稿、商品紹介、企画書のキービジュアル"],
      ["主題", "例: 人物、商品、キャラクター、建物、料理など中心に見せたいもの"],
      ["シーン・背景", "例: 場所、時間帯、季節、天候、背景に置きたい要素"],
      ["構図", "例: カメラ位置、距離、アングル、余白、視線誘導"],
      ["スタイル", "例: 写真調、映画調、3D、アニメ、イラスト、ブランドトーン"],
      ["ライティング", "例: 自然光、逆光、柔らかい影、ハイコントラスト"],
      ["色・質感", "例: メインカラー、アクセントカラー、素材感、彩度"],
      ["品質条件", "例: 高精細、シャープ、自然な手、破綻の少ない表情"],
      ["除外要素", "例: 文字、ロゴ、余計な人物、ぼけ、低解像度、歪み"]
    ]
  },
  video: {
    label: "動画生成",
    title: "動画生成プロンプト",
    outputTone: "production",
    items: [
      ["目的・用途", "例: 商品紹介、SNSショート、広告、説明動画、コンセプトムービー"],
      ["主題", "例: 人物、商品、キャラクター、風景など中心に見せたいもの"],
      ["シーン・背景", "例: 場所、時間帯、季節、空気感、背景の変化"],
      ["動き", "例: 被写体の動作、表情の変化、速度、自然さ"],
      ["カメラワーク", "例: ドリーイン、パン、固定、手持ち風、クローズアップ"],
      ["尺・テンポ", "例: 秒数、カット数、リズム、トランジション"],
      ["スタイル", "例: 実写風、映画調、広告調、アニメ、3D、ドキュメンタリー"],
      ["音・演出", "例: BGM、効果音、ナレーション、無音、字幕の有無"],
      ["除外要素", "例: ちらつき、不自然な動き、破綻した手、不要な文字"]
    ]
  }
};

let state = loadState();
let draggedId = null;
let pointerDrag = null;

const elements = {
  itemList: document.querySelector("#itemList"),
  itemTemplate: document.querySelector("#itemTemplate"),
  itemCount: document.querySelector("#itemCount"),
  promptTitle: document.querySelector("#promptTitle"),
  outputTone: document.querySelector("#outputTone"),
  markdownOutput: document.querySelector("#markdownOutput"),
  copyStatus: document.querySelector("#copyStatus"),
  qrStatus: document.querySelector("#qrStatus"),
  qrCanvas: document.querySelector("#qrCanvas"),
  shareUrl: document.querySelector("#shareUrl"),
  refreshQr: document.querySelector("#refreshQr"),
  segments: [...document.querySelectorAll(".segment")],
  addItem: document.querySelector("#addItem"),
  copyMarkdown: document.querySelector("#copyMarkdown"),
  downloadMarkdown: document.querySelector("#downloadMarkdown"),
  resetTemplate: document.querySelector("#resetTemplate"),
  selectMarkdown: document.querySelector("#selectMarkdown")
};

loadServerConfig().finally(initialize);

async function loadServerConfig() {
  try {
    const response = await fetch("./server-config.js", { cache: "no-store" });
    if (!response.ok) return;

    const source = await response.text();
    const match = source.match(/window\.PROMPTWEAVER_SERVER\s*=\s*(\{[\s\S]*?\});?/);
    if (!match) return;

    serverConfig = Function(`"use strict"; return (${match[1]});`)();
  } catch {
    serverConfig = globalThis.PROMPTWEAVER_SERVER || {};
  }
}

function initialize() {
  elements.promptTitle.value = state.title;
  elements.outputTone.value = state.outputTone;
  elements.shareUrl.value = getInitialShareUrl();
  bindEvents();
  render();
  renderQr();
  registerServiceWorker();
}

function bindEvents() {
  elements.promptTitle.addEventListener("input", () => {
    state.title = elements.promptTitle.value;
    updateOutput();
  });

  elements.outputTone.addEventListener("change", () => {
    state.outputTone = elements.outputTone.value;
    updateOutput();
  });

  elements.addItem.addEventListener("click", () => {
    state.items.push(createItem("新しい項目", "", "自由に入力"));
    render();
  });

  elements.copyMarkdown.addEventListener("click", copyMarkdown);
  elements.downloadMarkdown.addEventListener("click", downloadMarkdown);
  elements.resetTemplate.addEventListener("click", resetTemplate);
  elements.refreshQr.addEventListener("click", renderQr);
  elements.shareUrl.addEventListener("input", renderQr);
  elements.selectMarkdown.addEventListener("click", () => {
    elements.markdownOutput.focus();
    elements.markdownOutput.select();
  });

  elements.segments.forEach((segment) => {
    segment.addEventListener("click", () => {
      const nextType = segment.dataset.type;
      if (nextType === state.type) return;

      Object.assign(state, createTemplateState(nextType));
      elements.promptTitle.value = state.title;
      elements.outputTone.value = state.outputTone;
      render();
    });
  });
}

function render() {
  elements.itemList.replaceChildren();

  state.items.forEach((item, index) => {
    const node = elements.itemTemplate.content.firstElementChild.cloneNode(true);
    const handle = node.querySelector(".drag-handle");
    const priority = node.querySelector(".priority-badge");
    const nameField = node.querySelector(".field-name");
    const contentField = node.querySelector(".field-content");
    const enabledField = node.querySelector(".field-enabled");

    node.dataset.id = item.id;
    node.draggable = false;
    priority.textContent = `P${index + 1}`;
    priority.setAttribute("aria-label", `優先順位 ${index + 1}`);
    nameField.value = item.name;
    contentField.value = item.content;
    contentField.placeholder = item.placeholder;
    enabledField.checked = item.enabled;

    nameField.addEventListener("input", (event) => {
      item.name = event.target.value;
      updateOutput();
    });

    contentField.addEventListener("input", (event) => {
      item.content = event.target.value;
      updateOutput();
    });

    enabledField.addEventListener("change", (event) => {
      item.enabled = event.target.checked;
      updateOutput();
    });

    node.querySelector(".move-up").addEventListener("click", () => moveItem(index, index - 1));
    node.querySelector(".move-down").addEventListener("click", () => moveItem(index, index + 1));
    node.querySelector(".duplicate").addEventListener("click", () => duplicateItem(index));
    node.querySelector(".remove").addEventListener("click", () => removeItem(index));

    handle.addEventListener("pointerdown", () => {
      node.draggable = true;
    });

    handle.addEventListener("pointerup", () => {
      node.draggable = false;
    });

    handle.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      startPointerReorder(event, node, item.id);
    });

    handle.addEventListener("pointermove", updatePointerReorder);
    handle.addEventListener("pointerup", finishPointerReorder);
    handle.addEventListener("pointercancel", cancelPointerReorder);

    node.addEventListener("dragstart", (event) => {
      draggedId = item.id;
      node.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.id);
    });

    node.addEventListener("dragend", () => {
      draggedId = null;
      node.draggable = false;
      clearDragMarkers();
    });

    node.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!draggedId || draggedId === item.id) return;

      const rect = node.getBoundingClientRect();
      const placeAfter = event.clientY > rect.top + rect.height / 2;
      node.dataset.dropPosition = placeAfter ? "after" : "before";
      node.classList.toggle("is-over-before", !placeAfter);
      node.classList.toggle("is-over-after", placeAfter);
    });

    node.addEventListener("dragleave", () => {
      node.classList.remove("is-over-before", "is-over-after");
      delete node.dataset.dropPosition;
    });

    node.addEventListener("drop", (event) => {
      event.preventDefault();
      const sourceId = draggedId || event.dataTransfer.getData("text/plain");
      const placeAfter = node.dataset.dropPosition === "after";
      reorderById(sourceId, item.id, placeAfter);
      clearDragMarkers();
    });

    elements.itemList.append(node);
  });

  elements.segments.forEach((segment) => {
    const isActive = segment.dataset.type === state.type;
    segment.classList.toggle("is-active", isActive);
    segment.setAttribute("aria-checked", String(isActive));
  });

  updateOutput();
}

function moveItem(fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= state.items.length) return;
  const [item] = state.items.splice(fromIndex, 1);
  state.items.splice(toIndex, 0, item);
  render();
}

function duplicateItem(index) {
  const original = state.items[index];
  const copy = createItem(`${original.name} コピー`, original.content, original.placeholder);
  copy.enabled = original.enabled;
  state.items.splice(index + 1, 0, copy);
  render();
}

function removeItem(index) {
  if (state.items.length === 1) {
    setStatus("最後の1項目は残します");
    return;
  }
  state.items.splice(index, 1);
  render();
}

function reorderById(sourceId, targetId, placeAfter) {
  if (!sourceId || sourceId === targetId) return;

  const fromIndex = state.items.findIndex((item) => item.id === sourceId);
  const targetIndex = state.items.findIndex((item) => item.id === targetId);
  if (fromIndex === -1 || targetIndex === -1) return;

  const [item] = state.items.splice(fromIndex, 1);
  let insertIndex = targetIndex + (placeAfter ? 1 : 0);
  if (fromIndex < insertIndex) insertIndex -= 1;
  state.items.splice(insertIndex, 0, item);
  render();
}

function startPointerReorder(event, node, itemId) {
  if (state.items.length < 2) return;

  event.preventDefault();
  pointerDrag = {
    id: itemId,
    pointerId: event.pointerId,
    targetId: null,
    placeAfter: false
  };
  draggedId = itemId;
  node.classList.add("is-dragging");
  document.body.classList.add("is-reordering");
  event.currentTarget.setPointerCapture(event.pointerId);
}

function updatePointerReorder(event) {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;

  event.preventDefault();
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".prompt-item");
  clearDragMarkers();
  findPromptItemNode(pointerDrag.id)?.classList.add("is-dragging");

  if (!target || target.dataset.id === pointerDrag.id) {
    pointerDrag.targetId = null;
    return;
  }

  const rect = target.getBoundingClientRect();
  pointerDrag.targetId = target.dataset.id;
  pointerDrag.placeAfter = event.clientY > rect.top + rect.height / 2;
  target.classList.toggle("is-over-before", !pointerDrag.placeAfter);
  target.classList.toggle("is-over-after", pointerDrag.placeAfter);
}

function finishPointerReorder(event) {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;

  event.preventDefault();
  const { id, targetId, placeAfter } = pointerDrag;
  pointerDrag = null;
  draggedId = null;
  document.body.classList.remove("is-reordering");
  clearDragMarkers();

  if (targetId) {
    reorderById(id, targetId, placeAfter);
  }
}

function cancelPointerReorder(event) {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;

  pointerDrag = null;
  draggedId = null;
  document.body.classList.remove("is-reordering");
  clearDragMarkers();
}

function findPromptItemNode(itemId) {
  return [...document.querySelectorAll(".prompt-item")].find((node) => node.dataset.id === itemId);
}

function resetTemplate() {
  Object.assign(state, createTemplateState(state.type));
  elements.promptTitle.value = state.title;
  elements.outputTone.value = state.outputTone;
  render();
  setStatus("テンプレートを初期化しました");
}

async function copyMarkdown() {
  const promptText = buildCopyPrompt();

  try {
    await navigator.clipboard.writeText(promptText);
    setStatus("プロンプト本文をコピーしました");
  } catch {
    const copied = copyTextFallback(promptText);
    setStatus(copied ? "プロンプト本文をコピーしました" : "コピーできませんでした");
  }
}

function copyTextFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  textarea.style.fontSize = "16px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function downloadMarkdown() {
  const markdown = elements.markdownOutput.value;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const safeTitle = (state.title || "prompt").replace(/[\\/:*?"<>|]/g, "_");
  const fileName = `${safeTitle}.md`;

  if (navigator.canShare && navigator.share) {
    const file = new File([blob], fileName, { type: "text/markdown" });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: state.title || "PromptWeaver" })
        .then(() => setStatus("Markdownを共有しました"))
        .catch(() => setStatus("共有をキャンセルしました"));
      return;
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus("Markdownを保存しました");
}

function setStatus(message) {
  elements.copyStatus.textContent = message;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    elements.copyStatus.textContent = "自動更新";
  }, 1800);
}

function setQrStatus(message) {
  elements.qrStatus.textContent = message;
}

function updateOutput() {
  const enabledCount = state.items.filter((item) => item.enabled).length;
  elements.itemCount.textContent = `${state.items.length}項目 / 出力${enabledCount}項目`;
  elements.markdownOutput.value = buildMarkdown();
  saveState();
}

function buildMarkdown() {
  const template = promptTemplates[state.type];
  const title = normalizeInline(state.title) || template.title;
  const enabledItems = state.items.filter((item) => item.enabled);

  if (state.outputTone === "compact") {
    return buildCompactMarkdown(title, template.label, enabledItems);
  }

  if (state.outputTone === "production") {
    return buildProductionMarkdown(title, template.label, enabledItems);
  }

  return buildStructuredMarkdown(title, template.label, enabledItems);
}

function buildCopyPrompt() {
  const enabledItems = state.items.filter((item) => item.enabled);
  return finishMarkdown([buildPromptBlock(enabledItems)]);
}

function buildStructuredMarkdown(title, kind, items) {
  const lines = [
    `# ${title}`,
    "",
    `- 種別: ${kind}`,
    "- 出力形式: 構造化",
    "",
    "## 項目別プロンプト"
  ];

  appendDetailedItems(lines, items);

  return finishMarkdown(lines);
}

function buildCompactMarkdown(title, kind, items) {
  const lines = [
    `# ${title}`,
    "",
    `**${kind}プロンプト**`,
    "",
    buildPromptBlock(items)
  ];

  return finishMarkdown(lines);
}

function buildProductionMarkdown(title, kind, items) {
  const lines = [
    `# ${title}`,
    "",
    "## 制作概要",
    `- 種別: ${kind}`,
    `- 出力項目数: ${items.length}`,
    "- 優先順位: P1から順に強く反映",
    "",
    "## 優先順位付き指示"
  ];

  appendDetailedItems(lines, items);

  return finishMarkdown(lines);
}

function appendDetailedItems(lines, items) {
  if (!items.length) {
    lines.push("", "出力対象の項目がありません。");
    return;
  }

  items.forEach((item, index) => {
    lines.push("", `### P${index + 1}: ${normalizeInline(item.name)}`, normalizeBlock(item.content));
  });
}

function buildPromptBlock(items) {
  if (!items.length) return "出力対象の項目がありません。";

  return items
    .map((item, index) => `P${index + 1} ${normalizeInline(item.name)}: ${normalizeBlock(item.content)}`)
    .join("\n");
}

function finishMarkdown(lines) {
  return `${lines.join("\n").trim()}\n`;
}

function normalizeBlock(value) {
  const content = String(value || "")
    .replace(/\r\n/g, "\n")
    .trim();

  return content || EMPTY_VALUE;
}

function normalizeInline(value) {
  return normalizeBlock(value).replace(/\s+/g, " ");
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidSavedState(saved)) {
      return {
        type: saved.type,
        title: saved.title || promptTemplates[saved.type].title,
        outputTone: saved.outputTone || promptTemplates[saved.type].outputTone,
        items: saved.items.map(normalizeSavedItem)
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return createTemplateState("image");
}

function isValidSavedState(saved) {
  return (
    saved &&
    promptTemplates[saved.type] &&
    Array.isArray(saved.items) &&
    saved.items.length > 0
  );
}

function normalizeSavedItem(item) {
  return {
    id: item.id || createId(),
    name: item.name || "項目",
    content: item.content || "",
    placeholder: item.placeholder || "自由に入力",
    enabled: item.enabled !== false
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    setStatus("ローカル保存できません");
  }
}

function createTemplateState(type) {
  const template = promptTemplates[type];

  return {
    type,
    title: template.title,
    outputTone: template.outputTone,
    items: template.items.map(([name, placeholder]) => createItem(name, "", placeholder))
  };
}

function createItem(name, content, placeholder) {
  return {
    id: createId(),
    name,
    content,
    placeholder,
    enabled: true
  };
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clearDragMarkers() {
  document.querySelectorAll(".prompt-item").forEach((node) => {
    node.classList.remove("is-dragging", "is-over-before", "is-over-after");
    delete node.dataset.dropPosition;
  });
}

function getInitialShareUrl() {
  const currentUrl = window.location.href;
  const localHosts = ["127.0.0.1", "localhost", "::1"];
  if (serverConfig.lanUrl) return serverConfig.lanUrl;

  if (localHosts.includes(window.location.hostname)) {
    const port = window.location.port ? `:${window.location.port}` : "";
    return `${window.location.protocol}//${LAN_HOST_FALLBACK}${port}${window.location.pathname}`;
  }

  if (window.location.protocol !== "file:") return currentUrl;
  return `http://${LAN_HOST_FALLBACK}:8765/index.html`;
}

function renderQr() {
  const value = elements.shareUrl.value.trim();
  const canvas = elements.qrCanvas;
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!value) {
    setQrStatus("共有URLを入力してください");
    return;
  }

  try {
    const qr = createQrMatrix(value);
    drawQr(canvas, qr.modules);
    if (/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\]|::1)/.test(value)) {
      setQrStatus("127.0.0.1はスマホでは開けません。LAN IPのURLにしてください");
    } else {
      setQrStatus("QRコードを更新しました");
    }
  } catch (error) {
    drawQrPlaceholder(canvas);
    setQrStatus(error.message);
  }
}

function drawQr(canvas, modules) {
  const context = canvas.getContext("2d");
  const quiet = 4;
  const size = modules.length + quiet * 2;
  const scale = Math.floor(canvas.width / size);
  const offset = Math.floor((canvas.width - size * scale) / 2);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#121615";

  modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) {
        context.fillRect(offset + (x + quiet) * scale, offset + (y + quiet) * scale, scale, scale);
      }
    });
  });
}

function drawQrPlaceholder(canvas) {
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#d6dde3";
  context.lineWidth = 2;
  context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  context.fillStyle = "#607078";
  context.font = "12px sans-serif";
  context.textAlign = "center";
  context.fillText("URLを短くしてください", canvas.width / 2, canvas.height / 2);
}

function createQrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)];
  const dataCodewordCounts = [19, 34, 55, 80, 108];
  const eccCodewordCounts = [7, 10, 15, 20, 26];
  const version = dataCodewordCounts.findIndex((count) => bytes.length + 2 <= count) + 1;

  if (version < 1) {
    throw new Error("URLが長すぎます。短い共有URLにしてください");
  }

  const dataCodewords = makeDataCodewords(bytes, dataCodewordCounts[version - 1]);
  const eccCodewords = makeEccCodewords(dataCodewords, eccCodewordCounts[version - 1]);
  const codewords = [...dataCodewords, ...eccCodewords];
  const size = 21 + (version - 1) * 4;
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  addFunctionPatterns(modules, reserved, version);
  addDataBits(modules, reserved, codewords);
  addFormatBits(modules, reserved, 0);

  return { modules, version };
}

function makeDataCodewords(bytes, capacity) {
  const bits = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));

  const maxBits = capacity * 8;
  appendBits(bits, 0, Math.min(4, maxBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let index = 0; index < bits.length; index += 8) {
    codewords.push(bits.slice(index, index + 8).reduce((value, bit) => (value << 1) | bit, 0));
  }

  const pads = [0xec, 0x11];
  let padIndex = 0;
  while (codewords.length < capacity) {
    codewords.push(pads[padIndex % 2]);
    padIndex += 1;
  }

  return codewords;
}

function appendBits(bits, value, length) {
  for (let index = length - 1; index >= 0; index -= 1) {
    bits.push((value >>> index) & 1);
  }
}

function makeEccCodewords(data, degree) {
  const generator = makeGeneratorPolynomial(degree);
  const result = Array(degree).fill(0);

  data.forEach((byte) => {
    const factor = byte ^ result.shift();
    result.push(0);
    generator.forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  });

  return result;
}

function makeGeneratorPolynomial(degree) {
  let result = [1];
  for (let index = 0; index < degree; index += 1) {
    result = multiplyPolynomials(result, [1, gfPow(2, index)]);
  }
  return result.slice(1);
}

function multiplyPolynomials(left, right) {
  const result = Array(left.length + right.length - 1).fill(0);
  left.forEach((leftValue, leftIndex) => {
    right.forEach((rightValue, rightIndex) => {
      result[leftIndex + rightIndex] ^= gfMultiply(leftValue, rightValue);
    });
  });
  return result;
}

function gfPow(value, power) {
  let result = 1;
  for (let index = 0; index < power; index += 1) {
    result = gfMultiply(result, value);
  }
  return result;
}

function gfMultiply(left, right) {
  let result = 0;
  let a = left;
  let b = right;

  while (b > 0) {
    if (b & 1) result ^= a;
    a <<= 1;
    if (a & 0x100) a ^= 0x11d;
    b >>>= 1;
  }

  return result;
}

function addFunctionPatterns(modules, reserved, version) {
  const size = modules.length;
  addFinder(modules, reserved, 0, 0);
  addFinder(modules, reserved, size - 7, 0);
  addFinder(modules, reserved, 0, size - 7);

  for (let index = 8; index < size - 8; index += 1) {
    setModule(modules, reserved, 6, index, index % 2 === 0);
    setModule(modules, reserved, index, 6, index % 2 === 0);
  }

  if (version > 1) {
    addAlignment(modules, reserved, 4 * version + 10, 4 * version + 10);
  }

  setModule(modules, reserved, size - 8, 8, true);
  reserveFormatAreas(reserved);
}

function addFinder(modules, reserved, x, y) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (!isInside(modules, xx, yy)) continue;

      const dark =
        dx >= 0 &&
        dx <= 6 &&
        dy >= 0 &&
        dy <= 6 &&
        (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      setModule(modules, reserved, xx, yy, dark);
    }
  }
}

function addAlignment(modules, reserved, x, y) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const dark = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
      setModule(modules, reserved, x + dx, y + dy, dark);
    }
  }
}

function reserveFormatAreas(reserved) {
  const size = reserved.length;

  for (let index = 0; index <= 8; index += 1) {
    if (index !== 6) {
      reserved[8][index] = true;
      reserved[index][8] = true;
    }
  }

  for (let index = 0; index < 8; index += 1) {
    reserved[size - 1 - index][8] = true;
    reserved[8][size - 1 - index] = true;
  }
}

function addDataBits(modules, reserved, codewords) {
  const bits = [];
  codewords.forEach((codeword) => appendBits(bits, codeword, 8));

  const size = modules.length;
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;

    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;

      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        if (reserved[y][x]) continue;

        const rawBit = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        const maskedBit = rawBit !== ((x + y) % 2 === 0);
        modules[y][x] = maskedBit;
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

function addFormatBits(modules, reserved, mask) {
  const size = modules.length;
  const format = makeFormatBits(mask);
  const bit = (index) => ((format >>> index) & 1) === 1;

  for (let index = 0; index <= 5; index += 1) setFormat(modules, reserved, 8, index, bit(index));
  setFormat(modules, reserved, 8, 7, bit(6));
  setFormat(modules, reserved, 8, 8, bit(7));
  setFormat(modules, reserved, 7, 8, bit(8));
  for (let index = 9; index < 15; index += 1) setFormat(modules, reserved, 14 - index, 8, bit(index));

  for (let index = 0; index < 8; index += 1) setFormat(modules, reserved, size - 1 - index, 8, bit(index));
  for (let index = 8; index < 15; index += 1) setFormat(modules, reserved, 8, size - 15 + index, bit(index));
  setFormat(modules, reserved, size - 8, 8, true);
}

function makeFormatBits(mask) {
  const eccLow = 0b01;
  let value = ((eccLow << 3) | mask) << 10;
  const generator = 0x537;

  for (let bit = 14; bit >= 10; bit -= 1) {
    if ((value >>> bit) & 1) {
      value ^= generator << (bit - 10);
    }
  }

  return ((((eccLow << 3) | mask) << 10) | value) ^ 0x5412;
}

function setModule(modules, reserved, x, y, dark) {
  modules[y][x] = dark;
  reserved[y][x] = true;
}

function setFormat(modules, reserved, x, y, dark) {
  modules[y][x] = dark;
  reserved[y][x] = true;
}

function isInside(modules, x, y) {
  return y >= 0 && y < modules.length && x >= 0 && x < modules.length;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") return;

  navigator.serviceWorker.register("./sw.js?v=20260616-pw2").catch(() => {
    // The app still works as a plain local file when service workers are unavailable.
  });
}
