# @hia-doc/cssdoc-runner

## Supported runtime

Current source supports Node.js `^22.23.4 || ^24.22.1`. Release checks use
Node.js 22.23.4 and 24.22.1 on Windows and Ubuntu; actual package qualification
and npm availability remain separate. The repository default is Node.js 24.22.1.

中文：当前源码运行范围为上述两条已确认版本线，CI/安装验收与实际npm发布分别核对。


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
