const STORAGE_KEY = "midjourney-prompt-forge-state-v2-empty-default";
const EMPTY_VALUE = "未入力";

let serverConfig = globalThis.PROMPTWEAVER_SERVER || {};
let draggedId = null;
let pointerDrag = null;

const sharedNegative =
  "text, watermark, logo, signature, extra fingers, deformed hands, distorted face, blurry, low quality";

const defaultParams = {
  version: "v8.1",
  aspectRatio: "1:1",
  customAspect: "",
  resolution: "",
  stylize: 150,
  chaos: 8,
  weird: 0,
  quality: "",
  seed: "",
  styleWeight: "",
  rawMode: true,
  tileMode: false,
  publicMode: false,
  stealthMode: false
};

const promptPresets = {
  product: {
    label: "商品",
    title: "Premium product key visual",
    goal: "EC・広告・SNSの商品ビジュアル",
    outputFormat: "prompt",
    negativePrompt: sharedNegative,
    params: { ...defaultParams, aspectRatio: "4:5", stylize: 120, chaos: 5 },
    pieces: [
      ["主題", "single matte black skincare bottle with embossed silver label"],
      ["環境", "warm stone bathroom counter, soft linen towel, minimal premium props"],
      ["構図", "three-quarter front view, product centered, clean negative space"],
      ["光", "soft window light from the left, gentle highlight on the bottle edge"],
      ["質感", "realistic glass, brushed metal cap, fine surface detail, premium finish"],
      ["スタイル", "high-end commercial product photography, natural color grading"]
    ]
  },
  portrait: {
    label: "人物",
    title: "Editorial portrait concept",
    goal: "プロフィール・広告・ビジュアル企画",
    outputFormat: "prompt",
    negativePrompt: sharedNegative,
    params: { ...defaultParams, aspectRatio: "2:3", stylize: 100, chaos: 4, rawMode: true },
    pieces: [
      ["主題", "confident creative director in a tailored navy jacket"],
      ["表情", "calm expression, direct but relaxed eye contact"],
      ["環境", "modern daylight studio with subtle architectural shadows"],
      ["構図", "waist-up portrait, 85mm lens look, shallow depth of field"],
      ["光", "large softbox key light, delicate rim light, natural skin texture"],
      ["スタイル", "editorial photography, refined color, realistic detail"]
    ]
  },
  scene: {
    label: "空間",
    title: "Cinematic environment design",
    goal: "背景美術・コンセプトアート・世界観設計",
    outputFormat: "prompt",
    negativePrompt: "text, watermark, logo, blurry, low quality, flat lighting, clutter",
    params: { ...defaultParams, aspectRatio: "16:9", stylize: 220, chaos: 12 },
    pieces: [
      ["主題", "quiet coastal library built into white limestone cliffs"],
      ["時間", "blue hour after sunset, warm light glowing through tall windows"],
      ["環境", "misty sea below, narrow stone terraces, sparse pine trees"],
      ["構図", "wide establishing shot, layered depth, leading lines toward the entrance"],
      ["光", "cinematic contrast, warm interior light against cool ambient sky"],
      ["スタイル", "high-detail environment concept art, atmospheric realism"]
    ]
  },
  niji: {
    label: "Niji",
    title: "Niji character key art",
    goal: "アニメ調キャラクター・ゲーム用キービジュアル",
    outputFormat: "prompt",
    negativePrompt: "text, watermark, logo, extra fingers, off-model face, blurry, low quality",
    params: {
      ...defaultParams,
      version: "niji7",
      aspectRatio: "3:2",
      stylize: 300,
      chaos: 10,
      rawMode: false
    },
    pieces: [
      ["主題", "young skyship mechanic with brass goggles and a cobalt work coat"],
      ["デザイン", "expressive eyes, short tousled hair, tool belt with tiny charms"],
      ["ポーズ", "standing on a floating dock, holding a glowing engine core"],
      ["世界観", "sunny cloud harbor, small airships, hand-painted fantasy machinery"],
      ["構図", "dynamic three-quarter composition, clear silhouette, strong focal point"],
      ["スタイル", "clean anime key art, detailed linework, bright cel-shaded color"]
    ]
  }
};

