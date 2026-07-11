import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { cssExtractionToHiaDocument } from "@hia-doc/css-doc-adapter";
import { extractCssDoc } from "@hia-doc/css-doc-extractor";
import { createCssDocumentationSourceMap } from "@hia-doc/css-doc-source-map";
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
const RESULT_CONTRACT_VERSION = "0.1.0-draft";
const PRODUCER_ID = "cssdoc";
const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export async function runCssDoc(request, context = {}) {
  const normalized = normalizeRequest(request);
  await mkdir(normalized.outputDirectory, { recursive: true });

  const artifacts = [];
  const diagnostics = [];
  let completed = 0;

  for (const [index, input] of normalized.inputs.entries()) {
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

export async function loadCssDocConfig(configPath, options = {}) {
  const absoluteConfigPath = path.resolve(options.cwd ?? process.cwd(), configPath);
  const config = JSON.parse(await readFile(absoluteConfigPath, "utf8"));
  assertRecord(config, "CSSDoc config must be a JSON object.");
  assertKnownKeys(config, ["$schema", "schemaVersion", "workspaceRoot", "outputDirectory", "inputs", "options", "profileIds"], "config");
  if (config.schemaVersion !== CSSDOC_CONFIG_SCHEMA_VERSION) {
    throw new TypeError(`schemaVersion must be ${CSSDOC_CONFIG_SCHEMA_VERSION}.`);
  }
  if (config.$schema !== undefined && config.$schema !== CSSDOC_CONFIG_SCHEMA_ID) {
    throw new TypeError(`$schema must be ${CSSDOC_CONFIG_SCHEMA_ID}.`);
  }

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

export function inferCssDocInputKind(inputPath) {
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
      contractVersion: "0.1.0-draft",
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

function normalizeRequest(value) {
  assertRecord(value, "CSSDoc runner request must be an object.");
  assertAbsoluteDirectory(value.workspaceRoot, "workspaceRoot");
  assertAbsoluteDirectory(value.outputDirectory, "outputDirectory");
  if (!Array.isArray(value.inputs) || value.inputs.length === 0) {
    throw new TypeError("inputs must be a non-empty array.");
  }

  const inputs = value.inputs.map((input, index) => {
    assertRecord(input, `inputs[${index}] must be an object.`);
    assertKnownKeys(input, ["kind", "path", "language"], `inputs[${index}]`);
    const inputPath = normalizeSafeRelativePath(input.path, `inputs[${index}].path`);
    const kind = input.kind ?? inferCssDocInputKind(inputPath);
    if (!CSSDOC_INPUT_KINDS.includes(kind)) {
      throw new TypeError(`Unsupported CSSDoc input kind: ${kind}`);
    }
    return {
      kind,
      path: inputPath,
      ...(typeof input.language === "string" ? { language: input.language } : {})
    };
  });

  const runnerOptions = value.options ?? {};
  assertRecord(runnerOptions, "options must be an object.");
  assertKnownKeys(runnerOptions, ["emitDocSourceMap", "sourcesContentPolicy", "writeResultManifest"], "options");
  const sourcesContentPolicy = runnerOptions.sourcesContentPolicy ?? "none";
  if (!["none", "reference", "embed"].includes(sourcesContentPolicy)) {
    throw new TypeError(`Unsupported sourcesContentPolicy: ${sourcesContentPolicy}`);
  }
  const profileIds = value.profileIds ?? ["cssdoc"];
  if (!Array.isArray(profileIds) || profileIds.length === 0 || profileIds.some((id) => typeof id !== "string" || !SAFE_ID_PATTERN.test(id))) {
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

function assertKnownKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new TypeError(`${label}.${key} is not supported.`);
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
