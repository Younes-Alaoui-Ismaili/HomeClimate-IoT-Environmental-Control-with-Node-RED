# HomeClimate

An environmental monitoring prototype from 2019, extended in 2026 with a
generator that turns a plain-language instruction into an importable Node-RED
flow.

[![CI](https://github.com/Younes-Alaoui-Ismaili/HomeClimate-IoT-Environmental-Control-with-Node-RED/actions/workflows/ci.yml/badge.svg)](https://github.com/Younes-Alaoui-Ismaili/HomeClimate-IoT-Environmental-Control-with-Node-RED/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-20%20%7C%2022-informational)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Two layers, seven years apart

**2019, the prototype.** A home environment monitor: DHT11 and BMP180 sensors
feeding Node-RED over MQTT, with an IBM Watson IoT backend and a dashboard.
`Back-end.js` is the exported flow exactly as it was committed in 2019, and the
two screenshots below are from that build. Nothing in the 2026 layer modifies
it.

**2026, the extension.** A module that takes a sentence and produces a flow you
can paste into Node-RED. The interesting part is not that it emits a flow. It is
that it refuses to emit a broken one, and says why.

The 2019 flow is not decoration here. The test suite points the 2026 validator
at it, unmodified, so the validator has to accept a real flow it did not
generate.

### Screenshots, 2019

![Node-RED Flow](Flow%20on%20Node-Red.png)

![Dashboard](Home-monitoring-Front-End.png)

---

## From a sentence to an automation

```
instruction
  -> buildRequest     JSON Schema and node catalogue attached to the request
  -> client.complete  injected, so no test path reaches the network
  -> extractJson      survives a code fence or a stray sentence
  -> planSchema       shape, enforced rather than hoped for
  -> materialize      plan expanded into real Node-RED nodes
  -> validateFlow     meaning, which a schema cannot express
```

The model never writes Node-RED JSON. It writes a small plan constrained by a
JSON Schema, and the plan is expanded into real nodes locally. Two reasons:

- A Node-RED flow carries per-type properties, wiring conventions and invisible
  configuration nodes. Asking a model to get all of that right produces
  plausible JSON that Node-RED then refuses to import.
- A narrow plan is something a JSON Schema can actually describe, so the shape
  is enforced at the API boundary.

zod is the single source of truth. The JSON Schema sent to the model is derived
from it, so prompt, schema and validator cannot drift apart.

### Refusal is the feature

Any stage can refuse, and a refusal names the stage and the issues and produces
no flow at all. A flow that only mostly imports is worse than a refusal, because
it fails at the point where somebody is already relying on it.

```
outcome:     REFUSED at stage "validate"
reason:      the resulting flow would not import into Node-RED
issues:
  [dangling_wire] node "above_threshold" is wired to "notify_operator", which does not exist
No flow was produced. A partial flow is not an acceptable result.
```

That refusal is the one a JSON Schema cannot produce: the shape is perfect and
the meaning is broken.

---

## Run it without an API key

Everything below is offline and costs nothing.

```bash
npm install
npm run example
```

`npm run example` replays three fixture-backed model responses through the real
pipeline: one accepted, one refused for a wire pointing at a node that does not
exist, one refused for a node kind outside the catalogue.

Replay a single stored response:

```bash
node bin/nl2flow.js --replay fixtures/temperature-gauge.txt
```

### The live path

This is the only path that calls the API, and it is the only one that costs
money.

```bash
export ANTHROPIC_API_KEY=...
node bin/nl2flow.js "read the sensor and show temperature on a gauge" --out flow.json
```

The key is read from the environment and from nowhere else. There is no config
file, no default and no example value anywhere in this repository.

---

## What is proven here

Every claim below is checked by `npm test` and by CI on Node 20 and 22.

| Claim | How it is checked |
| --- | --- |
| The pipeline accepts a good response and produces an importable flow | end to end on a fixture, node and tab structure asserted |
| It refuses a structurally valid plan whose wires point nowhere | end to end, refusal asserted at the `validate` stage |
| It refuses a node kind outside the catalogue | end to end, refusal asserted at the `schema` stage |
| The validator is not circular | it is run against the untouched 2019 flow, which it must accept |
| Every catalogued kind can actually be built | each of the 13 kinds is materialised and validated in a loop |
| The same plan always yields the same flow | two runs compared as serialised output |
| Extraction survives a code fence or a preamble | dedicated cases per shape |
| The prompt cannot drift from the schema | the prompt is generated from the catalogue, and asserted to contain it |
| No test can reach the network | the client is a required injected argument, with no default |
| The API key is never exposed on the client object | asserted directly |

At the last local run: 68 tests across 7 files, coverage 94.37 percent of
statements, 90.76 percent of branches and 95.23 percent of lines.

## What is not proven here

This section exists because the table above is worth nothing without it.

- **The live API call is not exercised.** `complete()` on the Anthropic client
  is the one function in `src/` with no test, because covering it means issuing
  a real billed request on every run. Function coverage is 89.28 percent for
  that reason, and the threshold is set accordingly rather than faked.
- **The fixtures are hand authored, not captured from live calls.** They are
  written to be representative, including the formatting quirks the pipeline
  has to survive, but nobody should read them as evidence of what a given model
  returned on a given day. See `fixtures/README.md`.
- **No generated flow has been imported into a running Node-RED instance as
  part of CI.** Validation here is structural: identity, reachability, tab and
  configuration node conventions. It is stricter than a schema and it is not
  the same thing as Node-RED accepting the file.
- **The 2019 hardware build is not reproducible from this repository alone.**
  There is no wiring diagram and no parts list, only the exported flow and two
  screenshots.
- **The node catalogue is small on purpose.** Thirteen kinds, chosen to cover
  this prototype's domain. Anything outside them is refused rather than
  approximated, which is correct behaviour and also a real limit.

---

## Layout

```
Back-end.js          the 2019 Node-RED flow, untouched
src/                 the 2026 layer
  catalog.js         node kinds the model may use, and their Node-RED types
  schema.js          zod contract, and the JSON Schema derived from it
  prompt.js          system prompt, generated from the catalogue
  client.js          fixture client and Anthropic client, both injectable
  extract.js         pull JSON out of a model response
  materialize.js     plan expanded into real Node-RED nodes
  validate.js        graph validation for any Node-RED flow
  generate.js        the pipeline
bin/nl2flow.js       command line entry point
fixtures/            stored model responses used by tests and the example
scripts/             offline example and the repository guards
test/                the suite
```

## Requirements

Node 20 or later. One runtime dependency, `zod`. The Anthropic SDK is a
development dependency and is imported lazily, so the offline paths run without
it.

## License

MIT. See `LICENSE`.
