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

export function extractCssDoc(source, options = {}) {
  const sourcePath = normalizeSourcePath(options.path ?? "input.css");
  const parsed = parseCss(source, { path: sourcePath });
  const pairs = collectAttachedCommentPairs(parsed.root);
  const symbols = [];
  const annotations = [];
  const diagnostics = [...parsed.diagnostics];
  const usedIds = new Set();

  for (const pair of pairs) {
    const block = parseCssDocComment(pair.comment.text ?? "");
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
      const symbol = createSymbolFromAnnotation(parentAnnotation, target, pair.comment, block, usedIds);
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
      symbols.push(createSymbolFromAnnotation(annotation, target, pair.comment, block, usedIds, parentId));
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

export function parseCssDocComment(rawComment) {
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

  const descriptionTag = annotations.find((annotation) => annotation.tag === "description");
  return {
    annotations,
    summary: descriptionTag?.value || prose.join(" ").trim() || null
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

function createSymbolFromAnnotation(annotation, target, comment, block, usedIds, parentId = null) {
  const kind = getCssDocSymbolKind(annotation.tag);
  const name = getAnnotationName(annotation, target);
  const id = allocateId(`css:${annotation.tag}:${slug(name)}`, usedIds);
  const symbol = {
    id,
    kind,
    name,
    summary: annotation.tag === "component" ? block.summary ?? undefined : getAnnotationDescription(annotation),
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
  return symbol;
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
