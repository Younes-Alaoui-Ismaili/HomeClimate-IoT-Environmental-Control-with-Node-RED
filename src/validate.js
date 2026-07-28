/**
 * Graph validation for a real Node-RED flow.
 *
 * This runs on the materialised flow, not on the model's plan, and it checks the
 * things a JSON Schema cannot express: identity, reachability, and the tab and
 * configuration node conventions Node-RED relies on.
 *
 * It is deliberately independent of this project's own generator. The test suite
 * points it at `Back-end.js`, the untouched 2019 flow, to keep it honest: a
 * validator that only accepts what we generate proves nothing.
 */

import { CONFIG_NODE_TYPES, FLOW_NODE_TYPES } from "./catalog.js";

/** @typedef {{ code: string, message: string, node?: string }} Issue */

function issue(code, message, node) {
  return node === undefined ? { code, message } : { code, message, node };
}

/**
 * Validate a Node-RED flow.
 *
 * @param {unknown} flow Parsed JSON, expected to be an array of nodes.
 * @returns {{ ok: true, flow: object[] } | { ok: false, issues: Issue[] }}
 */
export function validateFlow(flow) {
  /** @type {Issue[]} */
  const issues = [];

  if (!Array.isArray(flow)) {
    return {
      ok: false,
      issues: [
        issue(
          "not_an_array",
          `a Node-RED flow is a JSON array of nodes, received ${describe(flow)}`,
        ),
      ],
    };
  }
  if (flow.length === 0) {
    return { ok: false, issues: [issue("empty_flow", "the flow has no nodes")] };
  }

  for (const [index, node] of flow.entries()) {
    if (node === null || typeof node !== "object" || Array.isArray(node)) {
      issues.push(
        issue("node_not_an_object", `entry ${index} is ${describe(node)}`),
      );
      continue;
    }
    if (typeof node.id !== "string" || node.id.length === 0) {
      issues.push(issue("missing_id", `entry ${index} has no usable id`));
    }
    if (typeof node.type !== "string" || node.type.length === 0) {
      issues.push(issue("missing_type", `entry ${index} has no usable type`));
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  const seen = new Set();
  for (const node of flow) {
    if (seen.has(node.id)) {
      issues.push(
        issue("duplicate_id", `id "${node.id}" is used more than once`, node.id),
      );
    }
    seen.add(node.id);
  }

  const tabs = flow.filter((node) => node.type === "tab");
  if (tabs.length === 0) {
    issues.push(
      issue("missing_tab", 'the flow has no node of type "tab" to hold it'),
    );
  } else if (tabs.length > 1) {
    issues.push(
      issue(
        "multiple_tabs",
        `the flow has ${tabs.length} tabs, an importable flow has exactly one`,
      ),
    );
  }
  const tabId = tabs.length === 1 ? tabs[0].id : null;

  const flowNodeIds = new Set(
    flow.filter((node) => FLOW_NODE_TYPES.has(node.type)).map((node) => node.id),
  );

  for (const node of flow) {
    const { id, type } = node;

    if (type === "tab") continue;

    if (CONFIG_NODE_TYPES.has(type)) {
      if ("z" in node) {
        issues.push(
          issue(
            "config_node_on_tab",
            `configuration node "${id}" of type "${type}" must not carry a z property`,
            id,
          ),
        );
      }
      continue;
    }

    if (!FLOW_NODE_TYPES.has(type)) {
      issues.push(
        issue(
          "unknown_node_type",
          `node "${id}" uses type "${type}", which is not in the catalogue`,
          id,
        ),
      );
      continue;
    }

    if (tabId !== null && node.z !== tabId) {
      issues.push(
        issue(
          "node_off_tab",
          `node "${id}" has z "${node.z ?? "(none)"}" but the tab is "${tabId}"`,
          id,
        ),
      );
    }

    if (!Array.isArray(node.wires)) {
      issues.push(
        issue("missing_wires", `node "${id}" has no wires array`, id),
      );
      continue;
    }

    for (const [outputIndex, output] of node.wires.entries()) {
      if (!Array.isArray(output)) {
        issues.push(
          issue(
            "malformed_wires",
            `node "${id}" output ${outputIndex} is not an array of target ids`,
            id,
          ),
        );
        continue;
      }
      for (const target of output) {
        if (target === id) {
          issues.push(
            issue("self_wire", `node "${id}" is wired to itself`, id),
          );
          continue;
        }
        if (!seen.has(target)) {
          issues.push(
            issue(
              "dangling_wire",
              `node "${id}" is wired to "${target}", which does not exist`,
              id,
            ),
          );
          continue;
        }
        if (!flowNodeIds.has(target)) {
          issues.push(
            issue(
              "wire_to_non_flow_node",
              `node "${id}" is wired to "${target}", which is not a flow node`,
              id,
            ),
          );
        }
      }
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, flow };
}

/** Render issues as the block a human reads when a generation is refused. */
export function formatIssues(issues) {
  return issues.map((i) => `  [${i.code}] ${i.message}`).join("\n");
}

function describe(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return `a value of type ${typeof value}`;
}
