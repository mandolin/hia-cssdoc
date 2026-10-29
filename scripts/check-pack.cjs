const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
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
    for (const requiredPath of ["LICENSE", "README.md", "package.json", "src/index.mjs"]) {
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
  // <lang><zh-CN>适配器精度、输入所有权与迁移责任必须随实际包提供，不能只留在仓库根。</zh-CN><en>Adapter precision, input ownership and migration responsibilities must ship in its package, not only at the repository root.</en></lang>
  if (packageJson.name === "@hia-doc/css-doc-adapter") {
    for (const document of ["API.md", "MIGRATION.md"]) {
      if (!packedPaths.has(document)) {
        console.error(`Missing ${document} in CSS Doc Adapter pack dry-run.`);
        failed = true;
      }
    }
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
