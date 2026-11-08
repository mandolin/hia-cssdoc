/** @file @lang zh-CN 运行器纯元数据，含版本及冻结输入/输出种类。 @lang en Pure runner metadata containing its version and frozen input/output kinds. */

/**
 * @lang zh-CN 显式输入kind只读列表，不发现文件。
 * @lang en Read-only explicit input-kind list without file discovery.
 */
export const CSSDOC_INPUT_KINDS = Object.freeze([
  "css",
  "postcss-css",
  "design-token"
]);

/**
 * @lang zh-CN 可能输出的工件kind，实际map受选项控制。
 * @lang en Possible output artifact kinds; actual map output is option-controlled.
 */
export const CSSDOC_OUTPUT_KINDS = Object.freeze([
  "cssdoc-extraction",
  "hia-document",
  "doc-source-map"
]);

/**
 * @lang zh-CN 当前包/producer版本，与工件契约身份分层。
 * @lang en Current package/producer version, separate from artifact contract identities.
 */
export const CSSDOC_RUNNER_VERSION = "1.0.0";
