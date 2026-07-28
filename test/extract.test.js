import { describe, expect, it } from "vitest";

import { extractJson } from "../src/extract.js";

describe("extractJson", () => {
  it("reads a bare JSON object", () => {
    expect(extractJson('{"label":"x"}')).toEqual({
      ok: true,
      value: { label: "x" },
    });
  });

  it("reads JSON wrapped in a json code fence", () => {
    // The reason this stage exists. Structured output constrains the shape of
    // the JSON, not whether the model decorates it on the way out.
    const raw = 'Here is the flow.\n\n```json\n{"label":"x"}\n```\n';
    expect(extractJson(raw)).toEqual({ ok: true, value: { label: "x" } });
  });

  it("reads JSON wrapped in an unlabelled fence", () => {
    expect(extractJson('```\n{"label":"x"}\n```')).toEqual({
      ok: true,
      value: { label: "x" },
    });
  });

  it("reads JSON preceded by a stray sentence, without a fence", () => {
    expect(extractJson('Sure thing.\n{"label":"x"}')).toEqual({
      ok: true,
      value: { label: "x" },
    });
  });

  it("keeps braces that appear inside string values intact", () => {
    const raw = '{"code":"if (x) { return msg; }"}';
    expect(extractJson(raw).value.code).toBe("if (x) { return msg; }");
  });

  it("refuses an empty response", () => {
    expect(extractJson("   ")).toMatchObject({
      ok: false,
      issues: [{ code: "empty_response" }],
    });
  });

  it("refuses a non-string response", () => {
    expect(extractJson(null)).toMatchObject({
      ok: false,
      issues: [{ code: "empty_response" }],
    });
  });

  it("refuses text with no JSON in it, and quotes what it saw", () => {
    const result = extractJson("I cannot help with that.");
    expect(result.ok).toBe(false);
    expect(result.issues[0].code).toBe("not_json");
    expect(result.issues[0].message).toContain("I cannot help with that.");
  });
});