let state = loadState();

const elements = {
  pieceList: document.querySelector("#pieceList"),
  pieceTemplate: document.querySelector("#pieceTemplate"),
  pieceCount: document.querySelector("#pieceCount"),
  projectTitle: document.querySelector("#projectTitle"),
  projectGoal: document.querySelector("#projectGoal"),
  outputFormat: document.querySelector("#outputFormat"),
  imageRefs: document.querySelector("#imageRefs"),
  styleRefs: document.querySelector("#styleRefs"),
  negativePrompt: document.querySelector("#negativePrompt"),
  version: document.querySelector("#version"),
  aspectRatio: document.querySelector("#aspectRatio"),
  customAspect: document.querySelector("#customAspect"),
  resolution: document.querySelector("#resolution"),
  stylize: document.querySelector("#stylize"),
  stylizeValue: document.querySelector("#stylizeValue"),
  chaos: document.querySelector("#chaos"),
  chaosValue: document.querySelector("#chaosValue"),
  weird: document.querySelector("#weird"),
  weirdValue: document.querySelector("#weirdValue"),
  quality: document.querySelector("#quality"),
  seed: document.querySelector("#seed"),
  styleWeight: document.querySelector("#styleWeight"),
  rawMode: document.querySelector("#rawMode"),
  tileMode: document.querySelector("#tileMode"),
  publicMode: document.querySelector("#publicMode"),
  stealthMode: document.querySelector("#stealthMode"),
  compatStatus: document.querySelector("#compatStatus"),
  scoreRing: document.querySelector("#scoreRing"),
  scoreText: document.querySelector("#scoreText"),
  promptOutput: document.querySelector("#promptOutput"),
  copyStatus: document.querySelector("#copyStatus"),
  qrStatus: document.querySelector("#qrStatus"),
  qrCanvas: document.querySelector("#qrCanvas"),
  shareUrl: document.querySelector("#shareUrl"),
  refreshQr: document.querySelector("#refreshQr"),
  segments: [...document.querySelectorAll(".segment")],
  addPiece: document.querySelector("#addPiece"),
  copyPrompt: document.querySelector("#copyPrompt"),
  downloadMarkdown: document.querySelector("#downloadMarkdown"),
  resetPreset: document.querySelector("#resetPreset"),
  selectOutput: document.querySelector("#selectOutput")
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
  syncControlsFromState();
  elements.shareUrl.value = getInitialShareUrl();
  bindEvents();
  renderPieces();
  renderQr();
  registerServiceWorker();
}

function bindEvents() {
  elements.projectTitle.addEventListener("input", () => {
    state.title = elements.projectTitle.value;
    updateOutput();
  });

  elements.projectGoal.addEventListener("input", () => {
    state.goal = elements.projectGoal.value;
    updateOutput();
  });

  elements.outputFormat.addEventListener("change", () => {
    state.outputFormat = elements.outputFormat.value;
    updateOutput();
  });

  elements.imageRefs.addEventListener("input", () => {
    state.imageRefs = elements.imageRefs.value;
    updateOutput();
  });

  elements.styleRefs.addEventListener("input", () => {
    state.styleRefs = elements.styleRefs.value;
    updateOutput();
  });

  elements.negativePrompt.addEventListener("input", () => {
    state.negativePrompt = elements.negativePrompt.value;
    updateOutput();
  });

  bindParam("version");
  bindParam("aspectRatio");
  bindParam("customAspect");
  bindParam("resolution");
  bindParam("stylize", true);
  bindParam("chaos", true);
  bindParam("weird", true);
  bindParam("quality");
  bindParam("seed");
  bindParam("styleWeight");
  bindParam("rawMode");
  bindParam("tileMode");
  bindParam("publicMode");
  bindParam("stealthMode");

  elements.addPiece.addEventListener("click", () => {
    state.pieces.push(createPiece("追加項目", ""));
    renderPieces();
    setStatus("項目を追加しました");
  });

  elements.copyPrompt.addEventListener("click", copyPrompt);
  elements.downloadMarkdown.addEventListener("click", downloadMarkdown);
  elements.resetPreset.addEventListener("click", resetPreset);
  elements.refreshQr.addEventListener("click", renderQr);
  elements.shareUrl.addEventListener("input", renderQr);

  elements.selectOutput.addEventListener("click", () => {
    elements.promptOutput.focus();
    elements.promptOutput.select();
  });

  elements.segments.forEach((segment) => {
    segment.addEventListener("click", () => {
      const nextPreset = segment.dataset.preset;
      if (nextPreset === state.preset) return;

      state = createPresetState(nextPreset);
      syncControlsFromState();
      renderPieces();
      setStatus(`${promptPresets[nextPreset].label}プリセットに切り替えました`);
    });
  });
}

