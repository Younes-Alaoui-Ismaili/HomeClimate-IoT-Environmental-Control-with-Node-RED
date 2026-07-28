# Fixtures

Fixture-backed model responses. Each `.txt` file is the raw assistant text for
one instruction, replayed through the whole pipeline by the tests and by
`npm run example`.

## Provenance

**These responses are hand authored, not captured from a live API call.** They
are written to be representative of what the model returns for the paired
instruction, including the formatting quirks the pipeline has to survive, but
nobody should read them as evidence of what a given model actually produced on a
given day.

If you want a captured response instead, run the live path with your own key and
save the output:

```bash
export ANTHROPIC_API_KEY=...
node bin/nl2flow.js "your instruction" > /tmp/flow.json
```

## Files

| File | Instruction | Expected outcome |
| --- | --- | --- |
| `temperature-gauge.txt` | Read the sensor, show temperature on a gauge, alert above 30 degrees | accepted |
| `dangling-wire.txt` | Same instruction | refused at `validate`: a wire points at a node that does not exist |
| `unknown-kind.txt` | Post readings to a web service | refused at `schema`: `kind` is outside the catalogue |

`dangling-wire.txt` is wrapped in a code fence on purpose. Structured output
constrains the shape of the JSON, not whether the model decorates it, so the
extraction step has to handle a fence and this fixture keeps that covered.
