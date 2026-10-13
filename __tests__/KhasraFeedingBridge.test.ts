import { KHASRA_FEEDING_BRIDGE } from '../src/utils/khasraFeedingBridge';
import {
  buildFeedingCommand,
  FeedingSnapshot,
} from '../src/domain/khasraFeeding';
const { runInNewContext } = require('vm');

// Minimal DOM fixture: execute the actual injected script with native-style
// setters/events. These tests do not make requests to government services.
class Element {
  tagName = 'INPUT';
  type = 'text';
  name = '';
  id = '';
  textContent = '';
  disabled = false;
  readOnly = false;
  hidden = false;
  isConnected = true;
  visibility = 'visible';
  required = false;
  checked = false;
  autocomplete = '';
  labels: { textContent: string }[] = [];
  options: { value: string; textContent: string; disabled?: boolean }[] = [];
  matches = (_selector: string) => false;
  descendants: Record<string, Element[]> = {};
  querySelectorAll = (selector: string) => this.descendants[selector] || [];
  private current = '';
  get value() {
    return this.current;
  }
  set value(v: string) {
    this.current = v;
  }
  getAttribute = (_key: string) => null;
  getClientRects = () => (this.hidden ? [] : [{}]);
  dispatchEvent = jest.fn();
  click = jest.fn(() => {
    if (this.type === 'checkbox' || this.type === 'radio')
      this.checked = !this.checked;
  });
  constructor(props: Partial<Element>) {
    Object.assign(this, props);
  }
}
function fixture(
  route = 'lekhpalInsertFasal',
  origin = 'https://ekhasra.up.gov.in',
  child = false,
  fetchMock?: (...args: any[]) => Promise<any>,
) {
  const fields = [
    new Element({ name: 'area', type: 'number', value: '1' }),
    new Element({
      name: 'crop',
      tagName: 'SELECT',
      value: 'rice',
      options: [
        { value: 'rice', textContent: 'Rice' },
        { value: 'wheat', textContent: 'Wheat' },
      ],
    }),
    new Element({ name: 'password', type: 'password' }),
    new Element({ name: 'otp', type: 'text' }),
  ];
  const buttons = [
    new Element({ tagName: 'BUTTON', textContent: 'Save' }),
    new Element({ tagName: 'BUTTON', textContent: 'Lock' }),
  ];
  const success: Element[] = [],
    errors: Element[] = [],
    loaders: Element[] = [];
  const messages: any[] = [];
  const tables: Element[] = [],
    dialogs: Element[] = [];
  const location = { origin, hash: `#/${route}`, href: `${origin}/#/${route}` };
  const window: any = {
    fetch: fetchMock,
    ReactNativeWebView: {
      postMessage: (raw: string) => messages.push(JSON.parse(raw)),
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  window.self = window;
  window.top = child ? {} : window;
  const env = {
    window,
    location,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Event: class {
      constructor(public type: string, public init: any) {}
    },
    getComputedStyle: (el: Element) => ({
      display: 'block',
      visibility: el.visibility,
    }),
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    document: {
      documentElement: {},
      body: { innerText: '' },
      querySelectorAll: (selector: string) => {
        if (selector === 'table') return tables;
        if (selector === '.swal2-html-container') return dialogs;
        if (selector === 'input')
          return fields.filter(f => f.tagName === 'INPUT');
        if (selector === 'input,select,textarea') return fields;
        if (selector === 'select.ng-pristine')
          return fields.filter(f => f.matches(selector));
        if (selector === 'button,input[type="submit"],a') return buttons;
        if (selector === '.ajs-success.ajs-visible') return success;
        if (selector === '.ajs-error.ajs-visible') return errors;
        if (selector.includes('#preloader')) return loaders;
        return [];
      },
    },
  };
  runInNewContext(KHASRA_FEEDING_BRIDGE, env);
  const latest = (): FeedingSnapshot =>
    messages.filter(m => m.type === 'snapshot').slice(-1)[0];
  const result = () => messages.filter(m => m.type === 'result').slice(-1)[0];
  let serial = 0;
  const command = (data: any) => {
    const s = latest();
    const c = {
      id: `cmd-${++serial}`,
      documentId: s.documentId,
      revision: s.revision,
      url: s.url,
      ...data,
    };
    runInNewContext(buildFeedingCommand(c), env);
    return c;
  };
  return {
    fields,
    tables,
    dialogs,
    buttons,
    success,
    errors,
    loaders,
    messages,
    location,
    window,
    env,
    latest,
    result,
    command,
  };
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('lock recognizes a new reference-style success dialog without clicking its confirmation', () => {
  const f = fixture('lekhpalInsertRemark');
  const old = new Element({ textContent: 'Gata Locked Success' });
  f.dialogs.push(old);
  f.window.__lekhpalFeeding.scan();
  f.command({
    type: 'action',
    actionRef: f.latest().actions.find(a => a.kind === 'lock')!.ref,
  });
  f.window.__lekhpalFeeding.scan();
  expect(f.result()).toBeUndefined();
  f.success.push(new Element({ textContent: 'Saved' }));
  f.dialogs.push(
    new Element({ textContent: 'Are you sure you want to lock?' }),
  );
  f.window.__lekhpalFeeding.scan();
  expect(f.result()).toBeUndefined();
  const current = new Element({ textContent: 'Gata Locked Success' });
  f.dialogs.push(current);
  f.window.__lekhpalFeeding.scan();
  expect(f.result()).toMatchObject({
    outcome: 'portal-success',
    message: 'Gata Locked Success',
  });
  expect(current.click).not.toHaveBeenCalled();
});
test('a lock dialog cannot confirm an unrelated crop save', () => {
  const f = fixture();
  f.command({
    type: 'action',
    actionRef: f.latest().actions.find(a => a.kind === 'save')!.ref,
  });
  f.dialogs.push(new Element({ textContent: 'Gata Locked Success' }));
  f.window.__lekhpalFeeding.scan();
  expect(f.result()).toBeUndefined();
  jest.advanceTimersByTime(21000);
  expect(f.result().outcome).toBe('uncertain');
});

test('validates area when the portal renders it as a text input', () => {
  const f = fixture();
  f.fields[0].type = 'text';
  f.window.__lekhpalFeeding.scan();
  const field = f.latest().fields.find(x => x.label.includes('Area'))!;
  f.command({ type: 'fill', values: { [field.ref]: '-1' } });
  expect(f.result().outcome).toBe('failed');
  expect(f.fields[0].value).toBe('1');
});

test('installation only reads the form and never exposes credentials or presses controls', () => {
  const f = fixture();
  expect(f.latest().fields.map(x => x.label)).toEqual([
    'क्षेत्रफल / Area',
    'crop',
  ]);
  expect(f.buttons.every(b => b.click.mock.calls.length === 0)).toBe(true);
  expect(f.fields.every(b => b.dispatchEvent.mock.calls.length === 0)).toBe(
    true,
  );
  expect(fixture('SelectLogin').latest().fields).toEqual([]);
  expect(fixture('lekhpalInsertFasal', 'https://example.com').messages).toEqual(
    [],
  );
  expect(fixture('lekhpalInsertFasal', undefined, true).messages).toEqual([]);
});
test.each([
  ['lekhpalGataList', 'list'],
  ['lekhpalOwnerDetails', 'owner'],
  ['lekhpalCroppingPattern', 'land'],
  ['lekhpalInsertFallow', 'fallow'],
  ['lekhpalInsertTree', 'trees'],
  ['lekhpalInsertFasal', 'crop'],
  ['lekhpalInsertRemark', 'remarks'],
  ['SelectLogin', 'login'],
])('recognizes reference workflow %s', (route, stage) => {
  expect(fixture(route).latest().stage).toBe(stage);
});
test('fills live options and emits Angular input/change events without submitting', () => {
  const f = fixture();
  const [area, crop] = f.latest().fields;
  f.command({
    type: 'fill',
    values: { [area.ref]: '0.25', [crop.ref]: 'wheat' },
  });
  expect(f.fields[0].value).toBe('0.25');
  expect(f.fields[1].value).toBe('wheat');
  expect(f.fields[0].dispatchEvent.mock.calls.map(c => c[0].type)).toEqual([
    'input',
    'change',
  ]);
  expect(f.result().outcome).toBe('filled');
  expect(f.buttons[0].click).not.toHaveBeenCalled();
});
test('recognizes the unnamed crop selector used by the reference only when it is unique', () => {
  const f = fixture();
  f.fields[1].name = '';
  f.fields[1].matches = selector => selector === 'select.ng-pristine';
  f.window.__lekhpalFeeding.scan();
  expect(f.latest().fields.find(field => field.kind === 'select')?.label).toBe(
    'फसल / Crop',
  );
  const duplicate = new Element({
    tagName: 'SELECT',
    matches: selector => selector === 'select.ng-pristine',
  });
  f.fields.push(duplicate);
  f.window.__lekhpalFeeding.scan();
  expect(f.latest().fields.some(field => field.label === 'फसल / Crop')).toBe(
    false,
  );
});
test('invalid later fields prevent earlier fields from being written', () => {
  const f = fixture();
  const [area, crop] = f.latest().fields;
  f.command({
    type: 'fill',
    values: { [area.ref]: '0.25', [crop.ref]: 'removed-crop' },
  });
  expect(f.fields[0].value).toBe('1');
  expect(f.result().outcome).toBe('failed');
});
test('stale revisions and documents cannot submit; commands are used only once', () => {
  const f = fixture();
  const actionRef = f.latest().actions[0].ref;
  f.command({ type: 'action', actionRef, revision: 0 });
  f.command({ type: 'action', actionRef, documentId: 'old-document' });
  expect(f.buttons[0].click).not.toHaveBeenCalled();
  const cmd = f.command({ type: 'action', actionRef });
  runInNewContext(buildFeedingCommand(cmd), f.env);
  expect(f.buttons[0].click).toHaveBeenCalledTimes(1);
});
test('an old success toast cannot confirm a new save; a new toast with identical text can', () => {
  const f = fixture();
  f.success.push(new Element({ textContent: 'Saved' }));
  f.window.__lekhpalFeeding.scan();
  f.command({ type: 'action', actionRef: f.latest().actions[0].ref });
  f.window.__lekhpalFeeding.scan();
  expect(f.result()).toBeUndefined();
  f.success.push(new Element({ textContent: 'Saved' }));
  f.window.__lekhpalFeeding.scan();
  expect(f.result().outcome).toBe('portal-success');
});
test.each(['timeout', 'route', 'stop'])(
  '%s records uncertainty and never repeats a submission',
  reason => {
    const f = fixture();
    f.command({ type: 'action', actionRef: f.latest().actions[0].ref });
    if (reason === 'timeout') jest.advanceTimersByTime(21000);
    if (reason === 'route') {
      f.location.href += '/next';
      f.window.__lekhpalFeeding.scan();
    }
    if (reason === 'stop') f.command({ type: 'stop' });
    expect(f.result().outcome).toBe('uncertain');
    expect(f.buttons[0].click).toHaveBeenCalledTimes(1);
  },
);
test('portal errors stop the attempt and disposal cancels observation', () => {
  const f = fixture();
  f.command({ type: 'action', actionRef: f.latest().actions[0].ref });
  f.errors.push(new Element({ textContent: 'Invalid area' }));
  f.window.__lekhpalFeeding.scan();
  expect(f.result()).toMatchObject({
    outcome: 'failed',
    message: 'Invalid area',
  });
  const count = f.messages.length;
  f.window.__lekhpalFeeding.dispose();
  jest.advanceTimersByTime(30000);
  expect(f.messages).toHaveLength(count);
});
test('field text is serialized as data, including script-like strings', () => {
  const f = fixture('lekhpalInsertRemark');
  f.fields[0].type = 'text';
  f.fields[0].name = 'remarks';
  f.window.__lekhpalFeeding.scan();
  const payload = '</script>"; window.compromised = true; //';
  f.command({ type: 'fill', values: { [f.latest().fields[0].ref]: payload } });
  expect(f.fields[0].value).toBe(payload);
  expect(f.window.compromised).toBeUndefined();
});
test('CSS-hidden or detached controls and unrelated block/delete buttons are not actionable', () => {
  const f = fixture();
  f.fields[0].visibility = 'hidden';
  f.fields[1].isConnected = false;
  f.buttons.push(
    new Element({ tagName: 'BUTTON', textContent: 'Block details' }),
    new Element({ tagName: 'BUTTON', textContent: 'Unlock' }),
  );
  f.window.__lekhpalFeeding.scan();
  expect(f.latest().fields).toEqual([]);
  expect(f.latest().actions.map(a => a.label)).toEqual(['Save', 'Lock']);
});

function row(gata: string, state = '') {
  const button = new Element({ tagName: 'BUTTON', textContent: 'Open' });
  const cells = ['1', gata, state].map(
    textContent => new Element({ tagName: 'TD', textContent }),
  );
  return {
    button,
    cells,
    element: new Element({
      tagName: 'TR',
      descendants: { td: cells, '.btn-info': [button] },
    }),
  };
}
function table(rows: ReturnType<typeof row>[], headers = true) {
  return new Element({
    tagName: 'TABLE',
    descendants: {
      th: headers
        ? ['Serial', 'Gata number', 'Status'].map(
            textContent => new Element({ tagName: 'TH', textContent }),
          )
        : [],
      'tbody tr': rows.map(r => r.element),
    },
  });
}
test('reads the reference gata table and opens only an exact available row', () => {
  const f = fixture('lekhpalGataList'),
    a = row('12'),
    b = row('12/1'),
    locked = row('13', 'Locked');
  f.tables.push(table([a, b, locked]));
  f.window.__lekhpalFeeding.scan();
  expect(f.latest().plots?.map(p => [p.gata, p.status])).toEqual([
    ['12', 'available'],
    ['12/1', 'available'],
    ['13', 'locked'],
  ]);
  f.command({ type: 'plot', gata: '12', plotRef: f.latest().plots![1].ref });
  expect(b.button.click).not.toHaveBeenCalled();
  f.command({ type: 'plot', gata: '१२/१', plotRef: f.latest().plots![1].ref });
  expect(b.button.click).toHaveBeenCalledTimes(1);
  expect(a.button.click).not.toHaveBeenCalled();
  f.command({ type: 'plot', gata: '13', plotRef: f.latest().plots![2].ref });
  expect(locked.button.click).not.toHaveBeenCalled();
});
test('reads reference plot details and government-land option pattern without invented defaults', () => {
  const f = fixture('lekhpalCroppingPattern');
  const cells = ['Gata', '12/1', 'Area', '0.025'].map(
    textContent => new Element({ tagName: 'TD', textContent }),
  );
  f.tables.push(new Element({ tagName: 'TABLE', descendants: { td: cells } }));
  const land = new Element({
    tagName: 'SELECT',
    name: 'agriculturalType',
    options: Array.from({ length: 7 }, (_, i) => ({
      value: String(i),
      textContent: String(i),
    })),
  });
  f.fields.push(land);
  f.window.__lekhpalFeeding.scan();
  expect(f.latest()).toMatchObject({
    plotIdentity: '12/1',
    plotArea: '0.025',
    governmentLandSignal: true,
  });
  land.options = land.options.slice(0, 4);
  cells[3].textContent = 'unknown';
  f.window.__lekhpalFeeding.scan();
  expect(f.latest().governmentLandSignal).toBe(false);
  expect(f.latest().plotArea).toBeUndefined();
});
test('remaining area requires one explicitly labelled read-only control', () => {
  const f = fixture();
  f.fields.push(
    new Element({
      readOnly: true,
      value: '0.2',
      labels: [{ textContent: 'Remaining area' }],
    }),
  );
  f.window.__lekhpalFeeding.scan();
  expect(f.latest().remainingArea).toBe('0.2');
  f.fields.push(
    new Element({
      disabled: true,
      value: '0.3',
      labels: [{ textContent: 'Remaining area' }],
    }),
  );
  f.window.__lekhpalFeeding.scan();
  expect(f.latest().remainingArea).toBeUndefined();
});
test('uses the reference second-cell fallback only for a table without headers and rejects duplicate gatas', () => {
  const f = fixture('lekhpalGataList'),
    a = row('15'),
    b = row('15');
  f.tables.push(table([a, b], false));
  f.window.__lekhpalFeeding.scan();
  expect(f.latest().plots).toHaveLength(2);
  f.command({ type: 'plot', gata: '15', plotRef: f.latest().plots![0].ref });
  expect(a.button.click).not.toHaveBeenCalled();
  expect(f.result().outcome).toBe('failed');
});
test('search writes only the gata filter, emits events and never opens the first fuzzy match', () => {
  const f = fixture('lekhpalGataList');
  f.fields[0].name = 'gata';
  f.fields[0].type = 'text';
  const first = row('12/1');
  f.tables.push(table([first]));
  f.window.__lekhpalFeeding.scan();
  f.command({ type: 'search', query: '12' });
  expect(f.fields[0].value).toBe('12');
  expect(f.fields[0].dispatchEvent.mock.calls.map(c => c[0].type)).toEqual([
    'input',
    'change',
  ]);
  expect(first.button.click).not.toHaveBeenCalled();
  expect(f.latest().listSearch?.value).toBe('12');
});
test('row reordering or changed gata content invalidates a previously prepared plot command', () => {
  const f = fixture('lekhpalGataList'),
    a = row('12');
  f.tables.push(table([a]));
  f.window.__lekhpalFeeding.scan();
  const old = f.latest();
  a.cells[1].textContent = '13';
  f.command({
    type: 'plot',
    gata: '12',
    plotRef: old.plots![0].ref,
    revision: old.revision,
  });
  expect(a.button.click).not.toHaveBeenCalled();
  expect(f.result().outcome).toBe('failed');
});

test('reads complete labelled crop tables for recovery and refuses ambiguous irrigation', () => {
  const f = fixture();
  const headers = ['फसल', 'क्षेत्रफल', 'सिंचित'].map(
    textContent => new Element({ tagName: 'TH', textContent }),
  );
  const cells = ['Rice', '०.६०००', 'हाँ'].map(
    textContent => new Element({ tagName: 'TD', textContent }),
  );
  f.tables.push(
    new Element({
      tagName: 'TABLE',
      descendants: {
        'thead th': headers,
        'tbody tr': [
          new Element({ tagName: 'TR', descendants: { td: cells } }),
        ],
      },
    }),
  );
  f.env.window.__lekhpalFeeding.scan();
  expect(f.latest().cropRows).toEqual([
    { crop: 'Rice', area: '0.6000', irrigated: true },
  ]);
  cells[2].textContent = 'Unknown';
  f.env.window.__lekhpalFeeding.scan();
  expect(f.latest().cropRows).toBeUndefined();
});

test('network work keeps the feeding bridge busy until the response body finishes', async () => {
  let finish!: () => void;
  const body = new Promise<void>(resolve => {
    finish = resolve;
  });
  const f = fixture(
    'lekhpalGataList',
    'https://ekhasra.up.gov.in',
    false,
    async () => ({ clone: () => ({ arrayBuffer: () => body }) }),
  );
  await f.window.fetch('/official-list');
  expect(f.latest().busy).toBe(true);
  finish();
  await Promise.resolve();
  expect(f.latest().busy).toBe(false);
});

test('identifies tree counts and ties each save to its own official form', () => {
  const f = fixture('lekhpalInsertTree');
  const treeForm = new Element({ tagName: 'FORM' });
  const otherForm = new Element({ tagName: 'FORM' });
  const type = new Element({
    name: 'vrikshType1',
    tagName: 'SELECT',
    value: '1',
    options: [
      { value: '1', textContent: 'फलदार' },
      { value: '2', textContent: 'अन्य' },
    ],
  });
  const count = new Element({ name: 'treeCount', type: 'number', value: '0' });
  Object.assign(type, { form: treeForm });
  Object.assign(count, { form: treeForm });
  f.fields.splice(0, f.fields.length, type, count);
  const correct = new Element({
    tagName: 'BUTTON',
    textContent: 'प्रविष्टि करें',
  });
  const unrelated = new Element({ tagName: 'BUTTON', textContent: 'Save' });
  Object.assign(correct, { form: treeForm });
  Object.assign(unrelated, { form: otherForm });
  f.buttons.splice(0, f.buttons.length, correct, unrelated);
  const recordTable = new Element({ tagName: 'TABLE' });
  const recordRow = new Element({ tagName: 'TR' });
  recordRow.descendants.td = [
    new Element({ textContent: 'फलदार' }),
    new Element({ textContent: '०' }),
  ];
  recordTable.descendants['thead th'] = [
    new Element({ textContent: 'वृक्ष का प्रकार' }),
    new Element({ textContent: 'वृक्षों की संख्या' }),
  ];
  recordTable.descendants['tbody tr'] = [recordRow];
  f.tables.push(recordTable);
  f.window.__lekhpalFeeding.scan();
  const snapshot = f.latest();
  expect(snapshot.treeRows).toEqual([{ type: 'फलदार', count: '0' }]);
  const save = snapshot.actions.filter(
    a => a.formRef === snapshot.fields[0].formRef,
  );
  expect(save).toHaveLength(1);
  f.command({ type: 'action', actionRef: save[0].ref });
  expect(correct.click).toHaveBeenCalledTimes(1);
  expect(unrelated.click).not.toHaveBeenCalled();
});

test('reads labelled fallow areas but rejects malformed or duplicate record tables', () => {
  const f = fixture('lekhpalInsertFallow');
  const recordTable = new Element({ tagName: 'TABLE' });
  const recordRow = new Element({ tagName: 'TR' });
  const amount = new Element({ textContent: '१.२५' });
  recordRow.descendants.td = [amount];
  recordTable.descendants['thead th'] = [
    new Element({ textContent: 'क्षेत्रफल' }),
  ];
  recordTable.descendants['tbody tr'] = [recordRow];
  f.tables.push(recordTable);
  f.window.__lekhpalFeeding.scan();
  expect(f.latest().landRows).toEqual([{ type: '', area: '1.25' }]);
  amount.textContent = 'unknown';
  f.window.__lekhpalFeeding.scan();
  expect(f.latest().landRows).toBeUndefined();
  amount.textContent = '0';
  f.tables.push(recordTable);
  f.window.__lekhpalFeeding.scan();
  expect(f.latest().landRows).toBeUndefined();
});

test('a mode change is filled alone and newly revealed fields get a new revision', () => {
  const f = fixture('lekhpalInsertFallow');
  const mode = new Element({ id: 'option2', type: 'radio', checked: false });
  f.fields.splice(0, f.fields.length, mode);
  mode.click.mockImplementation(() => {
    mode.checked = true;
    f.fields.push(new Element({ name: 'area', type: 'number', value: '' }));
  });
  f.window.__lekhpalFeeding.scan();
  const before = f.latest();
  f.command({ type: 'fill', values: { [before.fields[0].ref]: 'true' } });
  expect(f.result().outcome).toBe('filled');
  expect(f.latest().revision).toBeGreaterThan(before.revision);
  expect(f.latest().fields).toHaveLength(2);
  f.command({
    type: 'fill',
    revision: before.revision,
    values: { [f.latest().fields[1].ref]: '0' },
  });
  expect(f.result().outcome).toBe('failed');
  expect(f.buttons[0].click).not.toHaveBeenCalled();
});