function bindParam(name, numeric = false) {
  const element = elements[name];
  const eventName = element.type === "checkbox" ? "change" : "input";

  element.addEventListener(eventName, () => {
    let value = element.type === "checkbox" ? element.checked : element.value;
    if (numeric && value !== "") value = Number(value);

    state.params[name] = value;

    if (name === "publicMode" && value) {
      state.params.stealthMode = false;
      elements.stealthMode.checked = false;
    }

    if (name === "stealthMode" && value) {
      state.params.publicMode = false;
      elements.publicMode.checked = false;
    }

    updateRangeLabels();
    updateOutput();
  });
}

function syncControlsFromState() {
  elements.projectTitle.value = state.title;
  elements.projectGoal.value = state.goal;
  elements.outputFormat.value = state.outputFormat;
  elements.imageRefs.value = state.imageRefs;
  elements.styleRefs.value = state.styleRefs;
  elements.negativePrompt.value = state.negativePrompt;

  Object.entries(state.params).forEach(([key, value]) => {
    const element = elements[key];
    if (!element) return;
    if (element.type === "checkbox") {
      element.checked = Boolean(value);
    } else {
      element.value = value;
    }
  });

  updateRangeLabels();
}

function updateRangeLabels() {
  elements.stylizeValue.textContent = String(state.params.stylize);
  elements.chaosValue.textContent = String(state.params.chaos);
  elements.weirdValue.textContent = String(state.params.weird);
}

function renderPieces() {
  elements.pieceList.replaceChildren();

  state.pieces.forEach((piece, index) => {
    const node = elements.pieceTemplate.content.firstElementChild.cloneNode(true);
    const handle = node.querySelector(".drag-handle");
    const priority = node.querySelector(".priority-badge");
    const nameField = node.querySelector(".field-name");
    const contentField = node.querySelector(".field-content");
    const enabledField = node.querySelector(".field-enabled");

    node.dataset.id = piece.id;
    node.draggable = false;
    priority.textContent = `P${index + 1}`;
    priority.setAttribute("aria-label", `優先順位 ${index + 1}`);
    nameField.value = piece.name;
    contentField.value = piece.content;
    contentField.placeholder = piece.placeholder || "";
    enabledField.checked = piece.enabled;

    nameField.addEventListener("input", (event) => {
      piece.name = event.target.value;
      updateOutput();
    });

    contentField.addEventListener("input", (event) => {
      piece.content = event.target.value;
      updateOutput();
    });

    enabledField.addEventListener("change", (event) => {
      piece.enabled = event.target.checked;
      updateOutput();
    });

    node.querySelector(".move-up").addEventListener("click", () => movePiece(index, index - 1));
    node.querySelector(".move-down").addEventListener("click", () => movePiece(index, index + 1));
    node.querySelector(".duplicate").addEventListener("click", () => duplicatePiece(index));
    node.querySelector(".remove").addEventListener("click", () => removePiece(index));

    handle.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") {
        node.draggable = true;
        return;
      }

      startPointerReorder(event, node, piece.id);
    });

    handle.addEventListener("pointermove", updatePointerReorder);
    handle.addEventListener("pointerup", finishPointerReorder);
    handle.addEventListener("pointercancel", cancelPointerReorder);

    node.addEventListener("dragstart", (event) => {
      if (!event.target.closest(".drag-handle")) {
        event.preventDefault();
        return;
      }

      draggedId = piece.id;
      node.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", piece.id);
    });

    node.addEventListener("dragend", () => {
      draggedId = null;
      node.draggable = false;
      clearDragMarkers();
    });

    node.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!draggedId || draggedId === piece.id) return;

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
      reorderById(sourceId, piece.id, placeAfter);
      clearDragMarkers();
    });

    elements.pieceList.append(node);
  });

  elements.segments.forEach((segment) => {
    const isActive = segment.dataset.preset === state.preset;
    segment.classList.toggle("is-active", isActive);
    segment.setAttribute("aria-checked", String(isActive));
  });

  updateOutput();
}

