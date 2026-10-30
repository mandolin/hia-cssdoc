# Release Checklist

## Source candidate 1.0.0

- Eight selected packages carry candidate version 1.0.0, public scoped metadata,
  package-local API/migration/license files and exact internal dependencies.
- Root workspace remains private; `release/public-packages.json` records the
  dependency order and local candidate status.
- `npm run release:gate` checks the supported runtime, actual public entries,
  metadata, locks, examples, native tests, licenses and pack previews.
- Real original archives/clean consumers and the exact source CI matrix are
  qualified separately; local checks alone never imply a registry release.

## Local RC

- [x] Parser dependencies and licenses are reviewed.
- [x] Extraction schema and compatibility versions are documented.
- [x] Standalone runner API, JSON config and CLI are tested.
- [x] Documentation producer descriptor/result pass cross-repository validation.
- [x] CSS, PostCSS and DTCG 2025.10 examples generate stable artifacts.
- [x] Source privacy and absolute-path checks pass.
- [x] Every workspace package passes npm pack dry-run.
- [x] `npm run release:gate` passes.

## Public Release

- [x] Prepare selected 1.0.0 source manifests; keep the workspace root private.
- [ ] Confirm npm scope ownership and Trusted Publishing.
- [ ] Confirm registry targets, immutable archives, bootstrap route and actual
  package-level permissions in a separately approved release.
- [ ] Execute provenance-enabled publication, registry byte verification and
  clean consumer checks; bind the website/docs to the release inventory.

Current `release:check:publish-ready` deliberately fails without publishing.
See [first publication gates](release/README.md).

中文：候选元数据与真实首发分层；未核registry/OIDC/出处前不得按源码版本宣称已发布。
