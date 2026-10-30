# CSSDoc Runner API

中文：仅处理显式输入文件，按确认配置生成提取件/核心文档/映射，支持逐输入失败与边界中止；不发现业务文件。

## Public exports

- `runCssDoc(request, context?)`: async one-shot file generation/result.
- `loadCssDocConfig(configPath, options?)`: reads exact supported config JSON and
  returns a normalized runtime request; does not build.
- `inferCssDocInputKind(inputPath)`: suffix-only kind inference, no I/O.
- `CSSDOC_RUNNER_VERSION`: package/producer version `1.0.0`.
- `CSSDOC_INPUT_KINDS`: frozen css/postcss-css/design-token list.
- `CSSDOC_OUTPUT_KINDS`: frozen cssdoc-extraction/hia-document/doc-source-map list.
- `CSSDOC_CONFIG_SCHEMA_VERSION`, `CSSDOC_CONFIG_SCHEMA_ID`,
  `CSSDOC_CONFIG_JSON_SCHEMA`: current `1.0.0` config identity/schema.
- `CSSDOC_LEGACY_CONFIG_SCHEMA_VERSION`, `CSSDOC_LEGACY_CONFIG_SCHEMA_ID`,
  `CSSDOC_LEGACY_CONFIG_JSON_SCHEMA`: exact original `0.1.0-draft` identity/schema.
- `getCssDocConfigSchema(identity)`: exact version/ID selector, unknown undefined.
- `migrateCssDocConfig(value)`: pure explicit legacy JSON copy/identity migration.

Root `.` and resources `./schemas/cssdoc-config-0.1.0-draft.schema.json`,
`./schemas/cssdoc-config-1.0.0.schema.json`; JSON imports use `with { type: "json" }`.
Bin `cssdoc` supports `--config/-c`, `--kind/-k`, `--out-dir/-o`,
`--workspace-root`, `--sources-content-policy`, `--no-doc-source-map`,
`--help/-h`, `--version/-v` and explicit positional inputs. Unknown arguments
fail; no config or positional input fails. No glob discovery is performed.

## Inputs

Runtime requests require absolute `workspaceRoot`/`outputDirectory`, nonempty
inputs `{ path, kind?, language? }`, optional `profileIds` and options
`emitDocSourceMap`, `sourcesContentPolicy`, `writeResultManifest`. Input paths are
lexically safe relative locators; language is an optional nonempty label, not a
parser selector. Context supports AbortSignal and synchronous `reportProgress`.
External configs allow exact current/legacy schemaVersion and matching optional
$schema only, with relative directories; read relative config paths against
`options.cwd ?? process.cwd()`.

## Returns

Runner returns `documentation-producer-result@1.0.0`, producer version `1.0.0`,
success/partial/failed, relative artifact descriptors and diagnostics. Each
successful input writes extraction/core plus optional map; output paths derive
from the source path, input kind and one-based input index. Config loading
returns fresh normalized input/profile arrays and absolute runtime roots in
memory. Selectors return shared read-only schemas; migration returns a deep JSON
copy without mutating input or adding default fields.

## Defaults

Loader workspace root `.` relative to config directory; output `dist/cssdoc`
relative to workspace root. Suffix inference: `.json` design-token,
`.pcss`/`.postcss.css` postcss-css, otherwise css. Default profileIds `["cssdoc"]`;
map emission and result manifest true; source-content policy none. CLI paths
resolve from its workspace root and can override the loaded output/content/map
options. Profile lists must be nonempty unique lowercase ids.

## Errors

Invalid requests/configs throw fixed TypeErrors; file read/parse errors use
public-safe messages. Per-input read/parse/write failures become
`CSSDOC_RUNNER_INPUT_FAILED`, allowing subsequent inputs to proceed. An error
with any returned artifacts yields partial, otherwise failed. Output-directory,
result-manifest or progress callback exceptions can reject the promise.
CLI prints a fixed failure and exits 1; help/version exit 0, builds exit 0 only
on success. The original old schema required fields the old loader could omit;
compatible old reading does not rewrite that schema's historical required list.

## Effects

Creates output directories, reads explicit inputs, writes JSON and optionally
`cssdoc.producer-result.json`. Writes are non-atomic; partial files can remain
after failure. Signal is observed before each input, not during parsing/writing;
completed files remain. Callbacks execute synchronously and their exceptions
propagate. There is no watch/incremental execution or rollback transaction.

## Compatibility

Exact old/current configs preserve loader defaults; migration coordinates only
schemaVersion and existing $schema. New generated extraction/profile use 1.0.0,
core/source models 0.2.0 and map 1.1.0. Package versions are independent. See
[migration](MIGRATION.md); neither full DTCG/CSS conformance nor Sass support is added.

## Source linkage

Source policy controls CSS body embedding; token sources remain reference-only.
Rule fragments and per-reference map precision follow the adapter/map APIs.
Metadata coordinates and an embed label are not proof of external source access.

## Privacy

Absolute runtime roots stay out of results; declared relative inputs remain
public locators. Paths are checked lexically, not as a symlink sandbox. Use an
authorized workspace. Source bodies, token metadata and documentation text must
be authorized/sanitized by the caller. Progress includes relative input paths;
provide a suitable callback sink. No npm or network publication is executed.
