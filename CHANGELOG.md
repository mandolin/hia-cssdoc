# Changelog

## Unreleased — Original source fragments

- Slice proven PostCSS rule fragments at inclusive UTF-16 coordinates from the
  original text. Preserve CRLF, standalone CR, tabs and whitespace without
  including same-line neighbors; index source lines once per conversion.
- Retain references without fabricated fragments for unproven, partial,
  reversed, out-of-bounds or foreign-source ranges. Report design-token source
  language as JSON. Existing exact old/current readers and map rules remain.
- Ship adapter API/compatibility responsibilities and check them in pack output.
- Omit absent optional fields instead of returning `undefined`, so direct core
  JSON validation no longer depends on serialization discarding invalid values.
- 中文：修复片段整行截取和虚假精度，补随包责任文档；包版本/private未变，
  不代表八包最终候选通过或 npm 发布。

## Unreleased — Coordinated CSS contracts

- Add extraction/config/artifact profile `1.0.0`, exact legacy JSON reading,
  original schema archives, four schema JSON exports and explicit pure,
  lossless migration APIs. Current readers reject unknown or invalid inputs.
- Align the new config required list with existing loader defaults. Keep the
  historical schema and document its difference from compatible old reading.
- Validate local bundled schemas with pinned Ajv; preserve original parser
  dependency identities and source precision declarations.
- 中文：按确认方案协调自有三项身份，保持旧读和无损迁移；包仍private0.0.0，
  本项不声明npm发布或全部CSS/DTCG语法支持。

## Unreleased — Declared boundaries and producer contracts

- Enforce declared boolean/language/profile constraints, refuse inherited tag
  names and URI/drive-relative source locators, and keep raw arguments,
  configuration text and paths out of public failure messages.
- Adopt the approved producer descriptor/result `1.0.0` contracts while
  preserving CSSDoc extraction/config/profile `0.1.0-draft` and map `1.1.0`.
- Include local MIT licenses and explicit source/document allow-lists in all
  eight package archives; check all eight with the pack gate.
- 中文：本批修复已有声明与公开错误边界，补齐八包实际许可分发；自有契约和
  private/0.0.0 保持，首次公开候选及 npm 发布尚未完成。

## Unreleased — Supported runtime baseline

- 源清单、锁与本地/CI运行基线对齐Node.js 22.23.4和24.22.1，两平台门禁及拒绝漂移检查同步；旧已发布工件不改写，本次不发布npm。
- Align current source, locks and local/CI runtime floors on Node.js 22/24, with Windows/Ubuntu checks and drift rejection. Existing published archives remain separate; no npm release is announced.


## 0.0.0

- Added `@hia-doc/cssdoc-runner` with programmatic API, versioned JSON config/schema and `cssdoc` CLI.
- Added `@hia-doc/cssdoc-producer` for `documentation-producer@0.1.0-draft` integration.
- Added CSS/PostCSS/DTCG standalone examples and direct-source doc-source-map output.
- Updated the design-token bridge for DTCG 2025.10 `$root` and inherited `$type` semantics.
- Expanded the release gate to validate standalone output and every workspace package pack.
- Added the first CSSDoc foundation slice with PostCSS parser wrapping, unprefixed annotation extraction, design-token bridge, extraction artifact output and HIA core adapter.
- Added fixture coverage and release gate tests.
