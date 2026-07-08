import postcss from "postcss";

export function parseCss(source, options = {}) {
  const sourcePath = normalizeSourcePath(options.path ?? "input.css");
  const root = postcss.parse(source, {
    from: sourcePath,
    map: false
  });

  return {
    kind: "postcss-css",
    parser: {
      name: "postcss",
      mode: "stylesheet"
    },
    source: {
      path: sourcePath
    },
    root,
    diagnostics: []
  };
}

export function getCssNodeLocation(node) {
  return node?.source ?? null;
}

export function normalizeSourcePath(sourcePath) {
  const normalized = String(sourcePath).replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`Unsafe CSSDoc source path: ${sourcePath}`);
  }
  return normalized;
}
