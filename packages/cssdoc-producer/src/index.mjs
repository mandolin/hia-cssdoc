import {
  CSSDOC_INPUT_KINDS,
  CSSDOC_OUTPUT_KINDS,
  CSSDOC_RUNNER_VERSION,
  runCssDoc
} from "@hia-doc/cssdoc-runner";

export const cssdocProducerDescriptor = Object.freeze({
  contract: "documentation-producer",
  contractVersion: "0.1.0-draft",
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

export const cssdocProducer = Object.freeze({
  descriptor: cssdocProducerDescriptor,
  produce(request, context = {}) {
    return runCssDoc(request, context);
  }
});

export default cssdocProducer;
