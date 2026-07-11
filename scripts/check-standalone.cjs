const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "examples", "standalone", "dist", "cssdoc");
const manifestPath = path.join(output, "cssdoc.producer-result.json");

if (!fs.existsSync(manifestPath)) {
  console.error("Missing CSSDoc standalone result manifest.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
let failed = false;

if (manifest.contract !== "documentation-producer-result" || manifest.status !== "success") {
  console.error("Invalid CSSDoc standalone result contract or status.");
  failed = true;
}
if (manifest.artifacts?.length !== 9) {
  console.error(`Expected 9 CSSDoc artifacts, got ${manifest.artifacts?.length ?? 0}.`);
  failed = true;
}

for (const artifact of manifest.artifacts ?? []) {
  const artifactPath = path.join(output, artifact.path);
  if (!fs.existsSync(artifactPath)) {
    console.error(`Missing CSSDoc standalone artifact: ${artifact.path}`);
    failed = true;
  }
}

const serialized = listFiles(output)
  .map((filePath) => fs.readFileSync(filePath, "utf8"))
  .join("\n");
for (const marker of ["K:\\Project", "Github_mandolin", "HIA-Documentation-Sys"]) {
  if (serialized.includes(marker)) {
    console.error(`Local path leakage in CSSDoc standalone output: ${marker}`);
    failed = true;
  }
}
if (serialized.includes('"sourcesContent"')) {
  console.error("CSSDoc standalone output embeds sourcesContent by default.");
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("CSSDoc standalone example check passed: 3 inputs, 9 artifacts.");

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}
