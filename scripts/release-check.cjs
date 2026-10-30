/**
 * @file CSS八包源码候选检查，不把本地资格当作registry发布许可。
 * @lang en Checks eight CSS source candidates without treating local qualification as registry publication approval.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
/** @lang zh-CN 发行顺序按实际内部依赖拓扑固定。 @lang en Publication order follows the fixed actual dependency topology. */
const names = ["cssdoc-spec", "css-parser", "css-doc-source-map", "css-doc-extractor", "css-doc-adapter", "design-token-bridge", "cssdoc-runner", "cssdoc-producer"];
/** @lang zh-CN 实际源码的12条第一方依赖，防止全量workspace/consumer安装掩盖漏声明或误依赖。 @lang en Twelve actual source dependencies prevent full-workspace/consumer installs from masking missing or incorrect declarations. */
const dependencies = {
  "cssdoc-spec": [], "css-parser": [], "css-doc-source-map": ["cssdoc-spec"],
  "css-doc-extractor": ["css-doc-source-map", "css-parser", "cssdoc-spec"],
  "css-doc-adapter": ["cssdoc-spec"], "design-token-bridge": ["cssdoc-spec"],
  "cssdoc-runner": ["css-doc-adapter", "css-doc-extractor", "css-doc-source-map", "cssdoc-spec", "design-token-bridge"],
  "cssdoc-producer": ["cssdoc-runner"]
};

/**
 * @param {string} root <lang><zh-CN>内部工具固定的仓根。</zh-CN><en>Repository root fixed by internal tooling.</en></lang>
 * @returns {object} <lang><zh-CN>独立解析的清单、包元数据、根与冻结锁；仅读本仓文件。</zh-CN><en>Independently parsed inventory, manifests, root and lock; reads repository files only.</en></lang>
 * @throws {Error} <lang><zh-CN>缺失或非JSON文件失败，无网络访问。</zh-CN><en>Missing/invalid JSON fails without network access.</en></lang>
 */
function readCandidateContext(root) {
  // <lang><zh-CN>唯一清单绑定实际manifest，不在测试里改写分发内容。</zh-CN><en>The sole inventory binds actual manifests without tests rewriting distributions.</en></lang>
  const inventory = JSON.parse(fs.readFileSync(path.join(root, "release/public-packages.json"), "utf8"));
  return {
    inventory,
    packages: inventory.packages.map((item) => ({ ...item, manifest: JSON.parse(fs.readFileSync(path.join(root, item.directory, "package.json"), "utf8")) })),
    rootPackage: JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")),
    lock: JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"))
  };
}

/**
 * @param {object} context <lang><zh-CN>已物化快照；内部反例可复制后修改。</zh-CN><en>Materialized snapshot; internal negative cases may modify a copy.</en></lang>
 * @returns {void} <lang><zh-CN>一致时无值；纯检查，不修改快照。</zh-CN><en>No value when consistent; pure check without mutation.</en></lang>
 * @throws {import('node:assert').AssertionError} <lang><zh-CN>身份、顺序、依赖或许可/分发元数据漂移失败。</zh-CN><en>Fails on identity, order, dependency or license/distribution metadata drift.</en></lang>
 */
