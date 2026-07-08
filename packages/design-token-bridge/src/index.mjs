import {
  CSSDOC_EXTRACTION_CONTRACT,
  CSSDOC_EXTRACTION_CONTRACT_VERSION,
  CSSDOC_PROFILE_VERSION,
  CSSDOC_SYMBOL_KINDS
} from "@hia-doc/cssdoc-spec";

export function designTokensToCssExtraction(tokens, options = {}) {
  const sourcePath = normalizeSourcePath(options.path ?? "tokens.json");
  const symbols = [];
  collectTokens(tokens, [], symbols, sourcePath);

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
      format: "dtcg"
    }
  };
}

function collectTokens(node, pathParts, symbols, sourcePath) {
  if (!node || typeof node !== "object") {
    return;
  }
  if (Object.hasOwn(node, "$value")) {
    const name = pathParts.join(".");
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
        type: node.$type ?? null,
        value: node.$value
      }
    });
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) {
      continue;
    }
    collectTokens(value, [...pathParts, key], symbols, sourcePath);
  }
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
