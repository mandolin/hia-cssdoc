import { CSSDOC_EXTRACTION_CONTRACT } from "@hia-doc/cssdoc-spec";

const HIA_CORE_SCHEMA_VERSION = "0.2.0";
const HIA_SOURCE_MODEL = "hia-source";
const HIA_SOURCE_MODEL_VERSION = "0.2.0";

export function cssExtractionToHiaDocument(artifact, options = {}) {
  assertCssExtractionArtifact(artifact);
  const title = options.title ?? titleFromPath(artifact.source.path);
  const symbols = artifact.symbols.map((symbol) => mapSymbol(symbol, artifact));
  const defaultLocale = options.defaultLocale ?? artifact.defaultLocale ?? "en";

  return {
    schemaVersion: HIA_CORE_SCHEMA_VERSION,
    id: options.id ?? `cssdoc:${artifact.source.path}`,
    title,
    defaultLocale,
    locales: collectDocumentLocales(options.locales, artifact.locales, symbols, defaultLocale),
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
  const mapped = {
    id: symbol.id,
    name: symbol.name,
    kind: symbol.kind,
    parentId: symbol.parentId,
    summary: symbol.i18n?.fields?.description?.defaultText ?? symbol.summary,
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
  if (symbol.i18n) {
    mapped.i18n = symbol.i18n;
  }
  return mapped;
}

function collectDocumentLocales(optionLocales, artifactLocales, symbols, defaultLocale) {
  const locales = [
    defaultLocale,
    ...(Array.isArray(optionLocales) ? optionLocales : []),
    ...(Array.isArray(artifactLocales) ? artifactLocales : [])
  ];
  for (const symbol of symbols) {
    locales.push(...(Array.isArray(symbol.i18n?.locales) ? symbol.i18n.locales : []));
  }
  return [...new Set(locales.map((locale) => normalizeLocale(locale)).filter(Boolean))];
}

function normalizeLocale(value) {
  const locale = String(value ?? "").trim().replace(/_/g, "-");
  return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) ? locale : "";
}

function titleFromPath(sourcePath) {
  return sourcePath.split("/").at(-1) || "CSSDoc Document";
}

function extractRangeContent(source, range) {
  const lines = String(source).split(/\r\n|\r|\n/);
  const selected = lines.slice(range.start.line - 1, range.end.line);
  return selected.join("\n").trim() || null;
}
