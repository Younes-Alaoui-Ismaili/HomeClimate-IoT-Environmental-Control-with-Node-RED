/**
 * The contract between the model and this module.
 *
 * The model does not write Node-RED JSON directly. It writes a small plan, and
 * `materialize.js` expands that plan into a real flow. Two reasons:
 *
 *   - A Node-RED flow carries per-type properties, wiring conventions and
 *     invisible configuration nodes. Asking a model to get all of that right is
 *     asking for plausible JSON that Node-RED then refuses to import.
 *   - A narrow plan is something a JSON Schema can actually describe, which
 *     means the shape can be enforced at the API boundary rather than hoped for.
 *
 * Zod is the single source of truth. The JSON Schema handed to the model is
 * derived from it, so the two cannot drift apart.
 *
 * Every field is required and nullable rather than optional. Strict structured
 * output modes differ on whether an absent key is acceptable; a present `null`
 * is unambiguous everywhere.
 */

import { z } from "zod";
import { KIND_NAMES } from "./catalog.js";

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const nodeSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .describe("Unique identifier for this node, referenced by `wires`."),
    kind: z
      .enum(KIND_NAMES)
      .describe("One of the allowed kinds. Never invent a kind."),
    name: z.string().min(1).describe("Short human readable label."),
    topic: nullableString.describe("MQTT topic. Only for mqtt-in and mqtt-out."),
    code: nullableString.describe(
      "JavaScript body for a function node. Receives `msg`, must return it.",
    ),
    property: nullableString.describe(
      "Message property a switch or change node acts on, without the `msg.` prefix.",
    ),
    operator: nullableString.describe(
      "Comparison for a switch node: one of gt, gte, lt, lte, eq, neq.",
    ),
    compareTo: nullableString.describe(
      "Value a switch compares against, or the literal a change node sets.",
    ),
    unit: nullableString.describe("Unit label for a dashboard widget."),
    min: nullableNumber.describe("Lower bound of a gauge."),
    max: nullableNumber.describe("Upper bound of a gauge."),
    intervalSeconds: nullableNumber.describe(
      "Repeat interval for an inject node, or hold time for a delay node.",
    ),
    wires: z
      .array(z.array(z.string()))
      .describe(
        "Outgoing connections, one array per output. Use [] for a node with no outputs.",
      ),
  })
  .strict();

export const planSchema = z
  .object({
    label: z.string().min(1).describe("Name of the Node-RED tab."),
    description: z
      .string()
      .min(1)
      .describe("One sentence describing what the flow does."),
    nodes: z.array(nodeSchema).min(1).describe("The nodes of the flow."),
  })
  .strict();

/**
 * JSON Schema for the plan, derived from the zod schema above.
 *
 * `io: "input"` asks zod for the schema of what it accepts, which is what the
 * model has to produce. The guard test in test/schema.test.js asserts the
 * result stays inside the subset that structured output modes accept.
 */
export const PLAN_JSON_SCHEMA = z.toJSONSchema(planSchema, {
  io: "input",
  target: "draft-2020-12",
});
