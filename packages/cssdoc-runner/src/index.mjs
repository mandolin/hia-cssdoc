import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { cssExtractionToHiaDocument } from "@hia-doc/css-doc-adapter";
import { extractCssDoc } from "@hia-doc/css-doc-extractor";
import {
  CSS_DOC_SOURCE_MAP_CONTRACT_VERSION,
  createCssDocumentationSourceMap
} from "@hia-doc/css-doc-source-map";
import {
  CSSDOC_EXTRACTION_CONTRACT,
  CSSDOC_EXTRACTION_CONTRACT_VERSION
} from "@hia-doc/cssdoc-spec";
import { designTokensToCssExtraction } from "@hia-doc/design-token-bridge";

export {
  CSSDOC_CONFIG_JSON_SCHEMA,
  CSSDOC_CONFIG_SCHEMA_ID,
  CSSDOC_CONFIG_SCHEMA_VERSION
} from "./schema.mjs";
import { CSSDOC_CONFIG_SCHEMA_ID, CSSDOC_CONFIG_SCHEMA_VERSION } from "./schema.mjs";

export const CSSDOC_RUNNER_VERSION = "0.0.0";
export const CSSDOC_INPUT_KINDS = Object.freeze([
  "css",
  "postcss-css",
  "design-token"
]);
export const CSSDOC_OUTPUT_KINDS = Object.freeze([
  "cssdoc-extraction",
  "hia-document",
  "doc-source-map"
]);

const RESULT_CONTRACT = "documentation-producer-result";
/** @lang zh-CN 沿用已确认主SDK写者身份，与CSSDoc自有draft和包版本独立。 @lang en Uses the approved main SDK writer identity independently of CSSDoc drafts and package versions. */
const RESULT_CONTRACT_VERSION = "1.0.0";
const PRODUCER_ID = "cssdoc";
const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

/**
 * @param {object} request <lang><zh-CN>绝对运行根与非空安全相对输入；三种kind/选项见包README。</zh-CN><en>Absolute runtime roots and nonempty safe relative inputs; see package README for the three kinds/options.</en></lang>
 * @param {object} [context] <lang><zh-CN>signal在每个输入前检查；reportProgress同步回调，异常传播。</zh-CN><en>signal is checked before each input; reportProgress is synchronous and its exceptions propagate.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>已确认主SDK1.0.0结果，success/partial/failed；不返回运行绝对路径。</zh-CN><en>Approved SDK1.0.0 result with success/partial/failed; no runtime absolute paths.</en></lang>
 * @throws {TypeError|Error} <lang><zh-CN>输入结构、目录写入或回调失败；逐文件处理失败转诊断，非原子落盘。</zh-CN><en>Invalid request, directory writes or callbacks fail; per-file failures become diagnostics and writes are not atomic.</en></lang>
 */
