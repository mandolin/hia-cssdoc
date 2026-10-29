/**
 * @file Exact CSS contract coordination regression tests.
 * @lang zh-CN 验证确认B的新旧身份、纯迁移和实际writer-reader；不扩大CSS语法。
 * @lang en Tests confirmed B identities, pure migration and real writers/readers without expanding CSS syntax.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as spec from "../packages/cssdoc-spec/src/index.mjs";
import * as runner from "../packages/cssdoc-runner/src/index.mjs";
import { extractCssDoc } from "../packages/css-doc-extractor/src/index.mjs";
import { cssExtractionToHiaDocument } from "../packages/css-doc-adapter/src/index.mjs";
import { createCssDocumentationSourceMap } from "../packages/css-doc-source-map/src/index.mjs";
import { designTokensToCssExtraction } from "../packages/design-token-bridge/src/index.mjs";

// <lang><zh-CN>普通JSON副本代表落盘工件；仅fixture准备可序列化，迁移本身不得丢字段。</zh-CN><en>A JSON copy represents a persisted artifact; only fixture preparation serializes, never the migration under test.</en></lang>
const source = "/** @component Card */\n.card { color: red; }";
const legacy = JSON.parse(JSON.stringify(extractCssDoc(source, { path: "card.css" })));
legacy.contractVersion = "0.1.0-draft";
legacy.profile.version = "0.1.0-draft";
legacy.metadata.extension = { text: "扩展", list: [null, 2, false], __marker: "preserved" };

