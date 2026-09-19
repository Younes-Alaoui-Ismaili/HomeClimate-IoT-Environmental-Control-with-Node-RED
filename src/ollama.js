export function createOllamaClient({ baseUrl = 'http://127.0.0.1:11434', fetcher = fetch } = {}) {
 const url = new URL(baseUrl);
 if (url.protocol !== 'http:' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Ollama requires a loopback endpoint');
 return { name:'ollama', async complete(request) {
  const response = await fetcher(url.origin + '/api/chat', { method:'POST',redirect:'error',signal:AbortSignal.timeout(300000),headers:{'Content-Type':'application/json'},
   body:JSON.stringify({model:request.model,stream:false,think:false,format:request.output_config?.format?.schema ?? 'json',messages:[{role:'system',content:request.system ?? ''},...request.messages],options:{num_ctx:8192,num_predict:request.max_tokens ?? 2048,temperature:0}}) });
  if (!response.ok) throw new Error('Local model unavailable (' + response.status + ')');
  const data = await response.json();
  if (!data.done || data.done_reason === 'length') throw new Error('Local response incomplete or truncated');
  if (typeof data.message?.content !== 'string') throw new Error('Local response missing content');
  return data.message.content.split('</think>').at(-1).trim();
 }};
}
