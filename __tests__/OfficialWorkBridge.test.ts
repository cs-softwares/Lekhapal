import { officialWorkBridge } from '../src/utils/officialWorkBridge';
import { inspectorRange, OfficialWorkModule } from '../src/domain/officialWork';
const { runInNewContext } = require('vm');
class Node {
  id = '';
  name = '';
  value = '';
  textContent = '';
  type = 'text';
  tagName = 'INPUT';
  disabled = false;
  readOnly = false;
  hidden = false;
  checked = false;
  isConnected = true;
  options: any[] = [];
  labels: any[] = [];
  min = '';
  max = '';
  getClientRects = () => (this.hidden ? [] : [{}]);
  getAttribute = (_name: string) => null;
  matches = (_selector: string) => false;
  closest = (_selector: string) => ({});
  querySelectorAll = (_selector: string): Node[] => [];
  dispatchEvent = jest.fn();
  click = jest.fn(() => {
    this.checked = !this.checked;
  });
  constructor(props: Partial<Node> = {}) {
    Object.assign(this, props);
  }
}
function setup(
  module: OfficialWorkModule,
  path: string,
  selectors: Record<string, Node[]> = {},
) {
  const host =
    module === 'registry'
      ? 'upfr.agristack.gov.in'
      : module === 'inspector'
      ? 'ekhasra.up.gov.in'
      : module === 'census'
      ? 'agcensus.gov.in'
      : 'svamitva.up.gov.in';
  const url = `https://${host}${path}`,
    messages: any[] = [];
  const window: any = {
    ReactNativeWebView: {
      postMessage: (raw: string) => messages.push(JSON.parse(raw)),
    },
  };
  window.top = window;
  window.self = window;
  runInNewContext(officialWorkBridge(module), {
    window,
    document: {
      readyState: 'complete',
      documentElement: {},
      querySelectorAll: (s: string) => selectors[s] || [],
    },
    location: { origin: `https://${host}`, href: url },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    Event: class {},
    MouseEvent: class {},
    setInterval: jest.fn(),
    setTimeout,
    clearTimeout,
    clearInterval,
    URL,
  });
  const scan = () => {
    window.__lekhpalOfficialWork.scan();
    return messages.filter(m => m.type === 'snapshot').pop();
  };
  let id = 0;
  const send = (command: object, override: object = {}) => {
    const p = scan();
    window.__lekhpalOfficialWork.command({
      id: String(++id),
      documentId: p.documentId,
      revision: p.revision,
      url,
      ...command,
      ...override,
    });
    return messages[messages.length - 1];
  };
  return { scan, send, messages, window };
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('Survey-9 discovers the reference save control and requires fresh positive confirmation', () => {
  const save = new Node({ id: 'sbt', value: 'सुरक्षित', type: 'submit' });
  const notices: Node[] = [new Node({ textContent: 'Saved successfully' })];
  const f = setup('survey9', '/entry/form9.jsp', {
    'input#sbt': [save],
    '.alert-success,.alert-danger,.ajs-success.ajs-visible,.ajs-error.ajs-visible,.swal2-html-container,.swal2-title,.toast-success,.toast-error,[role="alert"]':
      notices,
  });
  const page = f.scan();
  expect(page.stage).toBe('entry');
  expect(page.actions).toHaveLength(1);
  f.send({ type: 'action', ref: page.actions[0].ref });
  expect(save.click).toHaveBeenCalledTimes(1);
  f.scan();
  expect(
    f.messages.some(m => m.type === 'result' && m.state === 'confirmed'),
  ).toBe(false);
  notices.push(new Node({ textContent: 'Record saved successfully' }));
  f.scan();
  expect(f.messages).toContainEqual(
    expect.objectContaining({ type: 'result', state: 'confirmed' }),
  );
});
test('stale revisions cannot click an approval control', () => {
  const save = new Node({ id: 'sbt', value: 'Save', type: 'submit' });
  const f = setup('survey9', '/entry/form9.jsp', { 'input#sbt': [save] });
  expect(
    f.send({ type: 'action', ref: f.scan().actions[0].ref }, { revision: -1 })
      .state,
  ).toBe('failed');
  expect(save.click).not.toHaveBeenCalled();
});
test('census excludes credentials, separates radio choices, and validates a whole patch before changing a field', () => {
  const serial = new Node({ id: 'sr_no', value: '1' }),
    gender1 = new Node({ name: 'sex', type: 'radio', value: '1' }),
    gender2 = new Node({ name: 'sex', type: 'radio', value: '2' }),
    area = new Node({ id: 'area1', type: 'number', value: '2', min: '0' }),
    password = new Node({ id: 'password', type: 'password', hidden: true });
  const f = setup('census', '/AgriCensus/L1_L2_Entry.jsp', {
    'input,select,textarea': [serial, gender1, gender2, area, password],
    '#sr_no': [serial],
  });
  const p = f.scan();
  expect(p.fields.map((v: any) => v.key)).toEqual([
    'sr_no',
    'sex|1',
    'sex|2',
    'area1',
  ]);
  expect(
    f.send({
      type: 'fill',
      values: { [p.fields[0].ref]: '2', [p.fields[3].ref]: 'NaN' },
    }).state,
  ).toBe('failed');
  expect(serial.value).toBe('1');
  expect(area.value).toBe('2');
});
test('Inspector range selects only requested rows and clears prior selections outside the range', () => {
  const rows = ['A', 'B', 'C'].map(
    value => new Node({ type: 'checkbox', name: 'gata', value }),
  );
  rows[0].checked = true;
  const lock = new Node({ name: 'ri_lock', type: 'submit', value: 'Lock' });
  const f = setup('inspector', '/#/inspector', {
    'input,select,textarea': rows,
    '[name="ri_lock"],.table-container input[type="checkbox"]': [lock, ...rows],
    '[name="ri_lock"]': [lock],
  });
  const p = f.scan(),
    plan = inspectorRange(p, 2, 3);
  expect(plan).toEqual({
    'approval:A': 'false',
    'approval:B': 'true',
    'approval:C': 'true',
  });
  f.send({
    type: 'fill',
    values: Object.fromEntries(p.fields.map((v: any) => [v.ref, plan[v.key]])),
  });
  expect(rows.map(r => r.checked)).toEqual([false, true, true]);
  expect(lock.click).not.toHaveBeenCalled();
  expect(() => inspectorRange(p, 1, 4)).toThrow('range');
});
test('Farmer Registry reads name-match score and discovers the reference approval button', () => {
  const approve = new Node({ tagName: 'BUTTON', textContent: 'Update' });
  const f = setup('registry', '/farmer-registry-up/#/approval', {
    '.updateApproval': [new Node()],
    '.gree_btn': [approve],
    '.nameMAtch': [new Node({ textContent: 'Name match score: 100%' })],
  });
  expect(f.scan()).toMatchObject({ stage: 'entry', nameMatch: 100 });
  expect(f.scan().actions).toEqual([
    expect.objectContaining({ kind: 'approve', label: 'Update' }),
  ]);
  expect(approve.click).not.toHaveBeenCalled();
});
test('a negative success message never completes an official write; timeout remains uncertain', () => {
  const save = new Node({ id: 'sbt', value: 'Save', type: 'submit' }),
    notices: Node[] = [];
  const f = setup('survey9', '/entry/form9.jsp', {
    'input#sbt': [save],
    '.alert-success,.alert-danger,.ajs-success.ajs-visible,.ajs-error.ajs-visible,.swal2-html-container,.swal2-title,.toast-success,.toast-error,[role="alert"]':
      notices,
  });
  f.send({ type: 'action', ref: f.scan().actions[0].ref });
  notices.push(new Node({ textContent: 'Not saved successfully' }));
  f.scan();
  jest.advanceTimersByTime(25000);
  expect(f.messages.filter(m => m.type === 'result')).toEqual([
    expect.objectContaining({ state: 'uncertain' }),
  ]);
});

test('Phase 2 reads operated area even when readonly and discovers the named Save control', () => {
  const area = new Node({ name: 'area_opr', value: '1.2500', readOnly: true });
  const crops = new Node({ name: 'tot_crops', value: '1' });
  const save = new Node({ name: 'Save', type: 'button', value: 'Save' });
  const f = setup('census', '/AgriCensus/Schedule_H.jsp', {
    '[name="area_opr"]': [area],
    'input,select,textarea': [area, crops],
    '#Save,[name="Save"]': [save],
  });
  expect(f.scan()).toMatchObject({
    stage: 'entry',
    censusOperatedArea: '1.2500',
    fields: [{ key: 'tot_crops', label: 'Number of crops / फसलों की संख्या' }],
    actions: [{ kind: 'save' }],
  });
});

test('Census batch confirms each new save dialog once and requires a fresh success title', () => {
  const serial = new Node({ name: 'sr_no', value: '2' });
  const save = new Node({ name: 'Save', type: 'button' });
  const dialogs: Node[] = [],
    notices: Node[] = [];
  const f = setup('census', '/AgriCensus/Schedule_H.jsp', {
    '[name="sr_no"],#sr_no': [serial],
    '#Save,[name="Save"]': [save],
    '.swal2-popup': dialogs,
    '.alert-success,.alert-danger,.ajs-success.ajs-visible,.ajs-error.ajs-visible,.swal2-html-container,.swal2-title,.toast-success,.toast-error,[role="alert"]':
      notices,
  });
  f.send({
    type: 'action',
    ref: f.scan().actions[0].ref,
    confirmDialogs: true,
  });
  const confirm = new Node({ tagName: 'BUTTON', textContent: 'OK' });
  const dialog = new Node({
    textContent: 'Confirm save?',
    querySelectorAll: s => (s === '.swal2-confirm' ? [confirm] : []),
  });
  dialogs.push(dialog);
  f.scan();
  f.scan();
  expect(confirm.click).toHaveBeenCalledTimes(1);
  expect(f.messages.filter(m => m.type === 'result')).toEqual([]);
  dialog.textContent = 'Saved successfully';
  notices.push(new Node({ textContent: 'Saved successfully' }));
  f.scan();
  f.scan();
  expect(confirm.click).toHaveBeenCalledTimes(2);
  expect(f.messages.filter(m => m.type === 'result')).toEqual([
    expect.objectContaining({ state: 'confirmed' }),
  ]);
  expect(save.click).toHaveBeenCalledTimes(1);
});

test('Census cannot confirm a dialog after the holding changes or when automation was not enabled', () => {
  for (const changed of [true, false]) {
    const serial = new Node({ name: 'sr_no', value: '2' });
    const save = new Node({ name: 'Save', type: 'button' }),
      confirm = new Node({ textContent: 'OK' });
    const dialogs: Node[] = [];
    const f = setup('census', '/AgriCensus/Schedule_H.jsp', {
      '[name="sr_no"],#sr_no': [serial],
      '#Save,[name="Save"]': [save],
      '.swal2-popup': dialogs,
    });
    f.send({
      type: 'action',
      ref: f.scan().actions[0].ref,
      confirmDialogs: changed,
    });
    if (changed) serial.value = '3';
    dialogs.push(
      new Node({
        textContent: 'Confirm save?',
        querySelectorAll: s => (s === '.swal2-confirm' ? [confirm] : []),
      }),
    );
    f.scan();
    expect(confirm.click).not.toHaveBeenCalled();
    if (changed)
      expect(f.messages.filter(m => m.type === 'result')).toEqual([
        expect.objectContaining({ state: 'uncertain' }),
      ]);
    f.window.__lekhpalOfficialWork.dispose();
  }
});
