/* Run only with ADB port 9226 forwarded to com.lekhpal on emulator-5556.
   Replaces an unauthenticated login document with a network-isolated synthetic
   form. This never loads government scripts or submits government records. */
const fs = require('fs');
const WebSocket = require('ws');
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'"><title>SYNTHETIC KHASRA QA ONLY</title><style>body{font:16px sans-serif;padding:12px;color:#17324d}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #aaa;padding:8px}button,input,select{font-size:16px;padding:10px;margin:6px}h2{color:#1565c0}.ajs-success{background:#eef8ee;padding:8px}</style></head><body><h2>SYNTHETIC TEST ONLY</h2><p>No government connection or records.</p><table><tr><td>Fasli year</td><td>1433</td></tr><tr><td>Season</td><td>kharif</td></tr><tr><td>Village code</td><td>999998</td></tr></table><main id="work"></main><div id="notices"></div><script>
window.__khasraQA={rows:{12:[],13:[]},events:[],current:null};
const qa=window.__khasraQA;
function list(){qa.current=null;location.hash='/lekhpalGataList';document.getElementById('work').innerHTML='<table><thead><tr><th>Gata number</th><th>Action</th></tr></thead><tbody>'+[12,13].map(n=>'<tr><td>'+n+'</td><td><button type="button" class="btn-info" onclick="crop('+n+')">Open</button></td></tr>').join('')+'</tbody></table>';}
function crop(n){qa.current=n;qa.events.push({type:'open',gata:n});location.hash='/lekhpalInsertFasal';document.getElementById('notices').innerHTML='';document.getElementById('work').innerHTML='<table><tr><td>Gata number</td><td>'+n+'</td></tr><tr><td>Plot area</td><td>'+(n===12?'0.5':'0.7')+'</td></tr></table><label for="crop">Crop</label><select id="crop" name="crop" required><option value="">Choose</option><option value="rice">Rice</option><option value="wheat">Wheat</option></select><br><label for="area">Area</label><input type="number" id="area" name="area" step="0.0001" required><br><label for="flexSwitchCheckDefault">Irrigated</label><input type="checkbox" id="flexSwitchCheckDefault"><br><label for="remaining">Remaining area</label><input id="remaining" readonly><table><thead><tr><th>Crop</th><th>Area</th><th>Irrigation</th></tr></thead><tbody id="crops"></tbody></table><button type="button" onclick="save()">Save</button><button type="button" onclick="remarks()">Next</button>';rows();}
function rows(){const used=qa.rows[qa.current].reduce((s,r)=>s+Math.round(Number(r.area)*10000),0);document.getElementById('remaining').value=(((qa.current===12?5000:7000)-used)/10000).toFixed(4);document.getElementById('crops').innerHTML=qa.rows[qa.current].map(r=>'<tr><td>'+r.crop+'</td><td>'+r.area+'</td><td>'+(r.irrigated?'Yes':'No')+'</td></tr>').join('');}
function notice(text){const el=document.createElement('div');el.className='ajs-success ajs-visible';el.textContent=text;document.getElementById('notices').appendChild(el);}
function save(){const s=document.getElementById('crop');const row={crop:s.options[s.selectedIndex].text,area:document.getElementById('area').value,irrigated:document.getElementById('flexSwitchCheckDefault').checked};if(!s.value||!row.area||Number(row.area)>Number(document.getElementById('remaining').value))throw Error('Invalid synthetic save');qa.rows[qa.current].push(row);qa.events.push({type:'save',gata:qa.current,...row});rows();notice('Saved synthetic row '+qa.rows[qa.current].length);}
function remarks(){location.hash='/lekhpalInsertRemark';document.getElementById('notices').innerHTML='';document.getElementById('work').innerHTML='<table><tr><td>Gata number</td><td>'+qa.current+'</td></tr></table><label for=remark>Remarks</label><textarea id=remark required></textarea><button type=button onclick=saveRemark()>Save</button><button type=button onclick=lock()>Lock</button><button type=button onclick=list()>Gata list</button>';}
function saveRemark(){const value=document.getElementById('remark').value;if(!value)throw Error('Missing synthetic remarks');qa.events.push({type:'remarks',gata:qa.current,value});notice('Saved synthetic remarks');}
function lock(){qa.events.push({type:'lock',gata:qa.current});notice('Gata Locked Successfully');}
list();
</script></body></html>`;
(async () => {
 const pages = await (await fetch('http://127.0.0.1:9226/json')).json();
 const page = pages.find(p => p.url.startsWith('https://ekhasra.up.gov.in/'));
 if (!page) throw Error('Open Khasra feeding login in Lekhpal first.');
 const ws = new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
 let id = 0; const pending = new Map();
 const call = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); });
 ws.on('message', raw => {
  const m = JSON.parse(raw);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  if (m.method === 'Fetch.requestPaused') {
   const p = m.params;
   const job = p.resourceType === 'Document' && p.request.url.startsWith('https://ekhasra.up.gov.in/khasra-qa-offline')
    ? call('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }], body: Buffer.from(html).toString('base64') })
    : call('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' });
   job.catch(console.error);
  }
 });
 try {
  if (process.argv[2] === 'start') {
   if (!/SelectLogin|login|khasra-qa-offline/i.test(page.url)) throw Error('Refusing to replace a non-login page.');
   await call('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
   const fixtureUrl = 'https://ekhasra.up.gov.in/khasra-qa-offline?run=' + Date.now() + '#/lekhpalGataList';
   await call('Page.navigate', { url: fixtureUrl });
   let ready = false;
   for (let i = 0; i < 30; i++) { const r = await call('Runtime.evaluate', { expression: 'location.href === ' + JSON.stringify(fixtureUrl) + ' && !!window.__khasraQA && !!window.__lekhpalFeeding', returnByValue: true }); if (r.result?.value) { ready = true; break; } await new Promise(resolve => setTimeout(resolve, 200)); }
   if (!ready) throw Error('Synthetic document and feeding bridge did not become ready.');
  } else if (!page.url.includes('/khasra-qa-offline')) throw Error('Not the synthetic fixture.');
  const expression = process.argv[2] === 'prepare-remarks' ? 'crop(12); remarks(); JSON.stringify(window.__khasraQA)' : process.argv[2] === 'list' ? 'list(); JSON.stringify(window.__khasraQA)' : 'JSON.stringify({url:location.href,fixture:window.__khasraQA,bridge:!!window.__lekhpalFeeding})';
  const result = await call('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  const resultText = result.result.value;
  console.log(resultText);
  if (process.argv[3]) fs.writeFileSync(process.argv[3], resultText + '\n');
 } finally { ws.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
