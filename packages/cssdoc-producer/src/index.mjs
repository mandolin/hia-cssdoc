import {
  CSSDOC_INPUT_KINDS,
  CSSDOC_OUTPUT_KINDS,
  CSSDOC_RUNNER_VERSION,
  runCssDoc
} from "@hia-doc/cssdoc-runner";

/** @lang zh-CN 已确认SDK1.0.0描述；仅一次执行/来源，无watch或增量。 @lang en Approved SDK1.0.0 descriptor with one-shot linkage, no watch or incremental support. */
export const cssdocProducerDescriptor = Object.freeze({
  /**
   * @lang zh-CN 生产器协议身份，用于宿主发现和校验。
   * @lang en Producer contract identity used for host discovery and validation.
   */
  contract: "documentation-producer",
  /**
   * @lang zh-CN 生产器协议版本，用于主SDK精确匹配。
   * @lang en Producer contract version used for exact matching by the main SDK.
   */
  contractVersion: "1.0.0",
  /**
   * @lang zh-CN 当前文档生产器的稳定领域标识。
   * @lang en Stable domain identifier of this documentation producer.
   */
  id: "cssdoc",
  /**
   * @lang zh-CN 生产器实现版本，取自当前运行器。
   * @lang en Producer implementation version supplied by the current runner.
   */
  version: CSSDOC_RUNNER_VERSION,
  /**
   * @lang zh-CN 供宿主显示的生产器名称。
   * @lang en Producer name presented by the host.
   */
  displayName: "CSSDoc",
  /**
   * @lang zh-CN 当前运行器接受的显式输入种类。
   * @lang en Explicit input kinds accepted by the current runner.
   */
  inputKinds: [...CSSDOC_INPUT_KINDS],
  /**
   * @lang zh-CN 当前运行器声明的输出工件种类。
   * @lang en Output artifact kinds declared by the current runner.
   */
  outputKinds: [...CSSDOC_OUTPUT_KINDS],
  /**
   * @lang zh-CN 供主SDK校验的来源关联、增量和监视能力声明。
   * @lang en Source-linkage, incremental and watch capability declarations validated by the main SDK.
   */
  capabilities: {
    /**
     * @lang zh-CN 声明支持来源关联，具体定位精度由实际产物描述。
     * @lang en Declares source-linkage support with precision described by the actual artifacts.
     */
    sourceLinkage: true,
    /**
     * @lang zh-CN 取false，每次执行处理完整请求的输入集。
     * @lang en False selects full processing of the requested input set on each invocation.
     */
    incremental: false,
    /**
     * @lang zh-CN 取false，每次构建由宿主的独立请求触发。
     * @lang en False selects individual host-triggered build requests.
     */
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

/** @lang zh-CN 默认入口与命名producer是同一只读对象，不新建执行器。 @lang en Default and named producer share one read-only object, without a new executor. */
export default cssdocProducer;
