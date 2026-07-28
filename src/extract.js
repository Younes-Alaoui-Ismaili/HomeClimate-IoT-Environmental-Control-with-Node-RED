/**
 * Pull the JSON object out of a model response.
 *
 * Even with a schema attached to the request, this stays in the pipeline. A
 * model that has been asked for JSON can still wrap it in a fenced block or add
 * a sentence of preamble, and a parser that assumes clean input turns that into
 * a stack trace instead of a refusal a human can read.
 */

const FENCED = /```(?:json)?\s*\n([\s\S]*?)\n?```/;

/**
 * @param {string} raw
 * @returns {{ ok: true, value: unknown } | { ok: false, issues: {code: string, message: string}[] }}
 */
export function extractJson(raw) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      ok: false,
      issues: [
        { code: "empty_response", message: "the model returned no text" },
      ],
    };
  }

  const candidates = [];
  const fenced = raw.match(FENCED);
  if (fenced) candidates.push(fenced[1]);

  const trimmed = raw.trim();
  candidates.push(trimmed);

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) candidates.push(trimmed.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      return { ok: true, value: JSON.parse(candidate) };
    } catch {
      // Try the next candidate.
    }
  }

  return {
    ok: false,
    issues: [
      {
        code: "not_json",
        message:
          "no parseable JSON object found in the model response; the first 200 characters were: " +
          JSON.stringify(trimmed.slice(0, 200)),
      },
    ],
  };
}
