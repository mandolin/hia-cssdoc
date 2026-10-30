# CSS Doc Source Map

## Supported runtime

Current source supports Node.js `^22.23.4 || ^24.22.1`. Release checks use
Node.js 22.23.4 and 24.22.1 on Windows and Ubuntu; actual package qualification
and npm availability remain separate. The repository default is Node.js 24.22.1.

中文：当前源码运行范围为上述两条已确认版本线，CI/安装验收与实际npm发布分别核对。


Creates safe documentation source-map references and direct-source manifests
for CSSDoc extraction artifacts.

```js
import { createCssDocumentationSourceMap } from "@hia-doc/css-doc-source-map";

const manifest = createCssDocumentationSourceMap({
  extraction,
  extractionPath: "artifacts/button.cssdoc.json",
  hiaDocumentPath: "artifacts/button.hia.json"
});
```

Source paths are workspace-relative, artifact paths are output-relative and
source content is not embedded by default.

The writer emits `doc-source-map@1.1.0`. Each ranged source reference carries
`rangeConvention`. Only PostCSS rule locations with verified columns declare
`inclusive` and `utf16-code-unit`; declarations, at-rules and design-token
placeholder ranges declare `unknown` for both fields. Missing ranges omit the
convention. The contract identity is independent of the npm package version.

Current writers/readers coordinate `hia-cssdoc-extraction@1.0.0` with exact `0.1.0-draft` JSON compatibility; unsupported or invalid reader inputs fail. See the repository migration guide for structure and source-precision limits.


## API and compatibility

See the packaged [API reference](API.md) and [migration notes](MIGRATION.md) for
all public entries, ownership, defaults, effects, source precision and privacy.
The package is a 1.0.0 source candidate; registry availability is a separate gate.

中文：公开责任与迁移文档随包提供；源码候选不代表已经发布npm。
