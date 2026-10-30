# CSSDoc Tests

`candidate.test.mjs` checks all eight source manifests and packaged responsibility
documents, runtime provenance, metadata/order/dependency negative cases, actual
public API coverage, explicit publication refusal and real token id collisions.
It never publishes or changes repository manifests during tests.

中文：候选反例先红后绿，不能把元数据改号当真实分发或正式版验收。

Tests cover parser/extractor output, adapter mapping, source-range evidence and
standalone generation. `boundary.test.mjs` adds declared boolean/language/profile
checks, safe public failures, relative locators, tag ownership, producer identity
and package-local licensing. Run `npm run release:gate` on either supported Node
line. These tests do not qualify complete CSS/DTCG semantics or a new wire version.

中文：边界反例与原有生成链一起纳入常驻门禁，不能以本批通过替代全部首版候选验收。

`source-fragment.test.mjs` follows the real parser/extractor/adapter/map chain for
old/current artifacts, neighboring and nested rules, multiple annotations,
LF/CRLF/standalone CR, UTF-16, unavailable bodies and incomplete or unproven
locations. It verifies exact original substrings and unchanged inputs; it does
not promote unknown coordinate conventions to proven ones.

中文：片段反例独立核原文及来源边界，适用于内容精度，不替代可见界面设计验收。
