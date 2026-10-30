/** @file 显式CSSDoc注释到版本化JSON工件，保留来源与字段级i18n。 @lang en Explicit CSSDoc comments to versioned JSON artifacts with source provenance and field-level i18n. */
import { createCssDocSourceMapRef, normalizeSourcesContentPolicy } from "@hia-doc/css-doc-source-map";
import { getCssNodeLocation, normalizeSourcePath, parseCss } from "@hia-doc/css-parser";
import {
  CSSDOC_EXTRACTION_CONTRACT,
  CSSDOC_EXTRACTION_CONTRACT_VERSION,
  CSSDOC_PROFILE_VERSION,
  getCssDocSymbolKind,
  isCssDocTag
} from "@hia-doc/cssdoc-spec";

const PRIMARY_TAGS = ["component", "selector", "cssprop", "keyframes", "layer", "media", "container", "token"];
const DEFAULT_LOCALE = "en";
const HIA_TEXT_I18N_MODEL = "hia-text-i18n";
const HIA_TEXT_I18N_MODEL_VERSION = "0.2.0";

/**
 * @param {string} source <lang><zh-CN>显式CSS文本，不读文件。</zh-CN><en>Explicit CSS text without file reads.</en></lang>
 * @param {object} [options] <lang><zh-CN>path默认input.css，defaultLocale默认en，sourcesContentPolicy默认none；仅embed保留正文。</zh-CN><en>path defaults to input.css, defaultLocale to en, sourcesContentPolicy to none; only embed retains the body.</en></lang>
 * @returns {object} <lang><zh-CN>当前CSSDoc JSON，不改输入；同目标多个符号可共享嵌套来源/注释对象。</zh-CN><en>Current CSSDoc JSON without input mutation; multiple symbols on one target may share nested source/annotation objects.</en></lang>
 * @throws {TypeError|Error} <lang><zh-CN>路径/策略固定拒绝；原生PostCSS语法错误可含源码，公开前须处理。</zh-CN><en>Fixed path/policy refusal; native PostCSS syntax errors may contain source and require handling before disclosure.</en></lang>
 */
export function extractCssDoc(source, options = {}) {
  // <lang><zh-CN>定位器只做公开相对路径检查，不读取路径。</zh-CN><en>Check a public relative locator without reading its path.</en></lang>
  const sourcePath = normalizeSourcePath(options.path ?? "input.css");
  // <lang><zh-CN>无效locale沿用英语默认，不临时发明语言语法。</zh-CN><en>Invalid locale falls back to English without inventing locale syntax.</en></lang>
  const defaultLocale = normalizeLocale(options.defaultLocale) || DEFAULT_LOCALE;
  // <lang><zh-CN>本次原生AST与紧邻注释配对，只识别实际目标，不自动扫描生成其它符号。</zh-CN><en>This call's native AST and adjacent-comment pairs identify actual targets without automatically generating other symbols.</en></lang>
  const parsed = parseCss(source, { path: sourcePath });
  const pairs = collectAttachedCommentPairs(parsed.root);
  // <lang><zh-CN>四组累积状态只属于本次提取，ID集合维护同一文档内唯一性。</zh-CN><en>Four accumulators belong to this extraction only; allocated ids maintain within-document uniqueness.</en></lang>
  const symbols = [];
  const annotations = [];
  const diagnostics = [...parsed.diagnostics];
  const usedIds = new Set();

  for (const pair of pairs) {
    // <lang><zh-CN>注释块携带标签及局部语言；无标签不构建符号。</zh-CN><en>The comment block carries tags/localized text; no tags means no symbols.</en></lang>
    const block = parseCssDocComment(pair.comment.text ?? "", { defaultLocale });
    if (block.annotations.length === 0) {
      continue;
    }

    // <lang><zh-CN>同目标位置由其各标签共享，注释自身范围单列。</zh-CN><en>Tags on one target share its location while the comment's own range stays separate.</en></lang>
    const target = createTargetInfo(pair.node, sourcePath);
    annotations.push({
      tags: block.annotations,
      source: target.source,
      annotation: toAnnotationRange(pair.comment)
    });

    // <lang><zh-CN>第一个component建父符号，其余支持标签可从属该父节点。</zh-CN><en>The first component creates a parent symbol for other supported tags.</en></lang>
    const parentAnnotation = block.annotations.find((annotation) => annotation.tag === "component");
    let parentId = null;
    if (parentAnnotation) {
      const symbol = createSymbolFromAnnotation(parentAnnotation, target, pair.comment, block, usedIds, null, defaultLocale);
      symbols.push(symbol);
      parentId = symbol.id;
    }

    for (const annotation of block.annotations) {
      if (annotation.tag === "component" || annotation.tag === "description" || annotation.tag === "lang" || annotation.tag === "cssdoc") {
        continue;
      }
      // <lang><zh-CN>只接受显式种类；识别标签并不自动承诺独立符号。</zh-CN><en>Accept only explicit kinds; recognizing a tag never automatically promises an independent symbol.</en></lang>
      const kind = getCssDocSymbolKind(annotation.tag);
      if (!kind) {
        diagnostics.push(createDiagnostic("CSSDOC_UNKNOWN_TAG", `Unknown CSSDoc annotation tag: @${annotation.tag}`, "warning", target.source, { tag: annotation.tag }));
        continue;
      }
      if (!PRIMARY_TAGS.includes(annotation.tag) && !parentId) {
        continue;
      }
      symbols.push(createSymbolFromAnnotation(annotation, target, pair.comment, block, usedIds, parentId, defaultLocale));
    }
  }

  // <lang><zh-CN>仅调用方明确embed才把已提供正文放进工件，引用不触发读取。</zh-CN><en>Only explicit embed puts the supplied body into the artifact; reference never triggers a read.</en></lang>
  const sourcesContentPolicy = normalizeSourcesContentPolicy(options.sourcesContentPolicy ?? "none");
  const sourceRecord = {
    kind: "css",
    path: sourcePath
  };
  if (sourcesContentPolicy === "embed") {
    sourceRecord.sourcesContent = source;
  }

  return {
    contract: CSSDOC_EXTRACTION_CONTRACT,
    contractVersion: CSSDOC_EXTRACTION_CONTRACT_VERSION,
    producer: {
      name: "@hia-doc/css-doc-extractor",
      version: "1.0.0"
    },
    profile: {
      name: "cssdoc",
      version: CSSDOC_PROFILE_VERSION
    },
    defaultLocale,
    locales: collectLocales([defaultLocale, ...symbols.flatMap((symbol) => symbol.i18n?.locales ?? [])]),
    source: sourceRecord,
    symbols,
    annotations,
    diagnostics,
    sourceMap: createCssDocSourceMapRef({ sourcesContentPolicy }),
    metadata: {
      parser: parsed.parser
    }
  };
}

