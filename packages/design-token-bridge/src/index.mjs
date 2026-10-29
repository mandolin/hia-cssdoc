import {
  CSSDOC_EXTRACTION_CONTRACT,
  CSSDOC_EXTRACTION_CONTRACT_VERSION,
  CSSDOC_PROFILE_VERSION,
  CSSDOC_SYMBOL_KINDS
} from "@hia-doc/cssdoc-spec";

export function designTokensToCssExtraction(tokens, options = {}) {
  const sourcePath = normalizeSourcePath(options.path ?? "tokens.json");
  const symbols = [];
  collectTokens(tokens, [], symbols, sourcePath, null);

  return {
    contract: CSSDOC_EXTRACTION_CONTRACT,
    contractVersion: CSSDOC_EXTRACTION_CONTRACT_VERSION,
    producer: {
      name: "@hia-doc/design-token-bridge",
      version: "0.0.0"
    },
    profile: {
      name: "design-tokens",
      version: CSSDOC_PROFILE_VERSION
    },
    source: {
      kind: "design-tokens",
      path: sourcePath
    },
    symbols,
    annotations: [],
    diagnostics: [],
    sourceMap: {
      kind: "hia-doc-source-map-ref",
      href: null,
      sourcesContentPolicy: "none"
    },
    metadata: {
      format: "dtcg",
      specification: inferDtcgSpecification(tokens?.$schema)
    }
  };
}

function collectTokens(node, pathParts, symbols, sourcePath, inheritedType) {
  if (!node || typeof node !== "object") {
    return;
  }
  if (Object.hasOwn(node, "$value")) {
    const name = pathParts.join(".") || "root";
    symbols.push({
      id: `token:${slug(name)}`,
      kind: CSSDOC_SYMBOL_KINDS.designToken,
      name,
      summary: node.$description || undefined,
      source: {
        path: sourcePath,
        range: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 1 }
        }
      },
      metadata: {
        type: node.$type ?? inheritedType,
        value: node.$value,
        deprecated: node.$deprecated ?? null,
        extensions: node.$extensions ?? null
      }
    });
    return;
  }

  const groupType = node.$type ?? inheritedType;
  if (node.$root && typeof node.$root === "object") {
    collectTokens(node.$root, pathParts, symbols, sourcePath, groupType);
  }

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) {
      continue;
    }
    collectTokens(value, [...pathParts, key], symbols, sourcePath, groupType);
  }
}

function inferDtcgSpecification(schema) {
  if (typeof schema !== "string") {
    return null;
  }
  return schema.includes("/2025.10/") ? "2025.10" : schema;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}

/**
 * @param {unknown} sourcePath <lang><zh-CN>调用方显式来源定位器。</zh-CN><en>Explicit caller source locator.</en></lang>
 * @returns {string} <lang><zh-CN>正斜杠安全相对路径；仅词法检查，不是symlink沙箱。</zh-CN><en>Slash-normalized safe relative path; lexical validation, not a symlink sandbox.</en></lang>
 * @throws {TypeError} <lang><zh-CN>非字符串/URI/盘符/父级路径固定拒绝，不回显输入。</zh-CN><en>Fixed refusal of nonstrings, URIs, drive and parent paths without echoing input.</en></lang>
 */
function normalizeSourcePath(sourcePath) {
  // <lang><zh-CN>来源边界在生成前拒绝私有定位器，不将其写进错误。</zh-CN><en>Reject private locators before generation without copying them into errors.</en></lang>
  const normalized = typeof sourcePath === "string" ? sourcePath.replaceAll("\\", "/") : "";
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError("Unsafe design token source path.");
  }
  return normalized;
}
