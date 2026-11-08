/** @file CSS的固定PostCSS解析边界，返回原生AST而非JSON。 @lang en Fixed PostCSS parsing boundary returning a native AST rather than JSON. */
import postcss from "postcss";

/**
 * @lang zh-CN 使用固定PostCSS样式表解析器解析显式文本，返回调用方可变的原生AST与相对来源记录。
 * @lang en Parses explicit text with the fixed PostCSS stylesheet parser, returning a caller-mutable native AST and relative provenance record.
 * @param {string} source <lang><zh-CN>显式CSS文本。</zh-CN><en>Explicit CSS text.</en></lang>
 * @param {Object} [options] <lang><zh-CN>解析来源配置。</zh-CN><en>Parser source options.</en></lang>
 * @param {string} [options.path="input.css"] <lang><zh-CN>安全相对来源。</zh-CN><en>Safe relative source.</en></lang>
 * @returns {object} <lang><zh-CN>可变原生AST包装与来源，不读文件或加载source map。</zh-CN><en>Mutable native AST wrapper and provenance without file reads or source-map loading.</en></lang>
 * @throws {TypeError|Error} <lang><zh-CN>路径固定拒绝；原生语法错误可能携带源码/路径，公开前须处理。</zh-CN><en>Fixed path refusal; native syntax errors may contain source/paths and must be handled before disclosure.</en></lang>
 */
export function parseCss(source, options = {}) {
  // <lang><zh-CN>来源先做词法边界检查，不解析为本机文件。</zh-CN><en>Check the source locator lexically before parsing, never resolving it to a local file.</en></lang>
  const sourcePath = normalizeSourcePath(options.path ?? "input.css");
  // <lang><zh-CN>固定stylesheet parser，关闭外部映射读取，root由调用方拥有并可变。</zh-CN><en>Use the fixed stylesheet parser with external map loading disabled; the caller owns the mutable root.</en></lang>
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

/**
 * @lang zh-CN 返回PostCSS节点原始source对象引用或null，位置沿用解析器原生表示。
 * @lang en Returns a PostCSS node's original source object reference or null, retaining the parser's native location representation.
 * @param {object} node <lang><zh-CN>原生PostCSS节点。</zh-CN><en>Native PostCSS node.</en></lang> @returns {object|null} <lang><zh-CN>同一个source引用或null，不拷贝/规范化坐标，无I/O。</zh-CN><en>The same source reference or null, without coordinate copying/normalization or I/O.</en></lang>
 */
export function getCssNodeLocation(node) {
  return node?.source ?? null;
}

/**
 * @lang zh-CN 将来源定位器转换为正斜杠相对路径，并以词法规则拒绝空值、URI、盘符、绝对及父级路径。
 * @lang en Normalizes a source locator to a slash-separated relative path and lexically refuses empty values, URIs, drive-qualified, absolute and parent paths.
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
