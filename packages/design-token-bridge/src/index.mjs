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

function normalizeSourcePath(sourcePath) {
  const normalized = String(sourcePath).replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`Unsafe design token source path: ${sourcePath}`);
  }
  return normalized;
}
