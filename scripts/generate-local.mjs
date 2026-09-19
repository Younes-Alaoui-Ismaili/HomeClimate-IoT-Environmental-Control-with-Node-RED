import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { generateFlow } from '../src/generate.js';
import { createOllamaClient } from '../src/ollama.js';
const instruction = process.argv.slice(2).join(' ') || 'Subscribe to MQTT topic homeclimate/input, convert msg.payload to a number in a function, display it in a temperature gauge and publish the number to homeclimate/output. No physical sensor. Use exactly four nodes.';
const started = performance.now();
const result = await generateFlow(instruction, { client:createOllamaClient(),model:process.env.OLLAMA_MODEL ?? 'qwen3:4b',maxTokens:4096 });
await mkdir('evidence',{recursive:true});
const name = 'evidence/generated-' + new Date().toISOString().replace(/[:.]/g,'-') + '.local.json';
await writeFile(name,JSON.stringify({model:process.env.OLLAMA_MODEL ?? 'qwen3:4b',duration_ms:Math.round(performance.now()-started),result},null,2));
if (!result.ok) { console.error('Generation refused; see ' + name); process.exitCode=1; }
else {
 const raw=JSON.stringify(result.flow,null,2)+'\n';
 await writeFile(name+'.flow.json',raw);
 console.log(JSON.stringify({file:name+'.flow.json',sha256:createHash('sha256').update(raw).digest('hex'),status:'Review every function, topic and connection before runtime deployment'}));
}
