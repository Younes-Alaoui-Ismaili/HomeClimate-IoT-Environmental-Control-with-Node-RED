# Local generated-flow demonstration

The current generator emits FlowFuse Dashboard nodes. The validator continues to read historical node-red-dashboard formats, and materialize(plan, { dashboard: 'legacy' }) remains available for historical tests. Back-end.js is kept as the historical export.

The demonstration below uses synthetic MQTT messages, no physical sensor, no paid AI API and no IBM cloud connection.

## Start and generate

Use Node.js 22, install dependencies and start local Ollama with qwen3:4b or the qwen3:4b-portfolio template variant described in the sibling claude-copilot-kit repository.

```sh
npm ci
npm test
node scripts/runtime.mjs
```

The isolated runtime uses localhost:18880 for Node-RED and localhost:1883 for its embedded MQTT broker. The editor is /red and the dashboard is /dashboard/home. Its state lives in ignored .runtime/. This is a local test runtime; its editor and broker are not authenticated for network hosting.

In another terminal, set OLLAMA_MODEL to the installed model and run:

```sh
npm run example:local
```

The generated plan and flow are written under evidence/ as ignored .local.json files. Generation is not deployment. Read the complete generated flow before execution: node types, function bodies, broker addresses, HTTP endpoints, file access and wiring. The validator checks structure; it cannot establish that arbitrary function code is safe.

## Review gate and execution

After review, calculate the exact flow file's SHA-256, then pass the path and approved digest:

```sh
node scripts/deploy-reviewed.mjs PATH_TO_FLOW.json SHA256
node scripts/prove-runtime.mjs
```

The deployment script refuses a mismatched digest, invalid wiring and physical-sensor nodes in this synthetic demonstration. It deploys only to the local test instance. A matching hash proves which file was reviewed; it does not automate the review.

The recorded demonstration flow subscribes to homeclimate/input, converts the payload to a number, feeds a FlowFuse gauge and publishes homeclimate/output. The runtime proof sends 35, observes the output, interrupts/restarts the broker and then verifies 27 after reconnection. Browser evidence separately checks the gauge's displayed values.

The generated function accepts parseFloat input for this controlled scenario. This flow is not a general validation layer for arbitrary sensor payloads. The test messages are known finite numbers.

## Acceptance and limits

- The unit suite verifies plan parsing, graph validation, legacy compatibility and current Dashboard configuration.
- The actual runtime must accept the reviewed flow and transmit MQTT messages.
- Broker reconnection must restore message processing.
- The actual browser must show the injected values; a generated JSON file alone is insufficient.
- The demonstration contains no physical acquisition or actuator control.

createOllamaClient implements the existing completion interface. Existing fixture and provider clients are preserved. All local model results, errors and reviewed flow hashes belong in evidence; avoid presenting an unexecuted generation as a running automation.

[FlowFuse migration guide](https://dashboard.flowfuse.com/user/migration.html) and [Node-RED embedding](https://nodered.org/docs/user-guide/runtime/embedding) describe the runtime components.
