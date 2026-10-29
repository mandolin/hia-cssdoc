# CSSDoc Spec

## Supported runtime

Current source supports Node.js `^22.23.4 || ^24.22.1`. Release checks use
Node.js 22.23.4 and 24.22.1 on Windows and Ubuntu; actual package qualification
and npm availability remain separate. The repository default is Node.js 24.22.1.

中文：当前源码运行范围为上述两条已确认版本线，CI/安装验收与实际npm发布分别核对。


Defines draft annotation, tag registry, rule and diagnostic semantics for CSS documentation.

The initial specification work targets one CSSDoc language specification:

- unprefixed core tags such as `@cssdoc`, `@component`, `@selector`, `@cssprop` and `@token`
- tag status records for CSSDOC 0.2.22 tags, including retained, modernized, legacy and deprecated tags

The package also exports the draft extraction artifact schema constants:

- `CSSDOC_EXTRACTION_SCHEMA_ID`
- `CSSDOC_EXTRACTION_JSON_SCHEMA`
