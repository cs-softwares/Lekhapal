/** Maharashtra-only adapter. Never injected into UP or other states' portals. */
export const ECHAWADI_BRIDGE = String.raw`
(function(){
if(window.top!==window.self||location.origin!=='https://echawadi.mahabhumi.gov.in')return;
if(window.__lekhpalEchawadi){window.__lekhpalEchawadi.scan();return;}
var doc=Date.now().toString(36)+Math.random().toString(36).slice(2),revision=0,last='',snapshot=null,requests=0,used='',queued=null,pending=null,writeTimer=null,writeIds={},prepareEpoch=0,demandPages={},demandContext='';
function text(e){return String(e&&e.textContent||'').replace(/\s+/g,' ').trim().slice(0,4000);}
function visible(e){return e&&!e.hidden&&e.getClientRects().length&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';}
function nodes(s,r){return Array.prototype.filter.call((r||document).querySelectorAll(s),visible);}
function post(data){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({channel:'lekhpal-echawadi-v1'},data)));}
function mode(){var h=location.hash.toLowerCase();return h==='#/generate-revenue/demandgeneration'?'demand':h==='#/reports/form8b'?'form8b':h==='#/transactions/receive-money'?'receipts':'other';}
function amount(t){var n=t.replace(/[०-९]/g,function(c){return String(c.charCodeAt(0)-2406);}).replace(/[₹,\s]/g,'').replace(/^(?:Rs\.?|INR)/i,'');return /^\d+(?:\.\d+)?$/.test(n)&&Number.isFinite(Number(n))?Number(n):null;}
function table(){var tables=nodes('.ant-table table').filter(function(t){return nodes('tbody .ant-table-row',t).length;});return tables.length===1?tables[0]:null;}
function next(){var n=nodes('.ant-pagination-next').filter(function(e){return !e.classList.contains('ant-pagination-disabled')&&e.getAttribute('aria-disabled')!=='true';});return n.length===1?n[0]:null;}
function reportAccounts(){var areas=nodes('#table-to-xls');if(mode()!=='form8b'||areas.length!==1)return undefined;var index=-1,accounts=[];nodes('tr',areas[0]).forEach(function(row){var cells=nodes('th,td',row),head=cells.map(text).findIndex(function(s){return /^(?:account\s*(?:no\.?|number)|khata\s*(?:no\.?|number)|खात[ेा]\s*(?:क्रमांक|क्र\.?|नंबर|संख्या))$/i.test(s);});if(head>=0){index=head;return;}if(index>=0&&cells[index]){var value=text(cells[index]).replace(/[०-९]/g,function(c){return String(c.charCodeAt(0)-2406);});if(/^\d[\d/ -]{0,49}$/.test(value))accounts.push(value);}});return index>=0?Array.from(new Set(accounts)):undefined;}
function payment(){var account=nodes('#register_khataNo'),methods=nodes('#register_ModeOfPayment');if(account.length!==1)return undefined;var method=methods.length===1?methods[0]:null;var amounts=nodes('input[id^="register_"]').filter(function(e){var label=e.labels&&Array.prototype.map.call(e.labels,text).join(' ');return /^(?:amount|payment amount|paid amount|रक्कम|भरणा रक्कम|राशि)$/i.test(String(label||e.getAttribute('aria-label')||'').trim());});var selected=method&&method.closest('.ant-select');return {account:String(account[0].value||'').trim(),method:method&&method.tagName==='SELECT'&&method.selectedOptions.length===1?text(method.selectedOptions[0]):selected?nodes('.ant-select-selection-item',selected).map(text).join(''):method?String(method.value||''):'',amount:amounts.length===1?amount(String(amounts[0].value)):null};}
function submitButton(){var pattern=mode()==='demand'?/^(?:generate demand|submit demand|मागणी तयार करा|मागणी निश्चित करा)$/i:/^(?:save|submit|receive money|receive payment|जतन करा|भरणा करा)$/i;var buttons=nodes('button').filter(function(e){return !e.disabled&&e.getAttribute('aria-disabled')!=='true'&&pattern.test(text(e));});return buttons.length===1?buttons[0]:null;}
function notices(){return nodes('.ant-message-success,.ant-message-error,.ant-notification-notice-success,.ant-notification-notice-error,[role="alert"]').map(function(e){if(!e.__lekhpalNotice)e.__lekhpalNotice=Math.random().toString(36);return {key:e.__lekhpalNotice+'|'+text(e),text:text(e)};});}
function finish(state,message){if(!pending)return;var id=pending.id;pending=null;clearTimeout(writeTimer);post({type:'transaction',id:id,state:state,message:message});}
function scan(){
var t=table(),headers=t?nodes('thead th',t).map(text):[],rows=t?nodes('tbody .ant-table-row',t):[],m=mode();
var amountIndex=headers.findIndex(function(h){return /(?:amount|रक्कम|मागणी|रकम)/i.test(h);});
// The reference used column six. Only use it when its heading identifies a monetary amount.
if(headers[5]&&/(?:amount|रक्कम|मागणी|रकम)/i.test(headers[5]))amountIndex=5;
var active=nodes('.ant-pagination-item-active'),page=active.length===1?Number(text(active[0])):rows.length?1:0;
var context=nodes('.ant-select-selection-item,select option:checked').filter(function(e){var select=e.closest('.ant-select');return !e.closest('.ant-pagination-options')&&!(select&&select.querySelector('#register_ModeOfPayment'))&&!(e.parentElement&&e.parentElement.id==='register_ModeOfPayment');}).map(text).join(' | ').slice(0,8000);
if(context!==demandContext){demandContext=context;demandPages={};}var p=payment();var s={reportAccounts:reportAccounts(),payment:p,canSubmit:!!submitButton(),type:'snapshot',documentId:doc,url:location.href,mode:m,busy:requests>0||document.readyState!=='complete'||nodes('.ant-spin-spinning,[aria-busy="true"],input[type="password"]').length>0,page:Number.isInteger(page)?page:0,next:!!next(),context:context,headers:headers,rows:rows.map(function(r){var cells=nodes('td',r).map(text),checks=nodes('input[type="checkbox"]',r),check=checks.length===1?checks[0]:null;return {key:r.getAttribute('data-row-key')||cells.join('|'),cells:cells,amount:amountIndex>=0?amount(cells[amountIndex]||''):null,selectable:!!check&&!check.disabled,checked:!!check&&check.checked};})};
if(m==='demand'&&page>0&&!s.busy&&demandPages[page])demandPages[page]=s.rows.filter(function(r){return r.checked;}).map(function(r){return {page:page,key:r.key,amount:r.amount};});
s.selectedDemand=Object.keys(demandPages).sort(function(a,b){return Number(a)-Number(b);}).reduce(function(all,key){return all.concat(demandPages[key]);},[]);
if(pending&&!s.busy){if(s.context!==pending.context||location.href!==pending.url||(pending.account&&(!p||p.account!==pending.account)))finish('uncertain','The account, village or page changed before confirmation. Verify the official record.');else {
if(pending.confirmDemand&&!pending.dialogClicked){
var dialogs=nodes('.ant-modal-confirm,.ant-popover-inner-content').filter(function(e){return /demand|मागणी/i.test(text(e));});
if(dialogs.length===1){var dialog=dialogs[0],buttons=nodes('button',dialog).filter(function(e){return !e.disabled&&/^(?:yes|ok|confirm|generate demand|होय|हो|मागणी तयार करा|पुष्टी करा)$/i.test(text(e));});
if(buttons.length===1){var message=text(dialog);var count=message.match(/(?:selected|records|accounts|निवडलेले|खाते)\s*[:：]?\s*(\d+)/i);
if(count&&Number(count[1])!==pending.demand.length){finish('uncertain','The confirmation count differs from the reviewed selection.');}
else if(JSON.stringify(s.selectedDemand)!==JSON.stringify(pending.demand)){finish('uncertain','Demand selection changed before confirmation.');}
else {pending.dialogClicked=true;buttons[0].click();}}
}
}
if(!pending)return;
var fresh=notices().filter(function(n){return pending.notices.indexOf(n.key)<0;});if(fresh.some(function(n){return /failed|error|invalid|unsuccess|असफल|त्रुटि/i.test(n.text);}))finish('uncertain','The portal reported an error. Verify the official record.');else if(fresh.some(function(n){return !/not|already|will|would|should|नहीं/i.test(n.text)&&/successfully|success|सफल|यशस्वी/i.test(n.text);}))finish('confirmed','The official portal confirmed successful submission.');}}
var encoded=JSON.stringify(s);if(encoded!==last){last=encoded;snapshot=Object.assign({revision:++revision},s);post(snapshot);}}
function fail(message){post({type:'error',message:message});}
function set(input,value){var setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input),'value');if(setter&&setter.set)setter.set.call(input,value);else input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
function command(c){if(c&&c.action==='stop'){prepareEpoch++;finish('uncertain','Stopped. Verify any pending official submission.');return;}scan();if(!c||!snapshot||c.documentId!==doc||c.revision!==revision||c.url!==location.href||snapshot.busy||pending){fail('The page changed or is still loading. Review it and try again.');return;}
var token=doc+'|'+revision+'|'+c.action;if(token===used){fail('This action has already been requested.');return;}used=token;
if(c.action==='export'){
var areas=nodes('#table-to-xls');if(snapshot.mode!=='form8b'||areas.length!==1||typeof c.value!=='string'){fail('Open the official Form 8B print table.');return;}
var original=areas[0],clone=original.cloneNode(true),source=[original].concat(Array.prototype.slice.call(original.querySelectorAll('*'))),copies=[clone].concat(Array.prototype.slice.call(clone.querySelectorAll('*')));
var properties=['display','font-family','font-size','font-weight','font-style','text-align','vertical-align','white-space','border','border-collapse','padding','width','height','color','background-color'];
copies.forEach(function(e,i){var computed=getComputedStyle(source[i]),style=properties.map(function(k){var v=computed.getPropertyValue(k);return v&&!/url\(|expression|javascript/i.test(v)?k+':'+v:'';}).filter(Boolean).join(';');Array.prototype.slice.call(e.attributes).forEach(function(a){if(!['rowspan','colspan'].includes(a.name.toLowerCase()))e.removeAttribute(a.name);});e.setAttribute('style',style);});
Array.prototype.forEach.call(clone.querySelectorAll('script,iframe,object,embed,button,input,select,textarea,link,style,img,svg,video,audio'),function(e){e.remove();});
var html='<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:8mm}body{margin:0}table{max-width:100%}</style></head><body>'+clone.outerHTML+'</body></html>';
if(html.length>1500000){fail('The report is too large to export at once.');return;}post({type:'document',id:c.value,documentId:doc,url:location.href,context:snapshot.context,html:html});return;}
if(c.action==='cash'){
if(snapshot.mode!=='receipts'||!snapshot.payment||snapshot.payment.account!==c.value){fail('The loaded account does not match.');return;}
var methods=nodes('#register_ModeOfPayment');if(methods.length!==1||methods[0].disabled){fail('Payment mode is unavailable.');return;}
var method=methods[0];if(method.tagName==='SELECT'){var options=Array.prototype.filter.call(method.options,function(o){return !o.disabled&&/^(?:cash|रोख|नकद)$/i.test(text(o));});if(options.length!==1){fail('Cash payment option is unavailable or ambiguous.');return;}set(method,String(options[0].value));}
else {var options=nodes('.ant-select-item-option-content').filter(function(e){return /^(?:cash|रोख|नकद)$/i.test(text(e));});if(options.length!==1){method.click();var expectedAccount=c.value,expectedContext=snapshot.context,preparedAt=prepareEpoch;setTimeout(function(){if(preparedAt!==prepareEpoch)return;scan();if(!snapshot||snapshot.mode!=='receipts'||snapshot.context!==expectedContext||!snapshot.payment||snapshot.payment.account!==expectedAccount){fail('Account changed while selecting Cash.');return;}var choices=nodes('.ant-select-item-option-content').filter(function(e){return /^(?:cash|रोख|नकद)$/i.test(text(e));});if(choices.length!==1){fail('Cash payment option could not be identified. Choose it on the official form.');return;}choices[0].click();scan();},200);return;}options[0].click();}scan();return;}
if(c.action==='submit'){
var v=c.value,button=submitButton();if(!v||typeof v.id!=='string'||!v.id||writeIds[v.id]||v.context!==snapshot.context||!v.context||!button){fail('Review this village and submission again.');return;}
if(snapshot.mode==='receipts'){var p=snapshot.payment;if(!p||p.account!==v.account||p.amount===null||p.amount<=0||p.amount!==v.amount||!/^(?:cash|रोख|नकद)$/i.test(p.method)){fail('Review the exact account, positive amount and Cash payment mode first.');return;}}
else if(snapshot.mode!=='demand'||(!snapshot.rows.some(function(r){return r.checked;})&&!(v.demand&&v.demand.length))||snapshot.rows.some(function(r){return r.checked&&r.amount===null;})){fail('Review selected demand records first.');return;}
if(v.confirmDemand&&(!Array.isArray(v.demand)||!v.demand.length||JSON.stringify(v.demand)!==JSON.stringify(snapshot.selectedDemand)||new Set(v.demand.map(function(r){return r.key;})).size!==v.demand.length)){fail('The reviewed cross-page demand selection changed or contains duplicate records.');return;}
writeIds[v.id]=true;pending={id:v.id,confirmDemand:!!v.confirmDemand,demand:v.demand,dialogClicked:false,context:snapshot.context,account:snapshot.mode==='receipts'?v.account:'',url:location.href,notices:notices().map(function(n){return n.key;})};writeTimer=setTimeout(function(){finish('uncertain','No official confirmation was received. Verify the record before retrying.');},25000);
try{button.click();}catch(e){finish('uncertain','Submission was interrupted. Verify the record.');}return;}
if(c.action==='next'){var n=next();if(!n){fail('No next report page is available.');return;}n.click();return;}
if(c.action==='select'){
if(snapshot.mode!=='demand'||typeof c.value!=='number'||!Number.isFinite(c.value)||c.value<0||!snapshot.rows.length||snapshot.rows.some(function(r){return !r.selectable||r.amount===null;})){fail('Open a demand table with a labelled amount column and selectable rows.');return;}
var rows=nodes('tbody .ant-table-row',table()),changed=0;
demandPages[snapshot.page]=[];
rows.forEach(function(row,i){var check=nodes('input[type="checkbox"]',row)[0],wanted=snapshot.rows[i].amount>=c.value;if(check.checked!==wanted){check.click();changed++;}});scan();post({type:'selected',message:'Selection prepared. Review the official table before generating demand.',count:changed});return;}
if(c.action==='search'){
if(snapshot.mode!=='receipts'||typeof c.value!=='string'||!/^\d[\d/ -]{0,49}$/.test(c.value)){fail('Open Receive payment and enter an account number.');return;}
var inputs=nodes('input.ant-input').filter(function(e){return !e.disabled&&!e.readOnly&&!/^register_/.test(e.id)&&!['password','hidden'].includes(e.type);});
var radios=nodes('input.ant-radio-input').filter(function(e){return /khata|account|खात[ेा]/i.test(text(e.closest('label')));});
var buttons=nodes('button').filter(function(e){return !e.disabled&&/^(search|शोधा|खोजें)$/i.test(text(e));});
if(inputs.length!==1||radios.length!==1||buttons.length!==1){fail('Select account-number search on the official page. The search controls could not be identified uniquely.');return;}
if(!radios[0].checked)radios[0].click();set(inputs[0],c.value);buttons[0].click();return;}
fail('Unsupported action.');}
function schedule(){if(queued)return;queued=setTimeout(function(){queued=null;scan();},60);}
if(window.fetch){var fetchOriginal=window.fetch;window.fetch=function(){requests++;schedule();return fetchOriginal.apply(this,arguments).then(function(r){r.clone().arrayBuffer().then(function(){requests--;schedule();},function(){requests--;schedule();});return r;},function(e){requests--;schedule();throw e;});};}
if(typeof XMLHttpRequest!=='undefined'){var sendOriginal=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.send=function(){var xhr=this;requests++;schedule();function done(){xhr.removeEventListener('loadend',done);requests--;schedule();}xhr.addEventListener('loadend',done);try{return sendOriginal.apply(xhr,arguments);}catch(e){done();throw e;}};}
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
document.addEventListener('change',schedule);window.addEventListener('hashchange',schedule);setInterval(scan,1000);
window.__lekhpalEchawadi={scan:scan,command:command};scan();
})();true;`;
