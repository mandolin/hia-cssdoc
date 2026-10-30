/**
 * @file 有界DTCG样式JSON到CSSDoc桥接；保留语义值但不执行引用解析。
 * @lang en Bounded DTCG-style JSON to CSSDoc bridge, preserving semantic values without reference resolution.
 */
import {
  CSSDOC_EXTRACTION_CONTRACT,
  CSSDOC_EXTRACTION_CONTRACT_VERSION,
  CSSDOC_PROFILE_VERSION,
  CSSDOC_SYMBOL_KINDS
} from "@hia-doc/cssdoc-spec";

/**
 * @param {object} tokens <lang><zh-CN>已解析的普通无环JSON；支持$value/group/$root/继承$type子集，不是完整validator。</zh-CN><en>Parsed ordinary acyclic JSON; supports the $value/group/$root/inherited-$type subset, not a complete validator.</en></lang>
 * @param {{path?:string}} [options] <lang><zh-CN>来源相对路径，默认tokens.json。</zh-CN><en>Relative source path, default tokens.json.</en></lang>
 * @returns {object} <lang><zh-CN>当前CSSDoc JSON；不改输入，但部分metadata值共享引用，1:1范围为合成占位。</zh-CN><en>Current CSSDoc JSON; input is unchanged but some metadata values share references and 1:1 ranges are synthetic placeholders.</en></lang>
 * @throws {TypeError} <lang><zh-CN>来源路径不合法；任意非JSON/循环对象不在本API保证内。</zh-CN><en>Invalid source path; arbitrary non-JSON/cyclic objects are outside this API's guarantees.</en></lang>
 */
export function designTokensToCssExtraction(tokens, options = {}) {
  // <lang><zh-CN>来源定位仅词法校验，不读文件。</zh-CN><en>Validate the source locator lexically without reading a file.</en></lang>
  const sourcePath = normalizeSourcePath(options.path ?? "tokens.json");
  // <lang><zh-CN>符号与去重集合均只属于本次遍历，不跨请求保留。</zh-CN><en>Symbols and allocated ids belong to this traversal only, never persisting across requests.</en></lang>
  const symbols = [];
  const usedIds = new Set();
  collectTokens(tokens, [], symbols, sourcePath, null, usedIds);

  return {
    contract: CSSDOC_EXTRACTION_CONTRACT,
    contractVersion: CSSDOC_EXTRACTION_CONTRACT_VERSION,
    producer: {
      name: "@hia-doc/design-token-bridge",
      version: "1.0.0"
    },
    profile: {
      name: "design-tokens",
      version: CSSDOC_PROFILE_VERSION
    },
    source: {
      kind: "design-tokens",
      path: sourcePath
    },
    symbols,
    annotations: [],
    diagnostics: [],
    sourceMap: {
      kind: "hia-doc-source-map-ref",
      href: null,
      sourcesContentPolicy: "none"
    },
    metadata: {
      format: "dtcg",
      specification: inferDtcgSpecification(tokens?.$schema)
    }
  };
}

/**
 * @param {unknown} node <lang><zh-CN>当前JSON节点，非对象叶忽略。</zh-CN><en>Current JSON node; nonobject leaves are ignored.</en></lang>
 * @param {string[]} pathParts <lang><zh-CN>语义名称分段，不改变原始名称大小写。</zh-CN><en>Semantic name segments retaining original name case.</en></lang>
 * @param {object[]} symbols <lang><zh-CN>本次遍历追加的符号。</zh-CN><en>Symbols appended by this traversal.</en></lang>
 * @param {string} sourcePath <lang><zh-CN>已核相对来源。</zh-CN><en>Checked relative source.</en></lang>
 * @param {string|null} inheritedType <lang><zh-CN>父组类型或未知。</zh-CN><en>Parent group type or unknown.</en></lang>
 * @param {Set<string>} usedIds <lang><zh-CN>已分配局部标识，用既有CSS后缀策略避免slug碰撞。</zh-CN><en>Allocated local ids, using the existing CSS suffix strategy to avoid slug collisions.</en></lang>
 * @returns {void} <lang><zh-CN>追加输出，不改变输入；metadata对象值仍可共享。</zh-CN><en>Appends output without changing input; metadata object values may still be shared.</en></lang>
 */
