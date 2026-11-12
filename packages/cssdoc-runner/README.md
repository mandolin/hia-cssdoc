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
of the package candidate version `1.0.0` and CSSDoc extraction/config/profile
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


## API and compatibility

See the packaged [API reference](API.md) and [migration notes](MIGRATION.md) for
all public entries, ownership, defaults, effects, source precision and privacy.
The package is a 1.0.0 source candidate; registry availability is a separate gate.

中文：公开责任与迁移文档随包提供；源码候选不代表已经发布npm。

## Pure metadata

```js
import { CSSDOC_RUNNER_VERSION, CSSDOC_INPUT_KINDS, CSSDOC_OUTPUT_KINDS } from "@hia-doc/cssdoc-runner/metadata";
```

This entry exposes the runner version and frozen input/output kind arrays from the same definitions used by the root API. It contains pure data definitions, with no runner execution dependencies.

中文说明。metadata子入口提供版本及冻结的输入/输出种类，根入口与该入口引用同一定义。执行构建继续使用原运行API。

## Command reference

中文。`--help/-h`从共享双语命令内容生成的随包静态帮助读取，终端按实际宽度选择80/120列，重定向使用80列。Node严格参数解析先于帮助，因此help加未知或缺值选项仍返回固定stderr/1。帮助加缺失配置路径或业务kind值时先显示帮助，业务语义由正常执行另行核验。

English. `--help/-h` reads packaged static help generated from shared bilingual command content. TTY width selects an 80/120-column layout and redirected output uses 80 columns. Node strict argument parsing precedes help, so unknown or missing option values still produce controlled stderr/1. Help with a missing config path or a business kind value displays help before business validation.

中文。在本地npm脚本调用，或用 `npm exec --offline -- cssdoc --help`。帮助退出0，version输出运行器版本。构建仅success退出0，partial/failed或参数/配置错误退出1。未知参数拒绝，错误文本受控。会写产物和结果清单，可能覆盖旧文件，失败或部分成功时可留有写入。

English. Invoke through a local npm script or `npm exec --offline -- cssdoc --help`. Help exits 0 and version prints the runner version. Only successful builds exit 0; partial/failed builds and argument/config errors exit 1. Unknown options are rejected with controlled errors. Artifacts and a result manifest are written, existing files may be replaced, and failed/partial runs may leave writes.

| Option | 中文 | English |
| --- | --- | --- |
| `--config/-c <file>` | 调用目录下的JSON配置 | JSON config resolved from cwd |
| `--workspace-root <dir>` | 仅直接模式，相对调用目录，默认`.` | Direct mode only, cwd-relative, default `.` |
| `--kind/-k <kind>` | 仅直接模式，css/postcss-css/design-token | Direct mode only, css/postcss-css/design-token |
| `--out-dir/-o <dir>` | 两模式覆盖，相对工作区 | Override in both modes, workspace-relative |
| `--sources-content-policy <policy>` | 两模式覆盖，none/reference/embed，默认none | Override in both modes, none/reference/embed, default none |
| `--no-doc-source-map` | 两模式关闭地图，默认启用 | Disable maps in both modes, enabled by default |
| `--help/-h` | 帮助，退出0 | Help, exit 0 |
| `--version/-v` | 运行器实现版本 | Runner implementation version |
| 位置输入 / positional inputs | 仅直接模式，必填且相对工作区 | Direct mode only, required and workspace-relative |

### Config and direct modes

中文。配置workspaceRoot相对配置目录，默认`.`；outputDirectory相对工作区，默认dist/cssdoc。配置模式忽略workspace-root、kind和位置输入；out-dir、sources-content-policy与no-doc-source-map读取后生效。直接模式按文件名推断kind或采用显式值。embed会把源码正文写入产物，使用前须确认公开许可。

English. Config workspaceRoot uses the config directory and defaults to `.`; outputDirectory is workspace-relative and defaults to dist/cssdoc. Config mode ignores workspace-root, kind, and positionals, then applies out-dir, sources-content-policy, and no-doc-source-map. Direct mode infers kind from filenames unless supplied. Confirm publication permission before embed writes source bodies into artifacts.

