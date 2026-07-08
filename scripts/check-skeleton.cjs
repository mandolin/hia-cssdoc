const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const requiredPaths = [
  "README.md",
  "CHANGELOG.md",
  "RELEASE_CHECKLIST.md",
  "THIRD_PARTY_NOTICES.md",
  "LICENSE",
  "package.json",
  "pnpm-workspace.yaml",
  "examples/basic/README.md",
  "fixtures/README.md",
  "test/README.md",
  "packages/cssdoc-spec/package.json",
  "packages/css-parser/package.json",
  "packages/css-doc-extractor/package.json",
  "packages/css-doc-adapter/package.json",
  "packages/css-doc-source-map/package.json",
  "packages/design-token-bridge/package.json"
];

let failed = false;

for (const relativePath of requiredPaths) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required skeleton path: ${relativePath}`);
    failed = true;
  }
}

const rootPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (rootPackage.private !== true) {
  console.error("Root package must stay private until CSSDoc package names are finalized.");
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("CSSDoc skeleton check passed.");