/**
 * @param {string} rawComment <lang><zh-CN>注释正文；实现会字符串化，不宜传带自定义转换对象。</zh-CN><en>Comment body; implementation stringifies it, so avoid custom coercion objects.</en></lang>
 * @param {{defaultLocale?:string}} [options] <lang><zh-CN>默认en的文本语言。</zh-CN><en>Text locale, default en.</en></lang>
 * @returns {object} <lang><zh-CN>标签、summary/null及i18n/null；无I/O，不是完整提取工件。</zh-CN><en>Annotations, summary/null and i18n/null; no I/O and not a complete extraction artifact.</en></lang>
 */
export function parseCssDocComment(rawComment, options = {}) {
  // <lang><zh-CN>注释文本按既有逻辑规范化换行与星号；不用于原始源码片段切片。</zh-CN><en>Normalize comment newlines/asterisks by existing rules, never using this text to slice original source fragments.</en></lang>
  const lines = String(rawComment)
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, "").trim());

  // <lang><zh-CN>标签与普通正文分开累积，保留顺序供字段级i18n投影。</zh-CN><en>Accumulate tags and prose separately, retaining order for field-level i18n projection.</en></lang>
  const annotations = [];
  const prose = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }
    // <lang><zh-CN>只识别行首标签，普通文字仍作为描述，不强行转语法。</zh-CN><en>Recognize line-leading tags only; ordinary text remains prose rather than forced syntax.</en></lang>
    const match = /^@([A-Za-z][\w-]*)(?:\s+(.*))?$/.exec(line);
    if (!match) {
      prose.push(line);
      continue;
    }
    // <lang><zh-CN>规范标签和值来自当前行，known只是识别结果，不是验证证明。</zh-CN><en>Canonical tag/value come from this line; known records recognition, not validation proof.</en></lang>
    const tag = normalizeTag(match[1]);
    const value = (match[2] ?? "").trim();
    annotations.push({
      tag,
      value,
      known: isCssDocTag(tag)
    });
  }

  // <lang><zh-CN>显式description优于普通正文；字段语言按现有规则回退。</zh-CN><en>Explicit description precedes ordinary prose; field locale follows existing fallback rules.</en></lang>
  const defaultLocale = normalizeLocale(options.defaultLocale) || DEFAULT_LOCALE;
  const descriptionTag = annotations.find((annotation) => annotation.tag === "description");
  const summary = descriptionTag?.value || prose.join(" ").trim() || null;
  return {
    annotations,
    summary,
    i18n: createDescriptionI18n(summary, annotations, defaultLocale, "cssdoc.comment")
  };
}

