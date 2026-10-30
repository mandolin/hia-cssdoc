# Compatibility and migration

Package/producer version now uses 1.0.0. Existing descriptor/result 1.0.0 wire identities and default/named object aliases are retained. Delegated runner errors, non-atomic writes and cancellation boundaries do not change.

This source candidate does not imply registry publication. Node.js support is
`^22.23.4 || ^24.22.1`. Internal runtime dependencies are pinned to the matching
1.0.0 candidate cohort. See [API responsibilities](API.md) for inputs, ownership,
defaults, errors, effects, precision and privacy before adopting the package.

中文：包候选与真实发布分开；保留已确认的稳定子集和旧读责任，不按包号推定源码精度。
