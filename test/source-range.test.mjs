/**
 * @file
 * 用真实 PostCSS 节点与 design-token bridge 输出检验 CSSDoc 源码范围边界。
 * 同时检验新版映射逐引用声明已证和未知的范围语义。
 *
 * @lang en Checks CSSDoc source-range boundaries from real PostCSS nodes and the design-token bridge, including proven and unknown per-reference conventions in the new map.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { extractCssDoc } from "../packages/css-doc-extractor/src/index.mjs";
import { parseCss } from "../packages/css-parser/src/index.mjs";
import {
  CSS_DOC_SOURCE_MAP_CONTRACT_VERSION,
  createCssDocumentationSourceMap
} from "../packages/css-doc-source-map/src/index.mjs";
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

// <lang><zh-CN>真实 @media 子树的注释规则也必须从原文独立证明起止列，不能只因目标类别为 rule 就相信写入标签。</zh-CN><en>A commented rule inside a real @media subtree must prove its endpoints against source text, not rely on its rule type alone.</en></lang>
test("nested PostCSS rule keeps independently measured UTF-16 endpoints", () => {
  // <lang><zh-CN>CRLF 分行，注释与声明中的非 BMP 字符分别让规则起列和终列区别于码点计数。</zh-CN><en>CRLF separates lines; astral characters in the comment and declaration distinguish both rule columns from code-point counts.</en></lang>
  const source = "@media screen {\r\n  /** @component Nested 🔥 */.card { content: '🔥'; }\r\n}\r\n";
  // <lang><zh-CN>使用实际解析及提取链，不手造目标节点或映射引用。</zh-CN><en>Use the actual parser and extraction chain rather than fabricated target nodes or map references.</en></lang>
  const parsed = parseCss(source, { path: "fixtures/nested.css" });
  const extraction = extractCssDoc(source, { path: "fixtures/nested.css" });
  const manifest = createCssDocumentationSourceMap({ extraction });
  // <lang><zh-CN>原文偏移作为独立真值；PostCSS 的 end.offset 是末字符之后的位置。</zh-CN><en>Source-text offsets are independent expectations; PostCSS end.offset follows the last character.</en></lang>
  const startOffset = source.indexOf(".card");
  const endOffset = source.indexOf("}", startOffset);
  const rule = parsed.root.nodes[0]?.nodes?.[1];
  const symbol = extraction.symbols.find((item) => item.name === "Nested");
  const ref = manifest.entries.find((entry) => entry.symbolId === symbol?.id)?.sourceRefs[0];

  assert.equal(parsed.root.nodes[0]?.type, "atrule");
  assert.equal(rule?.type, "rule");
  assert.equal(symbol?.metadata.target.type, "rule");
  assert.equal(extraction.symbols.length, 1);
  assert.equal(startOffset >= 0 && endOffset > startOffset, true);
  assert.deepEqual(rule.source.start, { offset: startOffset, ...positionAt(source, startOffset, "utf16") });
  assert.deepEqual(rule.source.end, { offset: endOffset + 1, ...positionAt(source, endOffset, "utf16") });
  assert.deepEqual(symbol.source.range, {
    start: positionAt(source, startOffset, "utf16"),
    end: positionAt(source, endOffset, "utf16")
  });
  assert.deepEqual(ref.range, symbol.source.range);
  assert.deepEqual(ref.rangeConvention, { endBoundary: "inclusive", columnUnit: "utf16-code-unit" });
  assert.equal(ref.rangeSourceDetail, "postcss-rule-location");
  assert.notDeepEqual(ref.range.start, positionAt(source, startOffset, "codepoint"));
  assert.notDeepEqual(ref.range.end, positionAt(source, endOffset, "codepoint"));
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
  // <lang><zh-CN>仅规则范围获得实测的包含式 UTF-16 语义，并与产物契约版本同步。</zh-CN><en>Only probed rule ranges receive inclusive UTF-16 semantics, synchronized with the artifact contract identity.</en></lang>
  assert.equal(manifest.contractVersion, CSS_DOC_SOURCE_MAP_CONTRACT_VERSION);
  assert.deepEqual(manifest.entries.map((entry) => entry.sourceRefs[0].range), extraction.symbols.map((symbol) => symbol.source.range));
  for (const entry of manifest.entries) {
    assert.deepEqual(entry.sourceRefs[0].rangeConvention, { endBoundary: "inclusive", columnUnit: "utf16-code-unit" });
    assert.equal(entry.sourceRefs[0].rangeSourceDetail, "postcss-rule-location");
    assert.equal(entry.sourceRefs[0].confidence, "high");
  }
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
    assert.equal(entry.sourceRefs[0].rangeSourceDetail, "design-token-placeholder");
    assert.deepEqual(entry.sourceRefs[0].range, placeholder);
    assert.deepEqual(entry.sourceRefs[0].rangeConvention, { endBoundary: "unknown", columnUnit: "unknown" });
    assert.equal(entry.sourceRefs[0].confidence, "low");
  }
});

