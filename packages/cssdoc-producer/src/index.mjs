import {runCssDoc} from '@hia-doc/cssdoc-runner';
/** @lang zh-CN 复用纯模块的同一描述符对象。 @lang en Reuses the same descriptor object from its pure module. */
import {cssdocProducerDescriptor} from './descriptor.mjs';
export {cssdocProducerDescriptor} from './descriptor.mjs';

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
