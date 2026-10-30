/**
 * @file 八包1.0.0来源、公开责任与本地候选门禁，不执行发布。
 * @lang en Checks eight-package 1.0.0 provenance, public responsibilities and local candidate guards without publishing.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { extractCssDoc } from "../packages/css-doc-extractor/src/index.mjs";
import { designTokensToCssExtraction } from "../packages/design-token-bridge/src/index.mjs";
import { createCssDocumentationSourceMap } from "../packages/css-doc-source-map/src/index.mjs";
import { cssdocProducerDescriptor } from "../packages/cssdoc-producer/src/index.mjs";
import { CSSDOC_RUNNER_VERSION } from "../packages/cssdoc-runner/src/index.mjs";

// <lang><zh-CN>仅本仓八个既有owner；目录不从外部输入或未确认清单发现。</zh-CN><en>Only this repository's eight existing owners; directories never come from external input or an unconfirmed inventory.</en></lang>
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const names = ["cssdoc-spec", "css-parser", "css-doc-source-map", "css-doc-extractor", "css-doc-adapter", "design-token-bridge", "cssdoc-runner", "cssdoc-producer"];
const require = createRequire(import.meta.url);
for (const name of names) {
  test(`source candidate metadata: ${name}`, () => {
    // <lang><zh-CN>读真实manifest而非在断言中临时重写版本/private。</zh-CN><en>Read the actual manifest rather than rewriting version/private for assertions.</en></lang>
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "packages", name, "package.json"), "utf8"));
    assert.equal(manifest.version, "1.0.0");
    assert.equal(manifest.private, undefined);
    assert.equal(manifest.publishConfig?.access, "public");
    for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
      if (dependency.startsWith("@hia-doc/")) assert.equal(version, "1.0.0");
    }
  });
  test(`packaged responsibility documents: ${name}`, () => {
    // <lang><zh-CN>实际文件与files白名单都须具备，不能只存在于根README。</zh-CN><en>Actual files and the files allowlist must both exist; a root README alone is insufficient.</en></lang>
    const directory = path.join(root, "packages", name);
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
    for (const file of ["API.md", "MIGRATION.md"]) {
      assert.ok(manifest.files.includes(file));
      assert.ok(fs.readFileSync(path.join(directory, file), "utf8").trim());
    }
  });
}

test("all current runtime producer versions match package candidates", () => {
  // <lang><zh-CN>真实CSS、令牌、map与runner/descriptor分别核，wire身份与包版本独立。</zh-CN><en>Check real CSS, tokens, map and runner/descriptor separately; wire identity remains independent of package version.</en></lang>
  const extraction = extractCssDoc("/** @component Probe */.probe{}", { path: "probe.css" });
  const tokens = designTokensToCssExtraction({ color: { $type: "color", $value: "#123456" } });
  for (const version of [extraction.producer.version, tokens.producer.version, createCssDocumentationSourceMap({ extraction }).producer.version, CSSDOC_RUNNER_VERSION, cssdocProducerDescriptor.version]) assert.equal(version, "1.0.0");
  assert.equal(extraction.contractVersion, "1.0.0");
  assert.equal(createCssDocumentationSourceMap({ extraction }).contractVersion, "1.1.0");
});

for (const drift of ["none", "version", "private", "dependency", "order", "status", "missingDependency", "wrongDependency"]) {
  test(`candidate metadata drift: ${drift}`, () => {
    // <lang><zh-CN>私有发行工具暴露纯检查供反例使用，不在测试中改真实仓文件。</zh-CN><en>The internal release tool exposes a pure check for negative cases; tests never alter actual repository files.</en></lang>
    const checker = path.join(root, "scripts/release-check.cjs");
    const { checkCandidateMetadata, readCandidateContext } = require(checker);
    assert.equal(typeof checkCandidateMetadata, "function");
    const context = structuredClone(readCandidateContext(root));
    if (drift === "version") context.packages[0].manifest.version = "0.0.0";
    if (drift === "private") context.packages[0].manifest.private = true;
    if (drift === "dependency") context.packages.at(-1).manifest.dependencies["@hia-doc/cssdoc-runner"] = "0.0.0";
    if (drift === "order") context.packages.at(-1).order = 1;
    if (drift === "status") context.inventory.releaseStatus = "published";
    if (drift === "missingDependency" || drift === "wrongDependency") delete context.packages.at(-1).manifest.dependencies["@hia-doc/cssdoc-runner"];
    if (drift === "wrongDependency") context.packages.at(-1).manifest.dependencies["@hia-doc/cssdoc-spec"] = "1.0.0";
    if (drift === "none") assert.doesNotThrow(() => checkCandidateMetadata(context));
    else assert.throws(() => checkCandidateMetadata(context));
  });
}

test("actual public API documentation gate covers all entries", () => {
  // <lang><zh-CN>运行实际门禁；其计数来自动态导出、四JSON和一个bin。</zh-CN><en>Run the actual gate; its counts come from dynamic exports, four JSON resources and one bin.</en></lang>
  const result = spawnSync(process.execPath, [path.join(root, "scripts/check-api-docs.mjs")], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /46 exports, 4 resources, 1 bins/);
});

test("local candidate explicitly refuses publish-ready without contacting npm", () => {
  // <lang><zh-CN>纯本地拒绝不因版本已为1.0.0而放行实际发布；不提供凭据。</zh-CN><en>Local refusal never enables publication merely because versions are 1.0.0; no credentials are supplied.</en></lang>
  const result = spawnSync(process.execPath, [path.join(root, "scripts/release-check.cjs"), "--publish-ready"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not enabled/);
});

test("distinct case-sensitive token names retain unique local symbol and map ids", () => {
  // <lang><zh-CN>实际合法名称在slug后冲突；复用CSS现有局部后缀分配规则，不能丢掉第二个令牌。</zh-CN><en>Actual valid names collide after slugging; reuse existing CSS local suffix allocation without losing later tokens.</en></lang>
  const tokens = { Color: { $type: "color", $value: "#111111" }, color: { $type: "color", $value: "#222222" }, "color-2": { $type: "color", $value: "#333333" } };
  const before = structuredClone(tokens);
  const extraction = designTokensToCssExtraction(tokens);
  assert.deepEqual(extraction.symbols.map((symbol) => symbol.name), Object.keys(tokens));
  assert.deepEqual(extraction.symbols.map((symbol) => symbol.id), ["token:color", "token:color-2", "token:color-2-2"]);
  assert.equal(new Set(createCssDocumentationSourceMap({ extraction }).entries.map((entry) => entry.id)).size, 3);
  assert.deepEqual(tokens, before);
});
