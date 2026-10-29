#!/usr/bin/env node

import path from "node:path";
import { parseArgs } from "node:util";

import {
  CSSDOC_RUNNER_VERSION,
  inferCssDocInputKind,
  loadCssDocConfig,
  runCssDoc
} from "./index.mjs";

// <lang><zh-CN>命令解析与执行共享公开错误边界，未知参数也不能泄露原文/栈。</zh-CN><en>Argument parsing and execution share the public error boundary, including unknown options.</en></lang>
try {
  const { values, positionals } = parseArgs({
    options: {
      config: { type: "string", short: "c" },
      help: { type: "boolean", short: "h" },
      kind: { type: "string", short: "k" },
      "no-doc-source-map": { type: "boolean" },
      "out-dir": { type: "string", short: "o" },
      "sources-content-policy": { type: "string" },
      version: { type: "boolean", short: "v" },
      "workspace-root": { type: "string" }
    },
    allowPositionals: true,
    strict: true
  });

  if (values.help) {
    process.stdout.write(`CSSDoc ${CSSDOC_RUNNER_VERSION}\n\nUsage:\n  cssdoc --config cssdoc.config.json\n  cssdoc [options] <input...>\n\nOptions:\n  -c, --config <path>\n  -k, --kind <kind>\n  -o, --out-dir <path>\n      --workspace-root <path>\n      --sources-content-policy <none|reference|embed>\n      --no-doc-source-map\n  -v, --version\n`);
    process.exit(0);
  }

  if (values.version) {
    process.stdout.write(`${CSSDOC_RUNNER_VERSION}\n`);
    process.exit(0);
  }

  // <lang><zh-CN>配置或显式输入建立内存运行请求，随后runner校验并写入。</zh-CN><en>Config or explicit inputs build the in-memory request before runner validation and writes.</en></lang>
  const request = values.config
    ? await loadCssDocConfig(values.config)
    : createCliRequest(values, positionals);

  if (values["out-dir"]) {
    request.outputDirectory = path.resolve(request.workspaceRoot, values["out-dir"]);
  }
  if (values["sources-content-policy"]) {
    request.options.sourcesContentPolicy = values["sources-content-policy"];
  }
  if (values["no-doc-source-map"]) {
    request.options.emitDocSourceMap = false;
  }

  const result = await runCssDoc(request);
  process.stdout.write(`CSSDoc ${result.status}: ${result.artifacts.length} artifact(s).\n`);
  process.exitCode = result.status === "success" ? 0 : 1;
} catch {
  process.stderr.write("CSSDoc failed: invalid arguments/configuration or build failure.\n");
  process.exitCode = 1;
}

/** @param {object} cliValues <lang><zh-CN>parseArgs后的开关。</zh-CN><en>Options after parseArgs.</en></lang> @param {string[]} inputs <lang><zh-CN>相对输入。</zh-CN><en>Relative inputs.</en></lang> @returns {object} <lang><zh-CN>内存运行请求，绝对根不公开。</zh-CN><en>In-memory request whose absolute roots stay private.</en></lang> @throws {TypeError} <lang><zh-CN>没有输入时拒绝。</zh-CN><en>Refuses missing inputs.</en></lang> */
function createCliRequest(cliValues, inputs) {
  if (inputs.length === 0) {
    throw new TypeError("At least one input or --config is required.");
  }
  // <lang><zh-CN>进程工作目录只解析运行根，不进公开工件。</zh-CN><en>cwd resolves runtime roots only, never public artifacts.</en></lang>
  const workspaceRoot = path.resolve(process.cwd(), cliValues["workspace-root"] ?? ".");
  return {
    workspaceRoot,
    outputDirectory: path.resolve(workspaceRoot, cliValues["out-dir"] ?? "dist/cssdoc"),
    inputs: inputs.map((inputPath) => ({
      kind: cliValues.kind ?? inferCssDocInputKind(inputPath),
      path: inputPath
    })),
    options: {
      emitDocSourceMap: !cliValues["no-doc-source-map"],
      sourcesContentPolicy: cliValues["sources-content-policy"] ?? "none",
      writeResultManifest: true
    }
  };
}
