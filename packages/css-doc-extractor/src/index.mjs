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

export function extractCssDoc(source, options = {}) {
  const sourcePath = normalizeSourcePath(options.path ?? "input.css");
  const defaultLocale = normalizeLocale(options.defaultLocale) || DEFAULT_LOCALE;
  const parsed = parseCss(source, { path: sourcePath });
  const pairs = collectAttachedCommentPairs(parsed.root);
  const symbols = [];
  const annotations = [];
  const diagnostics = [...parsed.diagnostics];
  const usedIds = new Set();

  for (const pair of pairs) {
    const block = parseCssDocComment(pair.comment.text ?? "", { defaultLocale });
    if (block.annotations.length === 0) {
      continue;
    }

    const target = createTargetInfo(pair.node, sourcePath);
    annotations.push({
      tags: block.annotations,
      source: target.source,
      annotation: toAnnotationRange(pair.comment)
    });

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
      version: "0.0.0"
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

export function parseCssDocComment(rawComment, options = {}) {
  const lines = String(rawComment)
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, "").trim());

  const annotations = [];
  const prose = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }
    const match = /^@([A-Za-z][\w-]*)(?:\s+(.*))?$/.exec(line);
    if (!match) {
      prose.push(line);
      continue;
    }
    const tag = normalizeTag(match[1]);
    const value = (match[2] ?? "").trim();
    annotations.push({
      tag,
      value,
      known: isCssDocTag(tag)
    });
  }

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
  const symbol = {
    id,
    kind,
    name,
    summary: i18n?.fields.description?.defaultText ?? summary,
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
