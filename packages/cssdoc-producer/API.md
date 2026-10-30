# CSSDoc Producer API

中文：把相同runner交给主体系编排，不增加文件发现、权限或发布行为。

## Public exports

- `cssdocProducerDescriptor`: frozen top-level `documentation-producer@1.0.0`
  descriptor, id cssdoc, version 1.0.0, input/output kinds and capabilities.
- `cssdocProducer`: frozen top-level object with descriptor and
  `produce(request, context?)` delegating to `runCssDoc`.
- `default`: the identical producer object, not a separate implementation.

Only `.` is exported, without binaries or JSON resource subpaths.

## Inputs

`produce` accepts the runner's explicit absolute runtime roots, relative inputs,
profile ids/options and optional AbortSignal/synchronous progress callback.
Descriptor capability flags are descriptive; they do not authorize source reads.

## Returns

The exact runner promise/result: `documentation-producer-result@1.0.0`,
success/partial/failed, relative artifacts and diagnostics. No extra cloning,
discovery or host-specific envelope is added. Frozen top-level exports contain
nested arrays/objects: treat them as shared read-only data, not deeply frozen
mutable ownership. Clone descriptor data before modifying it.

## Defaults

All execution defaults come from runner: source policy none, map/manifest true,
profile cssdoc. Capabilities: sourceLinkage true, incremental/watch false.

## Errors

Runner rejection and per-input failure semantics propagate unchanged. The
producer adds no retries, rollback, swallowed errors or permission prompts.

## Effects

Import and descriptor inspection perform no I/O. Calling produce invokes the
runner's explicit file reads/writes, non-atomic output and synchronous callbacks.
Cancellation is observed at input boundaries only.

## Compatibility

Descriptor/result wire identities remain 1.0.0; version fields track this
1.0.0 package candidate, not map/extraction schema numbers. Existing exact
legacy artifact reading belongs to their owner packages. See [migration](MIGRATION.md).

## Source linkage

The delegated chain is CSS/PostCSS or design-token input → extraction → core
document plus optional map. Rule precision and unknown token/Vue ranges follow
the adapter/map; sourceLinkage does not promise all coordinates are exact.

## Privacy

Runner lexical checks/fixed public errors remain, but this adapter is not a
filesystem sandbox or disclosure grant. Callers must authorize explicit files,
embedded source, metadata and documentation before publishing any artifact.
