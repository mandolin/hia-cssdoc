# @hia-doc/cssdoc-producer

Thin `documentation-producer@0.1.0-draft` adapter for CSSDoc.

```js
import cssdocProducer from "@hia-doc/cssdoc-producer";
```

The producer delegates to `@hia-doc/cssdoc-runner`, so standalone and HIA
project builds use the same extraction and artifact pipeline. The producer is
loaded explicitly by an HIA project; it does not scan installed modules.
