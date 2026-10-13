// Original adapter implementation informed by the reference's route-based
// workflow. No account credentials, third-party backend or subscription hooks.
// This script never submits, locks, fills or selects a plot on injection.
export const KHASRA_FEEDING_BRIDGE = String.raw`
(function () {
  if (window.top !== window.self || location.origin !== 'https://ekhasra.up.gov.in') return;
  if (window.__lekhpalFeeding) { window.__lekhpalFeeding.scan(); return; }
  var docId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  var revision = 0, serial = 0, last = '', snapshot = null, refs = {}, used = {}, pending = null;
  var timeout = null, debounce = null, dead = false, requests = 0;
  var stages = {lekhpalGataList:'list',lekhpalOwnerDetails:'owner',lekhpalCroppingPattern:'land',lekhpalInsertFallow:'fallow',lekhpalInsertTree:'trees',lekhpalInsertFasal:'crop',lekhpalInsertRemark:'remarks'};
  function clean(s) { return String(s || '').replace(/\s+/g,' ').trim().slice(0,2000); }
  function post(data) { if (!dead && window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({channel:'lekhpal-feeding-v1'},data))); }
  function visible(el) {
    if(!el || el.isConnected===false || el.hidden || el.getAttribute('aria-hidden')==='true' || !el.getClientRects().length) return false;
    if(el.closest && el.closest('[hidden],[aria-hidden="true"]')) return false;
    var css=getComputedStyle(el);
    return css.display!=='none' && css.visibility!=='hidden' && css.visibility!=='collapse' && css.opacity!=='0';
  }
  function stage() { var h = location.hash.toLowerCase(); var keys = Object.keys(stages); for (var i=0;i<keys.length;i++) if(h.indexOf(keys[i].toLowerCase())>=0) return stages[keys[i]]; return /login/i.test(h) ? 'login' : 'other'; }
  function ref(el) { if (!el.__lekhpalFeedRef) el.__lekhpalFeedRef = 'f'+(++serial); refs[el.__lekhpalFeedRef] = el; return el.__lekhpalFeedRef; }
  function label(el) {
    var labels = el.labels;
    if(labels && labels.length) return clean(Array.prototype.map.call(labels,function(l){return l.textContent;}).join(' '));
    var explicit=clean(el.getAttribute('aria-label') || el.getAttribute('placeholder'));
    if(explicit) return explicit;
    var known={area:'क्षेत्रफल / Area',flexSwitchCheckDefault:'सिंचित / Irrigated',agriTech:'सिंचाई विधि / Irrigation method'};
    if(known[el.id] || known[el.name]) return known[el.id] || known[el.name];
    if(el.name || el.id) return clean(el.name || el.id);
    // The reference selects the crop with select.ng-pristine: some portal
    // versions omit an id/name. Only use this fallback for a unique crop select.
    if(stage()==='crop' && el.matches && el.matches('select.ng-pristine') && nodes('select.ng-pristine').length===1) return 'फसल / Crop';
    return '';
  }
  function messages(selector) { return Array.prototype.filter.call(document.querySelectorAll(selector),visible).map(function(el){return clean(el.textContent);}).filter(Boolean); }
  function notices(selector) { return Array.prototype.filter.call(document.querySelectorAll(selector),visible).map(function(el){return {key:ref(el)+'|'+clean(el.textContent),text:clean(el.textContent)};}); }
  // The reference's lock callback also watches this SweetAlert result. A
  // confirmation question is not a success and is never clicked automatically.
  function lockNotices() { return notices('.swal2-html-container').filter(function(n){return /^Gata Locked Success(?:fully)?[.!]?$/i.test(n.text);}); }
  function nodes(selector) { return Array.prototype.filter.call(document.querySelectorAll(selector),visible); }
  function inside(el,selector) { return el && el.querySelectorAll ? Array.prototype.filter.call(el.querySelectorAll(selector),visible) : []; }
  function formRef(el) { var form=el.form || (el.closest && el.closest('form')); return form ? ref(form) : undefined; }
  function gataKey(value) { return clean(value).normalize('NFKC').replace(/\s+/g,'').replace(/[०-९]/g,function(d){return String('०१२३४५६७८९'.indexOf(d));}).toLowerCase(); }
  function validGata(value) { return /^[0-9]+(?:[/.\-][0-9a-z\u0900-\u097f]+)*[a-z\u0900-\u097f]*$/i.test(gataKey(value)) && clean(value).length<=80; }
  function readPlots() {
    var plots=[];
    nodes('table').forEach(function(table,index){
      var headers=inside(table,'th').map(function(h){return clean(h.textContent);});
      var column=headers.findIndex(function(h){return /(?:गाटा|खसरा)\s*(?:संख्या|नं)|(?:gata|khasra)\s*(?:no|number)/i.test(h) && !/unique|यूनिक/i.test(h);});
      // The reference reads td[1] in the first gata-list table.
      if(column<0 && index===0 && !headers.length) column=1;
      if(column<0) return;
      inside(table,'tbody tr').forEach(function(row){
        var cells=inside(row,'td'), gata=clean(cells[column] && cells[column].textContent);
        if(!validGata(gata)) return;
        var buttons=inside(row,'.btn-info');
        var locked=cells.some(function(cell){return /^(?:locked|लॉक|लॉक्ड)$/i.test(clean(cell.textContent));});
        var completed=cells.some(function(cell){return /^(?:completed|पूर्ण|सर्वेक्षण पूर्ण)$/i.test(clean(cell.textContent));});
        var button=buttons.length===1 ? buttons[0] : null;
        plots.push({ref:ref(button || row),gata:gata,status:locked?'locked':completed?'completed':button && !button.disabled && button.getAttribute('aria-disabled')!=='true'?'available':'unavailable'});
      });
    });
    return plots.slice(0,1000);
  }
  function readSearch() {
    var candidates=nodes('input').filter(function(el){return !el.disabled && !el.readOnly && ['text','search','number',''].indexOf(el.type || '')>=0 && !/password|captcha|otp|token|username/i.test([el.name,el.id].join(' '));});
    var named=candidates.filter(function(el){return /गाटा|खसरा|gata|khasra|खोज|search/i.test(label(el));});
    var el=named.length===1?named[0]:candidates.length===1?candidates[0]:null;
    return el ? {ref:ref(el),value:String(el.value || '')} : undefined;
  }
  function readPlotIdentity() {
    var identity='';
    nodes('table').forEach(function(table){
      inside(table,'tr').forEach(function(row){
        var cells=inside(row,'th,td');
        for(var i=0;i<cells.length-1;i++) {
          if(/^(?:(?:गाटा|खसरा)\s*(?:संख्या|नं०?)|(?:gata|khasra)\s*(?:no\.?|number))\s*:?$/i.test(clean(cells[i].textContent)) && validGata(cells[i+1].textContent)) {
            var value=clean(cells[i+1].textContent);
            if(identity && gataKey(identity)!==gataKey(value)) identity='ambiguous'; else identity=value;
          }
        }
      });
    });
    if(!identity && ['owner','land'].indexOf(stage())>=0) {
      var cells=inside(nodes('table')[0],'td');
      if(cells.length>=4 && validGata(cells[1].textContent)) identity=clean(cells[1].textContent);
    }
    return validGata(identity)?identity:undefined;
  }
  function readPlotArea() {
    function numeric(value) { var v=clean(value).replace(/[०-९]/g,function(d){return String('०१२३४५६७८९'.indexOf(d));}); return /^\d+(?:\.\d+)?$/.test(v) && isFinite(Number(v)) ? v : undefined; }
    var found=[];
    nodes('table').forEach(function(table){inside(table,'tr').forEach(function(row){
      var cells=inside(row,'th,td');
      for(var i=0;i<cells.length-1;i++) if(/^(?:(?:कुल\s*)?(?:क्षेत्रफल|रकबा)|(?:total\s+)?(?:plot\s+)?area)(?:\s*\([^)]*\))?\s*:?$/i.test(clean(cells[i].textContent))) {
        var value=numeric(cells[i+1].textContent); if(value!==undefined) found.push(value);
      }
    });});
    // Matches the combined reference's owner table, only when its gata is valid.
    if(!found.length && ['owner','land'].indexOf(stage())>=0) {
      var cells=inside(nodes('table')[0],'td');
      if(cells.length>=4 && validGata(cells[1].textContent)) {
        var value=numeric(cells[3].textContent); if(value!==undefined) found.push(value);
      }
    }
    return found.length && found.every(function(v){return Number(v)===Number(found[0]);}) ? found[0] : undefined;
  }
  function governmentLandSignal() {
    if(stage()!=='land') return undefined;
    var selectors=nodes('input,select,textarea').filter(function(el){return el.tagName==='SELECT' && el.name==='agriculturalType';});
    if(selectors.length!==1 || !selectors[0].options.length) return undefined;
    var count=selectors[0].options.length;
    // Reference heuristic, not an independent ownership determination.
    return count>=7 || count===3;
  }
  function remainingArea() {
    var values=nodes('input').filter(function(el){return (el.readOnly || el.disabled) && /(?:remaining|available).*area|area.*(?:remaining|available)|(?:शेष|अवशेष|उपलब्ध).*क्षेत्रफल|क्षेत्रफल.*(?:शेष|अवशेष|उपलब्ध)/i.test(label(el));}).map(function(el){return clean(el.value);});
    return values.length===1 && /^\d+(?:\.\d+)?$/.test(values[0]) && isFinite(Number(values[0])) ? values[0] : undefined;
  }
  function cropRows() {
    if(stage()!=='crop')return undefined;
    var candidates=[];
    nodes('table').forEach(function(table){
      var headers=inside(table,'thead th').map(function(e){return clean(e.textContent);});
      function column(pattern){var indices=[];headers.forEach(function(h,i){if(pattern.test(h))indices.push(i);});return indices.length===1?indices[0]:-1;}
      var crop=column(/^(?:crop(?: name)?|फसल(?: का नाम)?)$/i),area=column(/^(?:crop area|area|क्षेत्रफल|फसल का क्षेत्रफल)(?:\s*\([^)]*\))?$/i),water=column(/^(?:irrigated|irrigation|सिंचित|सिंचाई)$/i);
      if(crop<0||area<0||water<0)return;
      var rows=[],valid=true;
      inside(table,'tbody tr').forEach(function(row){var cells=inside(row,'td');if(!cells.length)return;
        if(cells.length!==headers.length){valid=false;return;}
        var value=clean(cells[area].textContent).replace(/[०-९]/g,function(c){return String(c.charCodeAt(0)-2406);}),irrigation=clean(cells[water].textContent);
        if(!/^\d+(?:\.\d{1,4})?$/.test(value)||!/^(?:yes|no|irrigated|unirrigated|हाँ|हां|नहीं|सिंचित|असिंचित)$/i.test(irrigation)){valid=false;return;}
        rows.push({crop:clean(cells[crop].textContent),area:value,irrigated:/^(?:yes|irrigated|हाँ|हां|सिंचित)$/i.test(irrigation)});
      });
      if(valid)candidates.push(rows);
    });
    return candidates.length===1?candidates[0]:undefined;
  }
  function listPagination() {
    var controls=nodes('.pagination [aria-label="Next"],.pagination [rel="next"],.pagination-next a,.pagination-next button').filter(function(e){return !e.disabled&&e.getAttribute('aria-disabled')!=='true'&&!e.closest('.disabled,[aria-disabled="true"]');});
    var active=nodes('.pagination .active,.pagination .current,.pagination [aria-current="page"]');
    if(active.length!==1||controls.length>1)return undefined;
    return {key:clean(active[0].textContent),nextRef:controls.length===1?ref(controls[0]):undefined};
  }
  function sectionRows(tree) {
    if(tree ? stage()!=='trees' : ['land','fallow'].indexOf(stage())<0)return undefined;
    var candidates=[];
    nodes('table').forEach(function(table){
      var headers=inside(table,'thead th').map(function(e){return clean(e.textContent);});
      function column(pattern){var found=[];headers.forEach(function(h,i){if(pattern.test(h))found.push(i);});return found.length===1?found[0]:-1;}
      var type=column(tree?/^(?:tree (?:type|category)|वृक्ष(?:ों)? (?:का )?प्रकार)$/i:/^(?:land type|भूमि (?:का )?प्रकार|भूमि की श्रेणी)$/i);
      var amount=column(tree?/^(?:count|tree count|number of trees|वृक्ष(?:ों)? की संख्या|संख्या)$/i:/^(?:area|क्षेत्रफल|रकबा)(?:\s*\([^)]*\))?$/i);
      if(amount<0 || (tree && type<0) || (!tree && stage()==='land' && type<0))return;
      var rows=[],valid=true;
      inside(table,'tbody tr').forEach(function(row){var cells=inside(row,'td');if(!cells.length)return;
        if(cells.length!==headers.length){valid=false;return;}
        var value=clean(cells[amount].textContent).replace(/[०-९]/g,function(d){return String('०१२३४५६७८९'.indexOf(d));});
        if(!(tree?/^\d+$/:/^\d+(?:\.\d+)?$/).test(value)){valid=false;return;}
        var record={type:type>=0?clean(cells[type].textContent):''};record[tree?'count':'area']=value;rows.push(record);
      });
      if(valid)candidates.push(rows);
    });
    return candidates.length===1?candidates[0]:undefined;
  }
  function officialContext() {
    var pairs=[];
    nodes('input,select').forEach(function(el){
      if(/password|captcha|otp|token|username/i.test([el.name,el.id].join(' ')))return;
      var value=el.tagName==='SELECT'&&el.selectedOptions&&el.selectedOptions[0]?clean(el.selectedOptions[0].textContent):clean(el.value);
      pairs.push([label(el)+' '+(el.name||'')+' '+(el.id||''),value,clean(el.value)]);
    });
    nodes('table').forEach(function(table){inside(table,'tr').forEach(function(row){var cells=inside(row,'th,td');for(var i=0;i<cells.length-1;i++)pairs.push([clean(cells[i].textContent),clean(cells[i+1].textContent),clean(cells[i+1].textContent)]);});});
    var values={year:[],season:[],villageCode:[],village:[]};
    pairs.forEach(function(p){
      var key=p[0],value=p[1],raw=p[2];
      if(/fasli|fasalyear|cropyear|फसली|फसली वर्ष/i.test(key)){var year=(value+' '+raw).match(/\b14\d{2}\b/);if(year)values.year.push(year[0]);}
      if(/season|fasalname|सीजन|ऋतु|फसल का नाम/i.test(key)){var season=/kharif|खरीफ/i.test(value)?'kharif':/rabi|ravi|रबी/i.test(value)?'rabi':/zaid|jayad|जायद/i.test(value)?'zaid':null;if(season)values.season.push(season);}
      if(/village.*code|villagecode|ग्राम.*कोड|गांव.*कोड/i.test(key)&&/^\d{6}$/.test(raw))values.villageCode.push(raw);
      if(/village|ग्राम|गांव/i.test(key)&&! /code|कोड/i.test(key)){if(/^\d{6}$/.test(raw))values.villageCode.push(raw);if(value&&!/^\d+$/.test(value))values.village.push(value);}
    });
    var context={};Object.keys(values).forEach(function(k){var v=values[k];if(v.length&&v.every(function(x){return x===v[0];}))context[k]=v[0];});return context;
  }
  function finish(outcome,message) {
    if (!pending) return;
    var id = pending.id; pending = null; clearTimeout(timeout);
    post({type:'result',id:id,outcome:outcome,message:message});
  }
  function scan() {
    if(dead || location.origin !== 'https://ekhasra.up.gov.in') return;
    var current = stage(), fields=[], actions=[]; refs={};
    var busy=requests>0||nodes('.progress-loader, #preloader, [aria-busy="true"]').some(function(el){return getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';});
    var unsupported=/unsupported browser/i.test(document.body ? document.body.innerText : '');
    var supported=['land','fallow','trees','crop','remarks'].indexOf(current)>=0;
    if(supported && !unsupported) {
      nodes('input,select,textarea').forEach(function(el){
        var type=(el.type || '').toLowerCase();
        if(el.disabled || el.readOnly || ['hidden','password','submit','button','file','search'].indexOf(type)>=0 || /password|captcha|otp|token|consent|username/i.test([el.id,el.name,el.autocomplete].join(' '))) return;
        var kind=el.tagName.toLowerCase()==='select'?'select':el.tagName.toLowerCase()==='textarea'?'textarea':['checkbox','radio','number'].indexOf(type)>=0?type:'text';
        var title=label(el); if(!title) return;
        var key=clean([el.tagName,kind,el.name,el.id,title,kind==='radio'?el.value:''].join('|'));
        fields.push({ref:ref(el),formRef:formRef(el),key:key,label:title,kind:kind,required:!!el.required,value:['radio','checkbox'].indexOf(kind)>=0?String(el.checked):String(el.value || ''),options:kind==='select'?Array.prototype.filter.call(el.options,function(o){return !o.disabled;}).map(function(o){return {value:String(o.value),label:clean(o.textContent)};}):[]});
      });
    }
    if((supported || current==='owner' || current==='list') && !unsupported) {
      nodes('button,input[type="submit"],a').forEach(function(el){
        if(el.disabled || el.getAttribute('aria-disabled')==='true') return;
        var title=clean(el.textContent || el.value); if(!title) return;
        var kind=/unlock|अनलॉक|delete|remove|हटायें|हटाएं|मिटा/i.test(title)?'other':/\block\b|लॉक/i.test(title)?'lock':/\bsave\b|\bsubmit\b|सुरक्षित|संरक्षित|दर्ज करें|प्रविष्टि करें/i.test(title)?'save':/\bnext\b|\bback\b|आगे|अगला|वापस|पिछला|गाटा\s*सूची|gata\s*list|सर्वेक्षण प्रारम्भ|सर्वेक्षण प्रारंभ/i.test(title)?'navigate':'other';
        if(kind!=='other' && (current!=='list' || kind==='navigate')) actions.push({ref:ref(el),formRef:formRef(el),label:title,kind:kind});
      });
    }
    var success=messages('.ajs-success.ajs-visible');
    var errors=messages('.ajs-error.ajs-visible');
    if(pending) {
      var freshSuccess=notices('.ajs-success.ajs-visible').filter(function(n){return pending.success.indexOf(n.key)<0;});
      if(pending.kind==='lock') freshSuccess=freshSuccess.filter(function(n){return /^(?:Gata )?Locked Success(?:fully)?[.!]?$/i.test(n.text);}).concat(lockNotices().filter(function(n){return pending.lockSuccess.indexOf(n.key)<0;}));
      var freshError=notices('.ajs-error.ajs-visible').filter(function(n){return pending.errors.indexOf(n.key)<0;});
      if(freshError.length) finish('failed',freshError.map(function(n){return n.text;}).join(' '));
      else if(freshSuccess.length) finish('portal-success',freshSuccess.map(function(n){return n.text;}).join(' '));
      else if(location.href!==pending.url) finish('uncertain','Page changed before a new success message was observed. Check the record before retrying.');
    }
    var data={officialContext:officialContext(),documentId:docId,url:location.href,stage:current,busy:busy,unsupported:unsupported,fields:fields.slice(0,150),actions:actions.slice(0,150),plots:current==='list' && !unsupported?readPlots():undefined,listSearch:current==='list' && !unsupported?readSearch():undefined,plotIdentity:current==='owner' || supported?readPlotIdentity():undefined,heading:clean(nodes('h1,h2,h3,h4')[0] && nodes('h1,h2,h3,h4')[0].textContent),message:errors.concat(success).join(' ').slice(0,2000)};
    if(current==='owner' || supported) { data.plotArea=readPlotArea(); data.remainingArea=remainingArea(); data.governmentLandSignal=governmentLandSignal(); data.cropRows=cropRows(); data.treeRows=sectionRows(true); data.landRows=sectionRows(false); }
    if(current==='list'&&!unsupported)data.listPagination=listPagination();
    var encoded=JSON.stringify(data);
    if(encoded!==last) { last=encoded; revision++; snapshot=Object.assign({type:'snapshot',channel:'lekhpal-feeding-v1',revision:revision},data); post(snapshot); }
  }
  function setValue(el,value) {
    if(el.type==='radio' && value==='false') return;
    if(el.type==='checkbox' || el.type==='radio') {
      if(el.checked!==(value==='true')) el.click();
    } else {
      var descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value');
      if(descriptor && descriptor.set) descriptor.set.call(el,value); else el.value=value;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }
  function command(c) {
    if(!c || !c.id || used[c.id]) return;
    used[c.id]=true;
    if(c.type==='stop') { finish('uncertain','Stopped. Check any pending submission on the portal.'); return; }
    scan();
    function fail(message) { post({type:'result',id:c.id,outcome:'failed',message:message}); }
    if(!snapshot || c.documentId!==docId || c.revision!==revision || c.url!==location.href || location.origin!=='https://ekhasra.up.gov.in') { fail('The page changed. Review the current form again.'); return; }
    if(pending || snapshot.busy || snapshot.unsupported || ['login','other'].indexOf(snapshot.stage)>=0) { fail('The official form is not ready.'); return; }
    if(c.type==='search') {
      var search=snapshot.listSearch && refs[snapshot.listSearch.ref];
      if(snapshot.stage!=='list' || !search || !visible(search) || !validGata(c.query) || search.disabled || search.readOnly) { fail('Open the gata list and its search field first.'); return; }
      setValue(search,c.query); scan(); post({type:'result',id:c.id,outcome:'filled',message:'Gata filter applied. Waiting for the matching result.'}); return;
    }
    if(c.type==='page') {
      var pager=snapshot.listPagination,button=pager&&refs[pager.nextRef];
      if(snapshot.stage!=='list'||!pager||!pager.nextRef||pager.nextRef!==c.actionRef||!visible(button)||button.disabled){fail('The list page changed or has no next page.');return;}
      button.click();post({type:'result',id:c.id,outcome:'clicked',message:'Opened the next gata-list page.'});return;
    }
    if(c.type==='plot') {
      var matches=(snapshot.plots || []).filter(function(plot){return gataKey(plot.gata)===gataKey(c.gata);});
      var plot=matches.length===1 && matches[0], plotButton=plot && refs[plot.ref];
      if(snapshot.stage!=='list' || !plot || plot.ref!==c.plotRef || plot.status!=='available' || !visible(plotButton) || plotButton.disabled) { fail('The exact gata is unavailable or ambiguous. Review the list.'); return; }
      try { plotButton.click(); post({type:'result',id:c.id,outcome:'clicked',message:'Opened gata '+plot.gata}); }
      catch(e) { fail('Could not open this gata. Review the list.'); }
      return;
    }
    if(c.type==='fill') {
      var values=c.values || {}, keys=Object.keys(values);
      if(!keys.length) { fail('No fields selected.'); return; }
      // Validate the entire patch before changing any field.
      for(var i=0;i<keys.length;i++) {
        var field=snapshot.fields.find(function(f){return f.ref===keys[i];}), value=values[keys[i]], el=refs[keys[i]];
        if(!field || !el || !visible(el) || typeof value!=='string' || value.length>2000 || el.disabled || el.readOnly) { fail('A field is no longer available.'); return; }
        if(field.kind==='select' && !field.options.some(function(o){return o.value===value;})) { fail('An option changed. Choose it again.'); return; }
        var areaField=['text','number'].indexOf(field.kind)>=0 && /(?:^|[|\s/_-])area(?:$|[|\s/_-])|क्षेत्रफल|रकबा/i.test(field.key+' '+field.label);
        if((field.kind==='number' || areaField) && value && (!isFinite(Number(value)) || Number(value)<0)) { fail('Invalid area or count.'); return; }
        if((field.kind==='checkbox'||field.kind==='radio') && value!=='true' && value!=='false') { fail('Invalid field choice.'); return; }
      }
      try {
        keys.forEach(function(key){if(!visible(refs[key]))throw new Error('Field changed');setValue(refs[key],values[key]);});
        scan(); post({type:'result',id:c.id,outcome:'filled',message:'Fields filled. Review the official form before saving.'});
      } catch(e) { fail('The form changed while filling. Review the values on the portal.'); }
      return;
    }
    if(c.type==='action') {
      var action=snapshot.actions.find(function(a){return a.ref===c.actionRef;}), button=refs[c.actionRef];
      if(!action || !button || !visible(button) || button.disabled) { fail('The action changed. Review the page again.'); return; }
      if(action.kind==='navigate'&&lockNotices().length===1){var ok=nodes('button.swal2-confirm');if(ok.length===1)ok[0].click();}
      if(action.kind==='save'||action.kind==='lock') {
        pending={id:c.id,url:location.href,kind:action.kind,lockSuccess:lockNotices().map(function(n){return n.key;}),success:notices('.ajs-success.ajs-visible').map(function(n){return n.key;}),errors:notices('.ajs-error.ajs-visible').map(function(n){return n.key;})};
        timeout=setTimeout(function(){finish('uncertain','No new success message was observed. Check the official record before retrying.');},20000);
      }
      try { button.click(); if(action.kind==='navigate') post({type:'result',id:c.id,outcome:'clicked',message:action.label}); }
      catch(e) { if(pending) finish('uncertain','Action interrupted. Check the official record.'); else fail('Could not open the next step.'); }
    }
  }
  function requestEnded(){requests=Math.max(0,requests-1);scan();}
  if(window.fetch){var originalFetch=window.fetch;window.fetch=function(){requests++;scan();return originalFetch.apply(this,arguments).then(function(response){response.clone().arrayBuffer().then(requestEnded,requestEnded);return response;},function(error){requestEnded();throw error;});};}
  if(typeof XMLHttpRequest!=='undefined'){var originalSend=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.send=function(){var xhr=this;requests++;scan();function ended(){xhr.removeEventListener('loadend',ended);requestEnded();}xhr.addEventListener('loadend',ended);try{return originalSend.apply(xhr,arguments);}catch(error){ended();throw error;}};}
  var observer=new MutationObserver(function(){clearTimeout(debounce);debounce=setTimeout(scan,150);});
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,characterData:true});
  var interval=setInterval(scan,1000);
  window.addEventListener('hashchange',scan);
  window.__lekhpalFeeding={scan:scan,command:command,dispose:function(){dead=true;observer.disconnect();clearInterval(interval);clearTimeout(timeout);clearTimeout(debounce);window.removeEventListener('hashchange',scan);delete window.__lekhpalFeeding;}};
  scan();
})(); true;
`;
