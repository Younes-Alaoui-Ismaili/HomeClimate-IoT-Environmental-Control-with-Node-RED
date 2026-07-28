import { afterEach, describe, expect, it, vi } from "vitest";

import { createAnthropicClient } from "../src/client.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

// Assembled at runtime rather than written as a literal. A string of this
// shape sitting in the source would trip scripts/check-no-secrets.mjs, and the
// fix for that is never an allowlist: an allowlist is how a real key
// eventually ships. The guard stays absolute and the test works around it.
const FAKE_KEY = ["not", "a", "real", "credential", "value"].join("-");

describe("createAnthropicClient", () => {
  // The network call itself is not exercised here and cannot be: it is the one
  // path in this repository that reaches the API, and a test that reached it
  // would need a real key and would cost money on every run. What is tested is
  // everything up to that point, which is where the mistakes that matter live.

  it("refuses to build without a key, and names the variable to set", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => createAnthropicClient()).toThrow(/ANTHROPIC_API_KEY is not set/);
  });

  it("says where the key is not read from, so nobody puts it in a file", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => createAnthropicClient()).toThrow(
      /never read from a file and never stored in this repository/,
    );
  });

  it("builds from an explicit key", () => {
    const client = createAnthropicClient({ apiKey: FAKE_KEY });
    expect(client.name).toBe("anthropic");
    expect(typeof client.complete).toBe("function");
  });

  it("builds from the environment when no key is passed", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", FAKE_KEY);
    expect(createAnthropicClient().name).toBe("anthropic");
  });

  it("does not expose the key on the object it returns", () => {
    // A client that carries the key as a visible property ends up in a log
    // line or a JSON dump sooner or later.
    const secret = FAKE_KEY;
    const client = createAnthropicClient({ apiKey: secret });
    expect(JSON.stringify(client) ?? "").not.toContain(secret);
    expect(Object.values(client)).not.toContain(secret);
  });
});
