# HIA CSSDoc

HIA CSSDoc is the CSS documentation workspace for HIA.

This repository is planned as an umbrella monorepo for CSS documentation specification, parsing, extraction, HIA adapter output, design-token bridging and documentation source-map linkage.

The first specification track defines a single CSSDoc language specification that modernizes the historical CSSDOC 0.2.22 draft and uses unprefixed core annotation tags.

## Packages

- `@hia-doc/cssdoc-spec`: CSS documentation annotation, tag registry and rule drafts.
- `@hia-doc/css-parser`: CSS parser wrapper boundary.
- `@hia-doc/css-doc-extractor`: CSS source to CSSDoc extraction artifact.
- `@hia-doc/css-doc-adapter`: CSSDoc extraction artifact to HIA core document.
- `@hia-doc/css-doc-source-map`: CSS documentation source-map linkage.
- `@hia-doc/design-token-bridge`: Design token artifact bridge.

## Status

This workspace is currently a skeleton. Runtime parser dependencies and public package publishing remain intentionally disabled until the foundation ADRs are accepted.

## Development

```sh
npm run release:gate
```
