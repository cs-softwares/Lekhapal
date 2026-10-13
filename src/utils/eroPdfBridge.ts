/** Selectors and routes follow FastERO/d.java and p016b/d.java. */
export const ERO_PDF_BRIDGE = String.raw`
(function(){
if(window.top!==window.self||location.origin!=='https://officials.eci.gov.in')return;
if(window.__lekhpalEro){window.__lekhpalEro.scan(true);return;}
var doc=Date.now().toString(36)+Math.random().toString(36).slice(2),revision=0,last='',snapshot=null,refs={},counter=0,used={},pending=null,requests=0,reader=null,controller=null;
function post(data){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({channel:'lekhpal-ero-v1'},data)));}
function text(e){return String(e&&(e.getAttribute&&e.getAttribute('aria-label')||e.textContent||e.value)||'').replace(/\s+/g,' ').trim().slice(0,4000);}
function visible(e){return e&&e.isConnected!==false&&!e.hidden&&e.getClientRects().length&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';}
function nodes(s,r){return Array.prototype.filter.call((r||document).querySelectorAll(s),visible);}
function ref(e){if(!e.__eroRef)e.__eroRef='e'+(++counter);refs[e.__eroRef]=e;return e.__eroRef;}
function enabled(e){return e&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&!/(?:^|\s)disabled(?:\s|$)/i.test(e.className||'');}
function unique(items){return items.length===1?ref(items[0]):undefined;}
function stage(){if(nodes('input[type="password"]').length||/\/login(?:[/?#]|$)/i.test(location.href))return 'login';if(/\/suomotoDSE\/checklist-processing-action(?:-india)?\//i.test(location.href))return 'record';if(/\/suomotoDSE\/?(?:[?#]|$)/i.test(location.href))return 'list';return 'other';}
function scan(force){refs={};var s=stage(),controls=nodes('.control-btn'),buttons=nodes('button,a,input[type="button"]');
var current=nodes('[aria-current="page"],.pagination .active,.pagination .active-page,.control-btn2,.current-page'),page=current.length===1?Number(text(current[0])):0;
if(!Number.isInteger(page)||page<1)page=0;
if(!page&&controls.length===4&&!enabled(controls[0])&&!enabled(controls[1]))page=1;
var next=unique(buttons.filter(function(e){return enabled(e)&&/^(?:next|next page|>|›|अगला)$/i.test(text(e));}));
var previous=unique(buttons.filter(function(e){return enabled(e)&&/^(?:previous|previous page|prev|<|‹|पिछला)$/i.test(text(e));}));
if(controls.length===4){if(!next&&enabled(controls[2]))next=ref(controls[2]);if(!previous&&enabled(controls[1]))previous=ref(controls[1]);}
var eyes=s==='list'?nodes('.fa.fa-eye'):[],rows=eyes.map(function(eye,i){var row=eye.closest('tr'),cells=row?nodes('td',row):[],label=row?text(row):'',serial=cells.length&&/^\d+$/.test(text(cells[0]))?Number(text(cells[0])):page&&eyes.length<=5?(page-1)*5+i+1:0;
var target=eye.closest('button,a')||eye;if(target.href&&!/\/suomotoDSE\/checklist-processing-action(?:-india)?\//i.test(target.href))serial=0;
return {ref:ref(target),key:row&&(row.getAttribute('data-row-key')||row.getAttribute('data-id'))||label,serial:serial,label:label};}).filter(function(r){return r.key&&r.serial>0;});
// A missing row is not silently removed from the ordinal range.
if(rows.length!==eyes.length)rows=[];
function isFilter(e){return !e.closest('.pagination,.paginator,.p-paginator,[aria-label="Pagination"]')&&!/page|pagination/i.test((e.name||'')+' '+(e.id||'')+' '+(e.getAttribute('aria-label')||''));}
var filters=nodes('select').filter(isFilter).map(function(e){return (e.name||e.id||'filter')+'='+String(e.value||'');});
nodes('[role="combobox"],.ng-select-container .ng-value-label,.ant-select-selection-item').filter(isFilter).forEach(function(e){filters.push(text(e));});
nodes('input[type="search"],input[type="text"],input[type="radio"]:checked,.tabSelected,[role="tab"][aria-selected="true"]').filter(isFilter).forEach(function(e){filters.push((e.name||e.id||e.getAttribute('placeholder')||'filter')+'='+String(e.value||text(e)));});
var context=filters.sort().join('|');
var download=s==='record'?unique(buttons.filter(function(e){return enabled(e)&&!/submit|approve|reject|delete|save changes/i.test(text(e))&&/^(?:(?:download|print)(?:\s+(?:pdf|format[ -]?a|form[ -]?a))?|(?:pdf|format[ -]?a|form[ -]?a)(?:\s+(?:download|print))?)$/i.test(text(e));})):undefined;
// The reference selects the first elector's Format A (its fourth button). Prefer its explicit label.
var formatA=buttons.filter(function(e){return enabled(e)&&/^download\s+format[ -]?a$/i.test(text(e));});if(s==='record'&&formatA.length)download=ref(formatA[0]);
// The legacy fourth button is used only when its purpose is identifiable.
var nativeButtons=nodes('button');if(s==='record'&&!download&&nativeButtons.length>=4&&enabled(nativeButtons[3])&&/download|print|pdf|format[ -]?a/i.test(text(nativeButtons[3]))&&!/submit|approve|reject|delete/i.test(text(nativeButtons[3])))download=ref(nativeButtons[3]);
var back=s==='record'?unique(buttons.filter(function(e){return enabled(e)&&/^(?:back|back to list|return|close|वापस)$/i.test(text(e));})):undefined;
var data={type:'snapshot',documentId:doc,url:location.href,stage:s,busy:requests>0||document.readyState!=='complete'||nodes('[aria-busy="true"],.spinner-border,.loading,.ant-spin-spinning').length>0,context:context,page:page,rows:rows,next:next,previous:previous,download:download,back:back};
var encoded=JSON.stringify(data);if(encoded!==last){last=encoded;snapshot=Object.assign({revision:++revision},data);post(snapshot);}else if(force===true&&snapshot)post(snapshot);}
function fail(message,id){post({type:'error',id:id||pending&&pending.id||'',message:message});}
function stop(){pending=null;if(controller)controller.abort();if(reader&&reader.readyState===1)reader.abort();reader=null;controller=null;}
async function capture(url,name){
if(!pending||pending.capturing)return;var job=pending;job.capturing=true;
try{
if(location.href!==job.url)throw Error('The ERO record changed before downloading.');
var value=String(url||''),blob;
if(/^data:application\/pdf;base64,/i.test(value)){if(value.length>28000000)throw Error('The PDF exceeds 20 MB.');if(pending===job)post({type:'pdf',id:job.id,documentId:doc,url:job.url,filename:String(name||'').slice(0,240),base64:value.slice(value.indexOf(',')+1)});return;}
var target=new URL(value,location.href);if(target.origin!==location.origin||!['https:','blob:'].includes(target.protocol))throw Error('The PDF download is outside the official ERO portal.');
controller=new AbortController();var response=await originalFetch.call(window,target.href,{credentials:'same-origin',redirect:'error',signal:controller.signal});
if(!response.ok)throw Error('The official PDF download failed. Sign in again if your session expired.');
if(Number(response.headers.get('content-length'))>20000000)throw Error('The PDF exceeds 20 MB.');
if(response.body&&response.body.getReader){var stream=response.body.getReader(),chunks=[],size=0;while(true){var part=await stream.read();if(part.done)break;size+=part.value.byteLength;if(size>20000000){await stream.cancel();throw Error('The PDF exceeds 20 MB.');}chunks.push(part.value);}blob=new Blob(chunks,{type:'application/pdf'});}else {blob=await response.blob();if(blob.size>20000000)throw Error('The PDF exceeds 20 MB.');}
reader=new FileReader();reader.onload=function(){if(pending===job)post({type:'pdf',id:job.id,documentId:doc,url:job.url,filename:String(name||'').slice(0,240),base64:String(reader.result).split(',')[1]});};reader.onerror=function(){if(pending===job){fail('The PDF could not be read.',job.id);stop();}};reader.readAsDataURL(blob);
}catch(e){if(pending===job){fail(e.message||'The PDF could not be downloaded.',job.id);stop();}}
}
function command(c){if(c&&c.type==='stop'){stop();return;}scan();if(!c||!c.id||used[c.id])return;used[c.id]=true;
if(!snapshot||snapshot.documentId!==c.documentId||snapshot.revision!==c.revision||snapshot.url!==c.url||snapshot.busy||pending){fail('The ERO page changed or is busy. Review it again.',c.id);return;}
var e=refs[c.ref];if(!e||!visible(e)||!enabled(e)){fail('The requested ERO control is unavailable.',c.id);return;}
if(c.type==='download'){if(snapshot.stage!=='record'||snapshot.download!==c.ref){fail('Open a record with an identifiable PDF download control.',c.id);return;}pending={id:c.id,url:location.href,capturing:false};}
else if(c.type==='open'){if(snapshot.stage!=='list'||!snapshot.rows.some(function(r){return r.ref===c.ref&&r.key===c.record;})){fail('The ERO record changed.',c.id);return;}}
else if(c.type==='navigate'){if(![snapshot.next,snapshot.previous,snapshot.back].includes(c.ref)){fail('The ERO navigation control changed.',c.id);return;}}
else {fail('Unsupported ERO action.',c.id);return;}
try{e.click();if(c.type!=='download')post({type:'acted',id:c.id});scan();}catch(error){fail('The ERO action was interrupted.',c.id);stop();}}
var originalFetch=window.fetch;
// Blob downloads are often opened in a temporary tab, which Android cannot save directly.
var open=window.open;window.open=function(url){if(pending&&url&&/^(?:blob:|data:application\/pdf)|\.pdf(?:[?#]|$)/i.test(String(url))){capture(url);return null;}return open.apply(window,arguments);};
var anchorClick=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){if(pending&&(this.download||/^(?:blob:|data:application\/pdf)|\.pdf(?:[?#]|$)/i.test(this.href))){capture(this.href,this.download);return;}return anchorClick.apply(this,arguments);};
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a');if(pending&&a&&(a.download||/^(?:blob:|data:application\/pdf)|\.pdf(?:[?#]|$)/i.test(a.href))){e.preventDefault();capture(a.href,a.download);}},true);
if(originalFetch)window.fetch=function(){requests++;scan();return originalFetch.apply(window,arguments).then(function(r){r.clone().arrayBuffer().then(function(){requests--;scan();},function(){requests--;scan();});return r;},function(e){requests--;scan();throw e;});};
if(typeof XMLHttpRequest!=='undefined'){var send=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.send=function(){var xhr=this;requests++;function end(){xhr.removeEventListener('loadend',end);requests--;scan();}xhr.addEventListener('loadend',end);try{return send.apply(xhr,arguments);}catch(e){end();throw e;}};}
new MutationObserver(function(){scan();}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
window.addEventListener('hashchange',function(){scan();});setInterval(scan,1000);
window.__lekhpalEro={scan:scan,command:command,download:capture};scan();
})();true;`;
