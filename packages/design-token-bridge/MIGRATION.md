# Compatibility and migration

Writer provenance now uses 1.0.0. Existing noncolliding ids remain; later slug collisions now use the existing CSS numeric suffix allocation, retaining original names/values. JSON source references stay synthetic and do not gain exact extents. This is not full DTCG validation or alias resolution.

This source candidate does not imply registry publication. Node.js support is
`^22.23.4 || ^24.22.1`. Internal runtime dependencies are pinned to the matching
1.0.0 candidate cohort. See [API responsibilities](API.md) for inputs, ownership,
defaults, errors, effects, precision and privacy before adopting the package.

中文：包候选与真实发布分开；保留已确认的稳定子集和旧读责任，不按包号推定源码精度。
