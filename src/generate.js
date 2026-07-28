/**
 * The pipeline: one instruction in, one importable flow or one explicit refusal
 * out.
 *
 *   instruction
 *     -> buildRequest    schema and catalogue attached to the request
 *     -> client.complete injected, so tests never touch the network
 *     -> extractJson     tolerant of a fence or a stray sentence
 *     -> planSchema      shape, enforced by the schema
 *     -> materialize     plan expanded into real Node-RED nodes
 *     -> validateFlow    meaning, which a schema cannot express
 *
 * A failure at any stage returns `{ ok: false }` with the reason and the list of
 * issues. There is no partial result and no best-effort flow: a flow that only
 * mostly imports is worse than a refusal, because it fails at the point where
 * somebody is already relying on it.
 */

import { extractJson } from "./extract.js";
import { materialize } from "./materialize.js";
import { buildRequest } from "./prompt.js";
import { planSchema } from "./schema.js";
import { validateFlow } from "./validate.js";

const REASONS = {
  extract: "the model response was not usable JSON",
  schema: "the model response did not match the plan schema",
  materialize: "the plan could not be expanded into Node-RED nodes",
  validate: "the resulting flow would not import into Node-RED",
};

/**
 * @param {string} instruction
 * @param {{ client: { complete(request: object): Promise<string> }, model?: string, maxTokens?: number }} options
 */
export async function generateFlow(instruction, options) {
  if (typeof instruction !== "string" || instruction.trim().length === 0) {
    throw new TypeError("instruction must be a non-empty string");
  }
  const client = options?.client;
  if (!client || typeof client.complete !== "function") {
    throw new TypeError(
      "options.client is required and must expose a complete(request) method",
    );
  }

  const request = buildRequest(instruction, options);
  const raw = await client.complete(request);

  const extracted = extractJson(raw);
  if (!extracted.ok) return refuse("extract", extracted.issues, raw);

  const parsed = planSchema.safeParse(extracted.value);
  if (!parsed.success) {
    return refuse(
      "schema",
      parsed.error.issues.map((i) => ({
        code: i.code,
        message: `${i.path.length > 0 ? i.path.join(".") : "(root)"}: ${i.message}`,
      })),
      raw,
    );
  }

  const materialized = materialize(parsed.data);
  if (!materialized.ok) return refuse("materialize", materialized.issues, raw);

  const validated = validateFlow(materialized.flow);
  if (!validated.ok) return refuse("validate", validated.issues, raw);

  return {
    ok: true,
    flow: validated.flow,
    plan: parsed.data,
    meta: {
      instruction,
      model: request.model,
      nodeCount: validated.flow.length,
    },
  };
}

function refuse(stage, issues, raw) {
  return { ok: false, stage, reason: REASONS[stage], issues, raw };
}
