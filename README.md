# HIA CSSDoc

## Supported runtime

Current source supports Node.js `^22.23.4 || ^24.22.1`. Release checks use
Node.js 22.23.4 and 24.22.1 on Windows and Ubuntu; actual package qualification
and npm availability remain separate. The repository default is Node.js 24.22.1.

中文：当前源码运行范围为上述两条已确认版本线，CI/安装验收与实际npm发布分别核对。


HIA CSSDoc is a standards-oriented CSS documentation toolkit. It extracts
structured documentation from CSS comments and Design Tokens Format Module
files, then produces CSSDoc artifacts, HIA documents and documentation source
maps.

The workspace supports two usage modes:

- standalone API and CLI for ordinary CSS and design-system projects;
- a `documentation-producer` adapter for HIA project orchestration.

## Inputs

- authored CSS;
- CSS generated or processed by PostCSS;
- Design Tokens Format Module 2025.10 JSON.

Core annotations use unprefixed tags such as `@component`, `@selector`,
`@modifier`, `@cssprop`, `@layer`, `@media`, `@container`, `@keyframes` and
`@token`.

## Standalone CLI

The eight packages are private source packages at `0.0.0`; registry publication
and `1.0.0` package qualification are not complete. From a source checkout:

```sh
npm install
npm run smoke:standalone
```

The public command exposed by `@hia-doc/cssdoc-runner` is:

```sh
cssdoc --config cssdoc.config.json
```

Minimal config:

```json
{
  "schemaVersion": "1.0.0",
  "workspaceRoot": ".",
  "outputDirectory": "dist/cssdoc",
  "inputs": [
    { "kind": "css", "path": "src/components.css" },
    { "kind": "design-token", "path": "tokens/theme.tokens.json" }
  ],
  "options": {
    "emitDocSourceMap": true,
    "sourcesContentPolicy": "none"
  }
}
```

See [`examples/standalone`](examples/standalone) for CSS, PostCSS and DTCG
inputs.

## Programmatic API

```js
import path from "node:path";
import { runCssDoc } from "@hia-doc/cssdoc-runner";

const result = await runCssDoc({
  workspaceRoot: process.cwd(),
  outputDirectory: path.resolve("dist/cssdoc"),
  inputs: [{ kind: "css", path: "src/components.css" }]
});
```

The current result follows `documentation-producer-result@1.0.0`. Artifact paths
are relative to `outputDirectory` and can be consumed without exposing runtime
absolute paths.

## HIA Producer

`@hia-doc/cssdoc-producer` exports a descriptor plus one-shot `produce()`
module. HIA project tooling loads it explicitly; standalone and integrated
builds share the same runner implementation.

```js
import cssdocProducer from "@hia-doc/cssdoc-producer";
```

## Outputs

Each successful input can produce:

- `cssdoc-extraction` JSON;
- HIA core document JSON;
- direct-source `doc-source-map` JSON.

The CLI also writes `cssdoc.producer-result.json`. Source content is not
embedded by default; `sourcesContentPolicy: "embed"` requires explicit opt-in.

## Design Tokens

The design-token bridge targets DTCG 2025.10. It preserves token value,
description, deprecation and extensions metadata, supports group `$type`
inheritance and maps `$root` tokens to the group path.

## Packages

- `@hia-doc/cssdoc-spec`: annotation registry and extraction schema.
- `@hia-doc/css-parser`: PostCSS parser boundary.
- `@hia-doc/css-doc-extractor`: CSS annotation extraction.
- `@hia-doc/css-doc-adapter`: CSSDoc to HIA document adapter.
- `@hia-doc/design-token-bridge`: DTCG design-token bridge.
- `@hia-doc/css-doc-source-map`: direct and generated source linkage helpers.
- `@hia-doc/cssdoc-runner`: standalone API, config and CLI.
- `@hia-doc/cssdoc-producer`: HIA documentation producer adapter.

## Compatibility

- Node.js `^22.23.4 || ^24.22.1`; local development is pinned to `24.22.1` with mise.
- CI release gates cover Node.js 22.23.4 and 24.22.1 on Windows and Ubuntu.
- PostCSS `8.5.16`.
- Design Tokens Format Module `2025.10`.
- CSSDoc extraction/artifact profile `1.0.0`, with exact `0.1.0-draft` JSON reading.
- CSSDoc config schema `1.0.0`, preserving the exact original old schema.
- documentation producer descriptor/result contracts `1.0.0`.
- doc-source-map contract `1.1.0` (source definition remains draft). Proven PostCSS rule ranges use inclusive UTF-16 columns; unprobed CSS nodes and synthetic design-token ranges declare unknown endpoint and unit.

## Development

```sh
npm test
npm run release:gate
```

## License

MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for reviewed parser
dependencies.

## Validation and public failures

The runner validates declared booleans, nonempty input languages and unique
profile identifiers before creating output. Explicit `null` is not omission.
Unknown fields/kinds and unsafe source locators are rejected without echoing
their raw values. The CLI reports a fixed failure message and exit code 1 for
argument/configuration failures; it does not print filesystem paths or stacks.
Relative locators are checked lexically, without a symlink containment claim.

The config/extraction/artifact profile contracts now use `1.0.0` with exact
legacy JSON reading, preserved old schemas and explicit pure migration.
The new config schema matches historical directory/kind defaults; the old
schema retains its original required list. The adapter and map reader reject
unsupported identities and invalid structures. See [MIGRATION.md](MIGRATION.md)
for APIs, ownership, non-JSON refusal and four bundled schema exports.
The DTCG bridge preserves the
documented token/group subset without resolving references or validating every
DTCG value. See the [runner contract](packages/cssdoc-runner/README.md).
