# @hia-doc/cssdoc-runner

Standalone API and CLI for CSS documentation projects.

JSON configs use `schemaVersion: "0.1.0-draft"`. The package exports
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
