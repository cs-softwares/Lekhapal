import { OFFICIAL_WORK, OfficialWorkModule } from '../domain/officialWork';
export const officialWorkBridge = (module: OfficialWorkModule) => String.raw`
(function(){
var module=${JSON.stringify(module)},host=${JSON.stringify(
  OFFICIAL_WORK[module].host,
)};
if(window.top!==window.self||location.origin!=='https://'+host)return;
if(window.__lekhpalOfficialWork){window.__lekhpalOfficialWork.scan(true);return;}
var doc=Date.now().toString(36)+Math.random().toString(36).slice(2),revision=0,serial=0,last='',snapshot=null,refs={},used={},pending=null,timer=null,stopped=false,requests=0,requestFailed=false,censusCalculation='',censusCalculated=false;
function clean(x){return String(x||'').replace(/\s+/g,' ').trim().slice(0,4000);}
function visible(e){return e&&e.isConnected!==false&&!e.hidden&&e.getClientRects().length&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';}
function nodes(s,r){return Array.prototype.filter.call((r||document).querySelectorAll(s),visible);}
function ref(e){if(!e.__officialWorkRef)e.__officialWorkRef='w'+(++serial);refs[e.__officialWorkRef]=e;return e.__officialWorkRef;}
function title(e){return clean(e.getAttribute('aria-label')||(e.labels&&e.labels[0]&&e.labels[0].textContent)||e.getAttribute('placeholder')||e.textContent||e.value||e.name||e.id);}
function post(x){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({channel:'lekhpal-official-work-v1'},x)));}
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(16);}
function censusLabel(key){var names={sr_no:'Serial number / क्रम संख्या',hl_name_local:'Holder name / धारक का नाम',f_h_name_local:'Father / husband name',tot_survey:'Survey / plot count',inst_sector:'Institutional sector / संस्थागत क्षेत्र',place_resident:'Place of residence',joint_no:'Joint holders / संयुक्त धारक',tot_crops:'Number of crops / फसलों की संख्या',field_05:'Irrigated area / सिंचित क्षेत्रफल',field_06:'Unirrigated area / असिंचित क्षेत्रफल',source_irr:'Irrigation source / सिंचाई स्रोत'};if(names[key])return names[key];var row=key.match(/^(land_use_list|land_use_type_list|operational_holder_list|area)(\d+)(_1)?$/);if(row)return ({land_use_list:'Land use',land_use_type_list:'Land-use type',operational_holder_list:'Operational holder',area:'Area'}[row[1]])+' · Row '+row[2]+(row[3]?' · decimal part':'');var crop=key.match(/^(un)?irri_ar_1(\d)$/);if(crop)return (crop[1]?'Unirrigated':'Irrigated')+' area · Crop '+(Number(crop[2])+1);return key;}
function stage(){var p=location.href.toLowerCase();if(nodes('input[type="password"]').length||/login|selectlogin/.test(p))return 'login';
if(module==='survey9')return /villagewise9\.jsp|disputeplot/.test(p)?'list':/form9\.jsp/.test(p)?'entry':'other';
if(module==='svamitva-pdf')return /(?:admin|entry)\/form/.test(p)&&nodes('#printarea').length===1?'document':/detailvillagewise/.test(p)?'list':'other';
if(module==='registry')return nodes('.updateApproval').length?'entry':nodes('.view_btn').length?'list':'other';
if(module==='census')return /l1_l2_entry\.jsp|schedule_h\.jsp|sch_h_list|survey_list\.jsp|search_crop\.jsp/.test(p)||nodes('input[onclick*="checkbox_update_1"],input[onchange*="checkbox_update_1"]').length?'entry':'other';
if(module==='inspector')return nodes('[name="ri_lock"],.table-container input[type="checkbox"]').length?'entry':'other';
if(module==='echawadi')return /demandgeneration|form8b|receive-money/.test(p)?'entry':'other';return 'other';}
function censusPopup(){if(module!=='census')return undefined;var url=(location.pathname||new URL(location.href).pathname).toLowerCase();return /sch_h_list/.test(url)?'serial':/survey_list\.jsp/.test(url)?'survey':/search_crop\.jsp/.test(url)?'crop':undefined;}
function rootDocument(){try{return module==='census'&&window.opener&&window.opener.location.origin===location.origin?window.opener.document:document;}catch(e){return document;}}
function censusChoices(kind){if(kind!=='serial'&&kind!=='crop')return undefined;var tables=nodes('tbody');var rows=tables.length>1?nodes('tr',tables[1]):[];return rows.map(function(row){var cells=nodes('td',row),check=nodes('input[type="checkbox"]',row);if(cells.length<2||check.length!==1||check[0].disabled)return null;var code=clean(cells[1].textContent);if(!/^\d{1,12}$/.test(code))return null;return {ref:ref(check[0]),code:code,label:clean(row.textContent),checked:!!check[0].checked};}).filter(Boolean);}
function surveyArea(){if(censusPopup()!=='survey')return undefined;var tables=nodes('tbody');if(tables.length<2)return undefined;var rows=nodes('tr',tables[1]),sum=0,valid=true;rows.forEach(function(row){var cells=nodes('td',row);if(cells.length<4){valid=false;return;}var status=clean(cells[3].textContent).toLowerCase(),value=clean(cells[2].textContent);if(!/^(?:operated|not operated|non operated)$/.test(status)||!/^\d+(?:\.\d{1,4})?$/.test(value)){valid=false;return;}if(status==='operated'){var parts=value.split('.');sum+=Number(parts[0])*10000+Number((parts[1]||'').padEnd(4,'0'));}});return valid&&rows.length&&Number.isSafeInteger(sum)?(sum/10000).toFixed(4):undefined;}
function result(state,message){if(!pending)return;var id=pending.id;pending=null;clearTimeout(timer);post({type:'result',id:id,state:state,message:message});}
function scan(force){refs={};var s=stage(),fields=[],actions=[],entries=[];
var root=rootDocument(),serialFields=Array.prototype.slice.call(root.querySelectorAll('[name="sr_no"],#sr_no')),serialField=serialFields[0], match=nodes('.nameMAtch')[0],score=match&&clean(match.textContent).match(/(?:score\s*:?\s*)?(\d+(?:\.\d+)?)\s*%?$/i);
var identity=serialField?String(serialField.value):'';
var context=Array.prototype.filter.call(root.querySelectorAll('input,select'),function(e){return /^(?:village(?:_?code|_?id)?|district(?:_?code|_?id)?|tehsil(?:_?code|_?id)?|survey|year)$/i.test(e.name||e.id);}).map(function(e){return (e.name||e.id)+'='+e.value;}).sort().join('&');
var busy=requests>0||nodes('.progress-loader,#preloader,[aria-busy="true"],.ant-spin-spinning').length>0||!!(window.jQuery&&window.jQuery.active)||document.readyState!=='complete';
if(s==='entry')nodes('input,select,textarea').forEach(function(e){var key=e.name||e.id,type=(e.type||'').toLowerCase();if(module==='census'&&type==='checkbox'&&/checkbox_update_1/.test((e.getAttribute('onclick')||'')+' '+(e.getAttribute('onchange')||'')))key='operational-holder:'+(e.id||e.name||ref(e));if(module==='inspector'&&type==='checkbox'){if(!e.closest('td')||!e.value||e.value==='on')return;key='approval:'+e.value;}if(!key||e.disabled||e.readOnly||/password|captcha|otp|token|csrf|username|user_id/i.test(key)||['hidden','file','submit','button','password'].includes(type))return;
if(module==='inspector'&&type!=='checkbox')return;
if(type==='radio')key=key+'|'+e.value;var kind=e.tagName==='SELECT'?'select':['checkbox','radio','number'].includes(type)?type:'text';
fields.push({ref:ref(e),key:key,label:clean(e.getAttribute('aria-label')||(e.labels&&e.labels[0]&&e.labels[0].textContent)||e.getAttribute('placeholder')||(module==='census'?censusLabel(key):key)),value:['checkbox','radio'].includes(kind)?String(e.checked):String(e.value||''),kind:kind,options:kind==='select'?Array.prototype.filter.call(e.options,function(o){return !o.disabled;}).map(function(o){return {value:String(o.value),label:clean(o.textContent)};}):[]});});
function action(e,label,kind){if(e&&!e.disabled&&e.getAttribute('aria-disabled')!=='true')actions.push({ref:ref(e),label:label,kind:kind});}
function unique(selector,label,kind){var list=nodes(selector);if(list.length===1)action(list[0],label,kind);}
if(s==='list'){
var list=module==='registry'?nodes('.view_btn'):nodes('table .btn');
list.forEach(function(b){var row=b.closest('tr');if(!row)return;var identity=nodes('input[name="khasraNo"],input[name="entrySeqNo"],input[name="plotNo"],input[name="entry_seq_no"],input[name="aabaadi_gata_number"]',row).map(function(e){return e.value;}).join('|');var label=clean(row.textContent);if(!identity)identity=label;
if(identity)entries.push({ref:ref(b),key:hash(identity),label:label||identity});});
}
if(s==='entry'){
if(module==='survey9'){var save=nodes('input#sbt').filter(function(e){return /सुरक्षित|save|approve/i.test(e.value);});if(save.length===1)action(save[0],title(save[0]),'approve');else {var forms=nodes('form'),tables=forms[0]&&nodes('table',forms[0]),inputs=tables&&tables[2]&&nodes('input[type="submit"],input[type="button"]',tables[2]);if(inputs&&inputs.length===1)action(inputs[0],title(inputs[0]),'approve');}}
if(module==='inspector'){var locks=nodes('[name="ri_lock"]');if(locks.length===1)action(locks[0],title(locks[0]),'approve');else {var approve=nodes('.table-container button').filter(function(e){return /approve|lock|अनुमोद|लॉक/i.test(title(e));});if(approve.length===1)action(approve[0],title(approve[0]),'approve');}}
if(module==='census'){
var popup=censusPopup(),choices=censusChoices(popup);(choices||[]).forEach(function(choice){action(refs[choice.ref],'Choose '+popup+' '+choice.code,'navigate');});
if(popup)actions.push({ref:'census-close-popup',label:'Return to census form',kind:'navigate'});
if(!popup)nodes('button,input[type="button"],a').forEach(function(e){var meaning=title(e)+' '+(e.getAttribute('onclick')||'');if(/sch_h_list|serial.*list|list.*serial|क्रम.*सूची/i.test(meaning))action(e,'Open serial list','navigate');else if(/survey_list|survey.*list|list.*survey/i.test(meaning))action(e,'Open survey list','navigate');else if(/search_crop|select.*crop|crop.*select/i.test(meaning))action(e,'Open crop chooser','navigate');});
if(!popup&&!actions.some(function(a){return a.label==='Open crop chooser';})&&/schedule_h\.jsp/i.test(location.pathname||location.href)){var cropButtons=nodes('.btn_3');if(cropButtons.length===1)action(cropButtons[0],'Open crop chooser','navigate');}
if(!popup&&/schedule_h\.jsp/i.test(location.href)){
var referenceButtons=nodes('.btn_1');
if(referenceButtons.length===4){if(!actions.some(function(a){return a.label==='Open serial list';}))action(referenceButtons[0],'Open serial list','navigate');if(!actions.some(function(a){return a.label==='Open survey list';}))action(referenceButtons[1],'Open survey list','navigate');action(referenceButtons[2],'Calculate census area','navigate');}
else {var calculate=nodes('button,input[type="button"],input[type="submit"]').filter(function(e){return /^(?:calculate|calculate area|गणना)$/i.test(title(e));});if(calculate.length===1)action(calculate[0],'Calculate census area','navigate');}
var dialogs=nodes('.swal2-popup');if(censusCalculation===identity&&censusCalculation&&dialogs.length===1){var dt=clean(dialogs[0].textContent),ok=nodes('.swal2-confirm',dialogs[0]);if(ok.length===1&&!/error|invalid|failed|unable|त्रुटि|असफल/i.test(dt)&&/area|calculat|irrigat|crop|क्षेत्र|गणना|फसल/i.test(dt))action(ok[0],'Acknowledge census calculation','navigate');}
}
var saves=nodes('#Save,[name="Save"]');if(saves.length===1)action(saves[0],'Save census entry','save');nodes('button,input[type="button"],input[type="submit"],a').forEach(function(e){if(/^(?:calculate|calculate area|next|previous|back|गणना|अगला|पिछला)$/i.test(title(e)))action(e,title(e),'navigate');});}
if(module==='registry'){
var selectors=nodes('.updateApproval ng-select');if(selectors.length===1)action(selectors[0],'Choose APPROVED','select-approval');
var submit=nodes('.updateApproval .gree_btn,button[type="submit"]').filter(function(e){return /^(submit|save|approve|सुरक्षित|अनुमोदन)$/i.test(title(e));});if(!submit.length){submit=nodes('.gree_btn').filter(function(e){return !/^(generate data|show data)$/i.test(title(e));});}if(submit.length===1)action(submit[0],title(submit[0]),'approve');
}
if(module==='echawadi')nodes('button').forEach(function(e){var label=title(e);if(/^(search|show|खोजें|शोधा|view report)$/i.test(label))action(e,label,'navigate');else if(/^(save|submit|generate demand|receive money|जतन करा)$/i.test(label))action(e,label,'save');});
}
if(s==='document')actions.push({ref:'printarea',label:'Save official PDF',kind:'export'});
var ns=nodes('.alert-success,.alert-danger,.ajs-success.ajs-visible,.ajs-error.ajs-visible,.swal2-html-container,.swal2-title,.toast-success,.toast-error,[role="alert"]');
var notices=ns.map(function(e){return {key:ref(e)+'|'+clean(e.textContent),text:clean(e.textContent),error:e.matches('.alert-danger,.ajs-error,.toast-error')};});
function positive(t){return !/not|unsuccess|failed|error|invalid|unable|already|will|would|should|if|नहीं|असफल|त्रुटि/i.test(t)&&/successfully|success|सफलतापूर्वक/i.test(t);}
if(pending&&module==='census'&&(pending.identity!==identity||pending.context!==context))result('uncertain','The census holding or village changed before confirmation.');
if(pending&&!busy&&module==='census'&&pending.censusConfirm){var dialogs=nodes('.swal2-popup');if(dialogs.length===1){var dialog=dialogs[0],dt=clean(dialog.textContent),ok=nodes('.swal2-confirm',dialog),dk=ref(dialog)+'|'+dt;if(pending.dialogs.indexOf(dk)<0&&ok.length===1&&!/error|invalid|failed|unable|delete|remove|त्रुटि|असफल/i.test(dt)&&/save|submit|confirm|success|सुरक्षित|सफल|पुष्टि/i.test(dt)){pending.dialogs.push(dk);if(positive(dt)&&notices.some(function(n){return pending.notices.indexOf(n.key)<0&&positive(n.text);}))result('confirmed','The portal reported successful completion.');ok[0].click();}}}
if(pending&&!busy){var fresh=notices.filter(function(n){return pending.notices.indexOf(n.key)<0;});if(fresh.some(function(n){return n.error;}))result('uncertain','The portal reported an error. Check the record.');else if(fresh.some(function(n){return positive(n.text);}))result('confirmed','The portal reported successful completion.');}

var censusAreas;
if(module==='census'){censusAreas=[];nodes('input').filter(function(e){return /^area\d+_1$/.test(e.name||e.id);}).forEach(function(e){var index=(e.name||e.id).match(/^area(\d+)_1$/)[1],whole=nodes('input').filter(function(w){return (w.name||w.id)==='area'+index;}),value=whole.length===1?String(whole[0].value)+'.'+String(e.value):String(e.value);if(/^\d+(?:\.\d{1,4})?$/.test(value))censusAreas.push({index:index,area:value});});}
var operated=module==='census'?nodes('[name="area_opr"]'):[],censusOperatedArea=operated.length===1&&/^\d+(?:\.\d{1,4})?$/.test(String(operated[0].value))?String(operated[0].value):undefined;
var cropCodes=module==='census'?Array.prototype.slice.call(root.querySelectorAll('input,select')).filter(function(e){return /^crop(?:_?code|_?cd)?_?\d*$/i.test(e.name||e.id);}).map(function(e){return String(e.value||'');}).filter(function(v){return /^\d+$/.test(v);}):undefined;
var operatedStatus=module==='census'?root.querySelectorAll('[name="operated_status"]'):[];
var data={censusOperatedStatus:operatedStatus.length===1?String(operatedStatus[0].value):undefined,censusCalculated:censusCalculated&&censusCalculation===identity,censusCropCodes:cropCodes,censusPopup:censusPopup(),censusChoices:censusChoices(censusPopup()),censusSurveyArea:surveyArea(),censusOperatedArea:censusOperatedArea,censusAreas:censusAreas,context:context,type:'snapshot',documentId:doc,url:location.href,stage:s,busy:busy,identity:identity,fields:fields,actions:actions,entries:entries,notice:notices.map(function(n){return n.text;}).join(' ').slice(0,4000),success:notices.some(function(n){return positive(n.text);}),error:requestFailed||notices.some(function(n){return n.error;}),nameMatch:score?Number(score[1]):undefined};
var encoded=JSON.stringify(data);if(force===true||encoded!==last){last=encoded;revision++;snapshot=Object.assign({revision:revision},data);post(snapshot);}
}
function set(e,value){if(e.type==='checkbox'||e.type==='radio'){if(e.checked!==(value==='true'))e.click();return;}var d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value');if(d&&d.set)d.set.call(e,value);else e.value=value;['input','change','keyup','blur'].forEach(function(t){e.dispatchEvent(new Event(t,{bubbles:true}));});}
function command(c){if(!c||!c.id||used[c.id])return;used[c.id]=true;if(c.type==='stop'){stopped=true;result('uncertain','Stopped. Check any pending official action.');return;}stopped=false;scan();
function fail(message){post({type:'result',id:c.id,state:'failed',message:message});}
if(!snapshot||c.documentId!==doc||c.revision!==revision||c.url!==location.href||snapshot.busy||pending){fail('The page changed or is busy.');return;}
if(c.type==='fill'){var patch=c.values||{},keys=Object.keys(patch);for(var i=0;i<keys.length;i++){var f=snapshot.fields.find(function(x){return x.ref===keys[i];}),e=refs[keys[i]],v=patch[keys[i]];if(!f||!visible(e)||e.disabled||e.readOnly||typeof v!=='string'||v.length>4000||(f.kind==='select'&&!f.options.some(function(o){return o.value===v;}))||(f.kind==='number'&&(!/^-?\d+(?:\.\d+)?$/.test(v)||!Number.isFinite(Number(v))||(e.min!==''&&e.min!=null&&Number(v)<Number(e.min))||(e.max!==''&&e.max!=null&&Number(v)>Number(e.max))))||(['checkbox','radio'].includes(f.kind)&&!['true','false'].includes(v))){fail('The field or option changed.');return;}}
try{keys.forEach(function(k){set(refs[k],patch[k]);});scan();post({type:'result',id:c.id,state:'filled',message:'Fields filled.'});}catch(e){fail('The form changed during filling.');}return;}
if(c.type==='open'){var rows=snapshot.entries.filter(function(e){return e.key===c.record;});if(rows.length!==1||rows[0].ref!==c.ref){fail('Record is missing or ambiguous.');return;}refs[c.ref].click();post({type:'result',id:c.id,state:'navigated',message:'Record opened.'});return;}
var a=snapshot.actions.find(function(x){return x.ref===c.ref;});if(!a){fail('Action no longer available.');return;}
if(a.ref==='census-close-popup'){post({type:'result',id:c.id,state:'navigated',message:a.label});window.close();return;}
if(module==='census'&&snapshot.censusPopup&&snapshot.censusChoices&&snapshot.censusChoices.some(function(choice){return choice.ref===a.ref;})){post({type:'result',id:c.id,state:'navigated',message:a.label});refs[a.ref].click();scan();return;}
if(a.kind==='export'){
var area=nodes('#printarea')[0];if(!area){fail('Official print area unavailable.');return;}
var clone=area.cloneNode(true);Array.prototype.forEach.call(clone.querySelectorAll('input,select,textarea'),function(e){var value=e.tagName==='SELECT'&&e.selectedOptions&&e.selectedOptions[0]?e.selectedOptions[0].textContent:e.value;if(!['password','hidden','file'].includes(e.type))e.replaceWith(document.createTextNode(value||''));else e.remove();});Array.prototype.forEach.call(clone.querySelectorAll('script,iframe,object,embed,button,link,style'),function(e){e.remove();});
Array.prototype.forEach.call(clone.querySelectorAll('*'),function(e){Array.prototype.slice.call(e.attributes).forEach(function(attr){if(!['src','alt','rowspan','colspan','width','height'].includes(attr.name.toLowerCase()))e.removeAttribute(attr.name);});});
Array.prototype.forEach.call(clone.querySelectorAll('img'),function(img){try{var u=new URL(img.getAttribute('src'),location.href);if(u.origin===location.origin)img.src=u.href;else img.remove();}catch(e){img.remove();}});
var images=Array.prototype.slice.call(clone.querySelectorAll('img'));if(images.length>30){fail('This document has too many images to export.');return;}
var controller=new AbortController(),imageBytes=0,exportTimer=setTimeout(function(){controller.abort();},20000);
Promise.all(images.map(function(img){return fetch(img.src,{credentials:'same-origin',signal:controller.signal}).then(function(response){if(!response.ok)throw Error('image');return response.blob();}).then(function(blob){imageBytes+=blob.size;if(imageBytes>4000000||!/^image\/(png|jpeg|webp)$/i.test(blob.type))throw Error('image');return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){img.src=reader.result;resolve();};reader.onerror=reject;reader.readAsDataURL(blob);});});})).then(function(){clearTimeout(exportTimer);if(stopped||location.href!==c.url){fail('Export stopped or the record changed.');return;}post({type:'document',id:c.id,title:clean(document.title)||'Official record',html:'<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:4px}img{max-width:100%}</style></head><body>'+clone.innerHTML+'</body></html>'});}).catch(function(){clearTimeout(exportTimer);controller.abort();fail('An official document image could not be loaded. Export was not saved.');});return;
}
if(a.kind==='select-approval'){
var control=refs[a.ref],container=nodes('div',control)[0];if(!container){fail('Approval selector unavailable.');return;}
container.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,view:window}));
setTimeout(function(){if(stopped||location.href!==c.url)return;var options=nodes('.ng-option').filter(function(e){return clean(e.textContent)==='APPROVED';});if(options.length!==1){fail('APPROVED option unavailable or ambiguous.');return;}options[0].click();scan();post({type:'result',id:c.id,state:'filled',message:'APPROVED selected; review before submission.'});},200);return;
}
if(a.kind==='save'||a.kind==='approve'){
pending={id:c.id,identity:snapshot.identity,context:snapshot.context,censusConfirm:module==='census'&&c.confirmDialogs===true,dialogs:nodes('.swal2-popup').map(function(e){return ref(e)+'|'+clean(e.textContent);}),notices:nodes('.alert-success,.alert-danger,.ajs-success.ajs-visible,.ajs-error.ajs-visible,.swal2-html-container,.swal2-title,.toast-success,.toast-error,[role="alert"]').map(function(e){return ref(e)+'|'+clean(e.textContent);})};
timer=setTimeout(function(){result('uncertain','No confirmed result; check the record before retrying.');},25000);
}
try{if(module==='census'&&a.label==='Calculate census area'){censusCalculation=snapshot.identity;censusCalculated=false;}if(module==='census'&&a.label==='Acknowledge census calculation')censusCalculated=true;
if(a.kind==='navigate')post({type:'result',id:c.id,state:'navigated',message:a.label});refs[c.ref].click();scan();}catch(e){if(pending)result('uncertain','Action interrupted.');else fail('Action interrupted.');}
}
function ended(status){requests=Math.max(0,requests-1);if(status===0||status>=400)requestFailed=true;scan();}
if(typeof XMLHttpRequest!=='undefined'){var originalSend=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.send=function(){var xhr=this;requests++;function done(){xhr.removeEventListener('loadend',done);ended(xhr.status);}xhr.addEventListener('loadend',done);try{return originalSend.apply(xhr,arguments);}catch(e){xhr.removeEventListener('loadend',done);ended(0);throw e;}};}
if(window.fetch){var originalFetch=window.fetch;window.fetch=function(){requests++;return originalFetch.apply(this,arguments).then(function(response){response.clone().arrayBuffer().then(function(){ended(response.status);},function(){ended(0);});return response;},function(e){ended(0);throw e;});};}
var observer=new MutationObserver(scan);observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,characterData:true});var interval=setInterval(scan,1000);
window.__lekhpalOfficialWork={scan:scan,command:command,dispose:function(){observer.disconnect();clearInterval(interval);clearTimeout(timer);delete window.__lekhpalOfficialWork;}};scan();
})(); true;`;
