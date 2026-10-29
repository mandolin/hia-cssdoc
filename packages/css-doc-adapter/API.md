# CSS Doc Adapter API

中文摘要：将精确支持的新旧 CSSDoc JSON 提取件投影为核心文档；同源、已证
PostCSS rule 的片段逐字符保留，未知范围只保留定位。适配器没有 I/O，不读取源码。

## Public exports

| Export | Responsibility |
| --- | --- |
| `cssExtractionToHiaDocument(artifact, options?)` | Validates an exact supported extraction and projects its symbols into a fresh HIA core document. It does not migrate or rewrite the input. |
| `assertCssExtractionArtifact(artifact)` | Validates the supported JSON structure and declared relative locators; returns `undefined` on success, throws a fixed `TypeError` on refusal. |

The only package export is `.`. There are no binaries or schema subpaths in this
package. Schema selectors, validators and migration APIs belong to
`@hia-doc/cssdoc-spec`.

## Inputs

`artifact` is an ordinary JSON `hia-cssdoc-extraction`, with matching extraction
and artifact profile versions: exact `0.1.0-draft` or `1.0.0`. JSON extension
fields remain supported by their schema. Unknown versions, malformed structures,
non-JSON values and unsafe declared source locators are refused.

`options` is an ordinary object. Optional `id`, `title`, `defaultLocale` and
`locales` customize document identity and locale selection. The adapter does not
validate these overrides as a complete core document: callers are responsible
for choosing suitable values and using the core validator downstream.

## Returns

The conversion returns `hia-core-document` shape `schemaVersion: "0.2.0"`, a root
node, a new symbols array, source links and source-contract metadata. Each source
uses `hia-source@0.2.0`, `mode: "link"`. Design-token source language is `json`;
CSS and Vue-style source language is `css`.

The result is **not a deep clone**. Symbol i18n, ranges and annotation objects,
diagnostic arrays, producer/source-map metadata and nested symbol metadata can
share references with the input. The conversion itself never changes them;
clone before mutating nested output data.

## Defaults

- Document id: `cssdoc:<artifact.source.path>`.
- Title: source filename, unless explicitly overridden.
- Default locale: override, then artifact locale, then `en`.
- Locales: normalized, deduplicated union of default, override, artifact and
  symbol locales; underscores normalize to hyphens and invalid locale strings
  are omitted.
- A missing symbol range preserves the existing reference fallback at `1:1`,
  with no source fragment. This fallback is not a claim of exact source extent.

## Errors

Invalid extraction input throws
`TypeError("Unsupported or invalid CSSDoc extraction.")`; raw schema errors are
not copied into the public message. A schema-valid but incomplete, reversed or
out-of-bounds range yields no fragment; it does not cause a slicing exception or
clamping. Reference ranges are retained for downstream consumers to assess.

## Effects

Conversion and assertion perform no filesystem, network, source resolution,
execution or publication. A provided source string is indexed once per document;
fragments are slices of that original text. No source text is fetched from paths
or schema URLs. Shared output references have the ownership limitation above.

## Compatibility

Exact old/current artifacts use the same conversion. No migration is implicit;
the source contract version remains in document metadata. Package version,
extraction/profile version and core/source-model versions are independent.
See [migration notes](MIGRATION.md) for the corrected fragment behavior.

## Source linkage

Only the established rule provenance obtains a precise fragment: source kind
`css`, parser `postcss` in `stylesheet` mode, target type `rule`, symbol path equal
to artifact source path, available `source.sourcesContent`, and complete,
in-bounds positive integer line/column coordinates. The rule convention matches
the CSS doc-source-map writer's `1.1.0`: one-based, **inclusive UTF-16** columns.
PostCSS counts lines at LF only; CR in CRLF remains in the original text, and a
standalone CR occupies a column. The slice preserves all content inside the
range, including CRLF, tabs, astral characters and whitespace; it never includes
same-line neighbors or the attached documentation comment outside the range.

Declarations, at-rules, Vue style locations, synthetic design-token `1:1`
locations, unknown parser provenance, missing columns, foreign source paths and
invalid ranges receive **no exact fragment**. Their reference information is
retained. No coordinate proof is inferred from a tag name, artifact version or
the availability of source text alone. Multiple annotations on a rule project
the same exact source fragment into their separate symbol identities.

## Privacy

The adapter consumes only explicitly supplied content; normal extraction with
`none` or `reference` does not supply a body and creates no fragments. A body
already present in an imported artifact is caller-supplied data, not a new
authorization check. Callers must authorize and sanitize embedded source,
summaries, annotations, extensions and diagnostics before publication. Valid
relative paths are a lexical boundary, not a filesystem or symlink sandbox.
Fixed validation errors do not make the accepted artifact itself public-safe.
