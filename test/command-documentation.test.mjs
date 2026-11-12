/**
 * @file
 * @lang zh-CN CSSDoc命令描述、实际解析声明及已确认帮助的采用回归。
 * @lang en Adoption regressions for CSSDoc command descriptions, actual parser declarations and confirmed help.
 */
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  mkdtemp,
  writeFile,
  mkdir,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import os from "node:os";
import { createCssDocCommandContent } from "../packages/cssdoc-runner/src/command-content.mjs";
import {
  observeCssDocOptions,
  checkCommandDocumentation,
  buildCommandDocumentation,
} from "../scripts/command-documentation.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = path.join(root, "packages/cssdoc-runner/src/cli.mjs");

test("a refused core projection preserves the existing generated group", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cssdoc-command-"));
  const receiptPath = path.join(
    root,
    "packages/cssdoc-runner/src/command-documentation/generation.json",
  );
  const before = await readFile(receiptPath);
  try {
    const module = path.join(directory, "refused-core.mjs");
    await writeFile(
      module,
      'export async function produceCommandDocumentation() { return {status:"refused",diagnostics:[]}; }\n',
    );
    await assert.rejects(buildCommandDocumentation(module));
    assert.deepEqual(await readFile(receiptPath), before);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("cssdoc-command-"));
    await rm(directory, { recursive: true, force: true });
  }
});

test("the descriptor covers eight actual switches and conditional positional inputs", () => {
  const command = createCssDocCommandContent();
  const actual = observeCssDocOptions();
  assert.equal(command.options.length, 8);
  assert.equal(command.positionals[0].name, "positionals");
  assert.equal(command.positionals[0].multiple, true);
  assert.deepEqual(
    command.options.map((item) => item.name).sort(),
    actual.options.map((item) => item.name).sort(),
  );
  assert.equal(actual.strict, true);
  assert.equal(actual.allowPositionals, true);
});

test("the checked generated artifacts bind current sources and original parser declarations", async () => {
  const receipt = await checkCommandDocumentation();
  assert.equal(receipt.commands, 1);
  assert.equal(receipt.symbols, 10);
});

test("an option type conflict is rejected independently of the descriptor", async () => {
  const actual = observeCssDocOptions();
  actual.options.find((option) => option.name === "config").valueType =
    "boolean";
  await assert.rejects(checkCommandDocumentation({ observation: actual }));
});

for (const [args, code, expected] of [
  [["--help"], 0, "HIA-Documentation-Sys · cssdoc"],
  [["-h"], 0, "配置与副作用 / Configuration and effects"],
  [
    ["--help", "--unknown-command-option"],
    1,
    "CSSDoc failed: invalid arguments/configuration or build failure.",
  ],
  [
    ["--help", "--config"],
    1,
    "CSSDoc failed: invalid arguments/configuration or build failure.",
  ],
  [["--help", "--kind", "not-a-kind"], 0, "HIA-Documentation-Sys · cssdoc"],
  [["--help", "--config", "missing.json"], 0, "HIA-Documentation-Sys · cssdoc"],
  [["--version"], 0, "1.0.0"],
  [["--help", "--version"], 0, "HIA-Documentation-Sys · cssdoc"],
  [
    ["--version", "--unknown-command-option"],
    1,
    "CSSDoc failed: invalid arguments/configuration or build failure.",
  ],
  [[], 1, "CSSDoc failed: invalid arguments/configuration or build failure."],
]) {
  test("normal CLI boundary " + JSON.stringify(args), () => {
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, code);
    assert.ok((code ? result.stderr : result.stdout).includes(expected));
    assert.equal(code ? result.stdout : result.stderr, "");
    assert.equal(result.stdout.includes("\x1b"), false);
  });
}

test("a leading separator makes help a positional input and preserves normal failed-build reporting", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cssdoc-command-"));
  try {
    const result = spawnSync(process.execPath, [cli, "--", "--help"], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.ok(result.stdout.includes("CSSDoc failed: 0 artifact(s)."));
    const manifest = JSON.parse(
      await readFile(
        path.join(directory, "dist/cssdoc/cssdoc.producer-result.json"),
        "utf8",
      ),
    );
    assert.equal(manifest.status, "failed");
    assert.equal(manifest.artifacts.length, 0);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("cssdoc-command-"));
    await rm(directory, { recursive: true, force: true });
  }
});

