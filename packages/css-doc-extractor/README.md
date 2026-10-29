# CSS Doc Extractor

## Supported runtime

Current source supports Node.js `^22.23.4 || ^24.22.1`. Release checks use
Node.js 22.23.4 and 24.22.1 on Windows and Ubuntu; actual package qualification
and npm availability remain separate. The repository default is Node.js 24.22.1.

中文：当前源码运行范围为上述两条已确认版本线，CI/安装验收与实际npm发布分别核对。


Extracts documentation symbols, annotations, diagnostics and source references from CSS sources.

Current output uses `hia-cssdoc-extraction@1.0.0` and its paired artifact profile. The existing input subset is unchanged; this is not a full CSS/DTCG validator. See the repository migration guide for exact historical reading and source-precision limits.