function collectAttachedCommentPairs(container, pairs = []) {
  let pendingComment = null;

  for (const child of container.nodes ?? []) {
    if (child.type === "comment") {
      pendingComment = child;
      continue;
    }

    if (pendingComment && isDocumentableCssNode(child)) {
      pairs.push({ comment: pendingComment, node: child });
      pendingComment = null;
    } else if (child.type !== "comment") {
      pendingComment = null;
    }

    if (child.nodes) {
      collectAttachedCommentPairs(child, pairs);
    }
  }

  return pairs;
}

function isDocumentableCssNode(node) {
  return node.type === "rule" || node.type === "decl" || node.type === "atrule";
}

function createTargetInfo(node, sourcePath) {
  const location = getCssNodeLocation(node);
  return {
    type: node.type,
    selector: node.selector ?? null,
    prop: node.prop ?? null,
    name: node.name ?? null,
    params: node.params ?? null,
    source: {
      path: sourcePath,
      range: toRange(location)
    }
  };
}

function createSymbolFromAnnotation(annotation, target, comment, block, usedIds, parentId = null, defaultLocale = DEFAULT_LOCALE) {
  const kind = getCssDocSymbolKind(annotation.tag);
  const name = getAnnotationName(annotation, target);
  const id = allocateId(`css:${annotation.tag}:${slug(name)}`, usedIds);
  const summary = annotation.tag === "component" ? block.summary ?? undefined : getAnnotationDescription(annotation);
  const i18n = annotation.tag === "component"
    ? createDescriptionI18n(summary, block.annotations, defaultLocale, "cssdoc.comment")
    : createDescriptionI18n(summary, [], defaultLocale, `cssdoc.${annotation.tag}`);
  // <lang><zh-CN>新工件省略缺省摘要，不生成非JSON的undefined属性；不放宽null。</zh-CN><en>New artifacts omit absent summaries rather than creating non-JSON undefined properties; null is not widened.</en></lang>
  const symbol = {
    id,
    kind,
    name,
    ...((i18n?.fields.description?.defaultText ?? summary) === undefined ? {} : { summary: i18n?.fields.description?.defaultText ?? summary }),
    source: target.source,
    annotation: toAnnotationRange(comment),
    metadata: {
      tag: annotation.tag,
      value: annotation.value,
      target: {
        type: target.type,
        selector: target.selector,
        prop: target.prop,
        name: target.name,
        params: target.params
      }
    }
  };
  if (parentId) {
    symbol.parentId = parentId;
  }
  if (i18n) {
    symbol.i18n = i18n;
  }
  return symbol;
}

// 中文：把 CSSDoc 的 `@lang` 与 inline `<lang>/<l>` 规整成 HIA field-level i18n。
// English: Normalizes CSSDoc `@lang` and inline `<lang>/<l>` into HIA field-level i18n.
function createDescriptionI18n(defaultText, annotations, defaultLocale, source) {
  const blocks = collectLangBlocks(annotations, "description", source);
  const segments = parseInlineSegments(defaultText, "description");
  if (blocks.length === 0 && segments.length === 0) {
    return null;
  }

  const field = createTextField({
    fieldPath: "description",
    kind: "text",
    defaultLocale,
    defaultText,
    blocks,
    segments,
    source
  });

  return {
    enabled: true,
    model: HIA_TEXT_I18N_MODEL,
    modelVersion: HIA_TEXT_I18N_MODEL_VERSION,
    defaultLocale,
    locales: collectLocales([defaultLocale, ...Object.keys(field.localizedText)]),
    fields: {
      description: field
    }
  };
}

function collectLangBlocks(annotations, fieldPath, source) {
  return annotations
    .filter((annotation) => annotation.tag === "lang")
    .map((annotation) => parseLangBlock(annotation.value, fieldPath, source))
    .filter(Boolean);
}

function parseLangBlock(value, fieldPath, source) {
  const match = /^(\S+)(?:\s+([\s\S]+))?$/.exec(String(value ?? "").trim());
  const locale = normalizeLocale(match?.[1]);
  const text = compactWhitespace(match?.[2] ?? "");
  if (!locale || !text) {
    return null;
  }
  return {
    kind: "lang-block",
    locale,
    fieldPath,
    text,
    source,
    rangeInComment: null
  };
}

