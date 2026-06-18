(function initializePromptProjectLibrary(global) {
  "use strict";

  const LIBRARY_KEY = "prompt-tool-project-library-v1";
  const PENDING_KEY = "prompt-tool-project-open-v1";
  const ACTIVE_KEY_PREFIX = "prompt-tool-active-project-v1-";
  const SINGLE_FORMAT = "prompt-tool-project";
  const LIBRARY_FORMAT = "prompt-tool-project-library";
  const FORMAT_VERSION = 1;
  const APP_TYPES = ["forge", "promptweaver"];

  function createManager(config) {
    validateManagerConfig(config);

    let activeProjectId =
      config.initialProject?.id ||
      readActiveProjectId(config.appType) ||
      "";
    let importMode = "";
    const ui = createLibraryDialog();

    config.button.addEventListener("click", openDialog);
    ui.closeButton.addEventListener("click", closeDialog);
    ui.newSaveButton.addEventListener("click", saveNewProject);
    ui.overwriteButton.addEventListener("click", overwriteProject);
    ui.exportCurrentButton.addEventListener("click", exportCurrentProject);
    ui.importSingleButton.addEventListener("click", () => chooseImportFile("single"));
    ui.exportLibraryButton.addEventListener("click", exportLibrary);
    ui.importMergeButton.addEventListener("click", () => chooseImportFile("merge"));
    ui.importReplaceButton.addEventListener("click", () => chooseImportFile("replace"));
    ui.fileInput.addEventListener("change", importJsonFile);
    ui.dialog.addEventListener("click", (event) => {
      if (event.target === ui.dialog) closeDialog();
    });

    global.addEventListener?.("storage", (event) => {
      if (event.key === LIBRARY_KEY && ui.dialog.open) renderLibrary();
    });

    if (config.initialProject?.id) {
      setActiveProject(config.initialProject.id);
    } else {
      ensureActiveProjectExists();
    }

    function openDialog() {
      ensureActiveProjectExists();
      renderLibrary();
      syncSaveName();
      setDialogStatus("");

      if (typeof ui.dialog.showModal === "function") {
        ui.dialog.showModal();
      } else {
        ui.dialog.setAttribute("open", "");
      }
    }

    function closeDialog() {
      if (typeof ui.dialog.close === "function") {
        ui.dialog.close();
      } else {
        ui.dialog.removeAttribute("open");
      }
    }

    function renderLibrary() {
      const projects = readLibrary();
      ui.projectList.replaceChildren();
      ui.projectCount.textContent = `${projects.length}件`;

      const active = projects.find(
        (project) => project.id === activeProjectId && project.appType === config.appType
      );
      ui.overwriteButton.disabled = !active;
      ui.activeProject.textContent = active
        ? `編集中: ${active.name}`
        : "編集中: 名前付き保存なし";

      if (!projects.length) {
        const empty = document.createElement("p");
        empty.className = "project-library-empty";
        empty.textContent = "保存済みプロジェクトはありません。";
        ui.projectList.append(empty);
        return;
      }

      projects.forEach((project) => {
        ui.projectList.append(createProjectRow(project));
      });
    }

    function createProjectRow(project) {
      const row = document.createElement("article");
      row.className = "project-library-row";
      if (project.id === activeProjectId && project.appType === config.appType) {
        row.classList.add("is-active");
      }

      const summary = document.createElement("div");
      summary.className = "project-library-summary";

      const heading = document.createElement("div");
      heading.className = "project-library-heading";

      const name = document.createElement("strong");
      name.textContent = project.name;

      const badge = document.createElement("span");
      badge.className = `project-library-badge is-${project.appType}`;
      badge.textContent = project.appType === "forge" ? "Forge" : "PW";

      const timestamp = document.createElement("span");
      timestamp.className = "project-library-time";
      timestamp.textContent = `更新 ${formatDate(project.updatedAt)}`;

      heading.append(name, badge);
      summary.append(heading, timestamp);

      const actions = document.createElement("div");
      actions.className = "project-library-row-actions";
      actions.append(
        createActionButton("開く", () => openProject(project), "primary"),
        createActionButton("名前変更", () => renameProject(project)),
        createActionButton("複製", () => duplicateProject(project)),
        createActionButton("JSON", () => exportSavedProject(project)),
        createActionButton("削除", () => deleteProject(project), "danger")
      );

      row.append(summary, actions);
      return row;
    }

    function createActionButton(label, handler, tone = "") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "project-library-action";
      if (tone) button.classList.add(`is-${tone}`);
      button.textContent = label;
      button.addEventListener("click", handler);
      return button;
    }

    function syncSaveName() {
      const active = findActiveProject();
      ui.saveName.value = active?.name || normalizeName(config.getDefaultName()) || "名称未設定";
    }

    function saveNewProject() {
      const projects = readLibrary();
      const name = normalizeName(ui.saveName.value);
      if (!name) {
        setDialogStatus("保存名を入力してください。", true);
        ui.saveName.focus();
        return;
      }

      if (hasDuplicateName(projects, config.appType, name)) {
        setDialogStatus("同じ名前があります。別名にするか、上書きを使用してください。", true);
        return;
      }

      const timestamp = new Date().toISOString();
      const project = normalizeProjectRecord({
        id: createId(),
        name,
        appType: config.appType,
        createdAt: timestamp,
        updatedAt: timestamp,
        state: config.getState()
      });

      try {
        writeLibrary([project, ...projects]);
      } catch (error) {
        reportStorageError(error);
        return;
      }

      setActiveProject(project.id);
      renderLibrary();
      setDialogStatus(`「${project.name}」を保存しました。`);
      config.setStatus?.("名前付き保存を作成しました");
    }

    function overwriteProject() {
      const projects = readLibrary();
      const index = projects.findIndex(
        (project) => project.id === activeProjectId && project.appType === config.appType
      );
      if (index < 0) {
        setDialogStatus("上書き対象を開いてから実行してください。", true);
        return;
      }

      const name = normalizeName(ui.saveName.value);
      if (!name) {
        setDialogStatus("保存名を入力してください。", true);
        return;
      }

      if (hasDuplicateName(projects, config.appType, name, activeProjectId)) {
        setDialogStatus("同じ名前があります。別の名前を入力してください。", true);
        return;
      }

      projects[index] = normalizeProjectRecord({
        ...projects[index],
        name,
        updatedAt: new Date().toISOString(),
        state: config.getState()
      });

      try {
        writeLibrary(projects);
      } catch (error) {
        reportStorageError(error);
        return;
      }

      renderLibrary();
      setDialogStatus(`「${name}」を上書きしました。`);
      config.setStatus?.("名前付き保存を更新しました");
    }

    function openProject(project) {
      if (project.appType === config.appType) {
        try {
          config.applyState(deepClone(project.state));
        } catch {
          setDialogStatus("保存データを開けませんでした。", true);
          return;
        }

        setActiveProject(project.id);
        closeDialog();
        config.setStatus?.(`「${project.name}」を開きました`);
        return;
      }

      try {
        const pending = normalizeProjectRecord(project);
        localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
        const destination = new URL(config.appUrls[project.appType], global.location.href);
        const encoded = encodePayload(pending);
        if (encoded.length <= 6000) destination.searchParams.set("projectOpen", encoded);
        global.location.href = destination.href;
      } catch {
        setDialogStatus("別アプリへデータを渡せませんでした。", true);
      }
    }

    function renameProject(project) {
      const nextName = global.prompt("新しい保存名を入力してください。", project.name);
      if (nextName === null) return;

      const name = normalizeName(nextName);
      if (!name) {
        setDialogStatus("保存名を入力してください。", true);
        return;
      }

      const projects = readLibrary();
      if (hasDuplicateName(projects, project.appType, name, project.id)) {
        setDialogStatus("同じアプリに同名の保存があります。", true);
        return;
      }

      const index = projects.findIndex((item) => item.id === project.id);
      if (index < 0) return;
      projects[index] = {
        ...projects[index],
        name,
        updatedAt: new Date().toISOString()
      };

      try {
        writeLibrary(projects);
      } catch (error) {
        reportStorageError(error);
        return;
      }

      if (project.id === activeProjectId) ui.saveName.value = name;
      renderLibrary();
      setDialogStatus(`「${name}」に変更しました。`);
    }

    function duplicateProject(project) {
      const projects = readLibrary();
      const timestamp = new Date().toISOString();
      const copy = normalizeProjectRecord({
        ...deepClone(project),
        id: createId(),
        name: createUniqueName(`${project.name} コピー`, project.appType, projects),
        createdAt: timestamp,
        updatedAt: timestamp
      });

      try {
        writeLibrary([copy, ...projects]);
      } catch (error) {
        reportStorageError(error);
        return;
      }

      renderLibrary();
      setDialogStatus(`「${copy.name}」を作成しました。`);
    }

    function deleteProject(project) {
      if (!global.confirm(`「${project.name}」を削除しますか？`)) return;

      const projects = readLibrary().filter((item) => item.id !== project.id);
      try {
        writeLibrary(projects);
      } catch (error) {
        reportStorageError(error);
        return;
      }

      if (project.id === activeProjectId) clearActiveProject();
      renderLibrary();
      syncSaveName();
      setDialogStatus("保存データを削除しました。");
    }

    async function exportCurrentProject() {
      const active = findActiveProject();
      const timestamp = new Date().toISOString();
      const project = normalizeProjectRecord({
        id: active?.id || createId(),
        name: normalizeName(ui.saveName.value) || normalizeName(config.getDefaultName()) || "名称未設定",
        appType: config.appType,
        createdAt: active?.createdAt || timestamp,
        updatedAt: timestamp,
        state: config.getState()
      });
      await exportProjectJson(project);
    }

    async function exportSavedProject(project) {
      await exportProjectJson(project);
    }

    async function exportProjectJson(project) {
      const payload = buildSingleExport(project);
      const fileName = `${sanitizeFileName(project.name)}.prompt-project.json`;
      await saveJsonFile(payload, fileName, setDialogStatus);
    }

    async function exportLibrary() {
      const payload = buildLibraryExport(readLibrary());
      const date = new Date().toISOString().slice(0, 10);
      await saveJsonFile(payload, `prompt-tool-backup-${date}.json`, setDialogStatus);
    }

    function chooseImportFile(mode) {
      importMode = mode;
      ui.fileInput.value = "";
      ui.fileInput.click();
    }

    async function importJsonFile() {
      const file = ui.fileInput.files?.[0];
      if (!file || !importMode) return;

      let payload;
      try {
        payload = JSON.parse(await readFileText(file));
      } catch {
        setDialogStatus("JSONファイルを読み取れませんでした。", true);
        return;
      }

      if (importMode === "single") {
        importSingleProject(payload);
      } else {
        importProjectLibrary(payload, importMode);
      }
      importMode = "";
    }

    function importSingleProject(payload) {
      let imported;
      try {
        validateExportHeader(payload, SINGLE_FORMAT);
        imported = normalizeProjectRecord(payload.project);
      } catch (error) {
        setDialogStatus(error.message, true);
        return;
      }

      const projects = readLibrary();
      const timestamp = new Date().toISOString();
      const project = {
        ...imported,
        id: createId(),
        name: createUniqueName(imported.name, imported.appType, projects),
        createdAt: timestamp,
        updatedAt: timestamp
      };

      try {
        writeLibrary([project, ...projects]);
      } catch (error) {
        reportStorageError(error);
        return;
      }

      renderLibrary();
      setDialogStatus(`「${project.name}」を追加しました。`);
    }

    function importProjectLibrary(payload, mode) {
      let importedProjects;
      try {
        validateExportHeader(payload, LIBRARY_FORMAT);
        if (!Array.isArray(payload.projects)) throw new Error("保存一覧が含まれていません。");
        importedProjects = normalizeProjectCollection(payload.projects);
      } catch (error) {
        setDialogStatus(error.message, true);
        return;
      }

      if (mode === "replace" && !global.confirm("現在の名前付き保存をすべて置き換えますか？")) {
        setDialogStatus("全件置換をキャンセルしました。");
        return;
      }

      const nextProjects =
        mode === "replace"
          ? ensureCollectionUniqueness(importedProjects)
          : mergeProjectCollections(readLibrary(), importedProjects);

      try {
        writeLibrary(nextProjects);
      } catch (error) {
        reportStorageError(error);
        return;
      }

      ensureActiveProjectExists();
      renderLibrary();
      syncSaveName();
      setDialogStatus(
        mode === "replace"
          ? `${nextProjects.length}件の保存データに置き換えました。`
          : `${importedProjects.length}件を追加・統合しました。`
      );
    }

    function setDialogStatus(message, isError = false) {
      ui.status.textContent = message;
      ui.status.classList.toggle("is-error", Boolean(isError));
    }

    function reportStorageError(error) {
      const message =
        error?.name === "QuotaExceededError"
          ? "ブラウザの保存容量が不足しています。JSONバックアップ後に不要な保存を削除してください。"
          : "ブラウザ内へ保存できませんでした。";
      setDialogStatus(message, true);
      config.setStatus?.("名前付き保存に失敗しました");
    }

    function findActiveProject() {
      return readLibrary().find(
        (project) => project.id === activeProjectId && project.appType === config.appType
      );
    }

    function setActiveProject(id) {
      activeProjectId = id || "";
      try {
        if (activeProjectId) {
          localStorage.setItem(`${ACTIVE_KEY_PREFIX}${config.appType}`, activeProjectId);
        } else {
          localStorage.removeItem(`${ACTIVE_KEY_PREFIX}${config.appType}`);
        }
      } catch {
        // The active project hint is optional.
      }
    }

    function clearActiveProject() {
      setActiveProject("");
    }

    function ensureActiveProjectExists() {
      if (!activeProjectId) return;
      const exists = readLibrary().some(
        (project) => project.id === activeProjectId && project.appType === config.appType
      );
      if (!exists) clearActiveProject();
    }

    return {
      open: openDialog,
      getActiveProjectId: () => activeProjectId,
      clearActiveProject
    };
  }

  function consumePendingProject(appType) {
    let pending = readPendingFromStorage(appType);
    if (pending) {
      clearProjectQueryParam();
    } else {
      pending = readPendingFromQuery(appType);
    }
    return pending;
  }

  function readPendingFromStorage(appType) {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      const pending = normalizeProjectRecord(JSON.parse(raw));
      if (pending.appType !== appType) return null;
      localStorage.removeItem(PENDING_KEY);
      return pending;
    } catch {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
  }

  function readPendingFromQuery(appType) {
    const params = new URLSearchParams(global.location.search);
    const encoded = params.get("projectOpen");
    if (!encoded) return null;

    try {
      const pending = normalizeProjectRecord(decodePayload(encoded));
      if (pending.appType !== appType) return null;
      clearProjectQueryParam();
      return pending;
    } catch {
      clearProjectQueryParam();
      return null;
    }
  }

  function clearProjectQueryParam() {
    try {
      const url = new URL(global.location.href);
      url.searchParams.delete("projectOpen");
      global.history.replaceState(null, "", url.href);
    } catch {
      // Query cleanup is optional.
    }
  }

  function createLibraryDialog() {
    const dialog = document.createElement("dialog");
    dialog.className = "project-library-dialog";
    dialog.setAttribute("aria-labelledby", "projectLibraryTitle");
    dialog.innerHTML = `
      <div class="project-library-shell">
        <header class="project-library-header">
          <div>
            <h2 id="projectLibraryTitle">名前付き保存</h2>
            <p>この端末のブラウザ内に保存されます。</p>
          </div>
          <button class="project-library-close" type="button" aria-label="閉じる" title="閉じる">×</button>
        </header>
        <section class="project-library-save" aria-label="現在の編集内容を保存">
          <label>
            <span>保存名</span>
            <input class="project-library-name" type="text" maxlength="100" autocomplete="off" />
          </label>
          <div class="project-library-save-actions">
            <button class="project-library-command is-primary project-library-new" type="button">新規保存</button>
            <button class="project-library-command project-library-overwrite" type="button">上書き</button>
          </div>
          <p class="project-library-active"></p>
        </section>
        <section class="project-library-list-section" aria-labelledby="projectLibraryListTitle">
          <div class="project-library-section-head">
            <h3 id="projectLibraryListTitle">保存一覧</h3>
            <span class="project-library-count">0件</span>
          </div>
          <div class="project-library-list"></div>
        </section>
        <section class="project-library-json" aria-labelledby="projectLibraryJsonTitle">
          <div class="project-library-section-head">
            <h3 id="projectLibraryJsonTitle">JSONバックアップ</h3>
          </div>
          <div class="project-library-json-actions">
            <button class="project-library-command project-library-export-current" type="button">現在の1件を保存</button>
            <button class="project-library-command project-library-import-single" type="button">1件を読込</button>
            <button class="project-library-command project-library-export-all" type="button">全件を保存</button>
            <button class="project-library-command project-library-import-merge" type="button">全件を追加・統合</button>
            <button class="project-library-command is-danger project-library-import-replace" type="button">全件を置換</button>
          </div>
          <input class="project-library-file" type="file" accept="application/json,.json" hidden />
        </section>
        <p class="project-library-status" role="status" aria-live="polite"></p>
      </div>
    `;
    document.body.append(dialog);

    return {
      dialog,
      closeButton: dialog.querySelector(".project-library-close"),
      saveName: dialog.querySelector(".project-library-name"),
      newSaveButton: dialog.querySelector(".project-library-new"),
      overwriteButton: dialog.querySelector(".project-library-overwrite"),
      activeProject: dialog.querySelector(".project-library-active"),
      projectList: dialog.querySelector(".project-library-list"),
      projectCount: dialog.querySelector(".project-library-count"),
      exportCurrentButton: dialog.querySelector(".project-library-export-current"),
      importSingleButton: dialog.querySelector(".project-library-import-single"),
      exportLibraryButton: dialog.querySelector(".project-library-export-all"),
      importMergeButton: dialog.querySelector(".project-library-import-merge"),
      importReplaceButton: dialog.querySelector(".project-library-import-replace"),
      fileInput: dialog.querySelector(".project-library-file"),
      status: dialog.querySelector(".project-library-status")
    };
  }

  function readLibrary() {
    try {
      const raw = localStorage.getItem(LIBRARY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== FORMAT_VERSION || !Array.isArray(parsed.projects)) {
        return [];
      }
      return normalizeProjectCollection(parsed.projects).sort(compareProjects);
    } catch {
      return [];
    }
  }

  function writeLibrary(projects) {
    const normalized = ensureCollectionUniqueness(normalizeProjectCollection(projects));
    const payload = {
      version: FORMAT_VERSION,
      projects: normalized
    };
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(payload));
  }

  function normalizeProjectCollection(projects) {
    return projects.map((project) => normalizeProjectRecord(project));
  }

  function normalizeProjectRecord(project) {
    if (!project || typeof project !== "object") {
      throw new Error("プロジェクトデータが正しくありません。");
    }

    if (!APP_TYPES.includes(project.appType)) {
      throw new Error("未対応のアプリ種別です。");
    }

    const name = normalizeName(project.name);
    if (!name) throw new Error("保存名がありません。");
    validateProjectState(project.appType, project.state);

    const timestamp = new Date().toISOString();
    return {
      id: normalizeName(project.id) || createId(),
      name,
      appType: project.appType,
      createdAt: normalizeTimestamp(project.createdAt, timestamp),
      updatedAt: normalizeTimestamp(project.updatedAt, timestamp),
      state: deepClone(project.state)
    };
  }

  function validateProjectState(appType, state) {
    if (!state || typeof state !== "object") {
      throw new Error("編集内容が含まれていません。");
    }

    if (appType === "forge") {
      if (
        !["product", "portrait", "scene", "niji"].includes(state.preset) ||
        !Array.isArray(state.pieces) ||
        !state.pieces.length ||
        state.pieces.some((piece) => !piece || typeof piece !== "object")
      ) {
        throw new Error("Forgeの保存データが正しくありません。");
      }
      if (!state.params || typeof state.params !== "object") {
        throw new Error("Forgeの設定データが正しくありません。");
      }
      return;
    }

    if (
      !["image", "video"].includes(state.type) ||
      !Array.isArray(state.items) ||
      !state.items.length ||
      state.items.some((item) => !item || typeof item !== "object")
    ) {
      throw new Error("PromptWeaverの保存データが正しくありません。");
    }
  }

  function mergeProjectCollections(currentProjects, importedProjects) {
    const result = ensureCollectionUniqueness(currentProjects);
    importedProjects.forEach((imported) => {
      const existingIndex = result.findIndex((project) => project.id === imported.id);
      if (existingIndex >= 0) {
        const withoutExisting = result.filter((_, index) => index !== existingIndex);
        result[existingIndex] = {
          ...imported,
          name: createUniqueName(imported.name, imported.appType, withoutExisting)
        };
      } else {
        result.push({
          ...imported,
          name: createUniqueName(imported.name, imported.appType, result)
        });
      }
    });
    return result.sort(compareProjects);
  }

  function ensureCollectionUniqueness(projects) {
    const result = [];
    const usedIds = new Set();
    projects.forEach((project) => {
      const normalized = normalizeProjectRecord(project);
      if (usedIds.has(normalized.id)) normalized.id = createId();
      usedIds.add(normalized.id);
      normalized.name = createUniqueName(normalized.name, normalized.appType, result);
      result.push(normalized);
    });
    return result.sort(compareProjects);
  }

  function validateExportHeader(payload, expectedFormat) {
    if (!payload || payload.format !== expectedFormat) {
      throw new Error("選択した種類のバックアップJSONではありません。");
    }
    if (payload.version !== FORMAT_VERSION) {
      throw new Error("未対応のバックアップ版です。");
    }
  }

  function buildSingleExport(project) {
    return {
      format: SINGLE_FORMAT,
      version: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      project: normalizeProjectRecord(project)
    };
  }

  function buildLibraryExport(projects) {
    return {
      format: LIBRARY_FORMAT,
      version: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      projects: ensureCollectionUniqueness(projects)
    };
  }

  function createUniqueName(baseName, appType, projects, excludedId = "") {
    const base = normalizeName(baseName) || "名称未設定";
    if (!hasDuplicateName(projects, appType, base, excludedId)) return base;

    let number = 2;
    let candidate = `${base} (${number})`;
    while (hasDuplicateName(projects, appType, candidate, excludedId)) {
      number += 1;
      candidate = `${base} (${number})`;
    }
    return candidate;
  }

  function hasDuplicateName(projects, appType, name, excludedId = "") {
    const target = normalizeName(name).toLocaleLowerCase();
    return projects.some(
      (project) =>
        project.id !== excludedId &&
        project.appType === appType &&
        normalizeName(project.name).toLocaleLowerCase() === target
    );
  }

  function readActiveProjectId(appType) {
    try {
      return localStorage.getItem(`${ACTIVE_KEY_PREFIX}${appType}`) || "";
    } catch {
      return "";
    }
  }

  function normalizeName(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
  }

  function normalizeTimestamp(value, fallback) {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback;
  }

  function compareProjects(left, right) {
    return right.updatedAt.localeCompare(left.updatedAt);
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function createId() {
    if (global.crypto?.randomUUID) return global.crypto.randomUUID();
    return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function sanitizeFileName(value) {
    return (normalizeName(value) || "prompt-project").replace(/[\\/:*?"<>|]/g, "_");
  }

  function encodePayload(payload) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function decodePayload(encoded) {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  async function saveJsonFile(payload, fileName, reportStatus) {
    const json = `${JSON.stringify(payload, null, 2)}\n`;
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const navigatorObject = global.navigator;

    if (global.File && navigatorObject?.canShare && navigatorObject.share) {
      const file = new global.File([blob], fileName, { type: "application/json" });
      if (navigatorObject.canShare({ files: [file] })) {
        try {
          await navigatorObject.share({ files: [file], title: fileName });
          reportStatus("JSONを共有しました。");
          return;
        } catch (error) {
          if (error?.name === "AbortError") {
            reportStatus("JSON保存をキャンセルしました。");
            return;
          }
        }
      }
    }

    const url = global.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    global.URL.revokeObjectURL(url);
    reportStatus("JSONを保存しました。");
  }

  function readFileText(file) {
    if (typeof file.text === "function") return file.text();

    return new Promise((resolve, reject) => {
      const reader = new global.FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")));
      reader.addEventListener("error", () => reject(reader.error));
      reader.readAsText(file);
    });
  }

  function validateManagerConfig(config) {
    if (!config || !APP_TYPES.includes(config.appType)) {
      throw new Error("Project library requires a supported appType.");
    }
    ["button", "getState", "applyState", "getDefaultName", "appUrls"].forEach((key) => {
      if (!config[key]) throw new Error(`Project library config is missing ${key}.`);
    });
  }

  global.PromptProjectLibrary = {
    createManager,
    consumePendingProject,
    constants: {
      LIBRARY_KEY,
      PENDING_KEY,
      SINGLE_FORMAT,
      LIBRARY_FORMAT,
      FORMAT_VERSION
    },
    test: {
      normalizeProjectRecord,
      mergeProjectCollections,
      ensureCollectionUniqueness,
      createUniqueName,
      validateExportHeader,
      buildSingleExport,
      buildLibraryExport
    }
  };
})(globalThis);