test("new extraction/config/profile identities are 1.0.0", () => {
  assert.equal(spec.CSSDOC_EXTRACTION_CONTRACT_VERSION, "1.0.0");
  assert.equal(spec.CSSDOC_PROFILE_VERSION, "1.0.0");
  assert.equal(runner.CSSDOC_CONFIG_SCHEMA_VERSION, "1.0.0");
});
test("new config required list matches actual directory/kind defaults", () => {
  assert.deepEqual(runner.CSSDOC_CONFIG_JSON_SCHEMA.required, ["schemaVersion", "inputs"]);
  assert.deepEqual(runner.CSSDOC_CONFIG_JSON_SCHEMA.properties.inputs.items.required, ["path"]);
});
test("old schema selectors retain exact historical identities and required list", () => {
  assert.deepEqual(runner.getCssDocConfigSchema("0.1.0-draft").required, ["schemaVersion", "workspaceRoot", "outputDirectory", "inputs"]);
  assert.equal(spec.getCssDocExtractionSchema("0.1.0-draft").properties.contractVersion.const, "0.1.0-draft");
  assert.equal(spec.getCssDocExtractionSchema("9.0.0"), undefined);
  assert.equal(runner.getCssDocConfigSchema("9.0.0"), undefined);
});
test("legacy JSON extraction remains readable without relabeling", () => {
  const before = structuredClone(legacy);
  assert.deepEqual(spec.validateCssDocExtraction(legacy), []);
  assert.equal(cssExtractionToHiaDocument(legacy).metadata.sourceContractVersion, "0.1.0-draft");
  assert.deepEqual(legacy, before);
});
test("pure extraction migration preserves extensions and input ownership", () => {
  const before = structuredClone(legacy);
  const migrated = spec.migrateCssDocExtraction(legacy);
  const expected = structuredClone(legacy);
  expected.contractVersion = "1.0.0";
  expected.profile.version = "1.0.0";
  assert.deepEqual(migrated, expected);
  assert.notEqual(migrated.metadata.extension, legacy.metadata.extension);
  assert.deepEqual(spec.validateCssDocExtraction(migrated), []);
  assert.deepEqual(legacy, before);
});
for (const patch of [{ contractVersion: "1.2.0" }, { contractVersion: undefined }, { profile: { name: "cssdoc", version: "9.0.0" } }, { symbols: [{ id: "incomplete" }] }]) {
  test(`reader/map refuse unsupported extraction ${JSON.stringify(patch)}`, () => {
    const value = { ...legacy, ...patch };
    assert.ok(spec.validateCssDocExtraction(value).length);
    assert.throws(() => cssExtractionToHiaDocument(value), TypeError);
    assert.throws(() => createCssDocumentationSourceMap({ extraction: value }), TypeError);
  });
}
for (const field of ["summary", "parentId"]) {
  test(`new extraction does not broaden ${field} to null`, () => {
    const value = spec.migrateCssDocExtraction(legacy);
    value.symbols[0][field] = null;
    assert.ok(spec.validateCssDocExtraction(value).length);
  });
}
test("invalid public path is rejected without echoing caller text", () => {
  const value = structuredClone(legacy);
  value.source.path = "private-sentinel:outside";
  assert.throws(() => spec.migrateCssDocExtraction(value), (error) => error instanceof TypeError && !error.message.includes("private-sentinel"));
});
for (const value of [undefined, new Date(), NaN, 1n, () => {}]) {
  test(`migration refuses non-JSON extension ${typeof value}`, () => {
    const input = structuredClone(legacy);
    input.metadata.nonJson = value;
    assert.throws(() => spec.migrateCssDocExtraction(input), TypeError);
  });
}
test("migration never invokes caller accessors", () => {
  let calls = 0;
  const input = structuredClone(legacy);
  Object.defineProperty(input.metadata, "private-sentinel", { enumerable: true, get() { calls++; throw new Error("private-sentinel"); } });
  assert.throws(() => spec.migrateCssDocExtraction(input), TypeError);
  assert.equal(calls, 0);
});
test("CSS and DTCG current writer objects validate directly before serialization", () => {
  for (const value of [extractCssDoc(source), designTokensToCssExtraction({ color: { $type: "color", action: { $value: "#112233" } } })]) {
    assert.equal(value.contractVersion, "1.0.0");
    assert.equal(value.profile.version, "1.0.0");
    assert.deepEqual(spec.validateCssDocExtraction(value), []);
    assert.ok(cssExtractionToHiaDocument(value).symbols.length);
  }
});
test("current and legacy rule maps retain measured inclusive UTF-16 semantics", () => {
  for (const value of [legacy, spec.migrateCssDocExtraction(legacy)]) {
    const map = createCssDocumentationSourceMap({ extraction: value });
    assert.equal(map.contractVersion, "1.1.0");
    assert.deepEqual(map.entries[0].sourceRefs[0].rangeConvention, { endBoundary: "inclusive", columnUnit: "utf16-code-unit" });
  }
});
test("synthetic token source precision stays unknown", () => {
  const map = createCssDocumentationSourceMap({ extraction: designTokensToCssExtraction({ token: { $value: 3 } }) });
  assert.deepEqual(map.entries[0].sourceRefs[0].rangeConvention, { endBoundary: "unknown", columnUnit: "unknown" });
});
test("config migration preserves historical omissions and exact schema URL pairing", () => {
  const old = { schemaVersion: "0.1.0-draft", $schema: runner.CSSDOC_LEGACY_CONFIG_SCHEMA_ID, inputs: [{ path: "theme.tokens.json" }] };
  const before = structuredClone(old);
  const migrated = runner.migrateCssDocConfig(old);
  assert.deepEqual(migrated, { ...before, schemaVersion: "1.0.0", $schema: runner.CSSDOC_CONFIG_SCHEMA_ID });
  assert.deepEqual(old, before);
  assert.equal(Object.hasOwn(migrated, "workspaceRoot"), false);
});
test("loader accepts exact old/current defaults and refuses mismatched identities", async () => {
  // <lang><zh-CN>真实配置文件只放入本测试拥有的临时目录，最终清理。</zh-CN><en>Real configs stay inside a temporary directory owned and cleaned by this test.</en></lang>
  const directory = await mkdtemp(path.join(tmpdir(), "cssdoc-contract-"));
  try {
    for (const version of ["0.1.0-draft", "1.0.0"]) {
      await writeFile(path.join(directory, "config.json"), JSON.stringify({ schemaVersion: version, inputs: [{ path: "theme.tokens.json" }] }));
      const loaded = await runner.loadCssDocConfig("config.json", { cwd: directory });
      assert.equal(loaded.workspaceRoot, directory);
      assert.equal(loaded.inputs[0].kind, "design-token");
      assert.equal(loaded.outputDirectory, path.join(directory, "dist/cssdoc"));
    }
    await writeFile(path.join(directory, "config.json"), JSON.stringify({ schemaVersion: "1.0.0", $schema: runner.CSSDOC_LEGACY_CONFIG_SCHEMA_ID, inputs: [{ path: "x.css" }] }));
    await assert.rejects(runner.loadCssDocConfig("config.json", { cwd: directory }), TypeError);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("current-version migration is refused instead of silently becoming identity copy", () => {
  assert.throws(() => spec.migrateCssDocExtraction(spec.migrateCssDocExtraction(legacy)), TypeError);
  assert.throws(() => runner.migrateCssDocConfig({ schemaVersion: "1.0.0", inputs: [{ path: "x.css" }] }), TypeError);
});
test("four actual JSON schema package subpaths match their exact selector objects", async () => {
  for (const version of ["0.1.0-draft", "1.0.0"]) {
    // <lang><zh-CN>真实包exports解析，而非直接读未公开的源码文件。</zh-CN><en>Resolve actual package exports rather than reading unexported source files.</en></lang>
    const extraction = await import(`@hia-doc/cssdoc-spec/schemas/hia-cssdoc-extraction-${version}.schema.json`, { with: { type: "json" } });
    const config = await import(`@hia-doc/cssdoc-runner/schemas/cssdoc-config-${version}.schema.json`, { with: { type: "json" } });
    assert.deepEqual(extraction.default, spec.getCssDocExtractionSchema(version));
    assert.deepEqual(config.default, runner.getCssDocConfigSchema(version));
    assert.equal(spec.getCssDocExtractionSchema(extraction.default.$id), spec.getCssDocExtractionSchema(version));
    assert.equal(runner.getCssDocConfigSchema(config.default.$id), runner.getCssDocConfigSchema(version));
  }
});
