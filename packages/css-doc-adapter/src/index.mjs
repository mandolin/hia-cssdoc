import { CSSDOC_EXTRACTION_CONTRACT } from "@hia-doc/cssdoc-spec";

const HIA_CORE_SCHEMA_VERSION = "0.2.0";
const HIA_SOURCE_MODEL = "hia-source";
const HIA_SOURCE_MODEL_VERSION = "0.2.0";

export function cssExtractionToHiaDocument(artifact, options = {}) {
  assertCssExtractionArtifact(artifact);
  const title = options.title ?? titleFromPath(artifact.source.path);
  const symbols = artifact.symbols.map((symbol) => mapSymbol(symbol, artifact));

  return {
    schemaVersion: HIA_CORE_SCHEMA_VERSION,
    id: options.id ?? `cssdoc:${artifact.source.path}`,
    title,
    defaultLocale: options.defaultLocale ?? "en",
    locales: options.locales ?? ["en"],
    nodes: [
      {
        id: "root",
        kind: "root",
        title,
        symbolIds: symbols.map((symbol) => symbol.id)
      }
    ],
    symbols,
    diagnostics: artifact.diagnostics ?? [],
    metadata: {
      sourceContract: artifact.contract,
      sourceContractVersion: artifact.contractVersion,
      producer: artifact.producer,
      sourceMap: artifact.sourceMap ?? null
    }
  };
}

export function assertCssExtractionArtifact(artifact) {
  if (!artifact || artifact.contract !== CSSDOC_EXTRACTION_CONTRACT) {
    throw new Error(`Expected ${CSSDOC_EXTRACTION_CONTRACT} artifact.`);
  }
  if (!Array.isArray(artifact.symbols)) {
    throw new Error("CSSDoc extraction artifact must contain symbols array.");
  }
}

function mapSymbol(symbol, artifact) {
  const sourcePath = symbol.source?.path ?? artifact.source.path;
  const range = symbol.source?.range ?? null;
  const fragmentContent = range && artifact.source?.sourcesContent
    ? extractRangeContent(artifact.source.sourcesContent, range)
    : null;
  return {
    id: symbol.id,
    name: symbol.name,
    kind: symbol.kind,
    parentId: symbol.parentId,
    summary: symbol.summary,
    source: {
      model: HIA_SOURCE_MODEL,
      modelVersion: HIA_SOURCE_MODEL_VERSION,
      mode: "link",
      definedIn: {
        kind: "defined-in",
        relativePath: sourcePath,
        language: "css",
        position: range?.start ?? { line: 1, column: 1 },
        range: range ?? undefined
      },
      fragments: range && fragmentContent
        ? [
            {
              kind: "source-fragment",
              id: `${symbol.id}:source`,
              relativePath: sourcePath,
              language: "css",
              range,
              content: fragmentContent,
              rangeSource: "parser",
              confidence: "high",
              origin: {
                contract: artifact.contract,
                annotation: symbol.annotation ?? null
              }
            }
          ]
        : []
    },
    diagnostics: symbol.diagnostics ?? [],
    metadata: {
      cssdoc: {
        annotation: symbol.annotation ?? null,
        ...symbol.metadata
      }
    }
  };
}

function titleFromPath(sourcePath) {
  return sourcePath.split("/").at(-1) || "CSSDoc Document";
}

function extractRangeContent(source, range) {
  const lines = String(source).split(/\r\n|\r|\n/);
  const selected = lines.slice(range.start.line - 1, range.end.line);
  return selected.join("\n").trim() || null;
}