function collectTokens(node, pathParts, symbols, sourcePath, inheritedType, usedIds) {
  // <lang><zh-CN>只把对象作为token/group；这不替代完整DTCG结构验证。</zh-CN><en>Only objects can be tokens/groups; this does not replace full DTCG structure validation.</en></lang>
  if (!node || typeof node !== "object") {
    return;
  }
  if (Object.hasOwn(node, "$value")) {
    // <lang><zh-CN>展示名称保留原大小写；根token继续使用既有root名称。</zh-CN><en>Display names retain original case; root tokens keep the existing root name.</en></lang>
    const name = pathParts.join(".") || "root";
    // <lang><zh-CN>未提供描述时省略字段，保持真实JSON对象和既有字符串schema。</zh-CN><en>Omit an absent description to retain a real JSON object and the existing string schema.</en></lang>
    symbols.push({
      id: allocateId(`token:${slug(name)}`, usedIds),
      kind: CSSDOC_SYMBOL_KINDS.designToken,
      name,
      ...(node.$description ? { summary: node.$description } : {}),
      source: {
        path: sourcePath,
        range: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 1 }
        }
      },
      metadata: {
        type: node.$type ?? inheritedType,
        value: node.$value,
        deprecated: node.$deprecated ?? null,
        extensions: node.$extensions ?? null
      }
    });
    return;
  }

  // <lang><zh-CN>局部组类型覆盖父类型，$root先投影到本组名称。</zh-CN><en>A local group type overrides its parent; $root projects to the group name first.</en></lang>
  const groupType = node.$type ?? inheritedType;
  if (node.$root && typeof node.$root === "object") {
    collectTokens(node.$root, pathParts, symbols, sourcePath, groupType, usedIds);
  }

  // <lang><zh-CN>按现有JSON成员顺序访问命名子节点；保留元数据键但不把它们当子token。</zh-CN><en>Visit named children in existing JSON member order; metadata keys are not child tokens.</en></lang>
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) {
      continue;
    }
    collectTokens(value, [...pathParts, key], symbols, sourcePath, groupType, usedIds);
  }
}

/**
 * @param {string} baseId <lang><zh-CN>既有规范化局部标识。</zh-CN><en>Existing normalized local id.</en></lang>
 * @param {Set<string>} usedIds <lang><zh-CN>本次请求已分配集合。</zh-CN><en>Ids allocated in this request.</en></lang>
 * @returns {string} <lang><zh-CN>首个ID保持；碰撞按CSS既有-2/-3顺序后缀，集合同步更新。</zh-CN><en>Preserves the first id; collisions use existing CSS -2/-3 suffixes and update the set.</en></lang>
 */
function allocateId(baseId, usedIds) {
  // <lang><zh-CN>候选与计数器只作用于当前slug，不改变语义名称或值。</zh-CN><en>The candidate and counter affect this slug only, never semantic names or values.</en></lang>
  let id = baseId;
  let index = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${index}`;
    index += 1;
  }
  usedIds.add(id);
  return id;
}

function inferDtcgSpecification(schema) {
  if (typeof schema !== "string") {
    return null;
  }
  return schema.includes("/2025.10/") ? "2025.10" : schema;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}

/**
 * @param {unknown} sourcePath <lang><zh-CN>调用方显式来源定位器。</zh-CN><en>Explicit caller source locator.</en></lang>
 * @returns {string} <lang><zh-CN>正斜杠安全相对路径；仅词法检查，不是symlink沙箱。</zh-CN><en>Slash-normalized safe relative path; lexical validation, not a symlink sandbox.</en></lang>
 * @throws {TypeError} <lang><zh-CN>非字符串/URI/盘符/父级路径固定拒绝，不回显输入。</zh-CN><en>Fixed refusal of nonstrings, URIs, drive and parent paths without echoing input.</en></lang>
 */
function normalizeSourcePath(sourcePath) {
  // <lang><zh-CN>来源边界在生成前拒绝私有定位器，不将其写进错误。</zh-CN><en>Reject private locators before generation without copying them into errors.</en></lang>
  const normalized = typeof sourcePath === "string" ? sourcePath.replaceAll("\\", "/") : "";
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized) || normalized.split("/").includes("..")) {
    throw new TypeError("Unsafe design token source path.");
  }
  return normalized;
}