test("normal direct mode keeps the last repeated output and disables maps", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cssdoc-command-"));
  try {
    await writeFile(
      path.join(directory, "sample.css"),
      ".sample { color: red; }\n",
    );
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "--out-dir",
        "first",
        "--out-dir",
        "second",
        "--no-doc-source-map",
        "sample.css",
      ],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual((await readdir(directory)).sort(), [
      "sample.css",
      "second",
    ]);
    const manifest = JSON.parse(
      await readFile(
        path.join(directory, "second/cssdoc.producer-result.json"),
        "utf8",
      ),
    );
    assert.equal(manifest.status, "success");
    assert.equal(manifest.artifacts.length, 2);
    assert.ok(
      manifest.artifacts.every(
        (artifact) => artifact.kind !== "doc-source-map",
      ),
    );
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("cssdoc-command-"));
    await rm(directory, { recursive: true, force: true });
  }
});

test("config mode ignores direct-only flags and applies the three supported overrides", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cssdoc-command-"));
  try {
    await mkdir(path.join(directory, "workspace"));
    await writeFile(
      path.join(directory, "workspace/sample.css"),
      ".sample { color: red; }\n",
    );
    await writeFile(
      path.join(directory, "config.json"),
      JSON.stringify({
        schemaVersion: "1.0.0",
        workspaceRoot: "workspace",
        outputDirectory: "original",
        inputs: [{ kind: "css", path: "sample.css" }],
        options: { sourcesContentPolicy: "embed", emitDocSourceMap: true },
      }),
    );
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "--config",
        "config.json",
        "--workspace-root",
        "missing-root",
        "--kind",
        "invalid-direct-kind",
        "--out-dir",
        "chosen",
        "--sources-content-policy",
        "none",
        "--no-doc-source-map",
        "ignored-positional.css",
      ],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      (await readdir(path.join(directory, "workspace"))).sort(),
      ["chosen", "sample.css"],
    );
    const manifest = JSON.parse(
      await readFile(
        path.join(directory, "workspace/chosen/cssdoc.producer-result.json"),
        "utf8",
      ),
    );
    assert.equal(manifest.status, "success");
    assert.equal(manifest.artifacts.length, 2);
    for (const artifact of manifest.artifacts)
      assert.equal(
        (
          await readFile(
            path.join(directory, "workspace/chosen", artifact.path),
            "utf8",
          )
        ).includes('"sourcesContent"'),
        false,
      );
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("cssdoc-command-"));
    await rm(directory, { recursive: true, force: true });
  }
});

test("a partial build keeps successful artifacts and exits one", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cssdoc-command-"));
  try {
    await writeFile(
      path.join(directory, "sample.css"),
      ".sample { color: red; }\n",
    );
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "--out-dir",
        "partial",
        "--no-doc-source-map",
        "sample.css",
        "missing.css",
      ],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.ok(result.stdout.includes("CSSDoc partial"));
    const manifest = JSON.parse(
      await readFile(
        path.join(directory, "partial/cssdoc.producer-result.json"),
        "utf8",
      ),
    );
    assert.equal(manifest.status, "partial");
    assert.equal(manifest.artifacts.length, 2);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("cssdoc-command-"));
    await rm(directory, { recursive: true, force: true });
  }
});

test("empty overrides retain config values while an empty direct output selects the workspace", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cssdoc-command-"));
  try {
    await mkdir(path.join(directory, "workspace"));
    await writeFile(
      path.join(directory, "workspace/sample.css"),
      ".sample { color: red; }\n",
    );
    await writeFile(
      path.join(directory, "sample.css"),
      ".direct { color: blue; }\n",
    );
    await writeFile(
      path.join(directory, "config.json"),
      JSON.stringify({
        schemaVersion: "1.0.0",
        workspaceRoot: "workspace",
        outputDirectory: "original",
        inputs: [{ kind: "css", path: "sample.css" }],
        options: { sourcesContentPolicy: "reference" },
      }),
    );
    const configured = spawnSync(
      process.execPath,
      [
        cli,
        "--config",
        "config.json",
        "--out-dir",
        "",
        "--sources-content-policy",
        "",
      ],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(configured.status, 0, configured.stderr);
    const manifest = JSON.parse(
      await readFile(
        path.join(directory, "workspace/original/cssdoc.producer-result.json"),
        "utf8",
      ),
    );
    const map = manifest.artifacts.find(
      (artifact) => artifact.kind === "doc-source-map",
    );
    assert.equal(
      JSON.parse(
        await readFile(
          path.join(directory, "workspace/original", map.path),
          "utf8",
        ),
      ).privacy.sourcesContentPolicy,
      "reference",
    );
    const direct = spawnSync(
      process.execPath,
      [cli, "--out-dir", "", "--no-doc-source-map", "sample.css"],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(direct.status, 0, direct.stderr);
    assert.equal(
      JSON.parse(
        await readFile(
          path.join(directory, "cssdoc.producer-result.json"),
          "utf8",
        ),
      ).status,
      "success",
    );
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("cssdoc-command-"));
    await rm(directory, { recursive: true, force: true });
  }
});
