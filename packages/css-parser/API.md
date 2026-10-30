# CSS Parser API

中文：固定PostCSS解析边界，返回可变AST及来源；不读取文件或生成文档，不是完整CSS验证服务。

## Public exports

- `parseCss(source, options?)`: parses a CSS string with pinned PostCSS 8.5.16,
  explicit `from` and source maps disabled. Returns a wrapper around its AST.
- `getCssNodeLocation(node)`: returns `node.source` by reference, or `null`.
- `normalizeSourcePath(sourcePath)`: validates and slash-normalizes a declared
  source locator without resolving or reading it.

Only `.` is exported; no binaries or schema resources.

## Inputs

Use a CSS string and ordinary options with optional string `path`. Location
lookup accepts a PostCSS node. Path normalization requires a nonempty string;
absolute, drive, URI and parent-traversal locators are refused.

## Returns

Parsing returns `{ kind: "postcss-css", parser: { name: "postcss", mode:
"stylesheet" }, source: { path }, root, diagnostics: [] }`. The AST and location
objects are mutable PostCSS objects, **not ordinary JSON or deep copies**.

## Defaults

`path` defaults to `input.css`. Missing node/source yields `null`. A nullish path
option takes the default; the normalization API itself refuses nonstrings.

## Errors

Unsafe locators throw fixed `TypeError("Unsafe CSSDoc source path.")`.
PostCSS syntax errors propagate unchanged and can contain source text, paths and
stack data. Sanitize them at a public boundary; the runner/CLI do so separately.

## Effects

No filesystem or network access, file discovery, transforms or ordinary source
map loading. The parser allocates an AST; mutating it changes later node lookups.

## Compatibility

The wrapper preserves PostCSS's supported stylesheet grammar and node semantics;
it does not promise arbitrary dialects, plugins, SCSS or standards conformance.
See [migration](MIGRATION.md). Package and emitted contract versions are separate.

## Source linkage

PostCSS's probed rule line/columns are one-based inclusive UTF-16. Lines advance
at LF only; a standalone CR occupies a column. `end.offset` instead follows the
last character. These fields must not be interchanged. CSSDoc's map/adapter
only claim exact precision for their established rule branch.

## Privacy

Lexical safe paths are not a filesystem/symlink sandbox. AST/source objects and
raw syntax errors may retain the whole caller-provided source. This package
does not authorize disclosure or sanitize CSS content.
