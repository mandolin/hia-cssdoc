import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { cssExtractionToHiaDocument } from "../packages/css-doc-adapter/src/index.mjs";
import { extractCssDoc } from "../packages/css-doc-extractor/src/index.mjs";
import { parseCss } from "../packages/css-parser/src/index.mjs";
import {
  CSSDOC_EXTRACTION_CONTRACT,
  CSSDOC_EXTRACTION_CONTRACT_VERSION,
  CSSDOC_EXTRACTION_JSON_SCHEMA,
  CSSDOC_EXTRACTION_SCHEMA_ID
} from "../packages/cssdoc-spec/src/index.mjs";
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

test("cssdoc spec exports the extraction JSON Schema contract", () => {
  assert.equal(CSSDOC_EXTRACTION_JSON_SCHEMA.$id, CSSDOC_EXTRACTION_SCHEMA_ID);
  assert.equal(CSSDOC_EXTRACTION_JSON_SCHEMA.properties.contract.const, CSSDOC_EXTRACTION_CONTRACT);
  assert.equal(CSSDOC_EXTRACTION_JSON_SCHEMA.properties.contractVersion.const, CSSDOC_EXTRACTION_CONTRACT_VERSION);
  assert.ok(CSSDOC_EXTRACTION_JSON_SCHEMA.required.includes("symbols"));
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

test("design token bridge supports DTCG 2025.10 root tokens and inherited types", () => {
  const artifact = designTokensToCssExtraction({
    $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
    color: {
      $type: "color",
      $root: { $value: "#0f172a" },
      action: { $value: "#0369a1" }
    }
  });

  assert.equal(artifact.metadata.specification, "2025.10");
  assert.deepEqual(artifact.symbols.map((symbol) => symbol.name), ["color", "color.action"]);
  assert.ok(artifact.symbols.every((symbol) => symbol.metadata.type === "color"));

  const rootArtifact = designTokensToCssExtraction({
    $type: "dimension",
    $root: { $value: { value: 4, unit: "px" } }
  });
  assert.equal(rootArtifact.symbols[0].name, "root");
  assert.equal(rootArtifact.symbols[0].metadata.type, "dimension");
});
