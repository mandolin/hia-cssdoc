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

/**
 * @param {unknown} sourcePath <lang><zh-CN>调用方显式来源定位器。</zh-CN><en>Explicit caller source locator.</en></lang>
 * @returns {string} <lang><zh-CN>正斜杠安全相对路径；仅词法检查，不是symlink沙箱。</zh-CN><en>Slash-normalized safe relative path; lexical validation, not a symlink sandbox.</en></lang>
 * @throws {TypeError} <lang><zh-CN>非字符串/URI/盘符/父级路径固定拒绝，不回显输入。</zh-CN><en>Fixed refusal of nonstrings, URIs, drive and parent paths without echoing input.</en></lang>
 */
export function normalizeSourcePath(sourcePath) {
  // <lang><zh-CN>来源边界在生成前拒绝私有定位器，不将其写进错误。</zh-CN><en>Reject private locators before generation without copying them into errors.</en></lang>
  const normalized = typeof sourcePath === "string" ? sourcePath.replaceAll("\\", "/") : "";
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError("Unsafe CSSDoc source path.");
  }
  return normalized;
}
