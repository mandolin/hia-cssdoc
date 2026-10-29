/**
 * @file CSSDoc declared input and public-failure regression probes.
 * @lang zh-CN 验证已有配置类型、相对来源、公开错误和主SDK身份；不批准自有契约新版本。
 * @lang en Checks declared config types, relative sources, public failures and approved SDK identities without approving new CSSDoc contracts.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { getCssDocSymbolKind } from "../packages/cssdoc-spec/src/index.mjs";
import { normalizeSourcePath } from "../packages/css-parser/src/index.mjs";
import { designTokensToCssExtraction } from "../packages/design-token-bridge/src/index.mjs";
import { createCssDocSourceMapRef, createCssDocumentationSourceMap } from "../packages/css-doc-source-map/src/index.mjs";
import { runCssDoc, loadCssDocConfig } from "../packages/cssdoc-runner/src/index.mjs";
import producer from "../packages/cssdoc-producer/src/index.mjs";

// <lang><zh-CN>定位测试仓及真实CLI；所有写入限于自动清理的临时目录。</zh-CN><en>Locate repository and real CLI; writes stay inside automatically cleaned temporary directories.</en></lang>
const root = fileURLToPath(new URL("../", import.meta.url));
const cli = path.join(root, "packages/cssdoc-runner/src/cli.mjs");
const request = { workspaceRoot: root, outputDirectory: path.join(root, "dist/boundary-unused"), inputs: [{ path: "fixtures/basic.css" }], options: { writeResultManifest: false } };

for (const option of ["emitDocSourceMap", "writeResultManifest"]) {
  for (const value of ["false", 0, null, {}]) {
    test(`declared boolean ${option} refuses ${JSON.stringify(value)}`, async () => {
      await assert.rejects(runCssDoc({ ...request, options: { ...request.options, [option]: value } }), TypeError);
    });
  }
}
for (const language of ["", 1, null]) {
  test(`declared input language refuses ${JSON.stringify(language)}`, async () => {
    await assert.rejects(runCssDoc({ ...request, inputs: [{ path: "fixtures/basic.css", language }] }), TypeError);
  });
}
for (const [label, patch] of [["duplicate profiles", { profileIds: ["cssdoc", "cssdoc"] }], ["null profiles", { profileIds: null }], ["null options", { options: null }], ["null kind", { inputs: [{ path: "fixtures/basic.css", kind: null }] }]]) {
  test(`declared structure refuses ${label}`, async () => {
    await assert.rejects(runCssDoc({ ...request, ...patch }), TypeError);
  });
}
for (const tag of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
  test(`tag registry excludes inherited ${tag}`, () => assert.equal(getCssDocSymbolKind(tag), null));
}
for (const unsafe of ["private-sentinel:source", "C:private-sentinel.css", "../private-sentinel.css", "/private-sentinel.css"]) {
  for (const [name, normalize] of [["parser", normalizeSourcePath], ["token", (value) => designTokensToCssExtraction({}, { path: value })]]) {
    test(`${name} refuses unsafe locator without echo ${unsafe}`, () => {
      assert.throws(() => normalize(unsafe), (error) => error instanceof TypeError && !error.message.includes("private-sentinel"));
    });
  }
}
test("map policy failure does not echo raw value", () => {
  assert.throws(() => createCssDocSourceMapRef({ sourcesContentPolicy: "private-sentinel" }), (error) => error instanceof TypeError && !error.message.includes("private-sentinel"));
});
test("map path failure does not echo raw value", () => {
  const extraction = designTokensToCssExtraction({});
  assert.throws(() => createCssDocumentationSourceMap({ extraction, extractionPath: "../private-sentinel" }), (error) => error instanceof TypeError && !error.message.includes("private-sentinel"));
});
for (const patch of [{ kind: "private-sentinel" }, { "private-sentinel": true }]) {
  test(`runner field failures do not echo ${JSON.stringify(patch)}`, async () => {
    await assert.rejects(runCssDoc({ ...request, inputs: [{ path: "fixtures/basic.css", ...patch }] }), (error) => error instanceof TypeError && !error.message.includes("private-sentinel"));
  });
}
for (const args of [["--private-sentinel"], ["--kind", "private-sentinel", "fixtures/basic.css"], ["--config", "private-sentinel.json"]]) {
  test(`CLI public failure contains no argument/source/stack: ${args[0]}`, () => {
    // <lang><zh-CN>直接执行真实入口，确保parseArgs也在统一公开错误边界内。</zh-CN><en>Execute the real entry so parseArgs is inside the public error boundary too.</en></lang>
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.equal(result.stderr.includes("private-sentinel"), false);
    assert.equal(result.stderr.includes(root), false);
    assert.doesNotMatch(result.stderr, /\n\s+at |node:internal/);
    assert.match(result.stderr, /^CSSDoc failed:/);
  });
}
test("config JSON failure contains no private source", async () => {
  // <lang><zh-CN>无效JSON是真实文件输入，原文不应进入可公开错误。</zh-CN><en>Malformed JSON is real file input whose raw text must not enter public errors.</en></lang>
  const directory = await mkdtemp(path.join(tmpdir(), "cssdoc-boundary-"));
  try {
    await writeFile(path.join(directory, "bad.json"), '{"private-sentinel":broken}');
    await assert.rejects(loadCssDocConfig("bad.json", { cwd: directory }), (error) => !error.message.includes("private-sentinel"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("config read failure does not echo private locator", async () => {
  await assert.rejects(loadCssDocConfig("private-sentinel-missing.json", { cwd: root }), (error) => !error.message.includes("private-sentinel"));
});
test("producer adopts approved 1.0.0 descriptor", () => assert.equal(producer.descriptor.contractVersion, "1.0.0"));
test("runner adopts approved result identity and emits the coordinated CSS extraction", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cssdoc-boundary-"));
  try {
    const result = await producer.produce({ ...request, outputDirectory: directory });
    assert.equal(result.status, "success");
    assert.equal(result.contractVersion, "1.0.0");
    const extraction = JSON.parse(await readFile(path.join(directory, result.artifacts[0].path), "utf8"));
    assert.equal(extraction.contractVersion, "1.0.0");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("boundary changes preserve ordinary relative paths and known tags", () => {
  assert.equal(normalizeSourcePath("src\\button.css"), "src/button.css");
  assert.equal(getCssDocSymbolKind("selector"), "css-selector");
});
test("all eight package tarballs have a local license and explicit source allow-list", async () => {
  for (const name of ["cssdoc-spec", "css-parser", "css-doc-extractor", "css-doc-adapter", "css-doc-source-map", "design-token-bridge", "cssdoc-runner", "cssdoc-producer"]) {
    // <lang><zh-CN>包级内容约束防止仅根许可证掩盖真实分发缺项。</zh-CN><en>Package-local checks prevent root licensing from hiding missing distribution content.</en></lang>
    const directory = path.join(root, "packages", name);
    assert.ok((await readFile(path.join(directory, "LICENSE"), "utf8")).includes("MIT License"));
    const manifest = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
    assert.ok(manifest.files.includes("src"));
    assert.ok(manifest.files.includes("LICENSE"));
  }
});
