export const CSS_DOC_SOURCE_CONTENT_POLICIES = Object.freeze(["none", "reference", "embed"]);

export function createCssDocSourceMapRef(options = {}) {
  return {
    kind: "hia-doc-source-map-ref",
    href: options.href ?? null,
    sourcesContentPolicy: normalizeSourcesContentPolicy(options.sourcesContentPolicy ?? "none")
  };
}

export function normalizeSourcesContentPolicy(policy) {
  if (!CSS_DOC_SOURCE_CONTENT_POLICIES.includes(policy)) {
    throw new Error(`Unsupported CSSDoc sourcesContent policy: ${policy}`);
  }
  return policy;
}

export function createCssDocumentationSourceMap(options = {}) {
  const extraction = options.extraction;
  if (!extraction || extraction.contract !== "hia-cssdoc-extraction") {
    throw new Error("Expected hia-cssdoc-extraction artifact.");
  }

  const extractionPath = normalizeSafePath(options.extractionPath ?? "document.cssdoc.json");
  const hiaDocumentPath = normalizeSafePath(options.hiaDocumentPath ?? "document.hia.json");
  const sourcePath = normalizeSafePath(extraction.source?.path ?? "input.css");
  const sourceLanguage = extraction.source?.kind === "design-tokens" ? "json" : "css";
  const sourceId = `source:${sourceLanguage}:${slug(sourcePath)}`;
  const extractionArtifactId = "artifact:cssdoc:extraction";
  const hiaArtifactId = "artifact:hia:document";
  const entryIds = extraction.symbols.map((symbol) => `entry:${slug(symbol.id)}`);
  const sourcesContentPolicy = normalizeSourcesContentPolicy(
    options.sourcesContentPolicy ?? extraction.sourceMap?.sourcesContentPolicy ?? "none"
  );

  return {
    contract: "doc-source-map",
    contractVersion: "0.1.0-draft",
    id: options.id ?? `docmap:cssdoc:${slug(sourcePath)}`,
    producer: {
      name: "@hia-doc/css-doc-source-map",
      version: "0.0.0",
      runtime: "node",
      profile: "cssdoc-direct-source"
    },
    pathBases: {
      artifacts: "outputDirectory",
      sources: "workspaceRoot"
    },
    artifacts: [
      {
        id: extractionArtifactId,
        kind: "extraction-artifact",
        path: extractionPath,
        language: "json",
        role: "generated",
        contractRefs: [{
          contract: extraction.contract,
          contractVersion: extraction.contractVersion,
          path: extractionPath
        }]
      },
      {
        id: hiaArtifactId,
        kind: "hia-document",
        path: hiaDocumentPath,
        language: "json",
        role: "generated"
      }
    ],
    sources: [{
      id: sourceId,
      kind: extraction.source?.kind ?? "css",
      path: sourcePath,
      language: sourceLanguage,
      role: "original",
      sourcesContentPolicy
    }],
    sourceMaps: [],
    chains: [{
      id: `chain:cssdoc:${slug(sourcePath)}`,
      stages: [
        {
          from: sourceId,
          to: extractionArtifactId,
          transform: extraction.source?.kind === "design-tokens" ? "design-token-to-cssdoc" : "css-to-cssdoc",
          sourceMap: null,
          linkage: entryIds
        },
        {
          from: extractionArtifactId,
          to: hiaArtifactId,
          transform: "cssdoc-to-hia-core",
          sourceMap: null,
          linkage: entryIds
        }
      ]
    }],
    entries: extraction.symbols.map((symbol, index) => ({
      id: entryIds[index],
      kind: symbol.kind === "design-token" ? "design-token-link" : "symbol",
      symbolId: symbol.id,
      symbolKind: symbol.kind,
      ...(symbol.metadata?.tag
        ? { annotation: { tag: symbol.metadata.tag, value: symbol.metadata.value ?? "" } }
        : {}),
      sourceRefs: [{
        sourceId,
        range: symbol.source?.range ?? undefined,
        rangeSource: extraction.source?.kind === "design-tokens" ? "adapter" : "parser",
        confidence: symbol.source?.range ? "high" : "medium"
      }],
      artifactRefs: [
        {
          artifactId: extractionArtifactId,
          selector: `/symbols/${index}`,
          rangeSource: "adapter",
          confidence: "high"
        },
        {
          artifactId: hiaArtifactId,
          selector: `/symbols/${index}`,
          rangeSource: "adapter",
          confidence: "high"
        }
      ],
      diagnostics: []
    })),
    privacy: {
      sourcesContentPolicy,
      allowAbsolutePaths: false,
      allowUncPaths: false,
      allowPathTraversal: false,
      releaseGate: {
        requireExplicitEmbedOptIn: true,
        failOnUnsafePath: true,
        failOnUnexpectedSourcesContent: true
      }
    },
    diagnostics: []
  };
}

function normalizeSafePath(value) {
  const normalized = String(value).replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`Unsafe doc-source-map path: ${value}`);
  }
  return normalized;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}