function movePiece(fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= state.pieces.length) return;
  const [piece] = state.pieces.splice(fromIndex, 1);
  state.pieces.splice(toIndex, 0, piece);
  renderPieces();
}

function duplicatePiece(index) {
  const original = state.pieces[index];
  const copy = createPiece(`${original.name} コピー`, original.content, original.placeholder);
  copy.enabled = original.enabled;
  state.pieces.splice(index + 1, 0, copy);
  renderPieces();
}

function removePiece(index) {
  if (state.pieces.length === 1) {
    setStatus("最後の1項目は残します");
    return;
  }

  state.pieces.splice(index, 1);
  renderPieces();
}

function reorderById(sourceId, targetId, placeAfter) {
  if (!sourceId || sourceId === targetId) return;

  const fromIndex = state.pieces.findIndex((piece) => piece.id === sourceId);
  const targetIndex = state.pieces.findIndex((piece) => piece.id === targetId);
  if (fromIndex === -1 || targetIndex === -1) return;

  const [piece] = state.pieces.splice(fromIndex, 1);
  let insertIndex = targetIndex + (placeAfter ? 1 : 0);
  if (fromIndex < insertIndex) insertIndex -= 1;
  state.pieces.splice(insertIndex, 0, piece);
  renderPieces();
}

function startPointerReorder(event, node, pieceId) {
  if (state.pieces.length < 2) return;

  event.preventDefault();
  pointerDrag = {
    id: pieceId,
    pointerId: event.pointerId,
    targetId: null,
    placeAfter: false
  };
  draggedId = pieceId;
  node.classList.add("is-dragging");
  document.body.classList.add("is-reordering");

  if (event.currentTarget.setPointerCapture) {
    event.currentTarget.setPointerCapture(event.pointerId);
  }
}

function updatePointerReorder(event) {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;

  event.preventDefault();
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".prompt-item");
  clearDragMarkers();
  findPieceNode(pointerDrag.id)?.classList.add("is-dragging");

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

function findPieceNode(pieceId) {
  return [...document.querySelectorAll(".prompt-item")].find((node) => node.dataset.id === pieceId);
}

function clearDragMarkers() {
  document.querySelectorAll(".prompt-item").forEach((node) => {
    node.classList.remove("is-dragging", "is-over-before", "is-over-after");
    delete node.dataset.dropPosition;
  });
}

function resetPreset() {
  state = createPresetState(state.preset);
  syncControlsFromState();
  renderPieces();
  setStatus("プリセットを初期化しました");
}

