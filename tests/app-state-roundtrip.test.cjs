const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createContext() {
  const storage = new Map();
  const dummy = {
    addEventListener() {},
    append() {},
    appendChild() {},
    remove() {},
    replaceChildren() {},
    setAttribute() {},
    querySelector() {
      return dummy;
    },
    querySelectorAll() {
      return [];
    },
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    content: {
      firstElementChild: {
        cloneNode() {
          return dummy;
        }
      }
    },
    style: {},
    dataset: {},
    value: "",
    checked: false,
    textContent: "",
    type: "text"
  };
  const context = {
    console,
    Date,
    Intl,
    JSON,
    Math,
    Number,
    Object,
    Promise,
    RegExp,
    String,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Blob,
    crypto: {
      randomUUID() {
        return `id-${Math.random().toString(16).slice(2)}`;
      }
    },
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      }
    },
    navigator: {},
    document: {
      body: dummy,
      querySelector() {
        return dummy;
      },
      querySelectorAll() {
        return [];
      },
      createElement() {
        return dummy;
      }
    },
    window: {
      location: {
        href: "http://127.0.0.1:8765/index.html",
        search: "",
        protocol: "http:",
        hostname: "127.0.0.1",
        port: "8765",
        pathname: "/index.html"
      },
      history: {
        replaceState() {}
      },
      setTimeout() {
        return 0;
      },
      clearTimeout() {}
    },
    fetch: async () => ({ ok: false }),
    setTimeout() {
      return 0;
    },
    clearTimeout() {}
  };
  context.globalThis = context;
  return context;
}

function executeApp(relativePath, assertions) {
  const filePath = path.join(__dirname, "..", relativePath);
  const source = fs
    .readFileSync(filePath, "utf8")
    .replace("loadServerConfig().finally(initialize);", "");
  const context = createContext();
  vm.runInNewContext(`${source}\n${assertions}`, context, { filename: relativePath });
  return JSON.parse(JSON.stringify(context.result));
}

test("all Forge presets preserve every editable field", () => {
  const result = executeApp(
    "app.js",
    `
      globalThis.result = ["product", "portrait", "scene", "niji"].map((preset, index) => {
        const original = createPresetState(preset);
        original.title = "title-" + preset;
        original.goal = "goal-" + preset;
        original.outputFormat = "markdown";
        original.imageRefs = "https://example.com/image-" + index + ".png";
        original.styleRefs = "https://example.com/style-" + index + ".png";
        original.negativePrompt = "text, watermark, " + preset;
        original.params = {
          ...original.params,
          aspectRatio: index % 2 ? "2:3" : "custom",
          customAspect: index % 2 ? "" : "7:5",
          resolution: "hd",
          stylize: 321 + index,
          chaos: 17 + index,
          weird: 250 + index,
          quality: "2",
          seed: String(100 + index),
          styleWeight: String(400 + index),
          rawMode: index % 2 === 0,
          tileMode: index % 2 === 1,
          publicMode: index % 2 === 0,
          stealthMode: index % 2 === 1
        };
        original.pieces = original.pieces.map((piece, pieceIndex) => ({
          ...piece,
          content: preset + "-content-" + pieceIndex,
          placeholder: preset + "-placeholder-" + pieceIndex,
          enabled: pieceIndex % 2 === 0
        }));
        const restored = normalizeForgeState(JSON.parse(JSON.stringify(original)));
        return {
          preset,
          original,
          restored
        };
      });
    `
  );

  result.forEach(({ original, restored }) => {
    assert.deepEqual(restored, original);
  });
});

test("PromptWeaver image and video states preserve every editable field", () => {
  const result = executeApp(
    "promptweaver/app.js",
    `
      globalThis.result = ["image", "video"].map((type, index) => {
        const original = createTemplateState(type);
        original.title = type + "-project";
        original.outputTone = index ? "production" : "generic";
        original.items = original.items.map((item, itemIndex) => ({
          ...item,
          name: type + "-name-" + itemIndex,
          content: type + "-content-" + itemIndex,
          placeholder: type + "-placeholder-" + itemIndex,
          enabled: itemIndex % 2 === 0
        }));
        const restored = normalizePromptWeaverState(JSON.parse(JSON.stringify(original)));
        return {
          type,
          original,
          restored
        };
      });
    `
  );

  result.forEach(({ original, restored }) => {
    assert.deepEqual(restored, original);
  });
});
