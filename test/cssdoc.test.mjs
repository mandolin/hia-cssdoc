import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { cssExtractionToHiaDocument } from "../packages/css-doc-adapter/src/index.mjs";
import { extractCssDoc } from "../packages/css-doc-extractor/src/index.mjs";
import { parseCss } from "../packages/css-parser/src/index.mjs";
import { designTokensToCssExtraction } from "../packages/design-token-bridge/src/index.mjs";

const fixture = await readFile(new URL("../fixtures/basic.css", import.meta.url), "utf8");

test("parseCss wraps PostCSS with source locations", () => {
  const parsed = parseCss(fixture, { path: "fixtures/basic.css" });
  assert.equal(parsed.parser.name, "postcss");
  assert.equal(parsed.source.path, "fixtures/basic.css");
  assert.equal(parsed.root.nodes.length, 1);
});

test("extractCssDoc maps explicit CSSDoc annotations to symbols", () => {
  const artifact = extractCssDoc(fixture, { path: "fixtures/basic.css" });
  const kinds = artifact.symbols.map((symbol) => symbol.kind);

  assert.equal(artifact.contract, "hia-cssdoc-extraction");
  assert.ok(kinds.includes("css-component-style"));
  assert.ok(kinds.includes("css-selector"));
  assert.ok(kinds.includes("css-modifier"));
  assert.ok(kinds.includes("css-custom-property"));
  assert.ok(kinds.includes("css-layer"));
  assert.ok(kinds.includes("design-token"));
  assert.equal(artifact.source.sourcesContent, undefined);
});

test("cssExtractionToHiaDocument emits a core document compatible shape", () => {
  const artifact = extractCssDoc(fixture, { path: "fixtures/basic.css" });
  const document = cssExtractionToHiaDocument(artifact, { title: "Alert CSS" });

  assert.equal(document.schemaVersion, "0.2.0");
  assert.equal(document.title, "Alert CSS");
  assert.ok(document.symbols.some((symbol) => symbol.kind === "css-selector"));
  assert.equal(document.symbols[0].source.model, "hia-source");
  assert.equal(document.symbols[0].source.definedIn.relativePath, "fixtures/basic.css");
});

test("designTokensToCssExtraction maps DTCG-style token objects", () => {
  const artifact = designTokensToCssExtraction({
    color: {
      alert: {
        text: {
          $type: "color",
          $value: "#164e63",
          $description: "Alert text color."
        }
      }
    }
  });

  assert.equal(artifact.contract, "hia-cssdoc-extraction");
  assert.equal(artifact.symbols[0].kind, "design-token");
  assert.equal(artifact.symbols[0].name, "color.alert.text");
});
