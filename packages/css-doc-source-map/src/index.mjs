import { validateCssDocExtraction } from "@hia-doc/cssdoc-spec";
export const CSS_DOC_SOURCE_CONTENT_POLICIES = Object.freeze(["none", "reference", "embed"]);
/**
 * 当前 CSSDoc 映射写入器所发出的文档源码映射契约身份。
 *
 * @lang en The documentation source-map contract identity emitted by the current CSSDoc map writer.
 */
export const CSS_DOC_SOURCE_MAP_CONTRACT_VERSION = "1.1.0";

export function createCssDocSourceMapRef(options = {}) {
  return {
    kind: "hia-doc-source-map-ref",
    href: options.href ?? null,
    sourcesContentPolicy: normalizeSourcesContentPolicy(options.sourcesContentPolicy ?? "none")
  };
}

/** @param {string} policy <lang><zh-CN>精确none/reference/embed。</zh-CN><en>Exact none/reference/embed.</en></lang> @returns {string} <lang><zh-CN>同一有效策略。</zh-CN><en>The same valid policy.</en></lang> @throws {TypeError} <lang><zh-CN>固定拒绝，不打印原文。</zh-CN><en>Fixed refusal without raw text.</en></lang> */
export function normalizeSourcesContentPolicy(policy) {
  if (!CSS_DOC_SOURCE_CONTENT_POLICIES.includes(policy)) {
    throw new TypeError("Unsupported CSSDoc sourcesContent policy.");
  }
  return policy;
}

/**
 * 从 CSSDoc 提取工件生成直接来源映射；逐条引用保留范围精度证据。
 * 已证的 PostCSS 规则使用包含式 UTF-16 列，其余节点和设计令牌占位范围保持未知。
 *
 * @lang en Builds a direct-source map from a CSSDoc extraction artifact. Proven PostCSS rule locations use inclusive UTF-16 columns; unproven nodes and synthetic design-token ranges stay unknown per reference.
 * @param {{extraction: object, extractionPath?: string, hiaDocumentPath?: string, sourcesContentPolicy?: string, id?: string}} options <lang><zh-CN>提取工件及公开安全的相对路径、内容策略。</zh-CN><en>Extraction artifact, public-safe relative paths and content policy.</en></lang>
 * @returns {object} <lang><zh-CN>不嵌入源码正文的 1.1.0 映射工件。</zh-CN><en>A 1.1.0 map artifact without embedded source content.</en></lang>
 * @throws {Error} <lang><zh-CN>提取契约、路径或内容策略无效时抛出。</zh-CN><en>Throws for an invalid extraction contract, path or content policy.</en></lang>
 */
export function createCssDocumentationSourceMap(options = {}) {
  const extraction = options.extraction;
  if (validateCssDocExtraction(extraction).length) {
    throw new TypeError("Unsupported or invalid CSSDoc extraction.");
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
    contractVersion: CSS_DOC_SOURCE_MAP_CONTRACT_VERSION,
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
      sourceRefs: [createCssSourceRef(symbol, extraction, sourceId)],
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

/**
 * 为单个符号声明源码范围约定；仅已测 PostCSS 规则获得精确列语义。
 *
 * @lang en Declares source-range conventions for one symbol; only probed PostCSS rule locations receive exact column semantics.
 * @param {object} symbol <lang><zh-CN>包含范围及目标节点类别的 CSSDoc 符号。</zh-CN><en>CSSDoc symbol with its range and target node kind.</en></lang>
 * @param {object} extraction <lang><zh-CN>提供解析器来源的提取工件。</zh-CN><en>Extraction artifact carrying parser provenance.</en></lang>
 * @param {string} sourceId <lang><zh-CN>映射来源标识。</zh-CN><en>Map source identity.</en></lang>
 * @returns {object} <lang><zh-CN>带范围时必有约定的源码引用；缺范围时两字段均省略。</zh-CN><en>A source reference with a convention iff ranged.</en></lang>
 */
function createCssSourceRef(symbol, extraction, sourceId) {
  // <lang><zh-CN>设计令牌桥接器的 1:1 范围是人工占位，不能推断它的终点或列单位。</zh-CN><en>The design-token bridge uses a synthetic 1:1 range, which proves neither endpoint nor column unit.</en></lang>
  const syntheticToken = extraction.source?.kind === "design-tokens";
  // <lang><zh-CN>提取器透传的节点范围；缺失时不能写出 1.1.0 的范围约定。</zh-CN><en>The extractor-provided node range; an absent range must not have a 1.1.0 convention.</en></lang>
  const range = symbol.source?.range;
  // <lang><zh-CN>仅匹配实测的 PostCSS 规则行列路径，不按标签或通用来源类别猜测其它分支。</zh-CN><en>Match only the probed PostCSS rule line/column path, never extrapolating from tags or a generic source category.</en></lang>
  const provenRule = !syntheticToken
    && extraction.source?.kind === "css"
    && extraction.metadata?.parser?.name === "postcss"
    && extraction.metadata.parser.mode === "stylesheet"
    && symbol.metadata?.target?.type === "rule"
    && Number.isSafeInteger(range?.start?.column)
    && Number.isSafeInteger(range?.end?.column);

  return {
    sourceId,
    ...(range ? {
      range,
      rangeConvention: provenRule
        ? { endBoundary: "inclusive", columnUnit: "utf16-code-unit" }
        : { endBoundary: "unknown", columnUnit: "unknown" }
    } : {}),
    rangeSource: syntheticToken ? "adapter" : "parser",
    rangeSourceDetail: syntheticToken ? "design-token-placeholder" : provenRule ? "postcss-rule-location" : "unproven-css-node-location",
    confidence: syntheticToken ? "low" : provenRule ? "high" : "medium"
  };
}

/** @param {string} value <lang><zh-CN>映射相对定位器。</zh-CN><en>Relative map locator.</en></lang> @returns {string} <lang><zh-CN>词法安全路径。</zh-CN><en>Lexically safe path.</en></lang> @throws {TypeError} <lang><zh-CN>固定失败不回显。</zh-CN><en>Fixed failure without echo.</en></lang> */
function normalizeSafePath(value) {
  const normalized = String(value).replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError("Unsafe doc-source-map path.");
  }
  return normalized;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}