async function copyPrompt() {
  const promptText = buildPromptText();

  try {
    await navigator.clipboard.writeText(promptText);
    setStatus("プロンプトをコピーしました");
  } catch {
    const copied = copyTextFallback(promptText);
    setStatus(copied ? "プロンプトをコピーしました" : "コピーできませんでした");
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
  const markdown = buildMarkdownPackage();
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const safeTitle = (state.title || "midjourney-prompt").replace(/[\\/:*?"<>|]/g, "_");
  const fileName = `${safeTitle}.md`;

  if (navigator.canShare && navigator.share) {
    const file = new File([blob], fileName, { type: "text/markdown" });
    if (navigator.canShare({ files: [file] })) {
      navigator
        .share({ files: [file], title: state.title || "Midjourney Prompt Forge" })
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
  const enabledCount = state.pieces.filter((piece) => piece.enabled).length;
  elements.pieceCount.textContent = `${state.pieces.length}項目 / 出力 ${enabledCount}項目`;
  elements.promptOutput.value = buildDisplayOutput();
  updateCompatibilityStatus();
  updateScore();
  saveState();
}

function buildDisplayOutput() {
  if (state.outputFormat === "brief") return buildBriefOutput();
  if (state.outputFormat === "markdown") return buildMarkdownPackage();
  return buildPromptText();
}

function buildPromptText() {
  const imageRefs = splitRefs(state.imageRefs).join(" ");
  const positive = state.pieces
    .filter((piece) => piece.enabled)
    .map((piece) => normalizePromptClause(piece.content))
    .filter(Boolean)
    .join(", ");

  if (!imageRefs && !positive) return "";

  const parameters = buildParameterTokens().join(" ");

  return [imageRefs, positive, parameters].filter(Boolean).join(" ").trim();
}

function buildBriefOutput() {
  const lines = [
    "Midjourney prompt:",
    buildPromptText(),
    "",
    "Brief:",
    `- 作品名: ${normalizeInline(state.title) || EMPTY_VALUE}`,
    `- 用途: ${normalizeInline(state.goal) || EMPTY_VALUE}`,
    `- プリセット: ${promptPresets[state.preset].label}`,
    `- モデル: ${describeVersion(state.params.version)}`,
    `- 比率: ${resolveAspectRatio()}`
  ];

  return finishText(lines);
}

function buildMarkdownPackage() {
  const activePieces = state.pieces.filter((piece) => piece.enabled);
  const lines = [
    `# ${normalizeInline(state.title) || "Midjourney Prompt"}`,
    "",
    "## Prompt",
    "",
    "```text",
    buildPromptText(),
    "```",
    "",
    "## Settings",
    "",
    `- Preset: ${promptPresets[state.preset].label}`,
    `- Goal: ${normalizeInline(state.goal) || EMPTY_VALUE}`,
    `- Model: ${describeVersion(state.params.version)}`,
    `- Aspect ratio: ${resolveAspectRatio()}`,
    `- Stylize: ${state.params.stylize}`,
    `- Chaos: ${state.params.chaos}`,
    `- Weird: ${state.params.weird}`,
    "",
    "## Prompt Pieces"
  ];

  activePieces.forEach((piece, index) => {
    lines.push("", `### P${index + 1}: ${normalizeInline(piece.name) || "項目"}`, normalizeBlock(piece.content));
  });

  return finishText(lines);
}

function buildParameterTokens() {
  const params = [];
  const version = state.params.version;
  const aspectRatio = resolveAspectRatio();
  const noList = normalizeNoList(state.negativePrompt);
  const styleRefs = splitRefs(state.styleRefs);
  const stylize = clampNumber(state.params.stylize, 0, 1000, 100);
  const chaos = clampNumber(state.params.chaos, 0, 100, 0);
  const weird = clampNumber(state.params.weird, 0, 3000, 0);
  const seed = normalizeInteger(state.params.seed);
  const styleWeight = normalizeInteger(state.params.styleWeight);

  if (aspectRatio) params.push("--ar", aspectRatio);

  if (version === "niji7") {
    params.push("--niji", "7");
  } else if (version === "v7") {
    params.push("--v", "7");
  } else if (version === "v6.1") {
    params.push("--v", "6.1");
  } else {
    params.push("--v", "8.1");
  }

  if (state.params.rawMode && version !== "niji7") params.push("--raw");
  if (state.params.resolution && version === "v8.1") params.push(`--${state.params.resolution}`);
  if (stylize !== 100) params.push("--s", String(stylize));
  if (chaos > 0) params.push("--c", String(chaos));
  if (weird > 0) params.push("--w", String(weird));
  if (state.params.quality && version !== "v8.1") params.push("--q", state.params.quality);
  if (seed !== "") params.push("--seed", seed);
  if (state.params.tileMode) params.push("--tile");
  if (styleRefs.length) params.push("--sref", ...styleRefs);
  if (styleRefs.length && styleWeight !== "") params.push("--sw", styleWeight);
  if (noList) params.push("--no", noList);
  if (state.params.stealthMode) params.push("--stealth");
  if (state.params.publicMode) params.push("--public");

  return params;
}

function updateCompatibilityStatus() {
  const notes = [];
  const version = state.params.version;

  notes.push(describeVersion(version));
  if (state.params.rawMode && version !== "niji7") notes.push("Raw");
  if (state.params.resolution && version === "v8.1") notes.push(state.params.resolution.toUpperCase());
  if (state.params.resolution && version !== "v8.1") notes.push("HD/SDはV8.1時のみ出力");
  if (state.params.quality && version === "v8.1") notes.push("QualityはV8.1では省略");
  if (state.params.rawMode && version === "niji7") notes.push("NijiではRawを省略");
  if (state.params.stealthMode) notes.push("Stealth");
  if (state.params.publicMode) notes.push("Public");

  elements.compatStatus.textContent = notes.join(" / ");
}

function updateScore() {
  const enabledPieces = state.pieces.filter((piece) => piece.enabled);
  const filledPieces = enabledPieces.filter((piece) => normalizeBlock(piece.content) !== EMPTY_VALUE);
  const hasSubject = filledPieces.some((piece) => /主題|商品|人物|キャラ|subject/i.test(piece.name));
  const hasComposition = filledPieces.some((piece) => /構図|camera|lens|composition|ポーズ/i.test(piece.name));
  const hasLight = filledPieces.some((piece) => /光|lighting|light/i.test(piece.name));
  const hasStyle = filledPieces.some((piece) => /スタイル|style|質感|design/i.test(piece.name));
  const hasNegative = Boolean(normalizeNoList(state.negativePrompt));

  let score = Math.min(45, filledPieces.length * 8);
  if (hasSubject) score += 18;
  if (hasComposition) score += 12;
  if (hasLight) score += 10;
  if (hasStyle) score += 10;
  if (hasNegative) score += 5;
  score = Math.min(100, score);

  elements.scoreRing.textContent = String(score);
  elements.scoreRing.style.setProperty("--score", `${score}%`);

  if (score >= 85) {
    elements.scoreText.textContent = "本番投入しやすい密度です";
  } else if (score >= 65) {
    elements.scoreText.textContent = "主題・構図・光はおおむね揃っています";
  } else {
    elements.scoreText.textContent = "主題、構図、光、スタイルを埋めると安定します";
  }
}

function resolveAspectRatio() {
  if (state.params.aspectRatio !== "custom") return state.params.aspectRatio || "1:1";

  const custom = String(state.params.customAspect || "").trim();
  if (/^[1-9]\d{0,3}:[1-9]\d{0,3}$/.test(custom)) return custom;
  return "1:1";
}

function describeVersion(version) {
  const labels = {
    "v8.1": "V8.1",
    v7: "V7",
    niji7: "Niji 7",
    "v6.1": "V6.1"
  };

  return labels[version] || "V8.1";
}

function splitRefs(value) {
  return normalizeBlock(value)
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item));
}

function normalizeNoList(value) {
  return normalizeBlock(value)
    .split(/,|\n/)
    .map((item) => item.replace(/^--?no\s+/i, "").trim())
    .filter(Boolean)
    .join(", ");
}

function normalizePromptClause(value) {
  const content = normalizeBlock(value);
  if (content === EMPTY_VALUE) return "";

  return content
    .replace(/\r\n/g, "\n")
    .replace(/\s*\n+\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,{2,}/g, ",")
    .trim();
}

function normalizeBlock(value) {
  const content = String(value || "")
    .replace(/\r\n/g, "\n")
    .trim();

  return content || EMPTY_VALUE;
}

function normalizeInline(value) {
  const content = normalizeBlock(value);
  return content === EMPTY_VALUE ? "" : content.replace(/\s+/g, " ");
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeInteger(value) {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return "";
  return String(Math.floor(number));
}

function finishText(lines) {
  return `${lines.join("\n").trim()}\n`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidSavedState(saved)) {
      return {
        preset: saved.preset,
        title: typeof saved.title === "string" ? saved.title : promptPresets[saved.preset].title,
        goal: typeof saved.goal === "string" ? saved.goal : promptPresets[saved.preset].goal,
        outputFormat: saved.outputFormat || "prompt",
        imageRefs: saved.imageRefs || "",
        styleRefs: saved.styleRefs || "",
        negativePrompt:
          typeof saved.negativePrompt === "string" ? saved.negativePrompt : promptPresets[saved.preset].negativePrompt,
        params: normalizeSavedParams(saved.params, saved.preset),
        pieces: saved.pieces.map(normalizeSavedPiece)
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return createPresetState("product");
}

function isValidSavedState(saved) {
  return (
    saved &&
    promptPresets[saved.preset] &&
    Array.isArray(saved.pieces) &&
    saved.pieces.length > 0
  );
}

function normalizeSavedParams(params, preset) {
  return {
    ...promptPresets[preset].params,
    ...(params || {})
  };
}

function normalizeSavedPiece(piece) {
  return {
    id: piece.id || createId(),
    name: piece.name || "項目",
    content: piece.content || "",
    placeholder: piece.placeholder || "",
    enabled: piece.enabled !== false
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    setStatus("ローカル保存できませんでした");
  }
}

function createPresetState(presetName) {
  const preset = promptPresets[presetName] || promptPresets.product;

  return {
    preset: presetName,
    title: "",
    goal: "",
    outputFormat: preset.outputFormat,
    imageRefs: "",
    styleRefs: "",
    negativePrompt: "",
    params: { ...preset.params },
    pieces: preset.pieces.map(([name]) => createPiece(name, "", ""))
  };
}

function createPiece(name, content, placeholder = "") {
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

  return `piece-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getInitialShareUrl() {
  const currentUrl = window.location.href;
  const localHosts = ["127.0.0.1", "localhost", "::1"];
  if (serverConfig.lanUrl) return serverConfig.lanUrl;

  if (localHosts.includes(window.location.hostname)) {
    const port = window.location.port ? `:${window.location.port}` : "";
    return `${window.location.protocol}//${getLanHostFallback()}${port}${window.location.pathname}`;
  }

  if (window.location.protocol !== "file:") return currentUrl;
  return `http://${getLanHostFallback()}:8765/index.html`;
}

function getLanHostFallback() {
  return serverConfig.lanHost || "192.168.11.4";
}

function renderQr() {
  const value = elements.shareUrl.value.trim();
  const canvas = elements.qrCanvas;
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!value) {
    setQrStatus("共有URLを入力してください");
    drawQrPlaceholder(canvas);
    return;
  }

  try {
    const qr = createQrMatrix(value);
    drawQr(canvas, qr.modules);
    if (/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\]|::1)/.test(value)) {
      setQrStatus("スマホではLAN IPか公開URLを使ってください");
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
  context.fillStyle = "#182025";

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
  context.strokeStyle = "#d8e0e6";
  context.lineWidth = 2;
  context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  context.fillStyle = "#60717d";
  context.font = "12px sans-serif";
  context.textAlign = "center";
  context.fillText("URLを入力", canvas.width / 2, canvas.height / 2);
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

  navigator.serviceWorker.register("./sw.js?v=20260616-6").catch(() => {
    // The app still works as a plain local file when service workers are unavailable.
  });
}