export async function runCssDoc(request, context = {}) {
  // <lang><zh-CN>执行前一次校验并复制请求，只将绝对根用于I/O。</zh-CN><en>Validate and copy the request once before execution, using absolute roots for I/O only.</en></lang>
  const normalized = normalizeRequest(request);
  await mkdir(normalized.outputDirectory, { recursive: true });

  // <lang><zh-CN>三项可变状态仅属于本次调用：成功产物、公开诊断和已完成输入数。</zh-CN><en>Three mutable accumulators belong to this call: artifacts, public diagnostics and completed input count.</en></lang>
  const artifacts = [];
  const diagnostics = [];
  let completed = 0;

  for (const [index, input] of normalized.inputs.entries()) {
    // <lang><zh-CN>中止只在输入边界观察，已落盘文件保留并产生明确失败诊断。</zh-CN><en>Observe cancellation at input boundaries; existing files remain and an explicit error diagnostic is emitted.</en></lang>
    if (context.signal?.aborted) {
      diagnostics.push(createDiagnostic(
        "CSSDOC_RUNNER_ABORTED",
        "CSSDoc runner was aborted before all inputs completed.",
        "error"
      ));
      break;
    }

    context.reportProgress?.({
      phase: "extract",
      current: index,
      total: normalized.inputs.length,
      message: input.path
    });

    try {
      // <lang><zh-CN>只有成功返回才并入产物；逐输入失败转诊断后继续其它输入。</zh-CN><en>Merge artifacts only after a successful return; per-input failures become diagnostics and remaining inputs continue.</en></lang>
      const generated = await processInput(input, normalized, index);
      artifacts.push(...generated.artifacts);
      diagnostics.push(...generated.diagnostics);
      completed += 1;
    } catch (error) {
      diagnostics.push(createDiagnostic(
        "CSSDOC_RUNNER_INPUT_FAILED",
        `Unable to process CSSDoc input ${input.path} (${errorCode(error)}).`,
        "error",
        input.path
      ));
    }
  }

  // <lang><zh-CN>有错误时按已存在产物区分partial/failed，不把未完成当success。</zh-CN><en>When errors exist, distinguish partial/failed using available artifacts, never presenting unfinished work as success.</en></lang>
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const result = {
    contract: RESULT_CONTRACT,
    contractVersion: RESULT_CONTRACT_VERSION,
    producer: {
      id: PRODUCER_ID,
      version: CSSDOC_RUNNER_VERSION
    },
    status: hasErrors ? (artifacts.length > 0 ? "partial" : "failed") : "success",
    artifacts,
    diagnostics
  };

  if (normalized.options.writeResultManifest) {
    await writeJson(path.join(normalized.outputDirectory, "cssdoc.producer-result.json"), result);
  }

  context.reportProgress?.({
    phase: "complete",
    current: completed,
    total: normalized.inputs.length
  });

  return result;
}

/**
 * @param {string} configPath <lang><zh-CN>配置定位器；相对cwd。</zh-CN><en>Config locator relative to cwd.</en></lang>
 * @param {{cwd?:string}} [options] <lang><zh-CN>默认process.cwd，仅内存绝对路径。</zh-CN><en>Defaults to process.cwd; absolute paths remain in memory.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>旧0.1.0-draft配置加载；历史目录/后缀默认保持，不写文件。</zh-CN><en>Legacy0.1.0-draft config load preserving historical directory/suffix defaults without writes.</en></lang>
 * @throws {TypeError} <lang><zh-CN>读/解析/字段失败，固定公开错误；旧schema的required冲突另行迁移。</zh-CN><en>Read/parse/field failures use fixed public errors; legacy required conflicts require separate migration.</en></lang>
 */
export async function loadCssDocConfig(configPath, options = {}) {
  // <lang><zh-CN>绝对配置位置只用于读取，不进入结果或公开异常。</zh-CN><en>The absolute config location is used for reads only, never public results or errors.</en></lang>
  const absoluteConfigPath = path.resolve(options.cwd ?? process.cwd(), configPath);
  // <lang><zh-CN>文件和JSON是外部边界，公开异常不携带本机路径或配置正文。</zh-CN><en>File and JSON input are external boundaries; public errors carry neither local paths nor config bodies.</en></lang>
  let config;
  try {
    config = JSON.parse(await readFile(absoluteConfigPath, "utf8"));
  } catch {
    throw new TypeError("Unable to read or parse CSSDoc config JSON.");
  }
  assertRecord(config, "CSSDoc config must be a JSON object.");
  assertKnownKeys(config, ["$schema", "schemaVersion", "workspaceRoot", "outputDirectory", "inputs", "options", "profileIds"], "config");
  if (config.schemaVersion !== CSSDOC_CONFIG_SCHEMA_VERSION) {
    throw new TypeError(`schemaVersion must be ${CSSDOC_CONFIG_SCHEMA_VERSION}.`);
  }
  if (config.$schema !== undefined && config.$schema !== CSSDOC_CONFIG_SCHEMA_ID) {
    throw new TypeError(`$schema must be ${CSSDOC_CONFIG_SCHEMA_ID}.`);
  }

  // <lang><zh-CN>历史配置位置关系：工作根相对配置，输出相对工作根；绝对解析仅保存在内存。</zh-CN><en>Historical bases: workspace relative to config, output relative to workspace; absolute resolutions stay in memory.</en></lang>
  const configDirectory = path.dirname(absoluteConfigPath);
  const workspaceDirectory = normalizeConfigDirectory(config.workspaceRoot ?? ".", "workspaceRoot");
  const outputDirectory = normalizeConfigDirectory(config.outputDirectory ?? "dist/cssdoc", "outputDirectory");
  const workspaceRoot = path.resolve(configDirectory, workspaceDirectory);

  return normalizeRequest({
    workspaceRoot,
    outputDirectory: path.resolve(workspaceRoot, outputDirectory),
    inputs: config.inputs,
    options: config.options,
    profileIds: config.profileIds
  });
}

