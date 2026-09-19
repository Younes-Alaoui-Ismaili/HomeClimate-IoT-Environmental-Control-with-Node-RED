const fs=require('node:fs');
const {chromium}=require('playwright-core');
const mqtt=require('mqtt');
let browser,client;
async function main(){
 const dir='evidence/browser-'+new Date().toISOString().replace(/[:.]/g,'-');fs.mkdirSync(dir,{recursive:true});
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:process.env.BROWSER_CHANNEL||'msedge'})});
 const context=await browser.newContext({viewport:{width:1200,height:800},recordVideo:{dir}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:18880/dashboard/home',{waitUntil:'domcontentloaded',timeout:60000});
 await page.getByText('Temperature Gauge',{exact:true}).waitFor({timeout:30000});
 client=mqtt.connect('mqtt://127.0.0.1:1883');await new Promise((resolve,reject)=>{client.once('connect',resolve);client.once('error',reject)});
 for(const value of [35,27]){await client.publishAsync('homeclimate/input',String(value),{qos:1});await page.getByText(String(value),{exact:true}).waitFor({timeout:30000});}
 const paths=await page.locator('.nrdb-ui-gauge svg path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));
 if(!paths.length||paths.some(d=>!d||/NaN|undefined/.test(d)))throw new Error('Gauge arc geometry is invalid');
 await page.screenshot({path:dir+'/homeclimate-gauge.png',fullPage:true});
 await client.endAsync();client=undefined;await context.close();await browser.close();browser=undefined;
 fs.writeFileSync(dir+'/result.json',JSON.stringify({visibleValues:[35,27],runtime:'local Node-RED, FlowFuse Dashboard and MQTT',physicalSensor:false,browserErrors:errors,date:new Date().toISOString()},null,2));
 if(errors.length)throw new Error(errors.join(';'));
 console.log('Gauge displayed 35 then 27 in the real browser');
}
main().catch(async e=>{console.error(e.message);await client?.endAsync();await browser?.close();process.exitCode=1});
