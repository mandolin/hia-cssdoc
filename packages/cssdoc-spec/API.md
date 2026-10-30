# CSSDoc Spec API

中文：明确新旧工件身份、标签和JSON边界；纯验证/无损迁移，不加载网络schema，不扩展CSS语法。

## Public exports

| Export | Meaning |
| --- | --- |
| `CSSDOC_EXTRACTION_CONTRACT` | `hia-cssdoc-extraction`. |
| `CSSDOC_EXTRACTION_CONTRACT_VERSION` | Current wire identity `1.0.0`. |
| `CSSDOC_EXTRACTION_SCHEMA_ID` | Canonical current schema URL identity. |
| `CSSDOC_EXTRACTION_JSON_SCHEMA` | Bundled current JSON schema. |
| `CSSDOC_PROFILE_VERSION` | Current artifact profile identity `1.0.0`. |
| `CSSDOC_LEGACY_EXTRACTION_CONTRACT_VERSION` | Exact `0.1.0-draft` wire identity. |
| `CSSDOC_LEGACY_EXTRACTION_SCHEMA_ID` | Original schema URL identity. |
| `CSSDOC_LEGACY_EXTRACTION_JSON_SCHEMA` | Original schema object archive. |
| `CSSDOC_LEGACY_PROFILE_VERSION` | Original artifact profile identity. |
| `CSSDOC_SYMBOL_KINDS` | Frozen mapping of nine supported symbol kind names. |
| `CSSDOC_TAGS` | Frozen recognized tag list; not every tag is a symbol. |
| `getCssDocSymbolKind(tag)` | Own canonical symbol kind, or null. |
| `isCssDocTag(tag)` | Exact recognized-tag boolean. |
| `getCssDocExtractionSchema(identity)` | Exact version/schema-ID selector, unknown gives undefined. |
| `validateCssDocExtraction(value)` | Ordinary-JSON/schema/profile/declared-locator validation. |
| `migrateCssDocExtraction(value)` | Explicit lossless old-to-current JSON copy. |

Root `.` plus two JSON subpaths:
`./schemas/hia-cssdoc-extraction-0.1.0-draft.schema.json` and
`./schemas/hia-cssdoc-extraction-1.0.0.schema.json`. JSON imports use
`with { type: "json" }` on supported Node versions. There are no binaries.

## Inputs

Tag helpers take canonical lowercase strings; they do not normalize hyphens or
case. Validators/migration accept materialized ordinary finite acyclic JSON;
accessors, hidden properties, sparse arrays, custom prototypes and non-JSON
values are refused without evaluating getters. JSON extensions must also be JSON.

## Returns

Validation returns `[]` or a fixed `CSSDOC_EXTRACTION_INVALID` error diagnostic,
not raw Ajv data. Migration deep-copies exact old JSON, changes only
`contractVersion` and `profile.version`, validates the target and retains every
other field. Input is unchanged. Schema objects are shared read-only data;
top-level freezing does not grant mutable ownership of nested properties.

## Defaults

No identity/version guessing, implicit migration, remote schema loading, field
coercion, default insertion or removal. Unknown schema identity returns undefined;
unknown/nonstring tag-kind lookup returns null, including prototype names.

## Errors

Validation contains failures as fixed diagnostics. Explicit migration throws
fixed TypeError for current/unknown identity, malformed/non-JSON input,
incompatible profile, unsafe declared locator or failed target validation.
Schema selectors return undefined rather than guessing a compatible range.

## Effects

No I/O/network/publication. Fixed bundled schemas compile lazily with pinned
local Ajv and call-local JSON copies. The validator cache does not mutate caller
objects; schema URLs are identities, not network resources to fetch.

## Compatibility

Exact `0.1.0-draft` and `1.0.0` extraction/profile pairs are supported.
Optional parentId/summary remain strings, not newly nullable. Package identity,
artifact profile and the main seven documentation-profile specifications are
distinct layers. See [migration](MIGRATION.md).

## Source linkage

Range is optional/null and may omit end/columns; schema acceptance alone proves
no coordinate convention. The map/adapter apply the established PostCSS rule
proof and keep unknown precision unknown. Validation checks declared relative
source/diagnostic/map-ref locators but does not read the addressed content.

## Privacy

Fixed failures avoid raw schema errors and rejected values. Accepted summaries,
metadata, annotations and diagnostic text are still caller-controlled data;
validation is neither redaction nor a disclosure grant or symlink sandbox.
