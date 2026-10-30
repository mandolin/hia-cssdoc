# Compatibility and migration

The pinned PostCSS wrapper, AST ownership and syntax-error behavior are retained. Use API.md for the inclusive UTF-16 versus exclusive offset distinction.

This source candidate does not imply registry publication. Node.js support is
`^22.23.4 || ^24.22.1`. Internal runtime dependencies are pinned to the matching
1.0.0 candidate cohort. See [API responsibilities](API.md) for inputs, ownership,
defaults, errors, effects, precision and privacy before adopting the package.

中文：包候选与真实发布分开；保留已确认的稳定子集和旧读责任，不按包号推定源码精度。
