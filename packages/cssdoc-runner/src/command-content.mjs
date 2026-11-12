/**
 * @file
 * @lang zh-CN CSSDoc命令的纯双语内容，供静态帮助及开发期core投影共同使用。
 * @lang en Pure bilingual CSSDoc command content shared by static help and development-time core projection.
 */
import { CSSDOC_RUNNER_VERSION, CSSDOC_INPUT_KINDS } from "./metadata.mjs";

/** @lang zh-CN 创建独立的原生字段语言模型，键名及两语正文精确保留。
 * @lang en Create an independent native field locale model retaining exact keys and both localized texts.
 * @param {object} fields <lang><zh-CN>中文/英文文本对。</zh-CN><en>Chinese/English text pairs.</en></lang>
 * @returns {object} <lang><zh-CN>1.0.0字段语言模型。</zh-CN><en>A 1.0.0 field locale model.</en></lang>
 */
function localized(fields) {
  return {
    enabled: true,
    model: "hia-text-i18n",
    modelVersion: "1.0.0",
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en"],
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        {
          fieldPath: key,
          kind: "text",
          defaultLocale: "zh-CN",
          localizedText: { "zh-CN": value[0], en: value[1] },
        },
      ]),
    ),
  };
}

/** @lang zh-CN 构造参数内容；其名称/类型/短名另由真实parseArgs调用观察。
 * @lang en Construct parameter content, with names, types and short names independently observed from the actual parseArgs call.
 * @param {string} name <lang><zh-CN>原生参数名。</zh-CN><en>Native parameter name.</en></lang>
 * @param {string} zh <lang><zh-CN>中文说明。</zh-CN><en>Chinese description.</en></lang>
 * @param {string} en <lang><zh-CN>英文说明。</zh-CN><en>English description.</en></lang>
 * @param {object} settings <lang><zh-CN>原生类型、短名、显示槽及默认规则。</zh-CN><en>Native type, short name, display slot and default rule.</en></lang>
 * @returns {object} <lang><zh-CN>带未绑定来源的参数内容。</zh-CN><en>Parameter content awaiting provenance binding.</en></lang>
 */
function parameter(name, zh, en, settings = {}) {
  // <lang><zh-CN>显示槽属于文案，位置参数名保留Node原生positionals身份。</zh-CN><en>The displayed slot is prose, while positional names retain Node's native positionals identity.</en></lang>
  const fields = { summary: [zh, en], description: [zh, en] };
  if (settings.metavar) fields.metavar = [settings.metavar, settings.metavar];
  return {
    id: name,
    kind: settings.kind ?? "option",
    name,
    ...(settings.short ? { short: settings.short } : {}),
    valueType: settings.valueType ?? "string",
    required: false,
    multiple: settings.multiple ?? false,
    ...(settings.choices ? { choices: settings.choices } : {}),
    defaultRule: settings.defaultRule ?? {
      kind: "conditional",
      conditions: ["description"],
    },
    i18n: localized(fields),
    evidence: [],
  };
}

/**
 * @lang zh-CN 返回cssdoc真实行为的独立内容图，版本来自运行器元数据，无文件或命令副作用。
 * @lang en Return an independent content graph for actual cssdoc behavior, taking the version from runner metadata without file or command effects.
 * @returns {object} <lang><zh-CN>待开发工具绑定真实来源的命令声明。</zh-CN><en>Command declaration awaiting actual-source binding by development tooling.</en></lang>
 */
