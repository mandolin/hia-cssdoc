# Design Token Bridge

## Supported runtime

Current source supports Node.js `^22.23.4 || ^24.22.1`. Release checks use
Node.js 22.23.4 and 24.22.1 on Windows and Ubuntu; actual package qualification
and npm availability remain separate. The repository default is Node.js 24.22.1.

中文：当前源码运行范围为上述两条已确认版本线，CI/安装验收与实际npm发布分别核对。


Bridges design token artifacts into HIA-compatible documentation data.

Current output uses `hia-cssdoc-extraction@1.0.0` and its paired artifact profile. The existing input subset is unchanged; this is not a full CSS/DTCG validator. See the repository migration guide for exact historical reading and source-precision limits.


## API and compatibility

See the packaged [API reference](API.md) and [migration notes](MIGRATION.md) for
all public entries, ownership, defaults, effects, source precision and privacy.
The package is a 1.0.0 source candidate; registry availability is a separate gate.

中文：公开责任与迁移文档随包提供；源码候选不代表已经发布npm。
