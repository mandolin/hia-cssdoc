# Compatibility and migration

Writer package provenance is 1.0.0; map contract stays 1.1.0. Exact legacy/current extraction readers and unknown coordinate conventions remain. No source body is fetched or embedded.

This source candidate does not imply registry publication. Node.js support is
`^22.23.4 || ^24.22.1`. Internal runtime dependencies are pinned to the matching
1.0.0 candidate cohort. See [API responsibilities](API.md) for inputs, ownership,
defaults, errors, effects, precision and privacy before adopting the package.

中文：包候选与真实发布分开；保留已确认的稳定子集和旧读责任，不按包号推定源码精度。
