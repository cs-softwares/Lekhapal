const fs = require('fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {INDIA_STATE_OPTIONS} = require('../src/data/stateDashboardCatalog.ts');
const {getStatePortals} = require('../src/data/statePortalCatalog.ts');
const {BHULEKH_OPTIONS, BHULEKH_DIRECTORY_OPTIONS, BHULEKH_RELATED_LINKS} = require('../src/data/bhulekhOptions.ts');
const {KHASRA_OPTIONS} = require('../src/data/khasraOptions.ts');
const {getToolById} = require('../src/data/toolCatalog.ts');
const entries = INDIA_STATE_OPTIONS.flatMap(s => getStatePortals(s.code).flatMap(p => p.action.type === 'khasra-menu' ? KHASRA_OPTIONS : p.action.type === 'bhulekh-menu' ? [...BHULEKH_OPTIONS, ...BHULEKH_DIRECTORY_OPTIONS, ...BHULEKH_RELATED_LINKS] : [p]).flatMap(p => {
  const url = p.action.type === 'portal' ? p.action.url : p.action.type === 'tool' ? getToolById(p.action.toolId)?.url : undefined;
  return url ? [{state:s.code,title:p.title.en,url}] : [];
}));
if (process.argv.includes('--list')) {console.log(JSON.stringify(entries,null,2));process.exit(0);}
(async () => {
  const urls = [...new Set(entries.map(e => e.url))];
  const results = [];
  let next = 0;
  await Promise.all(Array.from({length:8},async () => {
    while (next < urls.length) {
      const url = urls[next++];
      try {
        const res = await fetch(url,{signal:AbortSignal.timeout(10000),headers:{'User-Agent':'Mozilla/5.0'}});
        results.push({url,status:res.status,finalUrl:res.url});
        if(res.body) await res.body.cancel();
      } catch(e) {results.push({url,error:e.cause?.code || e.name});}
    }
  }));
  fs.writeFileSync('docs/portal-health-check.json',JSON.stringify({checkedAt:new Date().toISOString(),states:36,entries:entries.length,results},null,2));
  console.log(JSON.stringify({states:36,entries:entries.length,urls:urls.length,responses:results.filter(r=>r.status).length,success:results.filter(r=>r.status>=200&&r.status<400).length,unavailable:results.filter(r=>!r.status||r.status>=400).length}));
})();
