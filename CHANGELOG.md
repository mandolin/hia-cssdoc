# Changelog

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
