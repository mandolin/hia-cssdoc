# Design Token Bridge API

中文：将显式DTCG样式JSON子集桥接为CSSDoc设计令牌符号，不是完整验证器或引用解析器。

## Public exports

`designTokensToCssExtraction(tokens, options?)` traverses token/group JSON and
projects design-token symbols. Only `.` is exported, without binaries or
schema resource subpaths.

## Inputs

Provide ordinary acyclic JSON parsed from a trusted token document and ordinary
options with optional `path`. A node owning `$value` is treated as a token;
groups can inherit `$type`, and `$root` projects a group-root token. The bridge
does not validate all DTCG names/types/values or resolve aliases/`$extends`.
Nonobject leaves are ignored; null/empty inputs produce an empty extraction.

## Returns

Returns `hia-cssdoc-extraction@1.0.0`, artifact profile `design-tokens@1.0.0`,
producer version `1.0.0`, token names, optional descriptions, type/value/deprecated/
extension metadata and synthetic source references. Some metadata values retain
the input's object references; clone before mutation. Input is not changed.

## Defaults

Path `tokens.json`; no source body; null map href and policy `none`. Type inherits
from groups or is null when unspecified. Source ranges are synthetic `1:1`.
`$schema` containing `/2025.10/` records that specification label, otherwise
retains the string or null; the label is not a conformance verdict.

## Errors

Unsafe path uses a fixed TypeError without echoing it. This API does not promise
fixed safe failures for cyclic/non-JSON objects, getters or arbitrary coercion;
parse/validate external JSON and apply disclosure rules before passing it here.

## Effects

Synchronous traversal, no I/O, network, file discovery, CSS generation, schema
loading, alias resolution or npm publication.

## Compatibility

The existing DTCG-style group/root/type subset is retained. CSS custom properties
and design tokens remain distinct. Exact old CSSDoc artifacts remain readable
through the spec/adapter; see [migration](MIGRATION.md).

## Source linkage

Token coordinates are placeholders, not parser-proven extents. Map output keeps
unknown conventions and adapter emits JSON references without exact fragments.
Token ids use local normalized slugs. Distinct case-sensitive names can normalize
to the same slug; the first id is preserved and later collisions use the existing
CSS `-2`, `-3` allocation in traversal order, including suffix collisions. Names
and values are unchanged. Downstream consumers must not interpret
them as DTCG reference syntax or source coordinates.

## Privacy

No body is embedded, but values, descriptions, extensions and relative paths are
still caller data. Lexical path checks are not content redaction or a filesystem
sandbox. Authorize them separately before publication.
