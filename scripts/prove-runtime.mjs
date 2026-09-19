import mqtt from 'mqtt';
import { mkdir, writeFile } from 'node:fs/promises';
const client=mqtt.connect('mqtt://127.0.0.1:1883',{reconnectPeriod:500});
await new Promise((resolve,reject) => { client.once('connect',resolve); client.once('error',reject); });
let reconnects=0;
client.on('reconnect',()=>reconnects++);
await client.subscribeAsync('homeclimate/output',{qos:1});
async function observe(value) {
 return new Promise((resolve,reject) => {
  const send=()=>{ if(client.connected) client.publish('homeclimate/input',String(value),{qos:1}); };
  const timer=setInterval(send,500);
  const timeout=setTimeout(()=>{cleanup();reject(new Error('No matching output after 30 seconds'));},30000);
  const message=(topic,payload)=>{if(topic==='homeclimate/output' && Number(payload.toString())===value){cleanup();resolve(value);}};
  function cleanup(){clearInterval(timer);clearTimeout(timeout);client.off('message',message);}
  client.on('message',message);send();
 });
}
try {
 const first=await observe(35);
 const response=await fetch('http://127.0.0.1:18880/proof/broker/restart',{method:'POST'});
 if(!response.ok)throw new Error('Broker restart failed');
 const second=await observe(27);
 await mkdir('evidence',{recursive:true});
 const proof={runtime:'real local Node-RED + MQTT broker',first,afterReconnect:second,reconnects,physicalSensor:false,date:new Date().toISOString()};
 await writeFile('evidence/runtime.json',JSON.stringify(proof,null,2));
 console.log(JSON.stringify(proof));
} finally { await client.endAsync(); }
