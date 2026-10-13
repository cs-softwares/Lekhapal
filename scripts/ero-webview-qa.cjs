/* Local-only emulator QA. ADB forward must target Lekhpal on emulator-5556. */
const fs=require('fs');const WebSocket=require('ws');
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9224/json')).json();
 const page=pages.find(p=>/^https:\/\/(?:officials|ecinet)\.eci\.gov\.in\//.test(p.url));
 if(!page)throw Error('Open the Lekhpal ERO screen first');
 const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject)});
 let id=0;const pending=new Map();ws.on('message',raw=>{const m=JSON.parse(raw);if(m.id&&pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result)}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))});
 try{
 const result=await call('Runtime.evaluate',{expression:process.argv[2]?fs.readFileSync(process.argv[2],'utf8'):'JSON.stringify({url:location.href,title:document.title,text:document.body.innerText.slice(0,12000),links:Array.from(document.querySelectorAll("a")).map(a=>[a.textContent,a.href]),scripts:Array.from(document.scripts).map(s=>s.src),bridge:!!window.__lekhpalEro})',returnByValue:true,awaitPromise:true});
 if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));console.log(JSON.stringify(result.result.value,null,2));
 }finally{ws.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
