import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { formatIssues, validateFlow } from "../src/validate.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const tab = { id: "t", type: "tab", label: "T", disabled: false, info: "" };
const node = (over = {}) => ({
  id: "a",
  type: "function",
  z: "t",
  wires: [],
  ...over,
});

describe("validateFlow against the untouched 2019 flow", () => {
  it("accepts Back-end.js as it was committed in 2019", async () => {
    // The point of this test is independence. A validator that only accepts
    // what this project's own generator emits proves nothing about Node-RED.
    // Back-end.js predates every line of the 2026 layer and is not touched
    // by it.
    const legacy = JSON.parse(
      await readFile(path.join(ROOT, "Back-end.js"), "utf8"),
    );
    const result = validateFlow(legacy);
    expect(result.ok, formatIssues(result.issues ?? [])).toBe(true);
    expect(legacy.length).toBeGreaterThan(1);
  });
});

describe("validateFlow", () => {
  it("refuses something that is not an array", () => {
    expect(validateFlow({ nodes: [] })).toMatchObject({
      ok: false,
      issues: [{ code: "not_an_array" }],
    });
  });

  it("refuses an empty flow", () => {
    expect(validateFlow([])).toMatchObject({
      ok: false,
      issues: [{ code: "empty_flow" }],
    });
  });

  it("refuses an entry that is not an object", () => {
    expect(validateFlow([tab, "nope"])).toMatchObject({
      ok: false,
      issues: [{ code: "node_not_an_object" }],
    });
  });

  it("refuses a node with no id or no type", () => {
    const issues = validateFlow([tab, { z: "t", wires: [] }]).issues;
    expect(issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(["missing_id", "missing_type"]),
    );
  });

  it("refuses a duplicated id", () => {
    const result = validateFlow([tab, node(), node()]);
    expect(result.issues[0].code).toBe("duplicate_id");
  });

  it("refuses a flow with no tab", () => {
    const result = validateFlow([node()]);
    expect(result.issues.map((i) => i.code)).toContain("missing_tab");
  });

  it("refuses a flow with more than one tab", () => {
    const result = validateFlow([tab, { ...tab, id: "t2" }, node({ z: "t" })]);
    expect(result.issues.map((i) => i.code)).toContain("multiple_tabs");
  });

  it("refuses a wire pointing at a node that does not exist", () => {
    const result = validateFlow([tab, node({ wires: [["ghost"]] })]);
    expect(result.issues[0]).toMatchObject({
      code: "dangling_wire",
      node: "a",
    });
  });

  it("refuses a node wired to itself", () => {
    const result = validateFlow([tab, node({ wires: [["a"]] })]);
    expect(result.issues[0].code).toBe("self_wire");
  });

  it("refuses a wire that lands on a configuration node", () => {
    const result = validateFlow([
      tab,
      node({ wires: [["cfg"]] }),
      { id: "cfg", type: "ui_group" },
    ]);
    expect(result.issues[0].code).toBe("wire_to_non_flow_node");
  });

  it("refuses a configuration node placed on the tab", () => {
    const result = validateFlow([tab, { id: "cfg", type: "ui_group", z: "t" }]);
    expect(result.issues[0].code).toBe("config_node_on_tab");
  });

  it("refuses a node type outside the catalogue", () => {
    const result = validateFlow([tab, node({ type: "http-in" })]);
    expect(result.issues[0].code).toBe("unknown_node_type");
  });

  it("refuses a node sitting on a different tab", () => {
    const result = validateFlow([tab, node({ z: "elsewhere" })]);
    expect(result.issues[0].code).toBe("node_off_tab");
  });

  it("refuses a node with no wires array", () => {
    const result = validateFlow([tab, { id: "a", type: "function", z: "t" }]);
    expect(result.issues[0].code).toBe("missing_wires");
  });

  it("refuses a wires entry that is not an array of ids", () => {
    const result = validateFlow([tab, node({ wires: ["a"] })]);
    expect(result.issues[0].code).toBe("malformed_wires");
  });
});

describe("formatIssues", () => {
  it("renders one readable line per issue", () => {
    expect(
      formatIssues([
        { code: "dangling_wire", message: "node a points at ghost" },
      ]),
    ).toBe("  [dangling_wire] node a points at ghost");
  });
});