中文。配置模式中空字符串out-dir与sources-content-policy保留原配置；非空值覆盖。直接模式显式空out-dir解析为工作区根，省略则为dist/cssdoc；显式空sources-content-policy按无效策略拒绝。

English. In config mode empty out-dir and sources-content-policy strings retain configured values, while nonempty values override them. In direct mode an explicit empty out-dir resolves to the workspace root and omission uses dist/cssdoc. An explicit empty direct-mode source policy is rejected as invalid.

保存为项目根的cssdoc.config.json，并准备获准sample.css。Save at the project root and prepare authorized sample.css.

```json
{"schemaVersion":"1.0.0","workspaceRoot":".","outputDirectory":"dist/cssdoc","inputs":[{"kind":"css","path":"sample.css"}],"options":{"sourcesContentPolicy":"none"}}
```

```sh
npm exec --offline -- cssdoc --config cssdoc.config.json
npm exec --offline -- cssdoc --workspace-root . --kind css --out-dir dist/css-direct --sources-content-policy none --no-doc-source-map sample.css
```

### Installation and version routing

中文。本页为1.0.0源码候选，候选归档连同配套内部依赖安装，离线安装另需第三方缓存。走注册表时先用 `npm view @hia-doc/cssdoc-runner@1.0.0 version` 并核配套版本，再安装。用 `npm list @hia-doc/cssdoc-runner --depth=0` 核本地版本。旧0.1.x教程保留原包范围，当前配置和提取/profile为1.0.0，源码地图版本独立。

English. This is the 1.0.0 source candidate. Install its archive with matching internal dependencies and prepare a third-party cache for offline installs. For registry installation, check `npm view @hia-doc/cssdoc-runner@1.0.0 version` and matching dependencies first. Use `npm list @hia-doc/cssdoc-runner --depth=0` for the local version. Older 0.1.x tutorials retain their scope. Current config/extraction/profile identities are 1.0.0, while source maps are versioned independently.

### Command documentation assets

中文。包内`src/command-documentation/`提供`description.json`、`observations.json`、`document.hia.json`、两份自包含schema、静态help模块及生成摘要。描述采用独立`command-documentation@0.1.0-draft`，生成核心文档采用`hia-core-document@1.0.0`。命令采用与CSS提取产物的版本分别读取。

English. `src/command-documentation/` contains a command description, actual declaration observations, a standard HiaDocument, two self-contained schemas, static help and generation digests. The command description uses `command-documentation@0.1.0-draft`, with its document using `hia-core-document@1.0.0`. Read CSS extraction artifacts against their own versions.

中文。源码维护者运行`npm run commands:check`核实际来源、解析声明、快照和schema。修改相关源或命令内容后，使用已安装的`@hia-doc/core`运行`npm run commands:build`，或显式指定已编译核心入口。候选环境请准备匹配的核心归档或源码入口，安装资格按实际版本核对。

English. Source maintainers run `npm run commands:check` to verify actual sources, parser declarations, snapshots and schemas. After relevant source or content changes, regenerate with an installed `@hia-doc/core`, or explicitly select a compiled core entry. Prepare a matching core archive or source entry for candidate environments and verify the installed version separately.

```sh
npm run commands:build -- --core-module <compiled-core-entry.js>
npm run commands:check
```

中文。开发期在一次性子进程核真实parseArgs表，执行core严格投影；日常CI离线核已生成快照。CLI使用静态帮助。来源文件按本仓限定LF属性保持跨平台原字节摘要一致，来源锚点只记录实际解析调用行。

English. Development-time generation observes actual parseArgs settings in a disposable process and runs strict core projection. Routine CI verifies the generated snapshot offline. CLI help consumes static content. Scoped repository LF attributes keep original-byte digests consistent across platforms, and source anchors record the actual parser-call line.
