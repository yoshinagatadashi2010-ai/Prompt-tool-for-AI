const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadLibraryApi() {
  const source = fs.readFileSync(path.join(__dirname, "..", "project-library.js"), "utf8");
  let id = 0;
  const context = {
    console,
    Date,
    Intl,
    JSON,
    Math,
    Number,
    String,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    crypto: {
      randomUUID() {
        id += 1;
        return `generated-${id}`;
      }
    }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: "project-library.js" });
  return context.PromptProjectLibrary;
}

function forgeState(subject = "bottle") {
  return {
    preset: "product",
    params: { aspectRatio: "3:2" },
    pieces: [{ id: "p1", name: "被写体", content: subject, enabled: true }]
  };
}

function promptWeaverState(subject = "bottle") {
  return {
    type: "image",
    outputTone: "generic",
    items: [{ id: "i1", name: "被写体", content: subject, enabled: true }]
  };
}

function project(overrides = {}) {
  return {
    id: "project-1",
    name: "商品案",
    appType: "forge",
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
    state: forgeState(),
    ...overrides
  };
}

test("same name is allowed across different apps", () => {
  const api = loadLibraryApi();
  const projects = [
    project(),
    project({
      id: "project-2",
      appType: "promptweaver",
      state: promptWeaverState()
    })
  ];

  const normalized = api.test.ensureCollectionUniqueness(projects);
  assert.deepEqual(
    Array.from(normalized, (item) => item.name),
    ["商品案", "商品案"]
  );
});

test("duplicate names in the same app receive a numeric suffix", () => {
  const api = loadLibraryApi();
  const projects = [
    project(),
    project({ id: "project-2" }),
    project({ id: "project-3" })
  ];

  const normalized = api.test.ensureCollectionUniqueness(projects);
  assert.deepEqual(
    Array.from(normalized, (item) => item.name),
    ["商品案", "商品案 (2)", "商品案 (3)"]
  );
});

test("merge replaces a matching id and preserves unrelated projects", () => {
  const api = loadLibraryApi();
  const current = [
    project(),
    project({
      id: "project-2",
      name: "人物案",
      state: forgeState("portrait")
    })
  ];
  const incoming = [
    project({
      updatedAt: "2026-06-18T01:00:00.000Z",
      state: forgeState("updated bottle")
    })
  ];

  const merged = api.test.mergeProjectCollections(current, incoming);
  assert.equal(merged.length, 2);
  assert.equal(
    merged.find((item) => item.id === "project-1").state.pieces[0].content,
    "updated bottle"
  );
  assert.ok(merged.some((item) => item.id === "project-2"));
});

test("duplicate ids are replaced with generated ids", () => {
  const api = loadLibraryApi();
  const normalized = api.test.ensureCollectionUniqueness([
    project(),
    project({ name: "別案" })
  ]);

  assert.equal(new Set(normalized.map((item) => item.id)).size, 2);
  assert.ok(normalized.some((item) => item.id.startsWith("generated-")));
});

test("unsupported export versions are rejected", () => {
  const api = loadLibraryApi();
  assert.throws(
    () =>
      api.test.validateExportHeader(
        { format: "prompt-tool-project", version: 2 },
        "prompt-tool-project"
      ),
    /未対応/
  );
});

test("single-project JSON preserves the complete project state", () => {
  const api = loadLibraryApi();
  const original = project({
    state: {
      ...forgeState("complete bottle"),
      title: "Complete project",
      goal: "Campaign",
      imageRefs: "https://example.com/image.png",
      styleRefs: "https://example.com/style.png",
      negativePrompt: "text, watermark"
    }
  });

  const payload = api.test.buildSingleExport(original);
  api.test.validateExportHeader(payload, "prompt-tool-project");
  const restored = api.test.normalizeProjectRecord(payload.project);

  assert.deepEqual(
    JSON.parse(JSON.stringify(restored.state)),
    original.state
  );
});

test("library JSON contains both app types and can be normalized", () => {
  const api = loadLibraryApi();
  const payload = api.test.buildLibraryExport([
    project(),
    project({
      id: "project-2",
      appType: "promptweaver",
      name: "画像案",
      state: promptWeaverState()
    })
  ]);

  api.test.validateExportHeader(payload, "prompt-tool-project-library");
  assert.equal(payload.projects.length, 2);
  assert.deepEqual(
    Array.from(payload.projects, (item) => item.appType).sort(),
    ["forge", "promptweaver"]
  );
});

test("unsupported app states are rejected before import", () => {
  const api = loadLibraryApi();
  assert.throws(
    () =>
      api.test.normalizeProjectRecord(
        project({
          state: {
            preset: "future-preset",
            params: {},
            pieces: [{ name: "被写体" }]
          }
        })
      ),
    /Forge/
  );
  assert.throws(
    () =>
      api.test.normalizeProjectRecord(
        project({
          appType: "promptweaver",
          state: {
            type: "audio",
            items: [{ name: "音" }]
          }
        })
      ),
    /PromptWeaver/
  );
});