function createTextField(options) {
  const localizedText = {};
  const locales = collectLocales([
    options.defaultLocale,
    ...options.blocks.map((block) => block.locale),
    ...options.segments.flatMap((segment) => Object.keys(segment.localized))
  ]);

  for (const locale of locales) {
    const block = options.blocks.find((item) => item.locale === locale);
    localizedText[locale] = block?.text ?? renderInlineText(options.defaultText, options.segments, locale, options.defaultLocale);
  }

  const defaultText = localizedText[options.defaultLocale] || firstLocalizedText(localizedText) || compactWhitespace(options.defaultText);

  return {
    fieldPath: options.fieldPath,
    kind: options.kind,
    defaultLocale: options.defaultLocale,
    defaultText,
    source: options.source,
    localizedText,
    ...(options.blocks.length > 0 ? { blocks: options.blocks } : {}),
    ...(options.segments.length > 0 ? { segments: options.segments } : {}),
    resolutions: Object.fromEntries(Object.keys(localizedText).map((locale) => [
      locale,
      {
        requestedLocale: locale,
        resolvedLocale: locale,
        fallbackChain: fallbackChain(locale, options.defaultLocale),
        usedFallback: false,
        missing: false,
        sourceKind: options.blocks.some((block) => block.locale === locale) ? "lang-block" : "default-text",
        sourceLocale: locale,
        source: options.source
      }
    ])),
    missingLocales: []
  };
}

function parseInlineSegments(text, fieldPath) {
  const sourceText = String(text ?? "");
  const segments = [];
  const pattern = /<(lang|l)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = pattern.exec(sourceText))) {
    const localized = parseInlineLocalizedValues(match[3]);
    if (Object.keys(localized).length === 0) {
      continue;
    }
    const attributes = parseAttributes(match[2]);
    segments.push({
      kind: "lang-inline",
      id: `${fieldPath}.${segments.length}`,
      key: attributes.key ?? "",
      path: attributes.path ?? "",
      fieldPath,
      raw: match[0],
      localized,
      rangeInField: {
        start: match.index,
        end: match.index + match[0].length
      }
    });
  }
  return segments;
}

function parseInlineLocalizedValues(innerText) {
  const localized = {};
  const pattern = /<([A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = pattern.exec(innerText || ""))) {
    const locale = normalizeLocale(match[1]);
    const text = compactWhitespace(match[2]);
    if (locale && text) {
      localized[locale] = text;
    }
  }
  return localized;
}

function renderInlineText(text, segments, locale, defaultLocale) {
  let rendered = compactWhitespace(text);
  for (const segment of segments) {
    rendered = rendered.replace(segment.raw, resolveInlineLocalizedText(segment.localized, locale, defaultLocale));
  }
  return rendered;
}

function resolveInlineLocalizedText(localized, locale, defaultLocale) {
  return localized[locale]
    ?? localized[getParentLocale(locale)]
    ?? localized[defaultLocale]
    ?? firstLocalizedText(localized)
    ?? "";
}

function parseAttributes(rawAttributes) {
  const attributes = {};
  const pattern = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(rawAttributes || ""))) {
    attributes[match[1]] = match[2] || match[3] || "";
  }
  return attributes;
}

function getAnnotationName(annotation, target) {
  const [first] = annotation.value.split(/\s+/).filter(Boolean);
  if (first) {
    return first;
  }
  if (annotation.tag === "selector" || annotation.tag === "component" || annotation.tag === "modifier") {
    return target.selector ?? annotation.tag;
  }
  if (annotation.tag === "cssprop") {
    return target.prop ?? annotation.tag;
  }
  if (annotation.tag === "layer" || annotation.tag === "media" || annotation.tag === "container" || annotation.tag === "keyframes") {
    return target.params || target.name || annotation.tag;
  }
  return annotation.tag;
}

function getAnnotationDescription(annotation) {
  const [, ...rest] = annotation.value.split(/\s+/).filter(Boolean);
  return rest.join(" ") || undefined;
}

function toAnnotationRange(comment) {
  return {
    range: toRange(getCssNodeLocation(comment))
  };
}

function toRange(location) {
  if (!location?.start || !location?.end) {
    return null;
  }
  return {
    start: {
      line: location.start.line,
      column: location.start.column
    },
    end: {
      line: location.end.line,
      column: location.end.column
    }
  };
}

function createDiagnostic(code, message, severity, source, data = {}) {
  return {
    code,
    message,
    severity,
    path: source.path,
    data: {
      ...data,
      source
    }
  };
}

function normalizeTag(tag) {
  return tag.toLowerCase().replace(/-/g, "");
}

function allocateId(baseId, usedIds) {
  let id = baseId;
  let index = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${index}`;
    index += 1;
  }
  usedIds.add(id);
  return id;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}

function collectLocales(values) {
  return [...new Set(values.map((value) => normalizeLocale(value)).filter(Boolean))];
}

function normalizeLocale(value) {
  const locale = String(value ?? "").trim().replace(/_/g, "-");
  return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) ? locale : "";
}

function getParentLocale(locale) {
  return String(locale).split("-")[0] || locale;
}

function fallbackChain(locale, defaultLocale) {
  const chain = collectLocales([locale, getParentLocale(locale), defaultLocale]);
  return chain.length > 0 ? chain : [DEFAULT_LOCALE];
}

function firstLocalizedText(localizedText) {
  return Object.values(localizedText).find((text) => typeof text === "string" && text.length > 0) ?? "";
}

function compactWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