/** @param {string} inputPath <lang><zh-CN>输入名称。</zh-CN><en>Input name.</en></lang> @returns {string} <lang><zh-CN>.json为design-token，.pcss/.postcss.css为postcss-css，否则css；无I/O。</zh-CN><en>.json gives design-token, .pcss/.postcss.css gives postcss-css, otherwise css; no I/O.</en></lang> */
export function inferCssDocInputKind(inputPath) {
  // <lang><zh-CN>名称规范化只为后缀匹配，不执行文件读取或发现。</zh-CN><en>Name normalization serves suffix matching only, without reads or discovery.</en></lang>
  const normalized = String(inputPath).replaceAll("\\", "/").toLowerCase();
  if (normalized.endsWith(".json")) {
    return "design-token";
  }
  if (normalized.endsWith(".pcss") || normalized.endsWith(".postcss.css")) {
    return "postcss-css";
  }
  return "css";
}

async function processInput(input, request, index) {
  const sourceFile = path.resolve(request.workspaceRoot, input.path);
  const source = await readFile(sourceFile, "utf8");
  const extraction = input.kind === "design-token"
    ? designTokensToCssExtraction(JSON.parse(source), { path: input.path })
    : extractCssDoc(source, {
        path: input.path,
        sourcesContentPolicy: request.options.sourcesContentPolicy
      });
  const document = cssExtractionToHiaDocument(extraction, {
    id: `cssdoc:${input.path}`,
    title: path.posix.basename(input.path)
  });
  const basePath = outputBasePath(input, index);
  const extractionPath = `${basePath}.cssdoc.json`;
  const hiaDocumentPath = `${basePath}.hia.json`;
  const docSourceMapPath = `${basePath}.docmap.json`;

  await writeJson(path.join(request.outputDirectory, extractionPath), extraction);
  await writeJson(path.join(request.outputDirectory, hiaDocumentPath), document);

  const artifactIdBase = `input-${index + 1}`;
  const artifacts = [
    {
      id: `${artifactIdBase}-extraction`,
      kind: "cssdoc-extraction",
      path: extractionPath,
      contract: CSSDOC_EXTRACTION_CONTRACT,
      contractVersion: CSSDOC_EXTRACTION_CONTRACT_VERSION,
      language: "json",
      mediaType: "application/json",
      profileIds: request.profileIds
    },
    {
      id: `${artifactIdBase}-hia-document`,
      kind: "hia-document",
      path: hiaDocumentPath,
      language: "json",
      mediaType: "application/json",
      profileIds: request.profileIds
    }
  ];

  if (request.options.emitDocSourceMap) {
    const docSourceMap = createCssDocumentationSourceMap({
      extraction,
      extractionPath,
      hiaDocumentPath,
      sourcesContentPolicy: request.options.sourcesContentPolicy
    });
    await writeJson(path.join(request.outputDirectory, docSourceMapPath), docSourceMap);
    artifacts.push({
      id: `${artifactIdBase}-doc-source-map`,
      kind: "doc-source-map",
      path: docSourceMapPath,
      contract: "doc-source-map",
      contractVersion: CSS_DOC_SOURCE_MAP_CONTRACT_VERSION,
      language: "json",
      mediaType: "application/json",
      profileIds: request.profileIds
    });
  }

  return {
    artifacts,
    diagnostics: (extraction.diagnostics ?? []).map((diagnostic) => normalizeDiagnostic(diagnostic, input.path))
  };
}

