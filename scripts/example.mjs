#!/usr/bin/env node
/**
 * End to end example, offline.
 *
 * Replays three fixture-backed model responses through the real pipeline and
 * prints what a caller sees. No API key, no network, no cost, so anybody who
 * clones this repository can run it and get the same output.
 *
 * Two of the three cases are refusals. That is the point of the example rather
 * than an accident of it: the interesting property of this module is not that
 * it produces a flow, it is that it declines to produce a broken one.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createFixtureClient } from "../src/client.js";
import { generateFlow } from "../src/generate.js";
import { formatIssues } from "../src/validate.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CASES = [
  {
    fixture: "temperature-gauge.txt",
    instruction:
      "Read the sensor, show temperature on a gauge, alert above 30 degrees",
    expect: "accepted",
  },
  {
    fixture: "dangling-wire.txt",
    instruction:
      "Read the sensor, show temperature on a gauge, alert above 30 degrees",
    expect: "refused",
  },
  {
    fixture: "unknown-kind.txt",
    instruction: "Post readings to a web service",
    expect: "refused",
  },
];

function rule(char = "-") {
  return char.repeat(72);
}

async function main() {
  console.log("Running fixture-backed examples. No network, no API key.");
  console.log(rule("="));

  let accepted = 0;
  let refused = 0;

  for (const testCase of CASES) {
    const raw = await readFile(
      path.join(ROOT, "fixtures", testCase.fixture),
      "utf8",
    );
    const result = await generateFlow(testCase.instruction, {
      client: createFixtureClient(raw),
    });

    console.log(`fixture:     ${testCase.fixture}`);
    console.log(`instruction: ${testCase.instruction}`);

    if (result.ok) {
      accepted += 1;
      const types = result.flow
        .map((node) => node.type)
        .reduce((counts, type) => counts.set(type, (counts.get(type) ?? 0) + 1), new Map());
      console.log(`outcome:     ACCEPTED, ${result.meta.nodeCount} nodes`);
      console.log(`tab:         ${result.plan.label}`);
      console.log(
        `node types:  ${[...types].map(([type, n]) => `${type} x${n}`).join(", ")}`,
      );
      console.log("This flow imports into Node-RED as is.");
    } else {
      refused += 1;
      console.log(`outcome:     REFUSED at stage "${result.stage}"`);
      console.log(`reason:      ${result.reason}`);
      console.log("issues:");
      console.log(formatIssues(result.issues));
      console.log("No flow was produced. A partial flow is not an acceptable result.");
    }

    if (result.ok !== (testCase.expect === "accepted")) {
      console.error(
        `\nUNEXPECTED: ${testCase.fixture} was expected to be ${testCase.expect}.`,
      );
      process.exit(1);
    }
    console.log(rule());
  }

  console.log(`${accepted} accepted, ${refused} refused, all as expected.`);
}

main().catch((error) => {
  console.error(`example failed: ${error?.message ?? error}`);
  process.exit(1);
});
