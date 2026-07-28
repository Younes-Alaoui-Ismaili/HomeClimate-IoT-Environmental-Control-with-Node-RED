#!/usr/bin/env node
/**
 * nl2flow: one plain-language instruction in, one importable Node-RED flow out.
 *
 *   node bin/nl2flow.js "read the sensor and show temperature on a gauge"
 *   node bin/nl2flow.js "..." --out flow.json
 *   node bin/nl2flow.js --replay fixtures/temperature-gauge.txt
 *
 * The live path needs ANTHROPIC_API_KEY in the environment. The replay path
 * needs nothing at all: it runs a stored model response through the same
 * pipeline, offline.
 *
 * Exit codes: 0 accepted, 1 refused, 2 could not run.
 */

import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

import { createAnthropicClient, createFixtureClient } from "../src/client.js";
import { generateFlow } from "../src/generate.js";
import { formatIssues } from "../src/validate.js";

const USAGE = `Usage:
  nl2flow "<instruction>" [--out <file>] [--model <id>] [--max-tokens <n>]
  nl2flow --replay <file> [--instruction "<text>"] [--out <file>]

Options:
  --out <file>          write the flow to a file instead of stdout
  --replay <file>       run a stored model response instead of calling the API
  --instruction <text>  instruction recorded alongside a replayed response
  --model <id>          model id (default: claude-opus-5)
  --max-tokens <n>      output budget (default: 16000)

The live path reads ANTHROPIC_API_KEY from the environment.`;

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  let client;
  let instruction = args.positional[0] ?? args.instruction;

  if (args.replay) {
    const recorded = await readFile(args.replay, "utf8");
    client = createFixtureClient(recorded);
    instruction ??= `replay of ${args.replay}`;
  } else {
    if (!instruction) {
      process.stderr.write(`${USAGE}\n`);
      return 2;
    }
    client = createAnthropicClient();
  }

  const result = await generateFlow(instruction, {
    client,
    model: args.model,
    maxTokens: args.maxTokens,
  });

  if (!result.ok) {
    process.stderr.write(
      [
        "REFUSED",
        `  instruction: ${instruction}`,
        `  stage:       ${result.stage}`,
        `  reason:      ${result.reason}`,
        "  issues:",
        formatIssues(result.issues),
        "",
        "No flow was written. A partially valid flow is not an acceptable result.",
        "",
      ].join("\n"),
    );
    return 1;
  }

  const json = `${JSON.stringify(result.flow, null, 2)}\n`;
  if (args.out) {
    await writeFile(args.out, json, "utf8");
    process.stdout.write(
      `ACCEPTED  ${result.meta.nodeCount} nodes written to ${args.out}\n`,
    );
  } else {
    process.stdout.write(json);
  }
  return 0;
}

function parseArgs(argv) {
  const args = { positional: [], maxTokens: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "--out":
        args.out = argv[++i];
        break;
      case "--replay":
        args.replay = argv[++i];
        break;
      case "--instruction":
        args.instruction = argv[++i];
        break;
      case "--model":
        args.model = argv[++i];
        break;
      case "--max-tokens":
        args.maxTokens = Number(argv[++i]);
        break;
      default:
        args.positional.push(arg);
    }
  }
  return args;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error) => {
    process.stderr.write(`ERROR  ${error.message}\n`);
    process.exit(2);
  });
