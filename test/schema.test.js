import { describe, expect, it } from "vitest";

import { KIND_NAMES } from "../src/catalog.js";
import { PLAN_JSON_SCHEMA, planSchema } from "../src/schema.js";
import { makeNode, makePlan } from "./helpers.js";

describe("PLAN_JSON_SCHEMA, the shape handed to the model", () => {
  // These are not style assertions. Strict structured output modes reject a
  // schema that uses $ref, that allows extra properties, or that leaves a
  // property optional, so a drift here is a runtime failure at the API
  // boundary rather than a cosmetic one.
  it("inlines everything instead of using $ref", () => {
    expect(JSON.stringify(PLAN_JSON_SCHEMA)).not.toContain("$ref");
  });

  it("closes the object at the root and at the node level", () => {
    expect(PLAN_JSON_SCHEMA.type).toBe("object");
    expect(PLAN_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(PLAN_JSON_SCHEMA.properties.nodes.items.additionalProperties).toBe(
      false,
    );
  });

  it("requires every property it declares, at both levels", () => {
    expect([...PLAN_JSON_SCHEMA.required].sort()).toEqual([
      "description",
      "label",
      "nodes",
    ]);

    const node = PLAN_JSON_SCHEMA.properties.nodes.items;
    expect([...node.required].sort()).toEqual(
      Object.keys(node.properties).sort(),
    );
  });

  it("exposes the catalogue as a closed enum, in step with catalog.js", () => {
    expect(PLAN_JSON_SCHEMA.properties.nodes.items.properties.kind.enum).toEqual(
      KIND_NAMES,
    );
  });

  it("expresses optionality as an explicit null rather than an absent key", () => {
    const topic = PLAN_JSON_SCHEMA.properties.nodes.items.properties.topic;
    expect(topic.anyOf).toContainEqual({ type: "null" });
  });
});

describe("planSchema", () => {
  it("accepts a well formed plan", () => {
    const result = planSchema.safeParse(makePlan([makeNode()]));
    expect(result.success).toBe(true);
  });

  it("rejects a kind outside the catalogue", () => {
    const result = planSchema.safeParse(
      makePlan([makeNode({ kind: "webhook" })]),
    );
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(["nodes", 0, "kind"]);
  });

  it("rejects a property the model invented", () => {
    const result = planSchema.safeParse(
      makePlan([makeNode({ retries: 3 })]),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a node with a property missing rather than null", () => {
    const node = makeNode();
    delete node.topic;
    const result = planSchema.safeParse(makePlan([node]));
    expect(result.success).toBe(false);
  });

  it("rejects a plan with no nodes", () => {
    expect(planSchema.safeParse(makePlan([])).success).toBe(false);
  });

  it("rejects an empty label", () => {
    expect(
      planSchema.safeParse(makePlan([makeNode()], { label: "" })).success,
    ).toBe(false);
  });
});
