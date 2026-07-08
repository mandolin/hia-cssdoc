export const CSSDOC_EXTRACTION_CONTRACT = "hia-cssdoc-extraction";
export const CSSDOC_EXTRACTION_CONTRACT_VERSION = "0.1.0-draft";
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
