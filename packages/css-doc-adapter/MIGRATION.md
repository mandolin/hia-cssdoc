# CSS Doc Adapter compatibility

Both `hia-cssdoc-extraction@0.1.0-draft` and `@1.0.0` remain exact supported
inputs. Conversion does not migrate them; use the spec package's explicit pure
migration when needed. No contract version is changed by the fragment fix.

Source fragments now slice **only the precise rule range** from the original
text using the established PostCSS inclusive UTF-16 coordinates. The previous
whole-line `split/join/trim` behavior could include adjacent symbols and change
CRLF/whitespace. Consumers must not depend on those extra characters.

Unknown endpoints, columns or provenance, unprobed declaration/at-rule and Vue
locations, synthetic token locations, foreign source paths and out-of-bounds or
reversed ranges retain references but do not produce an alleged exact fragment.
Design-token references report JSON language. No source is fetched to fill a gap.

Absent optional `parentId`, `summary` and reference `range` properties are omitted
instead of assigned `undefined`, allowing the in-memory result to satisfy the
core ordinary-JSON boundary before any file serialization.

The output remains a shallow projection with shared nested i18n, range, diagnostic
and metadata objects. Clone before mutating output. For complete ownership,
defaults, errors, source precision and privacy responsibilities, see [API](API.md).

中文：修复按整行截取导致的串入邻居与换行损失，不升级契约；未知坐标不生成
高置信片段。新旧读取、调用者提供的正文和输入不变规则保持，详见包内 API。