export function createCssDocCommandContent() {
  return {
    id: "cssdoc",
    executable: "cssdoc",
    path: [],
    kind: "command",
    signature: "cssdoc [options] <input...>",
    i18n: localized({
      summary: [
        "提取CSS与设计令牌文档",
        "Extract CSS and design-token documentation",
      ],
      description: [
        "显式配置或直接输入构造运行请求，提取CSS、PostCSS与设计令牌文档。",
        "Build a request from explicit configuration or direct inputs to extract CSS, PostCSS and design-token documentation.",
      ],
      configUsage: [
        "cssdoc --config cssdoc.config.json",
        "cssdoc --config cssdoc.config.json",
      ],
      configOverrides: [
        "配置模式中，CLI可覆盖out-dir、sources-content-policy及no-doc-source-map。",
        "In config mode CLI can override out-dir, sources-content-policy and no-doc-source-map.",
      ],
      directOnly: [
        "kind及workspace-root用于直接模式；配置模式忽略它们和位置输入。",
        "kind and workspace-root apply to direct mode; config mode ignores them and positional inputs.",
      ],
      paths: [
        "配置文件相对调用目录，配置工作区相对配置目录；输出相对所选工作区。",
        "Config paths use cwd, configured workspaces use the config directory, and output uses the selected workspace.",
      ],
      writes: [
        "运行会创建目录并写工件，失败时可能已写部分文件。embed策略会写入获准公开的源码正文。",
        "Runs create directories and artifacts; failures may leave partial output. The embed policy includes source bodies authorized for publication.",
      ],
      parsing: [
        "Node严格解析先于帮助；未知、缺值或类型错误返回1。重复带值选项取最后值，--之后作为位置输入。",
        "Node strict parsing precedes help; unknown, missing or invalid option values exit 1. Repeated value options use the last value, and tokens after -- are positional inputs.",
      ],
      offline: [
        "@hia-doc/cssdoc-runner/README.md",
        "@hia-doc/cssdoc-runner/README.md",
      ],
    }),
    displayVersion: { kind: "runner", value: CSSDOC_RUNNER_VERSION },
    parsing: {
      helpOrder: "after-argument-validation",
      unknownOptions: "reject",
    },
    options: [
      parameter(
        "config",
        "从JSON配置构造请求。",
        "Build a request from JSON configuration.",
        {
          short: "c",
          metavar: "path",
          defaultRule: { kind: "not-applicable" },
        },
      ),
      parameter(
        "kind",
        "直接输入的类型，省略时从输入推断。",
        "Direct-input kind, inferred from input when omitted.",
        { short: "k", metavar: "kind", choices: [...CSSDOC_INPUT_KINDS] },
      ),
      parameter(
        "out-dir",
        "配置模式非空值覆盖输出；直接模式缺省dist/cssdoc，空字符串为工作区根。",
        "Nonempty values override configured output; direct mode defaults to dist/cssdoc, with an empty string selecting the workspace root.",
        { short: "o", metavar: "path" },
      ),
      parameter(
        "workspace-root",
        "直接模式的工作区根，省略时使用调用目录。",
        "Workspace root for direct mode, defaulting to cwd.",
        { metavar: "path" },
      ),
      parameter(
        "sources-content-policy",
        "直接模式缺省none；配置模式省略或空值时保留原值，非空值覆盖。",
        "Direct mode defaults to none; config mode retains its policy for omission or empty strings and uses nonempty overrides.",
        {
          metavar: "none|reference|embed",
          choices: ["none", "reference", "embed"],
        },
      ),
      parameter(
        "no-doc-source-map",
        "提供时关闭地图；省略时直接模式生成地图，配置模式保留原值。",
        "Supplying the flag disables maps; omission enables direct-mode maps and retains the configured value.",
        { valueType: "boolean" },
      ),
      parameter("help", "输出帮助并退出0。", "Print help and exit 0.", {
        short: "h",
        valueType: "boolean",
        defaultRule: { kind: "not-applicable" },
      }),
      parameter(
        "version",
        "输出运行器版本并退出0。",
        "Print runner version and exit 0.",
        {
          short: "v",
          valueType: "boolean",
          defaultRule: { kind: "not-applicable" },
        },
      ),
    ],
    positionals: [
      parameter(
        "positionals",
        "直接模式至少一个相对工作区的输入；配置模式忽略。",
        "Direct mode requires at least one workspace-relative input; config mode ignores positional inputs.",
        {
          kind: "positional",
          metavar: "input...",
          multiple: true,
          defaultRule: { kind: "not-applicable" },
        },
      ),
    ],
    examples: ["cssdoc --config cssdoc.config.json"],
    effects: { filesystem: "read-write", network: "none" },
    exitCodes: [
      {
        code: 0,
        i18n: localized({
          summary: ["成功、帮助或版本", "Success, help or version"],
          description: ["成功、帮助或版本", "Success, help or version"],
        }),
      },
      {
        code: 1,
        i18n: localized({
          summary: [
            "参数、配置或构建失败",
            "Argument, configuration or build failure",
          ],
          description: [
            "参数、配置、partial或failed构建",
            "Argument/configuration errors or partial/failed builds",
          ],
        }),
      },
    ],
    evidence: [],
  };
}
