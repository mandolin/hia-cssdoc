# HIA CSSDoc

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

The packages are currently local release candidates. From a source checkout:

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
  "schemaVersion": "0.1.0-draft",
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

The result follows `documentation-producer-result@0.1.0-draft`. Artifact paths
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

- Node.js `>=20.19.0`; local development is pinned to `20.20.2` with mise.
- CI release gates cover Node 20.20.2, 22.x and 24.x.
- PostCSS `8.5.16`.
- Design Tokens Format Module `2025.10`.
- CSSDoc extraction contract `0.1.0-draft`.
- CSSDoc config schema `0.1.0-draft`.
- documentation producer contract `0.1.0-draft`.
- doc-source-map contract `0.1.0-draft`.

## Development

```sh
npm test
npm run release:gate
```

## License

MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for reviewed parser
dependencies.
