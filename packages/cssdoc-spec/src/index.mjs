export const CSSDOC_EXTRACTION_CONTRACT = "hia-cssdoc-extraction";
export const CSSDOC_EXTRACTION_CONTRACT_VERSION = "0.1.0-draft";
export const CSSDOC_EXTRACTION_SCHEMA_ID = "https://hia-doc.local/schema/hia-cssdoc-extraction-0.1.0-draft.json";
export const CSSDOC_PROFILE_VERSION = "0.1.0-draft";

export const CSSDOC_SYMBOL_KINDS = Object.freeze({
  componentStyle: "css-component-style",
  selector: "css-selector",
  customProperty: "css-custom-property",
  modifier: "css-modifier",
  keyframes: "css-keyframes",
  layer: "css-layer",
  mediaQuery: "css-media-query",
  containerQuery: "css-container-query",
  designToken: "design-token"
});

export const CSSDOC_TAGS = Object.freeze([
  "cssdoc",
  "component",
  "selector",
  "modifier",
  "cssprop",
  "token",
  "layer",
  "media",
  "container",
  "keyframes",
  "description",
  "example",
  "lang"
]);

export const CSSDOC_EXTRACTION_JSON_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: CSSDOC_EXTRACTION_SCHEMA_ID,
  type: "object",
  required: ["contract", "contractVersion", "producer", "profile", "source", "symbols", "annotations", "diagnostics", "sourceMap"],
  additionalProperties: true,
  properties: {
    contract: { const: CSSDOC_EXTRACTION_CONTRACT },
    contractVersion: { const: CSSDOC_EXTRACTION_CONTRACT_VERSION },
    producer: { $ref: "#/$defs/producer" },
    profile: { $ref: "#/$defs/profile" },
    source: { $ref: "#/$defs/source" },
    symbols: {
      type: "array",
      items: { $ref: "#/$defs/symbol" }
    },
    annotations: {
      type: "array",
      items: { type: "object" }
    },
    diagnostics: {
      type: "array",
      items: { $ref: "#/$defs/diagnostic" }
    },
    sourceMap: { type: "object" },
    metadata: { type: "object" }
  },
  $defs: {
    nonEmptyString: { type: "string", minLength: 1 },
    producer: {
      type: "object",
      required: ["name", "version"],
      additionalProperties: true,
      properties: {
        name: { $ref: "#/$defs/nonEmptyString" },
        version: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    profile: {
      type: "object",
      required: ["name", "version"],
      additionalProperties: true,
      properties: {
        name: { $ref: "#/$defs/nonEmptyString" },
        version: { $ref: "#/$defs/nonEmptyString" }
      }
    },
    source: {
      type: "object",
      required: ["kind", "path"],
      additionalProperties: true,
      properties: {
        kind: { $ref: "#/$defs/nonEmptyString" },
        path: { $ref: "#/$defs/nonEmptyString" },
        sourcesContent: { type: "string" }
      }
    },
    sourcePosition: {
      type: "object",
      required: ["line"],
      additionalProperties: true,
      properties: {
        line: { type: "integer", minimum: 1 },
        column: { type: "integer", minimum: 1 }
      }
    },
    sourceRange: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          required: ["start"],
          additionalProperties: true,
          properties: {
            start: { $ref: "#/$defs/sourcePosition" },
            end: { $ref: "#/$defs/sourcePosition" }
          }
        }
      ]
    },
    symbol: {
      type: "object",
      required: ["id", "kind", "name", "source"],
      additionalProperties: true,
      properties: {
        id: { $ref: "#/$defs/nonEmptyString" },
        kind: { enum: Object.values(CSSDOC_SYMBOL_KINDS) },
        name: { $ref: "#/$defs/nonEmptyString" },
        parentId: { $ref: "#/$defs/nonEmptyString" },
        summary: { type: "string" },
        source: {
          type: "object",
          required: ["path", "range"],
          additionalProperties: true,
          properties: {
            path: { $ref: "#/$defs/nonEmptyString" },
            range: { $ref: "#/$defs/sourceRange" }
          }
        },
        annotation: { type: "object" },
        metadata: { type: "object" }
      }
    },
    diagnostic: {
      type: "object",
      required: ["code", "message", "severity"],
      additionalProperties: true,
      properties: {
        code: { $ref: "#/$defs/nonEmptyString" },
        message: { $ref: "#/$defs/nonEmptyString" },
        severity: { enum: ["info", "warning", "error"] },
        path: { $ref: "#/$defs/nonEmptyString" },
        data: { type: "object" }
      }
    }
  }
});

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

export function getCssDocSymbolKind(tag) {
  return TAG_TO_KIND[tag] ?? null;
}

export function isCssDocTag(tag) {
  return CSSDOC_TAGS.includes(tag);
}
