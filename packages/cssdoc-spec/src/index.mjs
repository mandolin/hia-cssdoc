/** @lang zh-CN 提取工件中性身份，与包及主SDK版本独立。 @lang en Neutral extraction identity independent of package and main SDK versions. */
export const CSSDOC_EXTRACTION_CONTRACT = "hia-cssdoc-extraction";
/** @lang zh-CN 确认B的新wire版本，旧版精确读取另保留。 @lang en Confirmed B wire version with exact legacy reading retained separately. */
export const CSSDOC_EXTRACTION_CONTRACT_VERSION = "1.0.0";
/** @lang zh-CN 公开schema身份，不执行网络读取。 @lang en Public schema identity without network reads. */
export const CSSDOC_EXTRACTION_SCHEMA_ID = "https://mandolin.github.io/HIA-Documentation/schemas/hia-cssdoc-extraction-1.0.0.schema.json";
/** @lang zh-CN 现有CSS/DTCG子集的工件profile身份，不等于官方七规范版本。 @lang en Artifact profile identity for the existing CSS/DTCG subset, distinct from the seven official profile specification versions. */
export const CSSDOC_PROFILE_VERSION = "1.0.0";

/** @lang zh-CN 旧模块原字节档案与精确读取/纯迁移入口。 @lang en Original legacy module archive and exact reading/pure migration entries. */
import * as legacyExtraction from "./schema-legacy.mjs";
/** @lang zh-CN 原档案提取schema的同一对象，不克隆或修改旧规则。 @lang en The original archived extraction-schema object without cloning or changing historical rules. */
export const CSSDOC_LEGACY_EXTRACTION_JSON_SCHEMA = legacyExtraction.CSSDOC_EXTRACTION_JSON_SCHEMA;
/** @lang zh-CN 原档案提取schema身份，不读取URL。 @lang en Original archived extraction-schema identity, without URL reads. */
export const CSSDOC_LEGACY_EXTRACTION_SCHEMA_ID = legacyExtraction.CSSDOC_EXTRACTION_SCHEMA_ID;
/** @lang zh-CN 原档案提取契约版本，与当前版本独立。 @lang en Original archived extraction-contract version, independent of the current version. */
export const CSSDOC_LEGACY_EXTRACTION_CONTRACT_VERSION = legacyExtraction.CSSDOC_EXTRACTION_CONTRACT_VERSION;
/** @lang zh-CN 原档案领域profile版本，独立于包和全局规范版本。 @lang en Original archived domain-profile version, independent of package and global-specification versions. */
export const CSSDOC_LEGACY_PROFILE_VERSION = legacyExtraction.CSSDOC_PROFILE_VERSION;
export { getCssDocExtractionSchema, validateCssDocExtraction, migrateCssDocExtraction } from "./compatibility.mjs";

/** @lang zh-CN 九类已支持的符号种类，浅冻结只读映射。 @lang en Read-only shallow-frozen mapping of nine supported symbol kinds. */
export const CSSDOC_SYMBOL_KINDS = Object.freeze({
  /**
   * @lang zh-CN 组件样式文档节点的领域种类。
   * @lang en Domain kind for a component-style documentation node.
   */
  componentStyle: "css-component-style",
  /**
   * @lang zh-CN CSS选择器文档节点的领域种类。
   * @lang en Domain kind for a CSS selector documentation node.
   */
  selector: "css-selector",
  /**
   * @lang zh-CN CSS自定义属性文档节点的领域种类。
   * @lang en Domain kind for a CSS custom-property documentation node.
   */
  customProperty: "css-custom-property",
  /**
   * @lang zh-CN CSS修饰状态文档节点的领域种类。
   * @lang en Domain kind for a CSS modifier documentation node.
   */
  modifier: "css-modifier",
  /**
   * @lang zh-CN CSS关键帧动画文档节点的领域种类。
   * @lang en Domain kind for a CSS keyframes documentation node.
   */
  keyframes: "css-keyframes",
  /**
   * @lang zh-CN CSS级联层文档节点的领域种类。
   * @lang en Domain kind for a CSS cascade-layer documentation node.
   */
  layer: "css-layer",
  /**
   * @lang zh-CN CSS媒体查询文档节点的领域种类。
   * @lang en Domain kind for a CSS media-query documentation node.
   */
  mediaQuery: "css-media-query",
  /**
   * @lang zh-CN CSS容器查询文档节点的领域种类。
   * @lang en Domain kind for a CSS container-query documentation node.
   */
  containerQuery: "css-container-query",
  /**
   * @lang zh-CN 设计令牌文档节点的领域种类。
   * @lang en Domain kind for a design-token documentation node.
   */
  designToken: "design-token"
});
/** @lang zh-CN 复用包内纯数据定义的同一冻结对象。 @lang en Reuses the same frozen objects from owner-local plain-data definitions. */
import {CSSDOC_TAGS} from './frozen-arrays.mjs';
export {CSSDOC_TAGS};

/** @lang zh-CN 新1.0.0固定schema；保留扩展和原字符串类型，不扩大nullable或CSS语法。 @lang en Fixed1.0.0 schema preserving extensions and original string types, without broader nullable or CSS syntax. */
import currentExtractionSchema from "./schemas/hia-cssdoc-extraction-1.0.0.schema.json" with { type: "json" };
/** @lang zh-CN 随包固定schema对象，与JSON子路径内容一致；不填默认、不改输入。 @lang en Fixed bundled schema object matching the JSON subpath, without defaults or input mutation. */
export const CSSDOC_EXTRACTION_JSON_SCHEMA = Object.freeze(currentExtractionSchema);

const TAG_TO_KIND = Object.freeze({
  component: CSSDOC_SYMBOL_KINDS.componentStyle,
  selector: CSSDOC_SYMBOL_KINDS.selector,
  modifier: CSSDOC_SYMBOL_KINDS.modifier,
  cssprop: CSSDOC_SYMBOL_KINDS.customProperty,
  token: CSSDOC_SYMBOL_KINDS.designToken,
  layer: CSSDOC_SYMBOL_KINDS.layer,
  media: CSSDOC_SYMBOL_KINDS.mediaQuery,
  container: CSSDOC_SYMBOL_KINDS.containerQuery,
  keyframes: CSSDOC_SYMBOL_KINDS.keyframes
});

/**
 * @param {string} tag <lang><zh-CN>规范化标签；不调用用户类型转换。</zh-CN><en>Canonical tag without invoking caller coercion.</en></lang>
 * @returns {string|null} <lang><zh-CN>显式自有种类，未知/原型/非字符串为null。</zh-CN><en>Explicit own kind; unknown, prototype and nonstring values return null.</en></lang>
 */
export function getCssDocSymbolKind(tag) {
  return typeof tag === "string" && Object.hasOwn(TAG_TO_KIND, tag) ? TAG_TO_KIND[tag] : null;
}

/** @param {unknown} tag <lang><zh-CN>精确规范标签，不做类型转换。</zh-CN><en>Exact canonical tag without coercion.</en></lang> @returns {boolean} <lang><zh-CN>是否在标签列表，无I/O。</zh-CN><en>Whether the tag is listed, without I/O.</en></lang> */
export function isCssDocTag(tag) {
  return CSSDOC_TAGS.includes(tag);
}
