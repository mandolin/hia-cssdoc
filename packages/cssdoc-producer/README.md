# @hia-doc/cssdoc-producer

## Supported runtime

Current source supports Node.js `^22.23.4 || ^24.22.1`. Release checks use
Node.js 22.23.4 and 24.22.1 on Windows and Ubuntu; actual package qualification
and npm availability remain separate. The repository default is Node.js 24.22.1.

中文：当前源码运行范围为上述两条已确认版本线，CI/安装验收与实际npm发布分别核对。


Thin `documentation-producer@1.0.0` adapter for CSSDoc.

```js
import cssdocProducer from "@hia-doc/cssdoc-producer";
```

The producer delegates to `@hia-doc/cssdoc-runner`, so standalone and HIA
project builds use the same extraction and artifact pipeline. The producer is
loaded explicitly by an HIA project; it does not scan installed modules.
