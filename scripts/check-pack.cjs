const { spawnSync } = require("node:child_process");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
// <lang><zh-CN>随包CLI参考须保留全部选项和模式/安装路由，语义由独立实际命令验证。</zh-CN><en>The packaged CLI reference retains every option and mode/installation routes; independent command runs verify semantics.</en></lang>
const runnerReadme = fs.readFileSync(path.join(root, "packages/cssdoc-runner/README.md"), "utf8");
for (const token of ["## Command reference", "### Config and direct modes", "### Installation and version routing", "--config/-c", "--workspace-root", "--kind/-k", "--out-dir/-o", "--sources-content-policy", "--no-doc-source-map", "--help/-h", "--version/-v"]) {
  assert.ok(runnerReadme.includes(token), `Runner documentation is missing ${token}.`);
}
const packageRoots = fs.readdirSync(path.join(root, "packages"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(root, "packages", entry.name))
  .filter((directory) => fs.existsSync(path.join(directory, "package.json")));
const npmCli = process.env.npm_execpath;
const npmArgs = ["pack", "--dry-run", "--json"];
const command = npmCli
  ? process.execPath
  : process.platform === "win32"
    ? process.env.ComSpec || "cmd.exe"
    : "npm";
const args = npmCli
  ? [npmCli, ...npmArgs]
  : process.platform === "win32"
    ? ["/d", "/s", "/c", `npm ${npmArgs.join(" ")}`]
    : npmArgs;
let failed = false;

for (const packageRoot of packageRoots) {
  const result = spawnSync(command, args, {
    cwd: packageRoot,
    encoding: "utf8"
  });
  if (result.error || result.status !== 0) {
    process.stderr.write(result.error?.message || result.stderr || result.stdout || "npm pack failed.\n");
    failed = true;
    continue;
  }
  const [pack] = JSON.parse(result.stdout);
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  const packedPaths = new Set((pack.files || []).map((file) => file.path.replaceAll("\\", "/")));
  for (const file of pack.files || []) {
    const filePath = file.path.replaceAll("\\", "/");
    if (filePath.includes("/node_modules/") || filePath.startsWith("node_modules/") || filePath.endsWith(".tgz")) {
      console.error(`Unsafe file in CSSDoc pack dry-run: ${file.path}`);
      failed = true;
    }
  }
  // <lang><zh-CN>八包均须实际包含许可与入口，不只检查两个runner包。</zh-CN><en>All eight packages must carry licenses and entries, not just the two runner packages.</en></lang>
  {
    for (const requiredPath of ["LICENSE", "README.md", "API.md", "MIGRATION.md", "package.json", "src/index.mjs"]) {
      if (!packedPaths.has(requiredPath)) {
        console.error(`Missing ${requiredPath} in ${packageJson.name} pack dry-run.`);
        failed = true;
      }
    }
  }
  if (packageJson.name === "@hia-doc/cssdoc-runner" && !packedPaths.has("src/cli.mjs")) {
    console.error("Missing src/cli.mjs in @hia-doc/cssdoc-runner pack dry-run.");
    failed = true;
  }
  // <lang><zh-CN>包声明的四JSON入口必须实际随包，根对象不能掩盖资源缺失。</zh-CN><en>The four declared JSON entries must ship; root schema objects cannot hide missing resources.</en></lang>
  for (const [entry, target] of Object.entries(packageJson.exports ?? {})) {
    if (entry.endsWith(".schema.json") && !packedPaths.has(target.replace(/^\.\//, ""))) {
      console.error(`Missing declared schema resource in ${packageJson.name}.`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(`CSSDoc pack check passed: ${packageRoots.length} workspace packages.`);
