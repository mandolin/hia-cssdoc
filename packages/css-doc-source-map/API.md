# CSS Doc Source Map API

中文：以显式工件和逐引用证据生成文档源码映射，不加载或嵌入源码，也不验证外部授权。

## Public exports

- `CSS_DOC_SOURCE_CONTENT_POLICIES`: frozen `none`, `reference`, `embed` list.
- `CSS_DOC_SOURCE_MAP_CONTRACT_VERSION`: current map identity `1.1.0`.
- `normalizeSourcesContentPolicy(policy)`: exact policy or fixed TypeError.
- `createCssDocSourceMapRef(options?)`: creates a ref with href and policy;
  does not fetch or validate the href as a filesystem target.
- `createCssDocumentationSourceMap(options)`: validates `options.extraction`
  as an exact supported CSSDoc JSON artifact, then projects a direct map.

Only `.` is exported; no binary or JSON resource subpaths.

## Inputs

Map options: `extraction`, optional public relative `extractionPath`,
`hiaDocumentPath`, `sourcesContentPolicy`, `id`. Ref options: `href`,
`sourcesContentPolicy`. Use ordinary objects and suitable strings for paths/id.
The writer performs lexical path checks, not file existence or path resolution.

## Returns

The ref is `{ kind: "hia-doc-source-map-ref", href, sourcesContentPolicy }`.
The map is `doc-source-map@1.1.0` with generated artifacts, original source,
chains, entries, privacy and diagnostics. It does not include source bodies.
Maps are new objects but range objects may share input references; clone before
mutating them. A policy label alone is not evidence of embedded or fetched data.

## Defaults

Ref href is `null`, policy `none`. Map paths default to `document.cssdoc.json`
and `document.hia.json`; source language is JSON for design-tokens and CSS
otherwise. Policy uses explicit option, extraction ref policy, then `none`.
Ids derive from the existing path/symbol slug convention; callers supplying
custom imported ids must ensure the resulting entry identities are unique.

## Errors

Invalid exact extraction throws fixed TypeError; unsafe map locators throw
`Unsafe doc-source-map path.`. Invalid content policy is refused. These errors
do not echo the rejected value. This writer does not replace the main map
semantic validator for arbitrary caller-created extraction metadata/id values.

## Effects

Pure synchronous projection: no I/O, source-map URL reads, ordinary map lookup,
compiler execution, source loading or publishing.

## Compatibility

Accepts exact extraction/profile `0.1.0-draft` and `1.0.0`; output map remains
`1.1.0`. Package version `1.0.0` is independent. See [migration](MIGRATION.md).

## Source linkage

Each symbol links original source to extraction selector and core selector.
Proven `css`/PostCSS stylesheet/rule coordinates declare inclusive UTF-16;
other node kinds and Vue styles remain unknown. Design-token `1:1` is synthetic,
adapter/low confidence, with unknown bounds/units. Missing range omits both
range and convention. No range convention is inferred from a version or tag.

## Privacy

Map output excludes source bodies even when policy is `embed`. Sources are
relative to workspaceRoot, artifacts to outputDirectory. Lexical path checks
are not a symlink sandbox or permission grant. Caller-supplied annotations,
ids and metadata still require public disclosure review.
