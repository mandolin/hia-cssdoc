/**
 * @file CSSDoc 原文片段与既有包含式 UTF-16 规则的实际链回归。
 * @lang en Regresses original CSSDoc fragments against the established inclusive UTF-16 rule convention.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { cssExtractionToHiaDocument } from "../packages/css-doc-adapter/src/index.mjs";
import { extractCssDoc } from "../packages/css-doc-extractor/src/index.mjs";
import { createCssDocumentationSourceMap } from "../packages/css-doc-source-map/src/index.mjs";
import { designTokensToCssExtraction } from "../packages/design-token-bridge/src/index.mjs";
import { parseCss } from "../packages/css-parser/src/index.mjs";

test("PostCSS standalone CR occupies columns rather than advancing a line", () => {
  // <lang><zh-CN>独立原文offset断言证明特殊换行，不从adapter结果反推期望。</zh-CN><en>Independent source-offset assertions prove the unusual newline handling without deriving expectations from the adapter.</en></lang>
  const source = "/** @component CR */.cr{\rcontent:'🔥';\r}";
  const rule = parseCss(source).root.nodes[1];
  assert.deepEqual(rule.source.start, { offset: source.indexOf(".cr"), line: 1, column: source.indexOf(".cr") + 1 });
  assert.deepEqual(rule.source.end, { offset: source.length, line: 1, column: source.length });
});

// <lang><zh-CN>同一真实输入覆盖两个精确受支持身份，不通过迁移来掩盖旧读。</zh-CN><en>The same real input covers both exactly supported identities without migration masking legacy reading.</en></lang>
for (const version of ["0.1.0-draft", "1.0.0"]) {
  for (const newline of ["\n", "\r\n", "\r"]) {
    test(`fragments preserve ${JSON.stringify(newline)} and adjacent UTF-16 rules / ${version}`, () => {
      // <lang><zh-CN>首尾同行邻居与非BMP字符同时区分整行截取、trim和码点列错误。</zh-CN><en>Same-line neighbors and astral characters distinguish whole-line, trimming and code-point mistakes.</en></lang>
      const first = `.first {${newline}\tcontent: '🔥';  ${newline}  }`;
      const second = ".second { color: blue; }";
      const source = `/** @component First 🔥 */${first}/** @component Second */${second}  `;
      // <lang><zh-CN>由实际解析器生成来源证据；仅切换受支持 wire/profile 身份。</zh-CN><en>The real parser generates provenance; only the supported wire/profile identities vary.</en></lang>
      const extraction = extractCssDoc(source, { path: "fixtures/fragments.css", sourcesContentPolicy: "embed" });
      extraction.contractVersion = version;
      extraction.profile.version = version;
      const before = structuredClone(extraction);
      const document = cssExtractionToHiaDocument(extraction);
      const map = createCssDocumentationSourceMap({ extraction });
      assert.deepEqual(document.symbols.map((symbol) => symbol.source.fragments[0]?.content), [first, second]);
      assert.deepEqual(extraction, before);
      for (const [index, symbol] of document.symbols.entries()) {
        assert.equal(symbol.source.fragments.length, 1);
        assert.equal(symbol.source.fragments[0].confidence, "high");
        assert.equal(symbol.source.fragments[0].rangeSource, "parser");
        assert.deepEqual(symbol.source.fragments[0].range, map.entries[index].sourceRefs[0].range);
        assert.deepEqual(map.entries[index].sourceRefs[0].rangeConvention, { endBoundary: "inclusive", columnUnit: "utf16-code-unit" });
      }
    });
  }

  test(`nested rule projects one exact fragment to multiple annotation symbols / ${version}`, () => {
    // <lang><zh-CN>父规则之外的包裹结构不能混入，同行多标签共用同一原文目标。</zh-CN><en>Outer wrappers must stay out; multiple comment tags project onto the same original target.</en></lang>
    const expected = ".card { content: '🔥'; }";
    const extraction = extractCssDoc(`@media screen {\r\n/**\n * @component Card\n * @selector .card\n */${expected}\r\n}`, { path: "nested.css", sourcesContentPolicy: "embed" });
    extraction.contractVersion = version;
    extraction.profile.version = version;
    assert.equal(extraction.symbols.length, 2);
    assert.deepEqual(cssExtractionToHiaDocument(extraction).symbols.map((symbol) => symbol.source.fragments[0]?.content), [expected, expected]);
  });
}

