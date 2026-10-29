# CSS Doc Adapter

## Supported runtime

Current source supports Node.js `^22.23.4 || ^24.22.1`. Release checks use
Node.js 22.23.4 and 24.22.1 on Windows and Ubuntu; actual package qualification
and npm availability remain separate. The repository default is Node.js 24.22.1.

中文：当前源码运行范围为上述两条已确认版本线，CI/安装验收与实际npm发布分别核对。


Converts CSSDoc extraction artifacts into HIA core documents.

Current writers/readers coordinate `hia-cssdoc-extraction@1.0.0` with exact `0.1.0-draft` JSON compatibility; unsupported or invalid reader inputs fail. See the repository migration guide for structure and source-precision limits.

See the packaged [API reference](API.md) and [compatibility notes](MIGRATION.md)
for input/output ownership, defaults, errors and privacy. Embedded fragments use
the original text and proven PostCSS rule coordinates, preserving CRLF and
whitespace while excluding same-line neighbors. Unproven locations remain
references without invented exact fragments. Design-token references use JSON.

中文：已证规则按原文精确截取；未知坐标只保留定位。包内文档与实际归档同步。
