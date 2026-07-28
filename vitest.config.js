import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // No environment, no globals, no setup file. The module under test is
    // plain Node with an injected client, and the suite should stay that
    // cheap to run.
    include: ["test/**/*.test.js"],
    coverage: {
      provider: "v8",
      // `all` counts files the tests never import. Without it, deleting the
      // only test for a module raises the coverage number instead of lowering
      // it, which is the wrong incentive.
      all: true,
      include: ["src/**/*.js"],
      reporter: ["text", "json-summary"],
      // Set just under what the suite actually reaches, so a real regression
      // trips them. Functions sits lower than the rest on purpose: the
      // `complete()` method of the Anthropic client is the single function in
      // src/ that performs the API call, and covering it would mean issuing a
      // real billed request on every run. It is left uncovered and said so in
      // the README rather than papered over with a mock that would only prove
      // the mock works.
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 85,
        lines: 90,
      },
    },
  },
});
