import { describe, expect, it } from "vitest";

import {
  CONFIG_NODE_TYPES,
  DASHBOARD_KINDS,
  FLOW_NODE_TYPES,
  KINDS,
  KIND_NAMES,
  MQTT_KINDS,
  TERMINAL_KINDS,
} from "../src/catalog.js";
import { createFixtureClient } from "../src/client.js";
import { SYSTEM_PROMPT, renderCatalogue } from "../src/prompt.js";

describe("the catalogue holds together", () => {
  it("maps every kind to a type the validator recognises", () => {
    for (const kind of KIND_NAMES) {
      expect(FLOW_NODE_TYPES.has(KINDS[kind].type), `kind "${kind}"`).toBe(true);
    }
  });

  it("keeps flow types and configuration types disjoint", () => {
    for (const type of CONFIG_NODE_TYPES) {
      expect(FLOW_NODE_TYPES.has(type)).toBe(false);
    }
  });

  it("only classifies kinds that actually exist", () => {
    for (const set of [DASHBOARD_KINDS, MQTT_KINDS, TERMINAL_KINDS]) {
      for (const kind of set) {
        expect(KIND_NAMES).toContain(kind);
      }
    }
  });

  it("gives every kind a description, since the model reads it", () => {
    for (const kind of KIND_NAMES) {
      expect(KINDS[kind].description.length).toBeGreaterThan(10);
    }
  });
});

describe("the prompt is generated from the catalogue, not written twice", () => {
  it("lists every kind", () => {
    const rendered = renderCatalogue();
    for (const kind of KIND_NAMES) {
      expect(rendered).toContain(`- ${kind}:`);
    }
  });

  it("carries the catalogue and the schema into the system prompt", () => {
    expect(SYSTEM_PROMPT).toContain(renderCatalogue());
    expect(SYSTEM_PROMPT).toContain('"additionalProperties": false');
  });
});

describe("createFixtureClient", () => {
  it("replays a fixed string", async () => {
    const client = createFixtureClient("hello");
    expect(await client.complete({})).toBe("hello");
  });

  it("can compute a response from the request", async () => {
    const client = createFixtureClient((request) => request.model);
    expect(await client.complete({ model: "m" })).toBe("m");
  });
});
