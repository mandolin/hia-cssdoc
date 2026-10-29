/**
 * @file CSSDoc JSON 到核心文档的纯投影；仅已证同源规则得到逐字符片段。
 * @lang en Pure CSSDoc JSON to core-document projection; only proven same-source rules receive character-exact fragments.
 */
import { validateCssDocExtraction } from "@hia-doc/cssdoc-spec";

const HIA_CORE_SCHEMA_VERSION = "0.2.0";
const HIA_SOURCE_MODEL = "hia-source";
const HIA_SOURCE_MODEL_VERSION = "0.2.0";

/** @param {object} artifact <lang><zh-CN>精确已支持旧/新JSON提取件，扩展必须为JSON。</zh-CN><en>Exactly supported old/current JSON extraction with JSON extensions.</en></lang> @param {object} [options] <lang><zh-CN>身份/标题/语言覆写。</zh-CN><en>Identity/title/locale overrides.</en></lang> @returns {object} <lang><zh-CN>新核心文档；i18n与部分metadata仍共享输入嵌套对象；无I/O。</zh-CN><en>Fresh core document; i18n and some metadata share nested input objects; no I/O.</en></lang> @throws {TypeError} <lang><zh-CN>未知版本或不合法结构拒绝。</zh-CN><en>Rejects unknown versions or invalid structure.</en></lang> */
export function cssExtractionToHiaDocument(artifact, options = {}) {
  assertCssExtractionArtifact(artifact);
  // <lang><zh-CN>标题按调用方覆写或来源文件名确定，不读取文件。</zh-CN><en>The caller override or source filename determines the title without file reads.</en></lang>
  const title = options.title ?? titleFromPath(artifact.source.path);
  // <lang><zh-CN>原文只索引一次，避免每个符号重复扫描整份嵌入源码；索引仅在本次调用中存在。</zh-CN><en>Index the original text once instead of rescanning all embedded source for every symbol; the index is call-local.</en></lang>
  const sourceLines = typeof artifact.source.sourcesContent === "string" ? indexSourceLines(artifact.source.sourcesContent) : null;
  // <lang><zh-CN>每个符号新建投影，多个标签可共享同一来源范围但保留各自身份。</zh-CN><en>Create each symbol projection separately; multiple tags may share a source range while keeping their own identities.</en></lang>
  const symbols = artifact.symbols.map((symbol) => mapSymbol(symbol, artifact, sourceLines));
  // <lang><zh-CN>沿用调用方、工件、英语的既有回退顺序。</zh-CN><en>Retain the existing caller, artifact, English fallback order.</en></lang>
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

/** @param {unknown} artifact <lang><zh-CN>普通JSON提取工件。</zh-CN><en>Ordinary JSON extraction artifact.</en></lang> @returns {void} <lang><zh-CN>精确旧/新结构有效时无值且不改输入。</zh-CN><en>No value for valid exact old/current structure; input unchanged.</en></lang> @throws {TypeError} <lang><zh-CN>固定公开拒绝，不回显schema诊断。</zh-CN><en>Fixed public refusal without raw schema diagnostics.</en></lang> */
export function assertCssExtractionArtifact(artifact) {
  if (validateCssDocExtraction(artifact).length) throw new TypeError("Unsupported or invalid CSSDoc extraction.");
}

/**
 * @param {object} symbol <lang><zh-CN>已验证符号，不修改输入。</zh-CN><en>Validated symbol, left unchanged.</en></lang>
 * @param {object} artifact <lang><zh-CN>提供来源正文及既有解析器证据的工件。</zh-CN><en>Artifact providing source text and established parser evidence.</en></lang>
 * @param {Array<{start:number,end:number}>|null} sourceLines <lang><zh-CN>PostCSS原文UTF-16行索引，end不含LF。</zh-CN><en>PostCSS original UTF-16 line index whose ends exclude LF.</en></lang>
 * @returns {object} <lang><zh-CN>新符号；定位范围透传，未知精度不发片段，部分嵌套metadata/i18n共享。</zh-CN><en>New symbol retaining reference ranges; unknown precision emits no fragment; some nested metadata/i18n is shared.</en></lang>
 */
function mapSymbol(symbol, artifact, sourceLines) {
  // <lang><zh-CN>定位可引用其它来源，但片段只能来自工件所带同路径正文。</zh-CN><en>References may address another source, but fragments require the artifact's own same-path text.</en></lang>
  const sourcePath = symbol.source?.path ?? artifact.source.path;
  // <lang><zh-CN>缺范围保持既有定位回退，不合成片段坐标。</zh-CN><en>Missing ranges keep the existing reference fallback without synthesizing fragment coordinates.</en></lang>
  const range = symbol.source?.range ?? null;
  // <lang><zh-CN>与1.1.0 map的已证rule分支一致；不外推Vue、声明、at-rule或token占位的终点/列单位。</zh-CN><en>Match the proven rule branch of the 1.1.0 map without extrapolating endpoint/column semantics to Vue, declarations, at-rules or token placeholders.</en></lang>
  const provenRule = artifact.source.kind === "css"
    && artifact.metadata?.parser?.name === "postcss"
    && artifact.metadata.parser.mode === "stylesheet"
    && symbol.metadata?.target?.type === "rule";
  // <lang><zh-CN>坐标完整且在原文内时按包含式UTF-16切片；不修剪、不夹取、不回退整行。</zh-CN><en>Slice complete in-bounds coordinates as inclusive UTF-16, without trimming, clamping or whole-line fallback.</en></lang>
  const fragmentContent = provenRule && range && sourceLines && sourcePath === artifact.source.path
    ? extractRangeContent(artifact.source.sourcesContent, sourceLines, range)
    : null;
  // <lang><zh-CN>设计令牌的实际来源是JSON，其合成范围仍只用于定位。</zh-CN><en>Design tokens originate in JSON; their synthetic ranges remain reference-only.</en></lang>
  const sourceLanguage = artifact.source.kind === "design-tokens" ? "json" : "css";
  // <lang><zh-CN>核心来源模型维持link模式；只有上面已证的正文能进入高置信片段。</zh-CN><en>The core source model stays in link mode; only text proven above may enter high-confidence fragments.</en></lang>
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
        language: sourceLanguage,
        position: range?.start ?? { line: 1, column: 1 },
        range: range ?? undefined
      },
      fragments: range && fragmentContent
        ? [
            {
              kind: "source-fragment",
              id: `${symbol.id}:source`,
              relativePath: sourcePath,
              language: sourceLanguage,
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

/**
 * @param {string} source <lang><zh-CN>已获提供的原始源码。</zh-CN><en>Provided original source text.</en></lang>
 * @returns {Array<{start:number,end:number}>} <lang><zh-CN>零基UTF-16行边界，按PostCSS仅以LF分行；保留CR/空行，时间/空间线性，无I/O。</zh-CN><en>Zero-based UTF-16 bounds using PostCSS LF-only line splitting, retaining CR/empty lines; linear time/space without I/O.</en></lang>
 */
function indexSourceLines(source) {
  // <lang><zh-CN>索引只存边界，不复制或规范化源码正文。</zh-CN><en>Store boundaries only, without copying or normalizing source text.</en></lang>
  const lines = [];
  // <lang><zh-CN>PostCSS input.fromOffset仅按LF递增行号；独立CR仍占同一行的UTF-16列。</zh-CN><en>PostCSS input.fromOffset increments lines only at LF; standalone CR occupies a UTF-16 column on the same line.</en></lang>
  let start = 0;
  // <lang><zh-CN>match.index为原始UTF-16偏移，不能用拆行再join重建文本。</zh-CN><en>match.index is an original UTF-16 offset; never reconstruct text by splitting and joining lines.</en></lang>
  for (const match of source.matchAll(/\n/g)) {
    lines.push({ start, end: match.index });
    start = match.index + match[0].length;
  }
  lines.push({ start, end: source.length });
  return lines;
}

/**
 * @param {string} source <lang><zh-CN>未改写原文。</zh-CN><en>Unmodified source.</en></lang>
 * @param {Array<{start:number,end:number}>} lines <lang><zh-CN>同一正文的一次性行索引。</zh-CN><en>Once-built line index for that same text.</en></lang>
 * @param {object} range <lang><zh-CN>来自已证PostCSS rule的一基包含式UTF-16范围。</zh-CN><en>One-based inclusive UTF-16 range from a proven PostCSS rule.</en></lang>
 * @returns {string|null} <lang><zh-CN>精确原文子串；不完整、反向或越界时null，不抛错或夹取。</zh-CN><en>Exact original substring; null for incomplete, reversed or out-of-bounds ranges, without throwing or clamping.</en></lang>
 */
function extractRangeContent(source, lines, range) {
  // <lang><zh-CN>schema允许省略end/column，因此精确片段另核四个安全正整数。</zh-CN><en>The schema permits omitted end/column, so exact fragments separately require four safe positive integers.</en></lang>
  if (![range.start?.line, range.start?.column, range.end?.line, range.end?.column].every((value) => Number.isSafeInteger(value) && value > 0)) return null;
  // <lang><zh-CN>行号越界不借JavaScript的slice夹取行为生成看似有效的文本。</zh-CN><en>Do not let JavaScript slice clamping turn out-of-bounds lines into plausible text.</en></lang>
  const startLine = lines[range.start.line - 1];
  const endLine = lines[range.end.line - 1];
  if (!startLine || !endLine || range.start.column > startLine.end - startLine.start || range.end.column > endLine.end - endLine.start) return null;
  // <lang><zh-CN>包含终点加一转为slice的排除式偏移；数值不跨入换行或相邻规则。</zh-CN><en>Convert the inclusive end to a slice-exclusive offset without entering newlines or neighboring rules.</en></lang>
  const start = startLine.start + range.start.column - 1;
  const end = endLine.start + range.end.column;
  return end > start ? source.slice(start, end) : null;
}