function checkCandidateMetadata(context) {
  // <lang><zh-CN>读取同一快照，不碰磁盘/registry或凭据。</zh-CN><en>Read one snapshot without touching disk, registry or credentials.</en></lang>
  const { inventory, packages, rootPackage, lock } = context;
  assert.equal(inventory.schemaVersion, "1.0.0");
  assert.equal(inventory.candidateVersion, "1.0.0");
  assert.equal(inventory.releaseStatus, "local-release-candidate");
  assert.equal(inventory.provenanceRequired, true);
  assert.equal(inventory.firstPublication, "separate-approval-and-registry-verification-required");
  assert.equal(inventory.registry, "https://registry.npmjs.org/");
  assert.equal(rootPackage.private, true);
  assert.equal(rootPackage.version, "1.0.0");
  assert.equal(lock.packages[""].version, "1.0.0");
  assert.deepEqual(packages.map((item) => item.name), names.map((name) => `@hia-doc/${name}`));
  // <lang><zh-CN>拓扑表核每条永久依赖，workspace链接不能掩盖错误版本。</zh-CN><en>The topology checks every permanent dependency; workspace links cannot mask wrong versions.</en></lang>
  const order = new Map(packages.map((item) => [item.name, item.order]));
  for (const item of packages) {
    // <lang><zh-CN>清单身份配对实际源码manifest与冻结锁。</zh-CN><en>Pair inventory identities with actual source manifests and frozen lock entries.</en></lang>
    const manifest = item.manifest;
    const locked = lock.packages[item.directory];
    assert.equal(item.directory, `packages/${item.name.slice("@hia-doc/".length)}`);
    assert.equal(item.status, "local-release-candidate");
    assert.equal(manifest.name, item.name);
    assert.equal(manifest.version, "1.0.0");
    assert.equal(locked.version, "1.0.0");
    assert.equal(manifest.private, undefined);
    assert.equal(manifest.license, "MIT");
    assert.equal(manifest.engines.node, "^22.23.4 || ^24.22.1");
    assert.equal(locked.engines.node, manifest.engines.node);
    assert.equal(manifest.publishConfig.access, "public");
    assert.equal(manifest.publishConfig.registry, inventory.registry);
    assert.equal(manifest.repository.url, "git+https://github.com/mandolin/hia-cssdoc.git");
    assert.equal(manifest.repository.directory, item.directory);
    assert.equal(manifest.bugs.url, "https://github.com/mandolin/hia-cssdoc/issues");
    assert.equal(manifest.homepage, `https://github.com/mandolin/hia-cssdoc/tree/main/${item.directory}`);
    assert.deepEqual(manifest.files, ["src", "README.md", "API.md", "MIGRATION.md", "LICENSE"]);
    assert.equal(manifest.exports["."], "./src/index.mjs");
    assert.deepEqual(Object.keys(manifest.dependencies ?? {}).filter((name) => name.startsWith("@hia-doc/")).sort(), dependencies[item.name.slice("@hia-doc/".length)].map((name) => `@hia-doc/${name}`).sort());
    for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
      if (!dependency.startsWith("@hia-doc/")) continue;
      assert.ok(order.has(dependency), "Unlisted first-party dependency");
      assert.equal(version, "1.0.0");
      assert.equal(locked.dependencies[dependency], version);
      assert.ok(order.get(dependency) < item.order, "Dependencies must precede consumers");
    }
  }
}

/**
 * @returns {void} <lang><zh-CN>检查本地材料，不执行npm、读登录或发布。</zh-CN><en>Checks local materials without executing npm, reading login state or publishing.</en></lang>
 * @throws {Error} <lang><zh-CN>候选漂移/材料缺失或请求发布就绪时失败。</zh-CN><en>Fails on drift, missing materials or a publication-readiness request.</en></lang>
 */
function main() {
  // <lang><zh-CN>固定本仓位置，发布开关不会执行外部命令。</zh-CN><en>Fix repository locations; publication flags never execute external commands.</en></lang>
  const root = path.resolve(__dirname, "..");
  const context = readCandidateContext(root);
  checkCandidateMetadata(context);
  for (const file of ["README.md", "CHANGELOG.md", "MIGRATION.md", "RELEASE_CHECKLIST.md", "THIRD_PARTY_NOTICES.md", "LICENSE", "release/README.md"]) assert.ok(fs.readFileSync(path.join(root, file), "utf8").trim());
  for (const item of context.packages) {
    for (const file of ["README.md", "API.md", "MIGRATION.md", "LICENSE", "src/index.mjs"]) assert.ok(fs.readFileSync(path.join(root, item.directory, file), "utf8").trim());
  }
  // <lang><zh-CN>沿用既有私有/安装目录排除约束。</zh-CN><en>Retain existing private/install-directory exclusions.</en></lang>
  const npmIgnore = fs.readFileSync(path.join(root, ".npmignore"), "utf8");
  for (const pattern of ["node_modules/", "packages/*/node_modules/", "*.tgz"]) assert.ok(npmIgnore.includes(pattern));
  if (process.argv.includes("--publish-ready")) throw new Error("CSSDoc registry publication is not enabled by this source candidate.");
  assert.equal(process.argv.length, 2, "Unknown release check option");
  console.log("CSSDoc release candidate check passed: 8 packages at 1.0.0; local-release-candidate; registry publication not enabled.");
}

// <lang><zh-CN>仅内部工具导出供反例，不增加任何包公开exports。</zh-CN><en>Export only internal tooling checks for negative cases, adding no package public exports.</en></lang>
module.exports = { readCandidateContext, checkCandidateMetadata };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
