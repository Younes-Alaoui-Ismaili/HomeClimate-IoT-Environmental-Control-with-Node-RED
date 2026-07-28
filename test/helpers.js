/**
 * Test helpers.
 *
 * `makeNode` fills every property with null so a test only has to state the
 * part it is actually about. The schema requires all thirteen properties to be
 * present, so writing them out in each test would bury the assertion.
 */

export function makeNode(overrides = {}) {
  return {
    id: "n1",
    kind: "function",
    name: "Node",
    topic: null,
    code: null,
    property: null,
    operator: null,
    compareTo: null,
    unit: null,
    min: null,
    max: null,
    intervalSeconds: null,
    wires: [],
    ...overrides,
  };
}

export function makePlan(nodes, overrides = {}) {
  return {
    label: "Test flow",
    description: "A flow built by the test suite.",
    nodes,
    ...overrides,
  };
}

/** A client that returns a canned string and records what it was asked. */
export function spyClient(response) {
  const calls = [];
  return {
    calls,
    name: "spy",
    async complete(request) {
      calls.push(request);
      return response;
    },
  };
}