// <lang><zh-CN>声明与 at-rule 尚无末端/列单位实样证明，不能从 parser 来源类别继承规则结论。</zh-CN><en>Declarations and at-rules lack proven endpoint/unit probes and cannot inherit rule semantics from the parser category.</en></lang>
test("unprobed CSS node kinds declare unknown rather than rule conventions", () => {
  // <lang><zh-CN>同一小型输入同时触发 at-rule 与声明写入分支。</zh-CN><en>A small input exercises both at-rule and declaration writer branches.</en></lang>
  const source = "/** @media print */@media print {} .host { /** @cssprop color */ color: red; }";
  // <lang><zh-CN>原生提取结果保留两种目标类别供逐引用判断。</zh-CN><en>The native extraction retains both target kinds for per-reference decisions.</en></lang>
  const extraction = extractCssDoc(source, { path: "fixtures/unprobed.css" });
  // <lang><zh-CN>映射工件必须显式保留未知精度，不得继承规则分支的已证语义。</zh-CN><en>The map must declare unknown precision rather than inherit the proven rule branch.</en></lang>
  const manifest = createCssDocumentationSourceMap({ extraction });

  assert.deepEqual(extraction.symbols.map((symbol) => symbol.metadata.target.type), ["atrule", "decl"]);
  for (const entry of manifest.entries) {
    assert.equal(entry.sourceRefs[0].rangeSource, "parser");
    assert.equal(entry.sourceRefs[0].rangeSourceDetail, "unproven-css-node-location");
    assert.deepEqual(entry.sourceRefs[0].rangeConvention, { endBoundary: "unknown", columnUnit: "unknown" });
    assert.equal(entry.sourceRefs[0].confidence, "medium");
  }
});

// <lang><zh-CN>外部提取工件可能缺失节点范围；新版契约只允许两个范围字段一起出现。</zh-CN><en>An external extraction artifact may omit a node range; the new contract allows neither range field in that case.</en></lang>
test("unranged CSS reference omits both range and convention", () => {
  // <lang><zh-CN>先获得结构正常的提取工件，再仅移除一个符号的来源范围。</zh-CN><en>Start with a structurally normal extraction, then remove just one symbol's source range.</en></lang>
  const extraction = extractCssDoc("/** @component Missing */.missing{}", { path: "fixtures/missing.css" });
  const symbol = extraction.symbols[0];
  const modified = { ...extraction, symbols: [{ ...symbol, source: { ...symbol.source, range: undefined } }] };
  // <lang><zh-CN>检查实际写出对象的自有字段，而非仅比较 JSON 序列化后的省略效果。</zh-CN><en>Check own fields on the actual output object, not just JSON serialization omission.</en></lang>
  const sourceRef = createCssDocumentationSourceMap({ extraction: modified }).entries[0].sourceRefs[0];

  assert.equal(Object.hasOwn(sourceRef, "range"), false);
  assert.equal(Object.hasOwn(sourceRef, "rangeConvention"), false);
  assert.equal(sourceRef.confidence, "medium");
});
