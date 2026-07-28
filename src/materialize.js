/**
 * Turn a validated plan into an importable Node-RED flow.
 *
 * This is where the Node-RED specifics live, so the model never has to know
 * them: per-type property sets, the dashboard tab and group that a widget needs
 * in order to render, the broker configuration an MQTT node points at, and the
 * canvas coordinates that make the imported flow readable rather than a pile of
 * boxes at the origin.
 *
 * The function is pure and deterministic. The same plan always produces the same
 * flow, byte for byte, which is what lets the tests compare against a fixture.
 */

import {
  DASHBOARD_KINDS,
  KINDS,
  MQTT_KINDS,
  TERMINAL_KINDS,
} from "./catalog.js";

const RESERVED_PREFIX = /^(tab_|cfg_)/;

const GAUGE_COLORS = ["#00b500", "#e6e600", "#ca3838"];

/**
 * @param {import("./schema.js").planSchema extends infer _ ? object : never} plan
 * @returns {{ ok: true, flow: object[] } | { ok: false, issues: {code: string, message: string, node?: string}[] }}
 */
export function materialize(plan) {
  const issues = [];

  for (const node of plan.nodes) {
    if (RESERVED_PREFIX.test(node.id)) {
      issues.push({
        code: "reserved_id_prefix",
        message: `node id "${node.id}" uses a prefix reserved for generated nodes (tab_, cfg_)`,
        node: node.id,
      });
    }
    if (TERMINAL_KINDS.has(node.kind) && node.wires.some((o) => o.length > 0)) {
      issues.push({
        code: "terminal_node_has_wires",
        message: `node "${node.id}" is a ${node.kind}, which has no outputs, but it carries wires`,
        node: node.id,
      });
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  const tabId = "tab_main";
  const flow = [
    {
      id: tabId,
      type: "tab",
      label: plan.label,
      disabled: false,
      info: plan.description,
    },
  ];

  const needsDashboard = plan.nodes.some((n) => DASHBOARD_KINDS.has(n.kind));
  const needsBroker = plan.nodes.some((n) => MQTT_KINDS.has(n.kind));
  const dashboardTabId = "cfg_ui_tab";
  const dashboardGroupId = "cfg_ui_group";
  const brokerId = "cfg_mqtt_broker";

  const positions = layout(plan.nodes);
  let dashboardOrder = 0;

  for (const node of plan.nodes) {
    const { x, y } = positions.get(node.id);
    const base = {
      id: node.id,
      type: KINDS[node.kind].type,
      z: tabId,
      name: node.name,
    };
    const wires = TERMINAL_KINDS.has(node.kind) ? [] : node.wires;

    switch (node.kind) {
      case "sensor":
        flow.push({ ...base, motion: false, env: true, stick: false, x, y, wires });
        break;

      case "inject":
        flow.push({
          ...base,
          props: [{ p: "payload" }],
          repeat: node.intervalSeconds === null ? "" : String(node.intervalSeconds),
          crontab: "",
          once: false,
          onceDelay: 0.1,
          topic: node.topic ?? "",
          payload: "",
          payloadType: "date",
          x,
          y,
          wires,
        });
        break;

      case "function":
        flow.push({
          ...base,
          func: node.code ?? "return msg;",
          outputs: Math.max(1, wires.length),
          timeout: 0,
          noerr: 0,
          initialize: "",
          finalize: "",
          libs: [],
          x,
          y,
          wires,
        });
        break;

      case "switch":
        flow.push({
          ...base,
          property: node.property ?? "payload",
          propertyType: "msg",
          rules: [
            {
              t: node.operator ?? "gt",
              v: node.compareTo ?? "0",
              vt: "num",
            },
          ],
          checkall: "true",
          repair: false,
          outputs: Math.max(1, wires.length),
          x,
          y,
          wires,
        });
        break;

      case "change":
        flow.push({
          ...base,
          rules: [
            {
              t: "set",
              p: node.property ?? "payload",
              pt: "msg",
              to: node.compareTo ?? "",
              tot: "str",
            },
          ],
          action: "",
          property: "",
          from: "",
          to: "",
          reg: false,
          x,
          y,
          wires,
        });
        break;

      case "delay":
        flow.push({
          ...base,
          pauseType: "delay",
          timeout: String(node.intervalSeconds ?? 1),
          timeoutUnits: "seconds",
          rate: "1",
          nbRateUnits: "1",
          rateUnits: "second",
          randomFirst: "1",
          randomLast: "5",
          randomUnits: "seconds",
          drop: false,
          allowrate: false,
          outputs: 1,
          x,
          y,
          wires,
        });
        break;

      case "debug":
        flow.push({
          ...base,
          active: true,
          tosidebar: true,
          console: false,
          tostatus: false,
          complete: "payload",
          targetType: "msg",
          statusVal: "",
          statusType: "auto",
          x,
          y,
          wires,
        });
        break;

      case "gauge":
        flow.push({
          ...base,
          group: dashboardGroupId,
          order: dashboardOrder++,
          width: 6,
          height: 4,
          gtype: "gage",
          title: node.name,
          label: node.unit ?? "",
          format: "{{value | number:1}}",
          min: node.min ?? 0,
          max: node.max ?? 100,
          colors: GAUGE_COLORS,
          seg1: "",
          seg2: "",
          className: "",
          x,
          y,
          wires,
        });
        break;

      case "chart":
        flow.push({
          ...base,
          group: dashboardGroupId,
          order: dashboardOrder++,
          width: 12,
          height: 6,
          label: node.name,
          chartType: "line",
          legend: "false",
          xformat: "HH:mm:ss",
          interpolate: "linear",
          nodata: "",
          dot: false,
          ymin: node.min === null ? "" : String(node.min),
          ymax: node.max === null ? "" : String(node.max),
          removeOlder: 1,
          removeOlderPoints: "",
          removeOlderUnit: "3600",
          cutout: 0,
          useOneColor: false,
          useUTC: false,
          colors: GAUGE_COLORS,
          outputs: 1,
          useDifferentColor: false,
          className: "",
          x,
          y,
          wires,
        });
        break;

      case "text":
        flow.push({
          ...base,
          group: dashboardGroupId,
          order: dashboardOrder++,
          width: 6,
          height: 1,
          label: node.name,
          format: `{{msg.payload}} ${node.unit ?? ""}`.trim(),
          layout: "row-spread",
          className: "",
          x,
          y,
          wires,
        });
        break;

      case "mqtt-in":
        flow.push({
          ...base,
          topic: node.topic ?? "",
          qos: "2",
          datatype: "auto-detect",
          broker: brokerId,
          nl: false,
          rap: true,
          rh: 0,
          inputs: 0,
          x,
          y,
          wires,
        });
        break;

      case "mqtt-out":
        flow.push({
          ...base,
          topic: node.topic ?? "",
          qos: "",
          retain: "",
          respTopic: "",
          contentType: "",
          userProps: "",
          correl: "",
          expiry: "",
          broker: brokerId,
          x,
          y,
          wires,
        });
        break;

      case "comment":
        flow.push({ ...base, info: "", x, y, wires: [] });
        break;

      /* c8 ignore next 7 */
      default:
        return {
          ok: false,
          issues: [
            {
              code: "unsupported_kind",
              message: `kind "${node.kind}" passed the schema but has no materialiser`,
              node: node.id,
            },
          ],
        };
    }
  }

  if (needsDashboard) {
    flow.push({
      id: dashboardGroupId,
      type: "ui_group",
      name: plan.label,
      tab: dashboardTabId,
      order: 1,
      disp: true,
      width: 12,
      collapse: false,
      className: "",
    });
    flow.push({
      id: dashboardTabId,
      type: "ui_tab",
      name: plan.label,
      icon: "dashboard",
      order: 1,
      disabled: false,
      hidden: false,
    });
  }

  if (needsBroker) {
    flow.push({
      id: brokerId,
      type: "mqtt-broker",
      name: "local broker",
      broker: "localhost",
      port: "1883",
      clientid: "",
      autoConnect: true,
      usetls: false,
      protocolVersion: "4",
      keepalive: "60",
      cleansession: true,
    });
  }

  return { ok: true, flow };
}

/**
 * Place nodes left to right by how far they are from an entry point, so an
 * imported flow reads in the direction the data actually travels.
 */
function layout(nodes) {
  const targets = new Set(nodes.flatMap((n) => n.wires.flat()));
  const depths = new Map();

  for (const node of nodes) {
    if (!targets.has(node.id)) depths.set(node.id, 0);
  }
  // Entry points can be absent in a cyclic or fully-connected plan; anchor on
  // the first node so every node still gets a column.
  if (depths.size === 0 && nodes.length > 0) depths.set(nodes[0].id, 0);

  const byId = new Map(nodes.map((n) => [n.id, n]));
  let frontier = [...depths.keys()];
  let depth = 0;
  while (frontier.length > 0 && depth < nodes.length) {
    depth += 1;
    const next = [];
    for (const id of frontier) {
      for (const target of byId.get(id)?.wires.flat() ?? []) {
        if (!depths.has(target) && byId.has(target)) {
          depths.set(target, depth);
          next.push(target);
        }
      }
    }
    frontier = next;
  }

  const rowsPerColumn = new Map();
  const positions = new Map();
  for (const node of nodes) {
    const column = depths.get(node.id) ?? 0;
    const row = rowsPerColumn.get(column) ?? 0;
    rowsPerColumn.set(column, row + 1);
    positions.set(node.id, { x: 160 + column * 190, y: 80 + row * 70 });
  }
  return positions;
}
