import RED from 'node-red';
import express from 'express';
import { createServer as httpServer } from 'node:http';
import { createServer as tcpServer } from 'node:net';
import { Aedes } from 'aedes';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

await mkdir('.runtime', {recursive:true});
let broker, mqttServer;
async function startBroker() {
 broker = await Aedes.createBroker();
 mqttServer = tcpServer(broker.handle);
 await new Promise((resolve,reject) => { mqttServer.once('error',reject); mqttServer.listen(1883,'127.0.0.1',resolve); });
}
await startBroker();
const app = express(), server = httpServer(app);
RED.init(server,{userDir:resolve('.runtime'),flowFile:'flows.json',httpAdminRoot:'/red',httpNodeRoot:'/',credentialSecret:false,functionExternalModules:false,logging:{console:{level:'warn',metrics:false,audit:false}},editorTheme:{projects:{enabled:false}}});
app.post('/proof/broker/restart',async (_req,res) => {
 await new Promise(resolve => broker.close(resolve));
 await new Promise(resolve => mqttServer.close(resolve));
 await startBroker();
 res.json({restarted:true,provenance:'local synthetic demonstration'});
});
app.use('/red',RED.httpAdmin);
app.use('/',RED.httpNode);
await RED.start();
await new Promise((resolve,reject) => { server.once('error',reject); server.listen(18880,'127.0.0.1',resolve); });
console.log('Local Node-RED: http://127.0.0.1:18880/red ; MQTT: 127.0.0.1:1883 ; synthetic data only');
async function stop() { await RED.stop(); await new Promise(resolve => broker.close(resolve)); mqttServer.close(); server.close(); }
process.on('SIGINT',() => { void stop(); });
process.on('SIGTERM',() => { void stop(); });
