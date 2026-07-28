/**
 * The node catalogue.
 *
 * Two vocabularies live here and they are deliberately different.
 *
 * 1. `KINDS` is what the model is allowed to emit. It is a small, closed set of
 *    plain names. Keeping it small is the point: a model that invents a node
 *    type gets refused instead of producing a flow that Node-RED cannot import.
 *
 * 2. `FLOW_NODE_TYPES` / `CONFIG_NODE_TYPES` are the real Node-RED type strings.
 *    The validator checks against these, so it can be pointed at any Node-RED
 *    flow, including the 2019 flow in this repository that predates all of this.
 */

/** Node-RED types that live on a tab and carry a `z` property. */
export const FLOW_NODE_TYPES = new Set([
  "comment",
  "inject",
  "function",
  "switch",
  "change",
  "delay",
  "debug",
  "mqtt in",
  "mqtt out",
  "http request",
  "ui_gauge",
  "ui_chart",
  "ui_text",
  "rpi-sensehat in",
]);

/** Node-RED configuration types. They are global: no `z`, no `wires`. */
export const CONFIG_NODE_TYPES = new Set(["ui_group", "ui_tab", "mqtt-broker"]);

/**
 * The kinds a model may use, mapped to the Node-RED type they materialise into.
 * The description is what the model reads in the prompt.
 */
export const KINDS = {
  sensor: {
    type: "rpi-sensehat in",
    description:
      "Environmental sensor input. Emits a payload with temperature, humidity and pressure fields.",
  },
  inject: {
    type: "inject",
    description:
      "Timer or manual trigger. Use `intervalSeconds` to repeat on a schedule.",
  },
  function: {
    type: "function",
    description:
      "Custom JavaScript. Put the body in `code`; it receives `msg` and must return it.",
  },
  switch: {
    type: "switch",
    description:
      "Route a message on a condition. Set `property`, `operator` and `compareTo`. The first output is the matching branch.",
  },
  change: {
    type: "change",
    description: "Set `msg.<property>` to the literal in `compareTo`.",
  },
  delay: {
    type: "delay",
    description: "Hold each message for `intervalSeconds` before passing it on.",
  },
  gauge: {
    type: "ui_gauge",
    description:
      "Dashboard gauge. Set `unit`, `min` and `max`. The dashboard tab and group are created for you.",
  },
  chart: {
    type: "ui_chart",
    description:
      "Dashboard line chart. The dashboard tab and group are created for you.",
  },
  text: {
    type: "ui_text",
    description: "Dashboard text readout. Set `unit` to append a unit label.",
  },
  debug: {
    type: "debug",
    description: "Print the payload to the Node-RED debug sidebar.",
  },
  "mqtt-in": {
    type: "mqtt in",
    description:
      "Subscribe to an MQTT topic. Set `topic`. The broker configuration is created for you.",
  },
  "mqtt-out": {
    type: "mqtt out",
    description:
      "Publish to an MQTT topic. Set `topic`. The broker configuration is created for you.",
  },
  comment: {
    type: "comment",
    description: "A label on the canvas. Carries no data and has no wires.",
  },
};

export const KIND_NAMES = Object.keys(KINDS);

/** Kinds that render on the Node-RED dashboard and therefore need a ui_group. */
export const DASHBOARD_KINDS = new Set(["gauge", "chart", "text"]);

/** Kinds that talk to a broker and therefore need an mqtt-broker config node. */
export const MQTT_KINDS = new Set(["mqtt-in", "mqtt-out"]);

/** Kinds that never carry outgoing wires. */
export const TERMINAL_KINDS = new Set([
  "debug",
  "gauge",
  "chart",
  "text",
  "mqtt-out",
  "comment",
]);
