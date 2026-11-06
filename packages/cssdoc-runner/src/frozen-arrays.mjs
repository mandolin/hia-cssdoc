/** @file @lang zh-CN 包内冻结数组纯数据定义，无导入和运行器副作用。 @lang en Owner-local frozen-array plain-data definitions without imports or runner side effects. */

/** @lang zh-CN 显式输入kind只读列表，不发现文件。 @lang en Read-only explicit input-kind list without file discovery. */
export const CSSDOC_INPUT_KINDS = Object.freeze([
  "css",
  "postcss-css",
  "design-token"
]);

/** @lang zh-CN 可能输出的工件kind，实际map受选项控制。 @lang en Possible output artifact kinds; actual map output is option-controlled. */
export const CSSDOC_OUTPUT_KINDS = Object.freeze([
  "cssdoc-extraction",
  "hia-document",
  "doc-source-map"
]);
