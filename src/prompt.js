/**
 * The system prompt and the request shape.
 *
 * The catalogue is rendered into the prompt from `catalog.js` rather than
 * written out by hand, so adding a kind updates the prompt, the schema and the
 * validator at once. A prompt that drifts from the schema it is paired with
 * produces output the validator then rejects, which reads like a model failure
 * and is not one.
 */

import { KINDS } from "./catalog.js";
import { PLAN_JSON_SCHEMA } from "./schema.js";

export function renderCatalogue() {
  return Object.entries(KINDS)
    .map(([kind, { description }]) => `- ${kind}: ${description}`)
    .join("\n");
}

export const SYSTEM_PROMPT = `You turn a plain-language automation request into a Node-RED flow plan.

Return one JSON object and nothing else. No prose, no code fence, no explanation.

Allowed kinds. Using anything outside this list is a failure, and so is inventing
a property that is not in the schema:

${renderCatalogue()}

Rules:
- Every node needs a unique id. Reference ids in "wires" to connect nodes.
- "wires" is an array with one entry per output, each entry an array of target ids.
  A node with no outputs uses [].
- Node ids must not start with "tab_" or "cfg_"; those are reserved.
- Set every property. Use null for the ones that do not apply to a kind.
- Do not add the Node-RED tab, dashboard groups or broker configuration. They are
  generated from your plan.
- Prefer the smallest flow that satisfies the request.

The JSON object must match this schema:

${JSON.stringify(PLAN_JSON_SCHEMA, null, 2)}`;

/**
 * Build the Messages API request for one instruction.
 *
 * `max_tokens` is deliberately generous: thinking and response text share the
 * budget on current models, and a plan truncated mid-object is indistinguishable
 * from a model that cannot follow the schema.
 */
export function buildRequest(instruction, { model, maxTokens } = {}) {
  return {
    model: model ?? "claude-opus-5",
    max_tokens: maxTokens ?? 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: instruction }],
    output_config: {
      format: {
        type: "json_schema",
        schema: PLAN_JSON_SCHEMA,
      },
    },
  };
}
