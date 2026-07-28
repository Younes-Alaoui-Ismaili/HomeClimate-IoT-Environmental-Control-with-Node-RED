import { describe, expect, it } from "vitest";

import { KINDS, KIND_NAMES, TERMINAL_KINDS } from "../src/catalog.js";
import { materialize } from "../src/materialize.js";
import { validateFlow } from "../src/validate.js";
import { makeNode, makePlan } from "./helpers.js";

const byId = (flow, id) => flow.find((node) => node.id === id);

describe("materialize", () => {
  it("is deterministic, byte for byte", () => {
    // This is what lets a fixture be a fixture. If the same plan produced a
    // different flow on a second run, no comparison in this suite would mean
    // anything.
    const plan = makePlan([
      makeNode({ id: "a", kind: "sensor", wires: [["b"]] }),
      makeNode({ id: "b", kind: "gauge", wires: [] }),
    ]);
    const first = materialize(plan);
    const second = materialize(plan);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("puts exactly one tab in front and hangs every node off it", () => {
    const { flow } = materialize(makePlan([makeNode({ id: "a" })]));
    const tabs = flow.filter((node) => node.type === "tab");
    expect(tabs).toHaveLength(1);
    expect(byId(flow, "a").z).toBe(tabs[0].id);
  });

  it("creates the dashboard tab and group a widget needs to render", () => {
    const { flow } = materialize(
      makePlan([makeNode({ id: "g", kind: "gauge" })]),
    );
    expect(byId(flow, "cfg_ui_group")).toMatchObject({ type: "ui_group" });
    expect(byId(flow, "cfg_ui_tab")).toMatchObject({ type: "ui_tab" });
    expect(byId(flow, "g").group).toBe("cfg_ui_group");
  });

  it("creates the broker an mqtt node points at", () => {
    const { flow } = materialize(
      makePlan([makeNode({ id: "m", kind: "mqtt-in", topic: "home/temp" })]),
    );
    expect(byId(flow, "cfg_mqtt_broker")).toMatchObject({ type: "mqtt-broker" });
    expect(byId(flow, "m").broker).toBe("cfg_mqtt_broker");
    expect(byId(flow, "m").topic).toBe("home/temp");
  });

  it("adds no configuration node that the plan does not call for", () => {
    const { flow } = materialize(makePlan([makeNode({ id: "f" })]));
    expect(byId(flow, "cfg_ui_group")).toBeUndefined();
    expect(byId(flow, "cfg_mqtt_broker")).toBeUndefined();
  });

  it("places nodes left to right in the direction data travels", () => {
    const { flow } = materialize(
      makePlan([
        makeNode({ id: "a", kind: "sensor", wires: [["b"]] }),
        makeNode({ id: "b", kind: "function", wires: [["c"]] }),
        makeNode({ id: "c", kind: "debug", wires: [] }),
      ]),
    );
    expect(byId(flow, "a").x).toBeLessThan(byId(flow, "b").x);
    expect(byId(flow, "b").x).toBeLessThan(byId(flow, "c").x);
  });

  it("refuses an id that collides with the generated namespace", () => {
    const result = materialize(makePlan([makeNode({ id: "cfg_ui_group" })]));
    expect(result.ok).toBe(false);
    expect(result.issues[0].code).toBe("reserved_id_prefix");
  });

  it("refuses a terminal node that carries outgoing wires", () => {
    const result = materialize(
      makePlan([
        makeNode({ id: "d", kind: "debug", wires: [["a"]] }),
        makeNode({ id: "a" }),
      ]),
    );
    expect(result.ok).toBe(false);
    expect(result.issues[0].code).toBe("terminal_node_has_wires");
  });

  it("gives every catalogued kind a materialiser that validates", () => {
    // Guards the default branch of the switch: a kind added to the catalogue
    // without a materialiser passes the schema and then fails at runtime.
    for (const kind of KIND_NAMES) {
      const node = makeNode({
        id: "only",
        kind,
        wires: TERMINAL_KINDS.has(kind) ? [] : [],
      });
      const result = materialize(makePlan([node]));
      expect(result.ok, `kind "${kind}" has no materialiser`).toBe(true);
      expect(byId(result.flow, "only").type).toBe(KINDS[kind].type);
      expect(validateFlow(result.flow).ok, `kind "${kind}" produced an invalid flow`).toBe(
        true,
      );
    }
  });
});
