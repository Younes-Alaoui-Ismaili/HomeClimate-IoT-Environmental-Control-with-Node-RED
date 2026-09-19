# Executed local flow evidence

A real local Qwen3 4B model generated the plan in [generation-record.json](generation-record.json). The original generation is retained, including the first materialized flow. The gauge configuration was subsequently corrected in the materializer; the same generated plan produced [reviewed-flow.json](reviewed-flow.json).

The reviewed flow SHA-256 is 589dc5a560e39cf905b41919c30a5457c0d771349725c2775c289e73505af855. Review covered every node, MQTT endpoint, function body and wire before deployment. The flow contains only a local MQTT input, numeric conversion, gauge and local MQTT output, plus their configuration nodes.

- [Runtime result](runtime.json): message 35 transmitted, broker interrupted and restarted, message 27 transmitted after reconnection.
- [Browser result](browser-result.json): values 35 and 27 displayed, finite gauge arc paths checked, no captured JavaScript errors.
- [Gauge screenshot](homeclimate-gauge.png) and [browser recording](generated-flow-browser.webm).

No physical sensor, actuator, IBM cloud connection or paid model API was used. The generated parseFloat function is evaluated with controlled finite numeric messages; it is not a general sensor validation layer.

Follow [reproduction and review instructions](../docs/local-runtime.md), then run node scripts/prove-browser.cjs against the reviewed local runtime. The script uses installed Edge through Playwright Core by default; set BROWSER_EXECUTABLE for another installed browser. Playwright FFmpeg is required for video recording. Explain the MQTT topic, wiring, review hash and expected behavior after a broker restart.