/** @param {unknown} value <lang><zh-CN>API或loader输入，是执行前真实信任边界。</zh-CN><en>API/loader input at the real execution trust boundary.</en></lang> @returns {object} <lang><zh-CN>复制输入/profile数组并规范化，未改原值；只缺省字段启用历史默认。</zh-CN><en>Copies input/profile arrays and normalizes without mutation; historical defaults apply only to absent fields.</en></lang> @throws {TypeError} <lang><zh-CN>已声明类型/唯一性/路径错误，不打印原值。</zh-CN><en>Declared type/uniqueness/path failure without raw values.</en></lang> */
function normalizeRequest(value) {
  assertRecord(value, "CSSDoc runner request must be an object.");
  assertAbsoluteDirectory(value.workspaceRoot, "workspaceRoot");
  assertAbsoluteDirectory(value.outputDirectory, "outputDirectory");
  if (!Array.isArray(value.inputs) || value.inputs.length === 0) {
    throw new TypeError("inputs must be a non-empty array.");
  }

  // <lang><zh-CN>每条输入建新记录，语言/路径和kind在此一次校验。</zh-CN><en>Create a fresh record per input, checking language/path/kind once here.</en></lang>
  const inputs = value.inputs.map((input, index) => {
    assertRecord(input, `inputs[${index}] must be an object.`);
    assertKnownKeys(input, ["kind", "path", "language"], `inputs[${index}]`);
    // <lang><zh-CN>已验证的相对定位器决定现有后缀推断，禁止回显错误kind。</zh-CN><en>The checked relative locator drives existing suffix inference without echoing invalid kinds.</en></lang>
    const inputPath = normalizeSafeRelativePath(input.path, `inputs[${index}].path`);
    const kind = input.kind === undefined ? inferCssDocInputKind(inputPath) : input.kind;
    if (!CSSDOC_INPUT_KINDS.includes(kind)) {
      throw new TypeError("Unsupported CSSDoc input kind.");
    }
    // <lang><zh-CN>非空语言是既有声明，不能静默丢弃错误类型。</zh-CN><en>A nonempty language is an existing declaration; mistyped values cannot be silently dropped.</en></lang>
    if (input.language !== undefined && (typeof input.language !== "string" || input.language.length === 0)) {
      throw new TypeError("Input language must be a non-empty string.");
    }
    return {
      kind,
      path: inputPath,
      ...(typeof input.language === "string" ? { language: input.language } : {})
    };
  });

  // <lang><zh-CN>显式null不能冒充缺省选项。</zh-CN><en>Explicit null cannot stand in for absent options.</en></lang>
  const runnerOptions = value.options === undefined ? {} : value.options;
  assertRecord(runnerOptions, "options must be an object.");
  assertKnownKeys(runnerOptions, ["emitDocSourceMap", "sourcesContentPolicy", "writeResultManifest"], "options");
  // <lang><zh-CN>仅缺省才启用默认值；显式null与其它非布尔值违反既有schema。</zh-CN><en>Defaults apply only when absent; explicit null and other nonbooleans violate the existing schema.</en></lang>
  for (const key of ["emitDocSourceMap", "writeResultManifest"]) {
    if (runnerOptions[key] !== undefined && typeof runnerOptions[key] !== "boolean") {
      throw new TypeError("Runner flags must be booleans.");
    }
  }
  const sourcesContentPolicy = runnerOptions.sourcesContentPolicy === undefined ? "none" : runnerOptions.sourcesContentPolicy;
  if (!["none", "reference", "embed"].includes(sourcesContentPolicy)) {
    throw new TypeError("Unsupported sourcesContentPolicy.");
  }
  // <lang><zh-CN>非空唯一profile列表随后复制，避免共享调用方可变数组。</zh-CN><en>The nonempty unique profile list is copied to avoid sharing the caller mutable array.</en></lang>
  const profileIds = value.profileIds === undefined ? ["cssdoc"] : value.profileIds;
  if (!Array.isArray(profileIds) || profileIds.length === 0 || profileIds.some((id) => typeof id !== "string" || !SAFE_ID_PATTERN.test(id)) || new Set(profileIds).size !== profileIds.length) {
    throw new TypeError("profileIds must be a non-empty array of lower-case identifiers.");
  }

  return {
    workspaceRoot: path.resolve(value.workspaceRoot),
    outputDirectory: path.resolve(value.outputDirectory),
    inputs,
    profileIds: [...profileIds],
    options: {
      emitDocSourceMap: runnerOptions.emitDocSourceMap !== false,
      sourcesContentPolicy,
      writeResultManifest: runnerOptions.writeResultManifest !== false
    }
  };
}

