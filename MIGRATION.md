# CSSDoc contract migration

## Version layers

Current extraction (`hia-cssdoc-extraction`), config and artifact profile versions
are `1.0.0`. Exact `0.1.0-draft` JSON reading remains supported. Package versions
are source candidates at `1.0.0`, producer descriptor/result use `1.0.0`, and documentation
source maps use `1.1.0`. These numbers identify different contracts. No registry
release or complete CSS/DTCG conformance is implied.

## Pure extraction migration

```js
import {
  migrateCssDocExtraction,
  validateCssDocExtraction,
  getCssDocExtractionSchema
} from "@hia-doc/cssdoc-spec";

const migrated = migrateCssDocExtraction(legacyJson);
const diagnostics = validateCssDocExtraction(migrated); // [] when valid
const oldSchema = getCssDocExtractionSchema("0.1.0-draft");
```

Migration accepts an exact supported legacy JSON structure, creates a deep
copy, changes only `contractVersion` and `profile.version`, and validates the
target. All other fields and JSON extensions are retained. The input is never
rewritten. Current/unknown versions, incompatible profiles, invalid structures,
unsafe declared locators and non-JSON data fail with a fixed TypeError.
Validation returns fixed diagnostics instead of raw Ajv errors. Neither API
reads a file, schema URL or source body. Returned selector schemas are shared
read-only data; clone before modifying them.

Optional `parentId` and `summary` retain their original string types; they are
not broadened to null. Unknown source ranges remain `null` in extraction and
are omitted from map references. The map writer does not turn unknown ranges
into proven PostCSS rule coordinates. A future-version number alone never
establishes compatibility.

## Pure config migration and defaults

```js
import { migrateCssDocConfig, loadCssDocConfig } from "@hia-doc/cssdoc-runner";

const config = migrateCssDocConfig({
  schemaVersion: "0.1.0-draft",
  inputs: [{ path: "src/button.css" }]
});
```

The fresh result coordinates `schemaVersion` and an existing `$schema`, retaining
omissions and every other supported field. No I/O or default insertion occurs.
The existing loader still resolves an omitted workspace root as `.`, output as
`dist/cssdoc`, and input kind from the suffix. The new `1.0.0` required list
matches those defaults; the original old schema required the directories and
kind. The old schema remains unchanged. Compatible legacy reading/migration
reflects the old loader behavior, not a claim that the old schema permits these
omissions. Version and `$schema`, when present, must be an exact pair.

## Bundled schemas and readers

Each version has a JSON export under the spec or runner package:

- `@hia-doc/cssdoc-spec/schemas/hia-cssdoc-extraction-<version>.schema.json`
- `@hia-doc/cssdoc-runner/schemas/cssdoc-config-<version>.schema.json`

`getCssDocExtractionSchema(identity)` and `getCssDocConfigSchema(identity)` select
by exact version or schema ID, returning undefined for unknown identities.
The adapter and map writer validate supported old/current structures. New CSS,
DTCG and Vue CSS writers use the current pair. Sass's separate
`cssdoc-extraction` bridge is a different contract and is not silently renamed.
No complete DTCG resolver or arbitrary CSS syntax is added.

中文：新旧身份、历史默认与schema差异、无损迁移及失败规则分别管理；迁移拒绝
非JSON值，不能靠序列化丢字段。配置/提取毕业不等于包首次公开发行或整体正式版验收。
