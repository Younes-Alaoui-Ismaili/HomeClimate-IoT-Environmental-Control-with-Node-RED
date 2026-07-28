#!/usr/bin/env node
/**
 * check-no-secrets.mjs
 *
 * Refuses anything that looks like a live credential committed to the tree.
 *
 * There is no allowlist and no escape hatch, on purpose. An allowlist is the
 * mechanism by which a real key eventually ships: somebody adds an exception
 * for a test value, and the next real key lands in the same shape.
 *
 * This file necessarily contains the patterns it looks for, so it excludes
 * itself by absolute path. That is the only exclusion.
 *
 * Usage: node scripts/check-no-secrets.mjs [directory]
 * Exit: 0 clean, 1 suspected credential found, 2 unexpected error.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const PATTERNS = [
  {
    label: "Anthropic API key",
    // Built by concatenation so the literal prefix never appears as one token.
    re: new RegExp("sk" + "-ant-[A-Za-z0-9_-]{16,}"),
  },
  {
    label: "assignment of a key-shaped value",
    re: /\b(?:api[_-]?key|apikey|secret|token|password|passwd)\b\s*[:=]\s*["'`][A-Za-z0-9_\-./+]{16,}["'`]/i,
  },
  {
    label: "exported credential with a value",
    re: /\b[A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)\b\s*=\s*[A-Za-z0-9_\-./+]{16,}/,
  },
  {
    label: "private key block",
    re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  {
    label: "bearer credential",
    re: /\bBearer\s+[A-Za-z0-9_\-.]{24,}/,
  },
];

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage"]);
const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz",
  ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp4", ".mov", ".mp3", ".wasm",
]);

const SELF = path.resolve(process.argv[1] ?? "");

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
      if (path.resolve(full) === SELF) continue;
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
      for (const { label, re } of PATTERNS) {
        if (re.test(line)) {
          hits.push({ file: path.relative(target, file), line: i + 1, label });
        }
      }
    });
  }

  if (hits.length === 0) {
    console.log(
      `[no-secrets] OK: nothing credential shaped in ${files.length} files under ${target}`,
    );
    process.exit(0);
  }

  // The matched text is deliberately not printed: a guard that echoes the
  // secret it found puts it in the CI log, which is the wrong place for it.
  console.error(`[no-secrets] FAIL: ${hits.length} suspected credential(s)`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  [${h.label}]  (value withheld)`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(`[no-secrets] unexpected error: ${error?.message ?? error}`);
  process.exit(2);
});
