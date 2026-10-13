import { buildRevenueBridge } from '../src/utils/revenueFeedingBridge';
import {
  revenueCommandScript,
  RevenueModule,
  RevenueSnapshot,
} from '../src/domain/revenueFeeding';
const { runInNewContext } = require('vm');

class Element {
  id = '';
  name = '';
  type = 'text';
  tagName = 'INPUT';
  value = '';
  textContent = '';
  readOnly = false;
  disabled = false;
  required = false;
  hidden = false;
  isConnected = true;
  labels: any[] = [];
  options: any[] = [];
  children: Record<string, Element[]> = {};
  attributes: Record<string, string> = {};
  classes: string[] = [];
  dispatchEvent = jest.fn();
  click = jest.fn();
  contains = (n: Element) => n === this;
  getClientRects = () => (this.hidden ? [] : [{}]);
  getAttribute = (name: string) => this.attributes[name] || null;
  closest = (_selector: string): Element | null => null;
  matches = (selector: string) =>
    selector.split(',').some(s => this.classes.includes(s));
  querySelectorAll = (selector: string) => this.children[selector] || [];
  constructor(props: Partial<Element> = {}) {
    Object.assign(this, props);
  }
}
function fixture(
  module: RevenueModule = 'ansh',
  path = '/bhulekh/mutAnshNirdharanInsertRtk',
  origin?: string,
) {
  const fields = [
    new Element({ id: 'area', value: '1.0001' }),
    new Element({ id: 'share', value: '' }),
    new Element({ id: 'hissa', value: '' }),
    new Element({ id: 'password', type: 'password', hidden: true }),
  ];
  const buttons = [
      new Element({ tagName: 'BUTTON', type: 'submit', textContent: 'Submit' }),
    ],
    notices: Element[] = [],
    rows: Element[] = [];
  const selectors: Record<string, Element[]> = {};
  const host =
    origin ||
    (module === 'prapatra5'
      ? 'https://svamitva.up.gov.in'
      : 'https://upbhulekh.gov.in');
  const location = {
    origin: host,
    pathname: new URL(host + path).pathname,
    href: host + path,
  };
  const messages: any[] = [];
  let observer: (mutations: any[]) => void;
  const window: any = {
    ReactNativeWebView: {
      postMessage: (raw: string) => messages.push(JSON.parse(raw)),
    },
  };
  window.top = window;
  window.self = window;
  const body = { innerText: '' };
  const document = {
    body,
    readyState: 'complete',
    documentElement: {},
    getElementById: (id: string) => fields.find(f => f.id === id),
    querySelectorAll: (selector: string) => {
      if (selectors[selector]) return selectors[selector];
      if (selector === 'input,select,textarea') return fields;
      if (selector === 'input[type="password"]')
        return fields.filter(f => f.type === 'password');
      if (selector === 'button[type="submit"]') return buttons;
      if (selector.startsWith('.alert-success')) return notices;
      if (selector === '#ownertab tr') return rows;
      if (selector.startsWith('#'))
        return fields.filter(f => `#${f.id}` === selector);
      return [];
    },
  };
  const env = {
    window,
    document,
    location,
    URL,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    getComputedStyle: () => ({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    }),
    Event: class {
      constructor(public type: string, public init: unknown) {}
    },
    MutationObserver: class {
      constructor(callback: any) {
        observer = callback;
      }
      observe() {}
      disconnect() {}
    },
  };
  runInNewContext(buildRevenueBridge(module), env);
  const scan = () => window.__lekhpalRevenue?.scan();
  const snapshot = (): RevenueSnapshot =>
    messages.filter(m => m.type === 'snapshot').slice(-1)[0];
  const result = () => messages.filter(m => m.type === 'result').slice(-1)[0];
  let id = 0;
  const command = (patch: any) => {
    const s = snapshot();
    runInNewContext(
      revenueCommandScript({
        id: `c${++id}`,
        documentId: s.documentId,
        revision: s.revision,
        url: s.url,
        ...patch,
      }),
      env,
    );
  };
  return {
    fields,
    buttons,
    notices,
    rows,
    selectors,
    location,
    body,
    window,
    messages,
    snapshot,
    result,
    scan,
    command,
    observe: (mutations: any[]) => observer!(mutations),
  };
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('only works in the correct official origin and module routes', () => {
  const wrong = fixture(
    'ansh',
    '/bhulekh/mutAnshNirdharanInsertRtk',
    'https://upbhulekh.gov.in.evil.test',
  );
  expect(wrong.window.__lekhpalRevenue).toBeUndefined();
  expect(fixture('ansh-delete').snapshot().stage).toBe('other');
  expect(fixture('ansh', '/#/selection').snapshot().stage).toBe('other');
});
test('injection exposes only reference fields, leaves official identity read-only and never clicks', () => {
  const f = fixture();
  expect(f.snapshot().stage).toBe('share');
  expect(f.snapshot().fields.map(x => x.key)).toEqual([
    'area',
    'share',
    'hissa',
  ]);
  expect(f.snapshot().fields[0].readOnly).toBe(true);
  expect(f.buttons[0].click).not.toHaveBeenCalled();
  f.command({ type: 'fill', values: { [f.snapshot().fields[0].ref]: '9' } });
  expect(f.result().outcome).toBe('failed');
});
test('fills shares with input/change/keyup, rejects stale commands and does not auto-submit', () => {
  const f = fixture(),
    before = f.snapshot();
  f.command({
    type: 'fill',
    values: { [before.fields[1].ref]: '1/2', [before.fields[2].ref]: '0.5001' },
  });
  expect(f.fields[1].value).toBe('1/2');
  expect(f.fields[1].dispatchEvent.mock.calls.map(c => c[0].type)).toEqual([
    'input',
    'change',
    'keyup',
  ]);
  expect(f.buttons[0].click).not.toHaveBeenCalled();
  f.command({
    type: 'action',
    actionRef: before.actions[0].ref,
    revision: before.revision,
  });
  expect(f.result().outcome).toBe('failed');
  expect(f.buttons[0].click).not.toHaveBeenCalled();
});
test('rejects invalid fractions before modifying another field', () => {
  const f = fixture();
  const s = f.snapshot();
  f.command({
    type: 'fill',
    values: { [s.fields[2].ref]: '2', [s.fields[1].ref]: '2/0' },
  });
  expect(f.fields[2].value).toBe('');
  expect(f.result().outcome).toBe('failed');
});
test('save requires a fresh positive result; duplicate commands and old notices cannot confirm it', () => {
  const f = fixture();
  f.notices.push(new Element({ textContent: 'Saved successfully' }));
  f.scan();
  const actionRef = f.snapshot().actions[0].ref;
  f.command({ type: 'action', id: 'save1', actionRef });
  f.scan();
  expect(f.result()).toBeUndefined();
  f.command({ type: 'action', id: 'save1', actionRef });
  expect(f.buttons[0].click).toHaveBeenCalledTimes(1);
  f.notices.push(new Element({ textContent: 'Not saved successfully' }));
  f.scan();
  expect(f.result()).toBeUndefined();
  f.notices.push(new Element({ textContent: 'Saved successfully' }));
  f.scan();
  expect(f.result().outcome).toBe('confirmed');
});
test('owner save requires a new matching owner-table row, not merely a toast or another owner', () => {
  const f = fixture('prapatra5', '/entryF5/addMoreandnewpage');
  f.fields.push(new Element({ id: 'owner_name', value: 'Ram' }));
  f.selectors['.btn.btn-danger.addRD'] = f.buttons;
  f.scan();
  f.command({
    type: 'action',
    actionRef: f.snapshot().actions.find(a => a.kind === 'owner-save')!.ref,
  });
  f.notices.push(new Element({ textContent: 'Saved successfully' }));
  f.scan();
  expect(f.result()).toBeUndefined();
  const row = (name: string) =>
    new Element({
      tagName: 'TR',
      children: {
        'td,th': [
          new Element(),
          new Element(),
          new Element({ textContent: name }),
        ],
      },
    });
  f.rows.push(row('Shyam'));
  f.scan();
  expect(f.result()).toBeUndefined();
  f.rows.push(row('Ram'));
  f.scan();
  expect(f.result().outcome).toBe('confirmed');
});
test('owner selection waits for the new gata owner list', () => {
  const f = fixture('ansh', '/bhulekh/mutAnshNirdharanRtk');
  f.fields.splice(
    0,
    f.fields.length,
    new Element({
      id: 'gataNumber',
      tagName: 'SELECT',
      value: 'g1',
      options: [{ value: 'g1', textContent: '12' }],
    }),
    new Element({
      id: 'ownerName',
      tagName: 'SELECT',
      value: 'o1',
      options: [{ value: 'o1', textContent: 'Ram' }],
    }),
  );
  f.scan();
  f.command({ type: 'action', actionRef: f.snapshot().actions[0].ref });
  expect(f.buttons[0].click).not.toHaveBeenCalled();
  f.observe([{ type: 'attributes', target: f.fields[1], addedNodes: [] }]);
  f.scan();
  expect(f.snapshot().ownersReady).toBe(false);
  f.observe([{ type: 'childList', target: f.fields[1], addedNodes: [] }]);
  f.scan();
  expect(f.snapshot().ownersReady).toBe(true);
  f.command({ type: 'action', actionRef: f.snapshot().actions[0].ref });
  expect(f.buttons[0].click).toHaveBeenCalledTimes(1);
});
test('delete mode exposes only deletion and timeouts remain uncertain without retry', () => {
  const f = fixture('ansh-delete', '/bhulekh/mutAnshNirdharanDeleteRtk');
  expect(f.snapshot().fields.every(x => x.readOnly)).toBe(true);
  expect(f.snapshot().actions[0].kind).toBe('delete');
  f.command({ type: 'action', actionRef: f.snapshot().actions[0].ref });
  jest.advanceTimersByTime(26000);
  expect(f.result().outcome).toBe('uncertain');
  expect(f.buttons[0].click).toHaveBeenCalledTimes(1);
});
test('property draft, boundaries and final result are distinct stages', () => {
  expect(
    fixture(
      'prapatra5',
      '/entryF5/propertyDetailEntry.jsp?formType=5',
    ).snapshot().stage,
  ).toBe('property');
  expect(fixture('prapatra5', '/entryF5/p5entry.jsp').snapshot().stage).toBe(
    'boundaries',
  );
  const f = fixture('prapatra5', '/entryF5/addremark');
  f.body.innerText = 'Record saved successfully';
  f.scan();
  expect(f.snapshot().result).toBe('saved');
  f.body.innerText = 'Record not saved successfully';
  f.scan();
  expect(f.snapshot().result).toBe('unconfirmed');
});