// <lang><zh-CN>正常schema允许不完整或未知范围；它们不应异常、夹取或得到虚假的高置信片段。</zh-CN><en>The schema allows partial or unknown ranges; they must not throw, clamp or receive falsely high-confidence fragments.</en></lang>
const variants = [
  ["no end", (artifact) => { delete artifact.symbols[0].source.range.end; }],
  ["no start column", (artifact) => { delete artifact.symbols[0].source.range.start.column; }],
  ["no end column", (artifact) => { delete artifact.symbols[0].source.range.end.column; }],
  ["null range", (artifact) => { artifact.symbols[0].source.range = null; }],
  ["reversed range", (artifact) => { artifact.symbols[0].source.range.end = { line: 1, column: 1 }; }],
  ["line outside source", (artifact) => { artifact.symbols[0].source.range.end.line = 1000; }],
  ["column outside source", (artifact) => { artifact.symbols[0].source.range.end.column = 1000; }],
  ["different source path", (artifact) => { artifact.symbols[0].source.path = "other.css"; }],
  ["unknown parser", (artifact) => { artifact.metadata.parser.name = "unproven"; }],
  ["unknown parser mode", (artifact) => { artifact.metadata.parser.mode = "unproven"; }],
  ["Vue style source", (artifact) => { artifact.source.kind = "vue-style"; }],
  ["no embedded content", (artifact) => { delete artifact.source.sourcesContent; }]
];
for (const [name, modify] of variants) {
  test(`no fabricated fragment: ${name}`, () => {
    // <lang><zh-CN>每例独立真实提取件，仅变更要核查的一个来源/坐标条件。</zh-CN><en>Each case has a fresh real extraction with just the provenance/coordinate condition under review changed.</en></lang>
    const extraction = extractCssDoc("/** @component Probe */.probe{}", { path: "probe.css", sourcesContentPolicy: "embed" });
    modify(extraction);
    const before = structuredClone(extraction);
    const document = cssExtractionToHiaDocument(extraction);
    assert.deepEqual(document.symbols[0].source.fragments, []);
    assert.deepEqual(extraction, before);
    assert.equal(document.symbols[0].source.definedIn.relativePath, extraction.symbols[0].source.path);
  });
}

test("unprobed declaration and at-rule retain references without exact fragments", () => {
  // <lang><zh-CN>按既有ADR仅rule实链有终点证明，不能把来源类别当作其它节点的证明。</zh-CN><en>Only the established rule chain proves endpoints; parser provenance cannot prove other node kinds.</en></lang>
  const extraction = extractCssDoc("/** @media print */@media print {} .host { /** @cssprop color */color:red; }", { path: "unknown.css", sourcesContentPolicy: "embed" });
  assert.deepEqual(extraction.symbols.map((symbol) => symbol.metadata.target.type), ["atrule", "decl"]);
  assert.deepEqual(cssExtractionToHiaDocument(extraction).symbols.map((symbol) => symbol.source.fragments), [[], []]);
});

test("synthetic design-token locations are JSON references without invented content", () => {
  // <lang><zh-CN>JSON正文即使存在，也不能将合成1:1范围升级为parser/high。</zh-CN><en>Even available JSON text cannot upgrade synthetic 1:1 ranges to parser/high.</en></lang>
  const extraction = designTokensToCssExtraction({ color: { $type: "color", $value: "#123456" } }, { path: "theme.json" });
  extraction.source.sourcesContent = '{"color":{"$type":"color","$value":"#123456"}}';
  const document = cssExtractionToHiaDocument(extraction);
  assert.equal(document.symbols[0].source.definedIn.language, "json");
  assert.deepEqual(document.symbols[0].source.fragments, []);
  assert.deepEqual(document.symbols[0].source.definedIn.range, extraction.symbols[0].source.range);
});
