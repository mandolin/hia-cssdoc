import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import cssdocProducer, { cssdocProducerDescriptor } from "../packages/cssdoc-producer/src/index.mjs";
import { CSS_DOC_SOURCE_MAP_CONTRACT_VERSION } from "../packages/css-doc-source-map/src/index.mjs";
import {
  CSSDOC_CONFIG_JSON_SCHEMA,
  CSSDOC_CONFIG_SCHEMA_ID,
  loadCssDocConfig,
  runCssDoc
} from "../packages/cssdoc-runner/src/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("standalone runner handles CSS, PostCSS and design-token inputs", async () => {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), "cssdoc-runner-"));
  try {
    const request = await loadCssDocConfig(path.join(root, "examples/standalone/cssdoc.config.json"));
    assert.equal(CSSDOC_CONFIG_JSON_SCHEMA.$id, CSSDOC_CONFIG_SCHEMA_ID);
    request.outputDirectory = outputDirectory;
    const result = await runCssDoc(request);

    assert.equal(result.status, "success");
    assert.equal(result.artifacts.length, 9);
    assert.deepEqual(new Set(result.artifacts.map((artifact) => artifact.kind)), new Set([
      "cssdoc-extraction",
      "hia-document",
      "doc-source-map"
    ]));

    const manifest = JSON.parse(await readFile(path.join(outputDirectory, "cssdoc.producer-result.json"), "utf8"));
    const tokenArtifactPath = result.artifacts.find((artifact) => artifact.path.includes("design-token") && artifact.kind === "cssdoc-extraction").path;
    const tokenArtifact = JSON.parse(await readFile(path.join(outputDirectory, tokenArtifactPath), "utf8"));
    const docMapPath = result.artifacts.find((artifact) => artifact.kind === "doc-source-map").path;
    const docMap = JSON.parse(await readFile(path.join(outputDirectory, docMapPath), "utf8"));
    assert.equal(manifest.contract, "documentation-producer-result");
    assert.equal(tokenArtifact.metadata.specification, "2025.10");
    assert.ok(tokenArtifact.symbols.some((symbol) => symbol.name === "color" && symbol.metadata.type === "color"));
    assert.ok(tokenArtifact.symbols.some((symbol) => symbol.name === "color.action" && symbol.metadata.type === "color"));
    assert.deepEqual(docMap.pathBases, { artifacts: "outputDirectory", sources: "workspaceRoot" });
    assert.equal(docMap.contractVersion, CSS_DOC_SOURCE_MAP_CONTRACT_VERSION);
    assert.ok(result.artifacts.filter((artifact) => artifact.kind === "doc-source-map")
      .every((artifact) => artifact.contractVersion === docMap.contractVersion));
    assert.ok(docMap.entries.every((entry) => entry.sourceRefs.every((sourceRef) =>
      Object.hasOwn(sourceRef, "range") === Object.hasOwn(sourceRef, "rangeConvention"))));
    assert.equal(docMap.privacy.sourcesContentPolicy, "none");
    assert.equal(JSON.stringify(manifest).includes(outputDirectory), false);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});

test("CSSDoc producer delegates to the standalone runner", async () => {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), "cssdoc-producer-"));
  try {
    const progress = [];
    const result = await cssdocProducer.produce({
      workspaceRoot: path.join(root, "examples/standalone"),
      outputDirectory,
      inputs: [{ kind: "css", path: "src/components.css" }],
      options: { writeResultManifest: false }
    }, {
      reportProgress(value) {
        progress.push(value.phase);
      }
    });

    assert.equal(cssdocProducerDescriptor.contract, "documentation-producer");
    assert.equal(cssdocProducerDescriptor.capabilities.sourceLinkage, true);
    assert.equal(result.status, "success");
    assert.equal(result.artifacts.length, 3);
    assert.deepEqual(progress, ["extract", "complete"]);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});

test("runner rejects unsafe workspace-relative inputs", async () => {
  await assert.rejects(() => runCssDoc({
    workspaceRoot: root,
    outputDirectory: path.join(root, "dist/unsafe-test"),
    inputs: [{ kind: "css", path: "../private.css" }]
  }), /safe relative path/);
});