function outputBasePath(input, index) {
  const parsed = path.posix.parse(input.path);
  const directory = parsed.dir ? `${parsed.dir}/` : "";
  return normalizeSafeRelativePath(
    `artifacts/${directory}${parsed.name}.${slug(input.kind)}-${index + 1}`,
    "artifact base path"
  );
}

function normalizeDiagnostic(diagnostic, fallbackPath) {
  const severity = diagnostic?.severity === "error" || diagnostic?.severity === "warning" || diagnostic?.severity === "info"
    ? diagnostic.severity
    : "info";
  const diagnosticPath = typeof diagnostic?.path === "string" && isSafeRelativePath(diagnostic.path)
    ? diagnostic.path.replaceAll("\\", "/")
    : fallbackPath;
  return {
    code: typeof diagnostic?.code === "string" ? diagnostic.code : "CSSDOC_RUNNER_DIAGNOSTIC",
    message: typeof diagnostic?.message === "string" ? diagnostic.message : "CSSDoc runner diagnostic.",
    severity,
    path: diagnosticPath,
    ...(isJsonObject(diagnostic?.data) ? { data: diagnostic.data } : {})
  };
}

function createDiagnostic(code, message, severity, diagnosticPath) {
  return {
    code,
    message,
    severity,
    ...(diagnosticPath ? { path: diagnosticPath } : {})
  };
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeSafeRelativePath(value, label) {
  if (typeof value !== "string" || !isSafeRelativePath(value)) {
    throw new TypeError(`${label} must be a safe relative path.`);
  }
  return value.replaceAll("\\", "/");
}

function isSafeRelativePath(value) {
  const normalized = String(value).replaceAll("\\", "/");
  return Boolean(normalized)
    && !path.posix.isAbsolute(normalized)
    && !path.win32.isAbsolute(value)
    && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized)
    && !normalized.split("/").includes("..");
}

function normalizeConfigDirectory(value, label) {
  if (typeof value !== "string" || path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
    throw new TypeError(`${label} must be relative to the config/project directory.`);
  }
  const normalized = value.replaceAll("\\", "/");
  if (!normalized || normalized.split("/").includes("..")) {
    throw new TypeError(`${label} must not escape its base directory.`);
  }
  return normalized;
}

function assertAbsoluteDirectory(value, label) {
  if (typeof value !== "string" || (!path.posix.isAbsolute(value) && !path.win32.isAbsolute(value))) {
    throw new TypeError(`${label} must be an absolute runtime path.`);
  }
}

/** @param {object} value <lang><zh-CN>已确认对象。</zh-CN><en>Checked object.</en></lang> @param {string[]} allowed <lang><zh-CN>允许字段。</zh-CN><en>Allowed keys.</en></lang> @param {string} label <lang><zh-CN>内部固定位置标签。</zh-CN><en>Internal location label.</en></lang> @returns {void} <lang><zh-CN>检查自有字段，无I/O。</zh-CN><en>Checks own keys without I/O.</en></lang> @throws {TypeError} <lang><zh-CN>未知键固定拒绝，键名可能私有所以不回显。</zh-CN><en>Fixed refusal of unknown potentially private keys without echo.</en></lang> */
function assertKnownKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new TypeError(`${label} contains unsupported fields.`);
    }
  }
}

function assertRecord(value, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(message);
  }
}

function isJsonObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

function errorCode(error) {
  return typeof error?.code === "string" ? error.code : error?.name ?? "Error";
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "input";
}
