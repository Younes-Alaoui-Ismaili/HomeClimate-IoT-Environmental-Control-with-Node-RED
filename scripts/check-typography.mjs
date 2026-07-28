#!/usr/bin/env node
/**
 * check-typography.mjs
 *
 * Refuses em dashes (U+2014) and en dashes (U+2013) anywhere in the tree.
 *
 * The rule is a house style rule, not a technical one, but it is enforced
 * mechanically for the same reason lint rules are: a style that depends on
 * somebody remembering it is a style that drifts.
 *
 * Usage: node scripts/check-typography.mjs [directory]
 * Exit: 0 clean, 1 offending characters found, 2 unexpected error.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

// Built from code points so this file does not itself contain the characters
// it refuses, which would make it its own first offender.
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const OFFENDERS = new Map([
  [EM_DASH, "U+2014 em dash"],
  [EN_DASH, "U+2013 en dash"],
]);

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage"]);
const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz",
  ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp4", ".mov", ".mp3", ".wasm",
]);

async function walk(dir, out) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, out);
    } else if (entry.isFile()) {
      if (BINARY_EXT.has(path.extname(entry.name).toLowerCase())) continue;
      out.push(full);
    }
  }
}

async function main() {
  const target = path.resolve(process.argv[2] ?? ".");
  const files = [];
  await walk(target, files);

  const hits = [];
  for (const file of files) {
    let text;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    text.split(/\r?\n/).forEach((line, i) => {
      for (const [char, label] of OFFENDERS) {
        if (line.includes(char)) {
          hits.push({
            file: path.relative(target, file),
            line: i + 1,
            label,
            text: line.trim().slice(0, 100),
          });
        }
      }
    });
  }

  if (hits.length === 0) {
    console.log(
      `[typography] OK: no em or en dash in ${files.length} files under ${target}`,
    );
    process.exit(0);
  }

  console.error(`[typography] FAIL: ${hits.length} occurrence(s)`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  [${h.label}]  ${h.text}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(`[typography] unexpected error: ${error?.message ?? error}`);
  process.exit(2);
});
