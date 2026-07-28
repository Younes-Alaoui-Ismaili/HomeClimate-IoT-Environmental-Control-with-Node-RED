import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createFixtureClient } from "../src/client.js";
import { generateFlow } from "../src/generate.js";
import { makeNode, makePlan, spyClient } from "./helpers.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = (name) =>
  readFile(path.join(ROOT, "fixtures", `${name}.txt`), "utf8");

describe("generateFlow, end to end on fixture-backed responses", () => {
  it("accepts the temperature gauge response and produces an importable flow", async () => {
    const result = await generateFlow(
      "Read the sensor, show temperature on a gauge, alert above 30 degrees",
      { client: createFixtureClient(await fixture("temperature-gauge")) },
    );
    expect(result.ok).toBe(true);
    expect(result.meta.nodeCount).toBe(result.flow.length);
    expect(result.flow.filter((n) => n.type === "tab")).toHaveLength(1);
    expect(result.plan.label).toBe("Temperature monitor");
  });

  it("refuses at the validate stage when a wire points nowhere", async () => {
    // The refusal that a JSON Schema cannot produce: the shape is perfect and
    // the meaning is broken.
    const result = await generateFlow("same instruction", {
      client: createFixtureClient(await fixture("dangling-wire")),
    });
    expect(result.ok).toBe(false);
    expect(result.stage).toBe("validate");
    expect(result.issues[0].code).toBe("dangling_wire");
    expect(result.flow).toBeUndefined();
  });

  it("refuses at the schema stage when the model invents a kind", async () => {
    const result = await generateFlow("Post readings to a web service", {
      client: createFixtureClient(await fixture("unknown-kind")),
    });
    expect(result.ok).toBe(false);
    expect(result.stage).toBe("schema");
    expect(result.issues[0].message).toContain("kind");
    expect(result.flow).toBeUndefined();
  });

  it("carries the raw response on a refusal so a human can see what happened", async () => {
    const result = await generateFlow("x", {
      client: createFixtureClient("not json at all"),
    });
    expect(result.stage).toBe("extract");
    expect(result.raw).toBe("not json at all");
  });

  it("refuses a plan the materialiser cannot expand", async () => {
    const plan = makePlan([
      makeNode({ id: "tab_main", kind: "function", wires: [] }),
    ]);
    const result = await generateFlow("x", {
      client: createFixtureClient(JSON.stringify(plan)),
    });
    expect(result.stage).toBe("materialize");
    expect(result.issues[0].code).toBe("reserved_id_prefix");
  });
});

describe("generateFlow, the request it builds", () => {
  it("attaches the schema and the instruction, and calls the client once", async () => {
    const client = spyClient(await fixture("temperature-gauge"));
    await generateFlow("do the thing", { client });

    expect(client.calls).toHaveLength(1);
    const request = client.calls[0];
    expect(request.messages).toEqual([
      { role: "user", content: "do the thing" },
    ]);
    expect(request.output_config.format.type).toBe("json_schema");
    expect(request.system).toContain("Allowed kinds");
  });

  it("passes the model and token budget through", async () => {
    const client = spyClient(await fixture("temperature-gauge"));
    const result = await generateFlow("x", {
      client,
      model: "some-model-id",
      maxTokens: 512,
    });
    expect(client.calls[0].model).toBe("some-model-id");
    expect(client.calls[0].max_tokens).toBe(512);
    expect(result.meta.model).toBe("some-model-id");
  });
});

describe("generateFlow, refusing to run at all", () => {
  it("throws on an empty instruction", async () => {
    await expect(
      generateFlow("   ", { client: createFixtureClient("{}") }),
    ).rejects.toThrow(TypeError);
  });

  it("throws when no client is injected", async () => {
    // The dependency is required rather than defaulted. A default would mean
    // a forgotten argument silently opens a network call.
    await expect(generateFlow("x", {})).rejects.toThrow(
      /options.client is required/,
    );
  });

  it("throws when the client does not expose complete()", async () => {
    await expect(
      generateFlow("x", { client: { name: "broken" } }),
    ).rejects.toThrow(TypeError);
  });
});
