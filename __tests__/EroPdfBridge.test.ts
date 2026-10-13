import { ERO_PDF_BRIDGE } from '../src/utils/eroPdfBridge';
const { runInNewContext } = require('vm');
class Element {
  textContent = '';
  hidden = false;
  disabled = false;
  className = '';
  name = '';
  id = '';
  value = '';
  isConnected = true;
  attributes: Record<string, string> = {};
  children: Record<string, Element[]> = {};
  ancestors: Record<string, Element> = {};
  click = jest.fn();
  getAttribute = (key: string) => this.attributes[key] || null;
  getClientRects = () => (this.hidden ? [] : [{}]);
  querySelectorAll = (s: string) => this.children[s] || [];
  closest = (s: string) => this.ancestors[s] || null;
  constructor(text = '') {
    this.textContent = text;
  }
}
function fixture(path = '/suomotoDSE') {
  const messages: any[] = [];
  const selectors: Record<string, Element[]> = {};
  const location = {
    origin: 'https://officials.eci.gov.in',
    href: 'https://officials.eci.gov.in' + path,
  };
  class Anchor {
    href = '';
    download = '';
    click() {}
  }
  const fetch = jest.fn();
  const window: any = {
    ReactNativeWebView: {
      postMessage: (s: string) => messages.push(JSON.parse(s)),
    },
    open: jest.fn(),
    fetch,
    addEventListener: jest.fn(),
  };
  window.top = window;
  window.self = window;
  const document = {
    readyState: 'complete',
    documentElement: {},
    querySelectorAll: (s: string) => selectors[s] || [],
    addEventListener: jest.fn(),
  };
  const controls = ['First', 'Previous', 'Next', 'Last'].map(
    s => new Element(s),
  );
  controls[0].disabled = controls[1].disabled = true;
  selectors['.control-btn'] = controls;
  selectors['button,a,input[type="button"]'] = controls;
  selectors['.fa.fa-eye'] = [1, 2, 3, 4, 5].map(n => {
    const row = new Element(n + ' Record ' + n);
    row.children.td = [new Element(String(n))];
    const e = new Element();
    e.ancestors.tr = row;
    return e;
  });
  selectors.select = [
    Object.assign(new Element(), { name: 'AC', value: '20' }),
  ];
  class Reader {
    result = 'data:application/pdf;base64,JVBERi0xLjc=';
    onload = () => {};
    readyState = 0;
    readAsDataURL() {
      this.onload();
    }
    abort() {}
  }
  runInNewContext(ERO_PDF_BRIDGE, {
    window,
    document,
    location,
    URL,
    HTMLAnchorElement: Anchor,
    FileReader: Reader,
    Blob,
    AbortController,
    MutationObserver: class {
      observe() {}
    },
    setInterval: jest.fn(),
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
  });
  const snapshot = () => messages.filter(m => m.type === 'snapshot').at(-1);
  const command = (type: string, ref: string, extra = {}) => {
    const p = snapshot();
    window.__lekhpalEro.command({
      id: 'command' + messages.length,
      type,
      ref,
      documentId: p.documentId,
      revision: p.revision,
      url: p.url,
      ...extra,
    });
  };
  return {
    window,
    selectors,
    messages,
    snapshot,
    command,
    location,
    controls,
    fetch,
  };
}
test('reference eye controls and pagination expose stable one-based serials; stale/replayed commands do not click', () => {
  const f = fixture();
  const p = f.snapshot();
  expect(p.rows.map((r: any) => r.serial)).toEqual([1, 2, 3, 4, 5]);
  const c = {
    id: 'one',
    type: 'open',
    ref: p.rows[4].ref,
    record: p.rows[4].key,
    documentId: p.documentId,
    revision: p.revision,
    url: p.url,
  };
  f.window.__lekhpalEro.command(c);
  f.window.__lekhpalEro.command(c);
  expect(f.selectors['.fa.fa-eye'][4].click).toHaveBeenCalledTimes(1);
  f.window.__lekhpalEro.command({ ...c, id: 'two', revision: 0 });
  expect(f.selectors['.fa.fa-eye'][4].click).toHaveBeenCalledTimes(1);
});
test('row identity gaps fail closed and pagination selectors do not change list filters', () => {
  const f = fixture();
  f.selectors.select.push(
    Object.assign(new Element(), { name: 'page', value: '2' }),
  );
  f.window.__lekhpalEro.scan();
  expect(f.snapshot().context).toBe('AC=20');
  f.selectors['.fa.fa-eye'][2].ancestors.tr.textContent = '';
  f.window.__lekhpalEro.scan();
  expect(f.snapshot().rows).toEqual([]);
});
test('data PDF is captured once, only while the identified download is armed', async () => {
  const f = fixture('/ero/suomotoDSE/checklist-processing-action/1');
  const pdf = new Element('Download PDF');
  pdf.click.mockImplementation(() =>
    f.window.open('data:application/pdf;base64,JVBERi0xLjc='),
  );
  f.selectors['button,a,input[type="button"]'] = [pdf, new Element('Back')];
  f.window.__lekhpalEro.scan();
  f.command('download', f.snapshot().download);
  await Promise.resolve();
  expect(f.messages.filter(m => m.type === 'pdf')).toHaveLength(1);
  f.window.__lekhpalEro.download('data:application/pdf;base64,JVBERi0xLjc=');
  expect(f.messages.filter(m => m.type === 'pdf')).toHaveLength(1);
  f.window.__lekhpalEro.command({ type: 'stop' });
  f.window.__lekhpalEro.download('data:application/pdf;base64,JVBERi0xLjc=');
  expect(f.messages.filter(m => m.type === 'pdf')).toHaveLength(1);
});
test('HTTP PDF download uses the logged-in session and preserves the byte stream', async () => {
  const f = fixture('/ero/suomotoDSE/checklist-processing-action/1');
  const pdf = new Element('Download PDF');
  f.selectors['button,a,input[type="button"]'] = [pdf];
  f.window.__lekhpalEro.scan();
  f.fetch.mockResolvedValue({
    ok: true,
    headers: { get: () => null },
    blob: async () => new Blob(['%PDF-1.7']),
  });
  f.command('download', f.snapshot().download);
  await f.window.__lekhpalEro.download(
    'https://officials.eci.gov.in/export.pdf',
  );
  expect(f.fetch).toHaveBeenCalledWith(
    'https://officials.eci.gov.in/export.pdf',
    expect.objectContaining({ credentials: 'same-origin', redirect: 'error' }),
  );
  expect(f.messages.at(-1)).toMatchObject({
    type: 'pdf',
    base64: 'JVBERi0xLjc=',
  });
});
test.each([
  'https://evil.test/a.pdf',
  'https://officials.eci.gov.in.evil.test/a.pdf',
  'http://officials.eci.gov.in/a.pdf',
])('rejects external download %s', async url => {
  const f = fixture('/ero/suomotoDSE/checklist-processing-action/1');
  f.selectors['button,a,input[type="button"]'] = [new Element('Download PDF')];
  f.window.__lekhpalEro.scan();
  f.command('download', f.snapshot().download);
  await f.window.__lekhpalEro.download(url);
  expect(f.fetch).not.toHaveBeenCalled();
  expect(f.messages.at(-1)).toMatchObject({ type: 'error' });
});
test('fourth button approval is never mistaken for reference PDF button', () => {
  const f = fixture('/ero/suomotoDSE/checklist-processing-action/1');
  f.selectors.button = [
    new Element('Other'),
    new Element('Back'),
    new Element('Other'),
    new Element('Approve PDF'),
  ];
  f.selectors['button,a,input[type="button"]'] = f.selectors.button;
  f.window.__lekhpalEro.scan();
  expect(f.snapshot().download).toBeUndefined();
});
test('late download after Stop cannot reach the native saver', async () => {
  const f = fixture('/ero/suomotoDSE/checklist-processing-action/1');
  f.selectors['button,a,input[type="button"]'] = [new Element('Download PDF')];
  f.window.__lekhpalEro.scan();
  f.command('download', f.snapshot().download);
  let resolve: any;
  f.fetch.mockImplementation(
    () =>
      new Promise(r => {
        resolve = r;
      }),
  );
  const work = f.window.__lekhpalEro.download(
    'blob:https://officials.eci.gov.in/one',
  );
  f.window.__lekhpalEro.command({ type: 'stop' });
  resolve({
    ok: true,
    headers: { get: () => null },
    blob: async () => new Blob(['%PDF-1.7']),
  });
  await work;
  expect(f.messages.some(m => m.type === 'pdf')).toBe(false);
});
test('current ERO record route takes precedence over its suomotoDSE prefix and targets the first Format A only', () => {
  const f = fixture(
    '/ero/suomotoDSE/checklist-processing-action/S24/20/1/C001/7',
  );
  const first = new Element('Download Format A'),
    second = new Element('Download Format A');
  f.selectors['button,a,input[type="button"]'] = [
    new Element('View Format A'),
    first,
    new Element('Approve'),
    second,
  ];
  f.window.__lekhpalEro.scan();
  expect(f.snapshot().stage).toBe('record');
  f.command('download', f.snapshot().download);
  expect(first.click).toHaveBeenCalledTimes(1);
  expect(second.click).not.toHaveBeenCalled();
});
test('current pagination counter supports legacy rows without a serial column', () => {
  const f = fixture();
  f.selectors[
    '[aria-current="page"],.pagination .active,.pagination .active-page,.control-btn2,.current-page'
  ] = [new Element('2')];
  f.selectors['.fa.fa-eye'].forEach(e => {
    e.ancestors.tr.children.td = [new Element('Record')];
  });
  f.window.__lekhpalEro.scan();
  expect(f.snapshot().rows.map((r: any) => r.serial)).toEqual([6, 7, 8, 9, 10]);
});
test('native SPA reinjection does not invalidate an unchanged observed page revision', () => {
  const f = fixture(
    '/ero/suomotoDSE/checklist-processing-action/S24/20/1/C001/7',
  );
  const download = new Element('Download Format A');
  f.selectors['button,a,input[type="button"]'] = [download];
  f.window.__lekhpalEro.scan();
  const before = f.snapshot();
  f.window.__lekhpalEro.scan(true);
  f.window.__lekhpalEro.scan(true);
  expect(f.snapshot().revision).toBe(before.revision);
  f.window.__lekhpalEro.command({
    id: 'native',
    type: 'download',
    ref: before.download,
    documentId: before.documentId,
    revision: before.revision,
    url: before.url,
  });
  expect(download.click).toHaveBeenCalledTimes(1);
});
