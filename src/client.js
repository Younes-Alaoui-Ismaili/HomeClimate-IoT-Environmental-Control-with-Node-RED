/**
 * Model clients.
 *
 * A client is anything with `complete(request) -> Promise<string>`. The pipeline
 * takes one as an argument and never constructs one itself. That is the reason
 * the test suite cannot reach the network even by accident: the tests pass a
 * fixture client, and nothing in the code path they exercise imports the SDK.
 *
 * The API key is read from the environment and from nowhere else. There is no
 * default, no config file, and no example value anywhere in this repository.
 */

const ENV_VAR = "ANTHROPIC_API_KEY";

/**
 * Replays a recorded model response. Deterministic, offline, and the client the
 * tests and `npm run example` use.
 *
 * @param {string | ((request: object) => string)} response
 */
export function createFixtureClient(response) {
  return {
    name: "fixture",
    async complete(request) {
      return typeof response === "function" ? response(request) : response;
    },
  };
}

/**
 * Calls the real Messages API. Used by the CLI, never by the test suite.
 *
 * Lazily imports the SDK so that installing without the optional dev dependency
 * still lets the offline paths run.
 *
 * @param {{ apiKey?: string }} [options]
 */
export function createAnthropicClient(options = {}) {
  const apiKey = options.apiKey ?? process.env[ENV_VAR];
  if (!apiKey) {
    throw new Error(
      `${ENV_VAR} is not set. Export your key before running the live path:\n` +
        `  export ${ENV_VAR}=...    (bash)\n` +
        `  $env:${ENV_VAR} = "..."  (PowerShell)\n` +
        "The key is never read from a file and never stored in this repository.",
    );
  }

  return {
    name: "anthropic",
    async complete(request) {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create(request);

      if (response.stop_reason === "refusal") {
        throw new Error(
          `the model declined the request (${response.stop_details?.category ?? "no category"})`,
        );
      }
      if (response.stop_reason === "max_tokens") {
        throw new Error(
          "the response hit max_tokens and is truncated; raise maxTokens and retry",
        );
      }

      return response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
    },
  };
}
