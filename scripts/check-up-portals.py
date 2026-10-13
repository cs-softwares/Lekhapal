"""Check every visible UP entry with the platform TLS trust store; no login or writes."""
import concurrent.futures, json, re, subprocess
from pathlib import Path
entries = json.loads(subprocess.check_output(['node','scripts/audit-state-portals.cjs','--list'], text=True))
entries = [e for e in entries if e['state'] == 'UP']
def check(entry):
    result = subprocess.run(['curl','--silent','--show-error','--location','--max-time','25',entry['url'],'--write-out','\n%{http_code}\t%{url_effective}'], capture_output=True, text=True)
    body, _, status = result.stdout.rpartition('\n')
    title = re.search(r'<title[^>]*>(.*?)</title>', body, re.I|re.S)
    return {**entry, 'status': status, 'title': re.sub(r'\s+',' ',title.group(1)).strip() if title else '', 'error':result.stderr.strip() if result.returncode else None}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(check,entries))
Path('docs/up-portal-health-check.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
for r in results: print(r['title'] or r['url'], r['status'], r['error'] or '')
