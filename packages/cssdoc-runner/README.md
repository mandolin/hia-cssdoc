# @hia-doc/cssdoc-runner

## Supported runtime

Current source supports Node.js `^22.23.4 || ^24.22.1`. Release checks use
Node.js 22.23.4 and 24.22.1 on Windows and Ubuntu; actual package qualification
and npm availability remain separate. The repository default is Node.js 24.22.1.

中文：当前源码运行范围为上述两条已确认版本线，CI/安装验收与实际npm发布分别核对。


Standalone API and CLI for CSS documentation projects.

JSON configs use `schemaVersion: "1.0.0"`. The package exports
`CSSDOC_CONFIG_JSON_SCHEMA` for validation and editor integration.

```js
import path from "node:path";
import { runCssDoc } from "@hia-doc/cssdoc-runner";

const result = await runCssDoc({
  workspaceRoot: process.cwd(),
  outputDirectory: path.resolve("dist/cssdoc"),
  inputs: [{ kind: "css", path: "src/components.css" }]
});
```

The runner accepts `css`, `postcss-css` and `design-token` inputs. It writes
CSSDoc extraction artifacts, HIA documents, direct-source documentation maps
and a documentation producer result.

```sh
cssdoc --config cssdoc.config.json
```

Source content is not embedded unless `sourcesContentPolicy: "embed"` is set
explicitly in the config `options` object.
# Request, configuration and result contract

Current source emits `documentation-producer-result@1.0.0`. The producer
descriptor uses `documentation-producer@1.0.0`; these identities are independent
of the private package version `0.0.0` and CSSDoc extraction/config/profile
`1.0.0` (exact legacy JSON remains readable).

`runCssDoc(request, context?)` requires absolute `workspaceRoot` and
`outputDirectory`, and a nonempty `inputs` array of safe relative `path`s.
Kinds are `css`, `postcss-css`, `design-token`. Omitted kinds use suffix
inference: `.json` means design tokens, `.pcss`/`.postcss.css` means PostCSS,
otherwise CSS. An optional language must be a nonempty string. Unknown input
fields are refused; explicit null is not omission.

Options: `emitDocSourceMap` and `writeResultManifest` are booleans defaulting
to true; `sourcesContentPolicy` is `none` (default), `reference` or `embed`.
`profileIds` defaults to `["cssdoc"]` and must be nonempty, unique lowercase
identifiers. Runtime roots stay in memory. Output files and result locators
are relative to `outputDirectory`. The runner creates directories and writes
JSON artifacts, plus `cssdoc.producer-result.json` unless disabled. Writes are
not transactional; failed inputs may leave files, and per-input diagnostics
produce `partial` or `failed` results. `context.signal` is checked before each
input; synchronous `reportProgress` errors propagate. Input/profile arrays
are normalized into new arrays. No discovery, watch, incremental or symlink
sandbox is provided.

`loadCssDocConfig(path, {cwd}?)` reads JSON relative to cwd (process cwd by
default), then resolves `workspaceRoot` relative to the configuration file
and `outputDirectory` relative to that workspace. Historical defaults are
`.` and `dist/cssdoc`; the current schema matches these defaults.
The old schema is retained with its original required list. Pure migration and
exact schema selectors are available; see [MIGRATION.md](MIGRATION.md). Reads/parsing failures produce a fixed TypeError without raw paths
or configuration text. Invalid declared fields are rejected before writes.

The `cssdoc` CLI supports `--config`, positional inputs, `--kind`, `--out-dir`,
`--workspace-root`, `--sources-content-policy`, `--no-doc-source-map`, `--help`
and `--version`. Config and argument failures return exit code 1 with a fixed
public stderr message; successful help/version return 0. Partial/failed builds
also return 1. API users receive structured diagnostics for build failures.

中文：本页声明现有 API 的默认值、所有权、写入/回调副作用与失败限制；主 SDK
身份已采用，自有1.0.0已匹配既有默认，旧schema/兼容迁移分别保留，不据此声称全部候选稳定。
