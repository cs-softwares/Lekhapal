import { RevenueModule } from '../domain/revenueFeeding';

// Independent browser adapter. Does not touch the retained public Bhulekh browser.
// Selectors and stage names follow FastKhatoni's Ansh/Prapatra implementations.
export const buildRevenueBridge = (module: RevenueModule) => String.raw`
(function(){
  var module=${JSON.stringify(
    module,
  )}, host=module==='prapatra5'?'svamitva.up.gov.in':'upbhulekh.gov.in';
  if(window.top!==window.self || location.origin!=='https://'+host) return;
  if(window.__lekhpalRevenue){window.__lekhpalRevenue.scan();return;}
  var doc=Date.now().toString(36)+Math.random().toString(36).slice(2), serial=0, revision=0, last='', snapshot=null, refs={}, used={}, pending=null, dead=false, requests=0, failed=false, waitingOwners=false, observedOwners=false;
  var lastGata='', timer=null, debounce=null;
  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,2000);}
  function post(v){if(!dead&&window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({channel:'lekhpal-revenue-v1'},v)));}
  function visible(el){if(!el||el.isConnected===false||el.hidden||!el.getClientRects().length||el.getAttribute('aria-hidden')==='true')return false;if(el.closest&&el.closest('[hidden],[aria-hidden="true"]'))return false;var s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.visibility!=='collapse'&&s.opacity!=='0';}
  function nodes(selector,root){return Array.prototype.filter.call((root||document).querySelectorAll(selector),visible);}
  function one(selector){var list=nodes(selector);return list.length===1?list[0]:null;}
  function ref(el){if(!el.__revenueRef)el.__revenueRef='r'+(++serial);refs[el.__revenueRef]=el;return el.__revenueRef;}
  function stage(){
    var p=location.pathname.toLowerCase(), base=p.split('/').pop();
    if(/(?:login|sessionexpired)/i.test(p)||nodes('input[type="password"]').length)return 'login';
    if(module!=='prapatra5'){
      if(module==='ansh'&&/^mutanshnirdharaninsertrtk(?:\.jsp)?$/.test(base))return 'share';
      if(module==='ansh-delete'&&/^mutanshnirdharandeletertk(?:\.jsp)?$/.test(base))return 'delete';
      if(module==='ansh'&&/^(?:mutanshnirdharanrtk|insertownerhissa)(?:\.jsp)?$/.test(base))return 'selection';
      if(module==='ansh-delete'&&/^(?:mutanshnirdharandeleteselectrtk|deleteownerhissa)(?:\.jsp)?$/.test(base))return 'selection';
      return 'other';
    }
    if(p.indexOf('/entryf5/')<0)return 'other';
    if(base==='propertydetailentry.jsp'&&new URL(location.href).searchParams.get('formType')==='5')return 'property';
    return ({chechkp5data:'check','p5entry.jsp':'boundaries',addmoreandnewpage:'owners','remarkpage.jsp':'remarks',addremark:'result'})[base]||'other';
  }
  var labels={gataNumber:'गाटा / Gata',ownerName:'खातेदार / Owner',khasra_no:'गाटा / Gata',name:'नाम / Name',father:'सम्बन्धी / Relative',area:'कुल क्षेत्रफल / Plot area',hissa:'अंश का क्षेत्रफल / Share area',share:'अंश / Fraction',remark:'टिप्पणी / Remark',village:'ग्राम / Village',survey:'सर्वेक्षण वर्ष / Survey year',khasraNo:'गाटा / Gata',entrySeqNo:'भूखण्ड संख्या / Property number',east:'पूरब / East',west:'पश्चिम / West',north:'उत्तर / North',south:'दक्षिण / South',cat:'श्रेणी / Category',scat:'उपश्रेणी / Subcategory',subcat:'उपश्रेणी / Subcategory',owner_name:'भूखण्ड स्वामी / Owner name',owner_hissa:'स्वामी का अंश / Owner share',gender_new:'लिंग / Gender',caste_new:'जाति / Caste',relation_new:'सम्बन्ध / Relationship',owner_relative_name_new:'सम्बन्धी का नाम / Relative name',id_new:'पहचान प्रकार / ID type',id_number_new:'पहचान संख्या / ID number',mobile_number_new:'मोबाइल / Mobile'};
  function title(el){return clean(el.labels&&el.labels.length?Array.prototype.map.call(el.labels,function(l){return l.textContent;}).join(' '):el.getAttribute('aria-label')||labels[el.id]||labels[el.name]||el.getAttribute('placeholder')||el.name||el.id);}
  function key(el){return labels[el.id]?el.id:labels[el.name]?el.name:el.id||el.name||'';}
  function ownerKey(value){var s=clean(value),a=2166136261,b=3339675911;for(var i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b^s.charCodeAt(i),2246822519);}return ('00000000'+(a>>>0).toString(16)).slice(-8)+('00000000'+(b>>>0).toString(16)).slice(-8);}
  function ownerCounts(){var out={};nodes('#ownertab tr').forEach(function(row){var cells=nodes('td,th',row);if(cells.length<3)return;var inputs=nodes('input[readonly],input[disabled]',cells[2]);var name=clean(inputs.length===1?inputs[0].value:cells[2].textContent);if(name){var k=ownerKey(name);out[k]=(out[k]||0)+1;}});return out;}
  function notices(){return nodes('.alert-success,.alert-danger,.alert-error,.error,.success,[role="alert"],[role="status"]').map(function(n){return {key:ref(n)+'|'+clean(n.textContent),text:clean(n.textContent),error:n.matches('.alert-danger,.alert-error,.error')};}).filter(function(n){return n.text;});}
  function positive(s){return !/\b(?:not|failed|failure|error|invalid|unable|cannot|duplicate|expired|already|will|would|should|if)\b|नहीं|नही|असफल|त्रुटि|विफल|करें|होगा|यदि|अगर/i.test(s)&&/saved\s+successfully|successfully\s+saved|deleted\s+successfully|successfully\s+deleted|सफलतापूर्वक.*(?:सुरक्षित|सहेजा|सेव|हटा)/i.test(s);}
  function finish(outcome,message){if(!pending)return;var id=pending.id;pending=null;clearTimeout(timer);post({type:'result',id:id,outcome:outcome,message:message});}
  function scan(){
    if(dead)return;
    refs={};var current=stage(), fields=[], actions=[], counts=ownerCounts();
    var busy=requests>0||!!(window.jQuery&&window.jQuery.active)||document.readyState!=='complete'||nodes('.progress-loader,#preloader,[aria-busy="true"]').length>0;
    var gataEl=one('#gataNumber'),ownerEl=one('#ownerName'),gata=gataEl?String(gataEl.value):'',owner=ownerEl?String(ownerEl.value):'';
    if(gata!==lastGata){lastGata=gata;waitingOwners=true;observedOwners=false;}
    if(waitingOwners&&observedOwners&&!busy)waitingOwners=false;
    if(!['login','other','result'].includes(current))nodes('input,select,textarea').forEach(function(el){
      var k=key(el),type=(el.type||'').toLowerCase();
      if(!k||/password|captcha|otp|token|username|csrf|consent/i.test(k)||['password','hidden','file','submit','button','checkbox','radio'].includes(type))return;
      if(module!=='prapatra5'&&!(current==='selection'?['gataNumber','ownerName']:['khasra_no','name','father','area','hissa','share','remark']).includes(k))return;
      var kind=el.tagName==='SELECT'?'select':el.tagName==='TEXTAREA'?'textarea':type==='number'?'number':'text';
      var readOnly=!!(el.readOnly||el.disabled)||(module!=='prapatra5'&&['khasra_no','name','father','area'].includes(k))||current==='delete';
      fields.push({ref:ref(el),key:k,label:title(el),kind:kind,value:String(el.value||''),readOnly:readOnly,required:!!el.required,options:kind==='select'?Array.prototype.filter.call(el.options,function(o){return !o.disabled;}).map(function(o){return {value:String(o.value),label:clean(o.textContent)};}):[]});
    });
    function action(selector,label,kind){var el=one(selector);if(el&&!el.disabled&&el.getAttribute('aria-disabled')!=='true')actions.push({ref:ref(el),label:label,kind:kind});}
    if(current==='selection')action('button[type="submit"]','Open selected owner','navigate');
    if(current==='share')action('button[type="submit"]','Save share','save');
    if(current==='delete')action('button[type="submit"]','Remove this share entry','delete');
    if(current==='property')action('.btn.btn-info','Continue property','navigate');
    if(current==='check')action('.btn.btn-danger','Open property details','navigate');
    if(current==='boundaries'){
      action('.btn.btn-danger.float-right','Continue to owners','navigate');
    }
    if(current==='boundaries'||current==='owners'){
      action('.btn.btn-danger.addRD','Save owner','owner-save');action('#step4','Continue to remarks','navigate');
    }
    if(current==='remarks'){
      var finals=nodes('form .btn.btn-info').filter(function(b){var f=b.form||b.closest('form');if(!f)return false;var dest=b.getAttribute('formaction')||f.getAttribute('action')||'';try{if(dest&&new URL(dest,location.href).origin!==location.origin)return false;}catch(e){return false;}return /\baddremark\b/i.test(dest+' '+(b.getAttribute('onclick')||'')+' '+(f.getAttribute('onsubmit')||''));});
      if(finals.length===1&&!finals[0].disabled)actions.push({ref:ref(finals[0]),label:'Save Prapatra-5',kind:'final-save'});
    }
    if(current==='result'){
      var links=nodes('a[href]').filter(function(a){try{var u=new URL(a.href,location.href);return u.origin===location.origin&&u.pathname.endsWith('/entryF5/propertyDetailEntry.jsp')&&u.searchParams.get('formType')==='5';}catch(e){return false;}});
      if(links.length===1)actions.push({ref:ref(links[0]),label:'Next property','kind':'navigate'});
    }
    var ns=notices(), error=ns.some(function(n){return n.error;}), saved=ns.some(function(n){return !n.error&&positive(n.text);});
    var body=clean(document.body&&(document.body.innerText||document.body.textContent));
    if(current==='result'&&body.length<=180&&!nodes('table,form,input,select,textarea').length&&positive(body))saved=true;
    var input=one('#owner_name'), proof=input&&clean(input.value)?{key:ownerKey(input.value),count:counts[ownerKey(input.value)]||0}:undefined;
    if(pending){
      if(failed||error)finish('uncertain','The portal reported an error. Check the official record before retrying.');
      else if(pending.kind==='owner-save'&&!busy&&(counts[pending.ownerKey]||0)>pending.baseline)finish('confirmed','The saved owner appeared in the official owner table.');
      else if(pending.kind!=='owner-save'&&ns.some(function(n){return pending.notices.indexOf(n.key)<0&&!n.error&&positive(n.text);}))finish('confirmed','The portal reported successful completion.');
    }
    var context=Array.prototype.filter.call(document.querySelectorAll('input,select'),function(e){return /^(?:village(?:_?code|_?id)?|villageCd|district(?:_?code|_?id)?|tehsil(?:_?code|_?id)?)$/i.test(e.name||e.id);}).map(function(e){return (e.name||e.id)+'='+e.value;}).sort().join('&');
    var data={context:context,module:module,documentId:doc,url:location.href,stage:current,busy:busy,failed:failed,ownersReady:!waitingOwners&&!busy,fields:fields,actions:actions,selection:{gata:gata,owner:owner},ownerProof:proof,ownerCounts:counts,notice:ns.map(function(n){return n.text;}).join(' ').slice(0,2000),result:error?'error':saved?'saved':'unconfirmed'};
    var encoded=JSON.stringify(data);if(encoded!==last){last=encoded;revision++;snapshot=Object.assign({type:'snapshot',channel:'lekhpal-revenue-v1',revision:revision},data);post(snapshot);}
  }
  function set(el,value){var d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value');if(d&&d.set)d.set.call(el,value);else el.value=value;['input','change','keyup'].forEach(function(type){el.dispatchEvent(new Event(type,{bubbles:true}));});}
  function command(c){
    if(!c||!c.id||used[c.id])return;used[c.id]=true;
    if(c.type==='stop'){finish('uncertain','Stopped. Check any pending official submission.');return;}
    scan();function reject(message){post({type:'result',id:c.id,outcome:'failed',message:message});}
    if(!snapshot||c.documentId!==doc||c.revision!==revision||c.url!==location.href||pending||snapshot.busy||failed||['login','other','result'].includes(snapshot.stage)&&c.type==='fill'){reject('The page changed or is not ready. Review it again.');return;}
    if(c.type==='fill'){
      var values=c.values||{},keys=Object.keys(values);if(!keys.length){reject('No fields selected.');return;}
      for(var i=0;i<keys.length;i++){var f=snapshot.fields.find(function(x){return x.ref===keys[i];}),v=values[keys[i]],el=refs[keys[i]];
        if(!f||!el||f.readOnly||el.disabled||el.readOnly||!visible(el)||typeof v!=='string'||v.length>2000){reject('A field is no longer editable.');return;}
        if(f.kind==='select'&&!f.options.some(function(o){return o.value===v;})){reject('The official options changed.');return;}
        if(f.key==='ownerName'&&!snapshot.ownersReady){reject('Wait for owners of the selected gata to load.');return;}
        if((f.kind==='number'||/^(?:hissa|area)$/.test(f.key))&&v&&(!/^\d+(?:\.\d+)?$/.test(v)||!isFinite(Number(v)))){reject('Invalid number.');return;}
        if(/^(?:share|owner_hissa)$/.test(f.key)&&v&&(!/^\d+\/[1-9]\d*$/.test(v)||Number(v.split('/')[0])>Number(v.split('/')[1]))){reject('Invalid share.');return;}
      }
      try{keys.forEach(function(k){var el=refs[k];if(!visible(el)||el.disabled||el.readOnly)throw Error('changed');if(el.id==='gataNumber'){waitingOwners=true;observedOwners=false;}set(el,values[k]);});scan();post({type:'result',id:c.id,outcome:'filled',message:'Fields filled. Review the official form.'});}catch(e){reject('The form changed during filling. Review it.');}return;
    }
    var a=snapshot.actions.find(function(x){return x.ref===c.actionRef;}),b=refs[c.actionRef];
    if(!a||!visible(b)||b.disabled){reject('The action changed.');return;}
    if(snapshot.stage==='selection'&&(!snapshot.ownersReady||!snapshot.selection.gata||!snapshot.selection.owner)){reject('Choose the gata and wait for its owner list.');return;}
    if(a.kind!=='navigate'){
      if(a.kind==='owner-save'&&!snapshot.ownerProof){reject('Enter the owner name first.');return;}
      pending={id:c.id,kind:a.kind,notices:notices().map(function(n){return n.key;}),ownerKey:snapshot.ownerProof&&snapshot.ownerProof.key,baseline:snapshot.ownerProof&&snapshot.ownerProof.count};
      timer=setTimeout(function(){finish('uncertain','No confirmed result. Check the official record before retrying.');},25000);
    }
    try{b.click();if(a.kind==='navigate')post({type:'result',id:c.id,outcome:'clicked',message:a.label});}catch(e){if(pending)finish('uncertain','Submission interrupted. Check the record.');else reject('Navigation interrupted.');}
  }
  function began(){requests++;}
  function ended(status){requests=Math.max(0,requests-1);if(status===0||status>=400)failed=true;scan();}
  if(typeof XMLHttpRequest!=='undefined'){
    var originalSend=XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send=function(){var xhr=this;began();function done(){xhr.removeEventListener('loadend',done);ended(xhr.status);}xhr.addEventListener('loadend',done);try{return originalSend.apply(xhr,arguments);}catch(e){xhr.removeEventListener('loadend',done);ended(0);throw e;}};
  }
  if(window.fetch){var originalFetch=window.fetch;window.fetch=function(){began();var promise;try{promise=originalFetch.apply(this,arguments);}catch(e){ended(0);throw e;}return promise.then(function(response){try{response.clone().arrayBuffer().then(function(){ended(response.status);},function(){ended(0);});}catch(e){ended(0);}return response;},function(e){ended(0);throw e;});};}
  var observer=new MutationObserver(function(ms){var owners=document.getElementById('ownerName');if(owners&&ms.some(function(m){return (m.type==='childList'||m.type==='characterData')&&(m.target===owners||owners.contains(m.target)||Array.prototype.some.call(m.addedNodes||[],function(n){return n===owners||(n.contains&&n.contains(owners));}));}))observedOwners=true;clearTimeout(debounce);debounce=setTimeout(scan,100);});
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,characterData:true});
  var interval=setInterval(scan,700);
  window.__lekhpalRevenue={scan:scan,command:command,dispose:function(){dead=true;observer.disconnect();clearTimeout(timer);clearTimeout(debounce);clearInterval(interval);delete window.__lekhpalRevenue;}};
  scan();
})(); true;
`;
