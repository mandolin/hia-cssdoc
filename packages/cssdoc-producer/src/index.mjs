import {
  CSSDOC_INPUT_KINDS,
  CSSDOC_OUTPUT_KINDS,
  CSSDOC_RUNNER_VERSION,
  runCssDoc
} from "@hia-doc/cssdoc-runner";

/** @lang zh-CN 已确认SDK1.0.0描述；仅一次执行/来源，无watch或增量。 @lang en Approved SDK1.0.0 descriptor with one-shot linkage, no watch or incremental support. */
export const cssdocProducerDescriptor = Object.freeze({
  contract: "documentation-producer",
  contractVersion: "1.0.0",
  id: "cssdoc",
  version: CSSDOC_RUNNER_VERSION,
  displayName: "CSSDoc",
  inputKinds: [...CSSDOC_INPUT_KINDS],
  outputKinds: [...CSSDOC_OUTPUT_KINDS],
  capabilities: {
    sourceLinkage: true,
    incremental: false,
    watch: false
  }
});

/** @lang zh-CN 包装同一runner，不发现文件或增加权限；请求所有权不变。 @lang en Wraps the same runner without file discovery or added permissions; request ownership is unchanged. */
export const cssdocProducer = Object.freeze({
  descriptor: cssdocProducerDescriptor,
  /** @param {object} request <lang><zh-CN>显式runner请求。</zh-CN><en>Explicit runner request.</en></lang> @param {object} [context] <lang><zh-CN>signal/同步进度。</zh-CN><en>signal/synchronous progress.</en></lang> @returns {Promise<object>} <lang><zh-CN>同一runner结果与失败语义，非原子落盘。</zh-CN><en>The same runner result/failure semantics with non-atomic writes.</en></lang> */
  produce(request, context = {}) {
    return runCssDoc(request, context);
  }
});

export default cssdocProducer;
