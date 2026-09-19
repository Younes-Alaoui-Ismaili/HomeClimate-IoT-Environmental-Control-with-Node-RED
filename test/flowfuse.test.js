import { it, expect } from 'vitest';
import { materialize } from '../src/materialize.js';
import { validateFlow } from '../src/validate.js';
import { createOllamaClient } from '../src/ollama.js';
import { makeNode, makePlan } from './helpers.js';
it('generates FlowFuse widgets and their complete configuration by default', () => {
 const result = materialize(makePlan([makeNode({ id: 'g', kind: 'gauge' })]));
 const gauge = result.flow.find(n => n.id === 'g');
 expect(gauge.type).toBe('ui-gauge');
 expect(gauge.sizeThickness).toBeGreaterThan(0);
 expect(gauge.sizeGap).toBeGreaterThanOrEqual(0);
 expect(gauge.sizeKeyThickness).toBeGreaterThan(0);
 expect(result.flow.some(n => n.type === 'ui-base')).toBe(true);
 expect(validateFlow(result.flow).ok).toBe(true);
 const broken = result.flow.filter(n => n.type !== 'ui-group');
 expect(validateFlow(broken).ok).toBe(false);
});
it('keeps an explicit historical dashboard output', () => {
 expect(materialize(makePlan([makeNode({ kind: 'gauge' })]), { dashboard: 'legacy' }).flow.some(n => n.type === 'ui_gauge')).toBe(true);
});
it('local generation refuses remote endpoints and truncated model responses', async () => {
 expect(() => createOllamaClient({ baseUrl: 'https://example.com' })).toThrow(/loopback/);
 const client = createOllamaClient({ fetcher: async () => new Response(JSON.stringify({ done: true, done_reason: 'length', message: { content: '{}' } })) });
 await expect(client.complete({ model: 'qwen3:4b', messages: [] })).rejects.toThrow(/truncated/);
});
