# CSS Doc Extractor API

中文：从实际CSS及其显式注释生成CSSDoc JSON；不会把所有选择器自动升级为文档符号。

## Public exports

- `extractCssDoc(source, options?)`: parses source and projects supported explicit
  CSSDoc annotations attached to the next documentable rule/declaration/at-rule.
- `parseCssDocComment(rawComment, options?)`: parses a comment body into
  annotations, summary and optional field-level i18n without parsing CSS.

Only `.` is exported; no binary or JSON resource subpaths.

## Inputs

Use a CSS string plus ordinary options `path`, `defaultLocale`,
`sourcesContentPolicy`. Comment parsing stringifies its body; provide text, not
objects with custom coercion. Both APIs accept a locale option.
Supported symbol tags are component/selector/modifier/cssprop/token/layer/media/
container/keyframes. `description`, canonical `@lang` and inline `<lang>/<l>`
provide text/i18n. Recognition in the spec's tag list is not a promise to emit
an independent symbol for every tag, e.g. `example`.

## Returns

Extraction produces `hia-cssdoc-extraction@1.0.0`, artifact profile `cssdoc@1.0.0`,
producer version `1.0.0`, symbols/annotations/diagnostics and a source-map ref.
Comment parsing returns `{ annotations, summary, i18n }`; absent prose yields
null summary/i18n. It is a comment parse result, not itself an extraction artifact.
New objects are allocated; source/annotation records can be shared among
symbols projected from one target. Clone before mutating shared nested data.

## Defaults

Path `input.css`, normalized default locale `en`, source-content policy `none`.
Only `embed` places the supplied full source in `source.sourcesContent`;
`reference` and `none` retain no body. A component parents supported secondary
annotations from that block. Repeated CSS symbol slugs receive numeric suffixes
within the call; unattached comments create no symbols.

## Errors

Path/policy failures use fixed TypeErrors; raw PostCSS syntax errors propagate
and may contain source/path data. Unknown syntactically valid annotation tags
can yield `CSSDOC_UNKNOWN_TAG` warnings with tag text. The API is an extractor,
not a general schema validator for arbitrary option objects.

## Effects

Synchronous in-memory parsing only, no reads/writes/network, plugins, file
discovery or publish action. Default extraction does not embed source.

## Compatibility

New output uses the current wire/profile pair; the spec's explicit migration
and exact readers retain `0.1.0-draft`. See [migration](MIGRATION.md). This is a
bounded CSSDoc subset, not complete CSS/Sass/DTCG semantic validation.

## Source linkage

Attached comments retain annotation locations; generated symbols point to the
target node. Multiple symbols may project the same target range. Only the
established PostCSS rule chain proves inclusive UTF-16 bounds; downstream maps
declare other targets unknown, and adapters emit no invented exact fragment.

## Privacy

The caller must authorize source embedding and publication of prose, tags and
diagnostics. Lexical source checks do not sanitize arbitrary CSS or annotation
text, and raw parser errors are not safe public error messages.
