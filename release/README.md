# CSSDoc source candidates and first publication

`public-packages.json` is the sole eight-package source candidate inventory.
The workspace root remains private. Selected packages have public metadata,
exact `1.0.0` internal runtime dependencies, package-local API/migration/license
files and a dependency-ordered release list. No registry publication is claimed.

`npm run release:gate` validates source/metadata/docs/pack contents and examples.
`npm run release:check:publish-ready` **fails intentionally** for this source
candidate. It neither calls npm nor checks login state. Candidate metadata alone
does not prove scope permissions, registry target availability or OIDC trust.

Before first public publication, a separate approved release must:

1. Bind exact source SHA and immutable original archives/integrities to the
   final release inventory; recheck all supported runtime/platform evidence.
2. Verify package/scope ownership and every target version in the registry.
3. Confirm the bootstrap/publisher route and actual package-level trust rules;
   configure a narrowly authorized workflow and provenance. Do not copy another
   repository's trust configuration or imply prior CSS publication.
4. Publish only the reviewed batch in dependency order, verify registry
   bytes/provenance and repeat clean consumer installation and generation.
5. Record partial failures/recovery and final website/documentation version
   correspondence. Never silently overwrite a published version.

No credential, token or unverified publisher configuration is stored here.
中文：本地候选资格、首次公开准备和真实发行分层管理；当前仅候选，不能用改状态字段
绕过单独发行设计/权限、出处与registry消费门禁。
