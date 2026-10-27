/**
 * @file
 * 用真实 PostCSS 节点与 design-token bridge 输出检验 CSSDoc 源码范围边界。
 * 测试只比较当前提取结果，不提升旧版映射工件的契约身份。
 *
 * @lang en Checks CSSDoc source-range boundaries from real PostCSS nodes and the design-token bridge. These tests inspect current extraction without upgrading the legacy map contract.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { extractCssDoc } from "../packages/css-doc-extractor/src/index.mjs";
import { parseCss } from "../packages/css-parser/src/index.mjs";
import { createCssDocumentationSourceMap } from "../packages/css-doc-source-map/src/index.mjs";
import { designTokensToCssExtraction } from "../packages/design-token-bridge/src/index.mjs";

/**
 * 将源码中的 UTF-16 偏移转换为一基行列，供解析器输出独立对照。
 * CRLF 算一次换行；码点对照刻意与 JavaScript 字符串长度区分。
 *
 * @lang en Converts a UTF-16 source offset to a one-based line and column for an independent parser comparison. CRLF counts as one newline; code-point mode deliberately differs from JavaScript string length.
 * @param {string} source <lang><zh-CN>完整 CSS 文本。</zh-CN><en>Complete CSS text.</en></lang>
 * @param {number} offset <lang><zh-CN>待定位字符的零基 UTF-16 偏移。</zh-CN><en>Zero-based UTF-16 offset of the character to locate.</en></lang>
 * @param {"utf16" | "codepoint"} unit <lang><zh-CN>列的计数单位。</zh-CN><en>Column counting unit.</en></lang>
 * @returns {{line: number, column: number}} <lang><zh-CN>一基坐标；越界偏移由调用测试负责排除。</zh-CN><en>One-based position; callers exclude out-of-range offsets.</en></lang>
 */
function positionAt(source, offset, unit) {
  // <lang><zh-CN>只统计字符之前的前缀，避免用解析器报告的坐标反推期望值。</zh-CN><en>Count only the prefix before the character instead of deriving expectations from parser coordinates.</en></lang>
  const lines = source.slice(0, offset).split(/\r\n|\r|\n/);
  const prefix = lines.at(-1);
  return {
    line: lines.length,
    column: (unit === "utf16" ? prefix.length : Array.from(prefix).length) + 1
  };
}

// <lang><zh-CN>注释和规则跨 CRLF，代理对分别位于两个末端之前，足以区分 UTF-16 与码点列。</zh-CN><en>CRLF separates the comment and rule, while astral characters before both ends distinguish UTF-16 columns from code-point columns.</en></lang>
test("PostCSS comment and rule ends are inclusive UTF-16 positions", () => {
  const source = "/** @component RangeProbe 🔥 */\r\n.range-probe {\r\n  content: '🔥'; }\r\n";
  const parsed = parseCss(source, { path: "fixtures/range.css" });
  const extraction = extractCssDoc(source, { path: "fixtures/range.css" });
  const [comment, rule] = parsed.root.nodes;
  const symbol = extraction.symbols.find((item) => item.name === "RangeProbe");
  const commentLastOffset = source.indexOf("*/") + 1;
  const ruleLastOffset = source.indexOf("}");

  assert.ok(symbol);
  assert.equal(comment.type, "comment");
  assert.equal(rule.type, "rule");
  // <lang><zh-CN>PostCSS 的 end.offset 在末字符之后，而 end.column 指向末字符；两个字段不能当作同一种终点。</zh-CN><en>PostCSS end.offset follows the last character while end.column points at it; the two fields use different end conventions.</en></lang>
  assert.equal(comment.source.end.offset, commentLastOffset + 1);
  assert.equal(rule.source.end.offset, ruleLastOffset + 1);
  assert.deepEqual(comment.source.end, { offset: commentLastOffset + 1, ...positionAt(source, commentLastOffset, "utf16") });
  assert.deepEqual(rule.source.end, { offset: ruleLastOffset + 1, ...positionAt(source, ruleLastOffset, "utf16") });
  assert.deepEqual(symbol.annotation.range.end, positionAt(source, commentLastOffset, "utf16"));
  assert.deepEqual(symbol.source.range.end, positionAt(source, ruleLastOffset, "utf16"));
  assert.notDeepEqual(symbol.annotation.range.end, positionAt(source, commentLastOffset, "codepoint"));
  assert.notDeepEqual(symbol.source.range.end, positionAt(source, ruleLastOffset, "codepoint"));
});

// <lang><zh-CN>同一行相邻节点验证包含式终点停在前一个字符，后继起点前进一列。</zh-CN><en>Adjacent nodes on one line show that an inclusive end stays on the preceding character and the next start advances one column.</en></lang>
test("adjacent CSSDoc comments and rules keep distinct boundary positions", () => {
  const source = "/** @component Alpha */.a{color:red}/** @component Beta */.b{color:blue}";
  const parsed = parseCss(source, { path: "fixtures/adjacent.css" });
  const extraction = extractCssDoc(source, { path: "fixtures/adjacent.css" });
  const manifest = createCssDocumentationSourceMap({ extraction });
  const [firstComment, firstRule, secondComment, secondRule] = parsed.root.nodes;

  assert.deepEqual(parsed.root.nodes.map((node) => node.type), ["comment", "rule", "comment", "rule"]);
  assert.deepEqual(extraction.symbols.map((symbol) => symbol.name), ["Alpha", "Beta"]);
  assert.equal(firstComment.source.end.column + 1, firstRule.source.start.column);
  assert.equal(firstRule.source.end.column + 1, secondComment.source.start.column);
  assert.equal(secondComment.source.end.column + 1, secondRule.source.start.column);
  // <lang><zh-CN>写入器目前只透传符号范围；本探针核对数据路径，不把这些坐标自动升级为新契约。</zh-CN><en>The writer currently forwards symbol ranges; this probe checks the data path without automatically upgrading the coordinates to a new contract.</en></lang>
  assert.deepEqual(manifest.entries.map((entry) => entry.sourceRefs[0].range), extraction.symbols.map((symbol) => symbol.source.range));
});

// <lang><zh-CN>两枚不同 token 共用同一人工坐标，证明该占位值不能证明任一 token 的精确源码边界。</zh-CN><en>Two distinct tokens share one synthetic coordinate, so that placeholder cannot prove either token's exact source boundary.</en></lang>
test("design-token bridge 1:1 range remains synthetic provenance", () => {
  const extraction = designTokensToCssExtraction({
    color: {
      primary: { $type: "color", $value: "#123456" },
      secondary: { $type: "color", $value: "#abcdef" }
    }
  }, { path: "tokens/theme.json" });
  const manifest = createCssDocumentationSourceMap({ extraction });
  const placeholder = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

  assert.deepEqual(extraction.symbols.map((symbol) => symbol.name), ["color.primary", "color.secondary"]);
  for (const symbol of extraction.symbols) {
    assert.deepEqual(symbol.source.range, placeholder);
  }
  for (const entry of manifest.entries) {
    assert.equal(entry.sourceRefs[0].rangeSource, "adapter");
    assert.deepEqual(entry.sourceRefs[0].range, placeholder);
  }
});
