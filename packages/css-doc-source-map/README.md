# CSS Doc Source Map

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
