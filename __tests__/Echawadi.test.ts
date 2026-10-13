import { ECHAWADI_BRIDGE } from '../src/utils/echawadiBridge';
import {
  demandThreshold,
  receiptAccounts,
  form8bHtml,
  echawadiMode,
  echawadiUrl,
} from '../src/domain/echawadi';
const { runInNewContext } = require('vm');
function fixture(
  host = 'echawadi.mahabhumi.gov.in',
  extra: Record<string, any[]> = {},
) {
  const messages: any[] = [];
  const check = (checked: boolean) => ({
    checked,
    disabled: false,
    getClientRects: () => [{}],
    click: jest.fn(function (this: any) {
      this.checked = !this.checked;
    }),
  });
  const checks = [check(true), check(false)];
  const node = (textContent: string) => ({
    textContent,
    getClientRects: () => [{}],
  });
  let currentPage = 1;
  let rows = checks.map((c, i) => ({
    getClientRects: () => [{}],
    getAttribute: () => String(i),
    querySelectorAll: (s: string) =>
      s === 'td'
        ? [node(String(i)), node(i ? '₹ १,५००.५०' : '50')]
        : s === 'input[type="checkbox"]'
        ? [c]
        : [],
  }));
  const table = {
    getClientRects: () => [{}],
    querySelectorAll: (s: string) =>
      s === 'thead th' ? [node('Account'), node('Amount')] : rows,
  };
  const next = {
    getClientRects: () => [{}],
    getAttribute: () => null,
    classList: { contains: () => false },
    click: jest.fn(() => {
      currentPage++;
    }),
  };
  const selectors = (s: string) =>
    extra[s] ||
    (s === '.ant-table table'
      ? [table]
      : s === '.ant-pagination-item-active'
      ? [node(String(currentPage))]
      : s === '.ant-pagination-next'
      ? [next]
      : []);
  const window: any = {
    ReactNativeWebView: {
      postMessage: (raw: string) => messages.push(JSON.parse(raw)),
    },
    addEventListener: () => {},
  };
  window.self = window;
  window.top = window;
  const location = {
    origin: 'https://' + host,
    hash: '#/generate-revenue/demandGeneration',
    href: 'https://' + host + '/#/generate-revenue/demandGeneration',
  };
  runInNewContext(ECHAWADI_BRIDGE, {
    window,
    location,
    document: {
      readyState: 'complete',
      documentElement: {},
      querySelectorAll: selectors,
      addEventListener: () => {},
    },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
    MutationObserver: class {
      observe() {}
    },
    setInterval: () => {},
    setTimeout: () => {},
    clearTimeout: () => {},
    Event: class {},
  });
  const latest = () => messages.filter(m => m.type === 'snapshot').at(-1);
  const command = (action: string, value?: any) =>
    window.__lekhpalEchawadi.command({ ...latest(), action, value });
  return {
    window,
    messages,
    latest,
    command,
    checks,
    next,
    location,
    clearRows: () => {
      rows = [];
    },
    setPage: (
      page: number,
      values: { key: string; amount: string; checked: boolean }[],
    ) => {
      currentPage = page;
      rows = values.map(value => {
        const c = check(value.checked);
        return {
          getClientRects: () => [{}],
          getAttribute: () => value.key,
          querySelectorAll: (s: string) =>
            s === 'td'
              ? [node(value.key), node(value.amount)]
              : s === 'input[type="checkbox"]'
              ? [c]
              : [],
        };
      });
      window.__lekhpalEchawadi.scan();
    },
  };
}

test('demand batch retains its cross-page manifest, confirms once, and waits for fresh success', () => {
  const node = (textContent: string): any => ({
    textContent,
    getClientRects: () => [{}],
    getAttribute: () => null,
    closest: () => null,
  });
  const submit = { ...node('Generate demand'), click: jest.fn() },
    confirm = { ...node('Confirm'), click: jest.fn() };
  const dialogs: any[] = [],
    notices: any[] = [];
  const f = fixture('echawadi.mahabhumi.gov.in', {
    button: [submit],
    '.ant-select-selection-item,select option:checked': [node('Village 1')],
    '.ant-modal-confirm,.ant-popover-inner-content': dialogs,
    '.ant-message-success,.ant-message-error,.ant-notification-notice-success,.ant-notification-notice-error,[role="alert"]':
      notices,
  });
  f.command('select', 100);
  f.setPage(2, [{ key: 'account-3', amount: '300', checked: false }]);
  f.command('select', 100);
  f.setPage(3, [{ key: 'account-4', amount: '20', checked: false }]);
  f.command('select', 100);
  const demand = [
    { page: 1, key: '1', amount: 1500.5 },
    { page: 2, key: 'account-3', amount: 300 },
  ];
  expect(f.latest().selectedDemand).toEqual(demand);
  f.command('submit', {
    id: 'batch',
    context: 'Village 1',
    demand,
    confirmDemand: true,
  });
  expect(submit.click).toHaveBeenCalledTimes(1);
  dialogs.push({
    ...node('Generate demand for selected: 2 accounts?'),
    querySelectorAll: () => [confirm],
  });
  f.window.__lekhpalEchawadi.scan();
  f.window.__lekhpalEchawadi.scan();
  expect(confirm.click).toHaveBeenCalledTimes(1);
  expect(f.messages.filter(m => m.type === 'transaction')).toEqual([]);
  notices.push(node('Demand generated successfully'));
  f.window.__lekhpalEchawadi.scan();
  expect(f.messages.filter(m => m.type === 'transaction')).toEqual([
    expect.objectContaining({ id: 'batch', state: 'confirmed' }),
  ]);
});

test('demand batch refuses duplicated identities or a changed reviewed manifest', () => {
  const node = (textContent: string): any => ({
    textContent,
    getClientRects: () => [{}],
    getAttribute: () => null,
    closest: () => null,
  });
  const submit = { ...node('Generate demand'), click: jest.fn() };
  const f = fixture('echawadi.mahabhumi.gov.in', {
    button: [submit],
    '.ant-select-selection-item,select option:checked': [node('Village 1')],
  });
  f.command('select', 100);
  f.setPage(2, [{ key: '1', amount: '300', checked: false }]);
  f.command('select', 100);
  f.command('submit', {
    id: 'duplicate',
    context: 'Village 1',
    demand: f.latest().selectedDemand,
    confirmDemand: true,
  });
  expect(submit.click).not.toHaveBeenCalled();
  expect(f.messages.at(-1)).toMatchObject({ type: 'error' });
  f.setPage(2, [{ key: 'unique', amount: '300', checked: false }]);
  f.command('select', 100);
  f.command('submit', {
    id: 'changed',
    context: 'Village 1',
    demand: [{ page: 1, key: '1', amount: 999 }],
    confirmDemand: true,
  });
  expect(submit.click).not.toHaveBeenCalled();
});
test('demand threshold selects by the labelled amount, supports Marathi digits, and remains idempotent', () => {
  const f = fixture();
  expect(f.latest().rows[1].amount).toBe(1500.5);
  f.command('select', 100);
  expect(f.checks.map(c => c.checked)).toEqual([false, true]);
  f.command('select', 100);
  expect(f.checks.map(c => c.click.mock.calls.length)).toEqual([1, 1]);
  expect(f.next.click).not.toHaveBeenCalled();
});
test('stale commands and non-Maharashtra pages cannot modify rows', () => {
  const f = fixture();
  const old = f.latest();
  f.command('next');
  f.window.__lekhpalEchawadi.scan();
  f.window.__lekhpalEchawadi.command({ ...old, action: 'select', value: 100 });
  expect(f.checks[0].click).not.toHaveBeenCalled();
  expect(f.messages.at(-1).type).toBe('error');
  expect(fixture('upbhulekh.gov.in').window.__lekhpalEchawadi).toBeUndefined();
});
test('invalid thresholds and empty reports fail without toggling anything', () => {
  expect(() => demandThreshold('-1')).toThrow();
  expect(() => demandThreshold('1e3')).toThrow();
  expect(() => demandThreshold('1.234')).toThrow();
  expect(demandThreshold('100.25')).toBe(100.25);
  const f = fixture();
  f.clearRows();
  f.command('select', 100);
  expect(f.checks[0].click).not.toHaveBeenCalled();
  expect(f.messages.at(-1).type).toBe('error');
});
test('account queue preserves account numbers, removes duplicates and rejects executable strings', () => {
  expect(receiptAccounts('001\n002/1\n001')).toEqual(['001', '002/1']);
  expect(() => receiptAccounts("1');alert(1)")).toThrow();
  expect(echawadiMode(echawadiUrl('form8b'))).toBe('form8b');
  expect(
    echawadiMode('https://upbhulekh.gov.in/#/reports/Form8B'),
  ).toBeUndefined();
});
test('Form 8B exports visible data with escaped values and cannot label a demand table as Form 8B', () => {
  const f = fixture();
  expect(() => form8bHtml([f.latest()])).toThrow();
  const page = {
    ...f.latest(),
    mode: 'form8b',
    context: '<script>alert(1)</script>',
  };
  const html = form8bHtml([page]);
  expect(html).toContain('₹ १,५००.५०');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
});

test('demand submission requires matching village and a fresh official success notice', () => {
  const node = (textContent: string): any => ({
    textContent,
    getClientRects: () => [{}],
    getAttribute: () => null,
    closest: () => null,
  });
  const submit = { ...node('Generate demand'), click: jest.fn() };
  const notices = [node('Saved successfully')];
  const f = fixture('echawadi.mahabhumi.gov.in', {
    button: [submit],
    '.ant-select-selection-item,select option:checked': [node('Village 1')],
    '.ant-message-success,.ant-message-error,.ant-notification-notice-success,.ant-notification-notice-error,[role="alert"]':
      notices,
  });
  f.command('submit', {
    id: 'bad',
    context: 'Village 2',
    account: '',
    amount: null,
  });
  expect(submit.click).not.toHaveBeenCalled();
  f.window.__lekhpalEchawadi.scan();
  // Revision-bound duplicate commands cannot be replayed; start a fresh snapshot.
  f.command('select', 10);
  f.command('submit', {
    id: 'valid',
    context: 'Village 1',
    account: '',
    amount: null,
  });
  expect(submit.click).toHaveBeenCalledTimes(1);
  f.window.__lekhpalEchawadi.scan();
  expect(f.messages.some(m => m.type === 'transaction')).toBe(false);
  notices.push(node('Demand saved successfully'));
  f.window.__lekhpalEchawadi.scan();
  expect(f.messages.filter(m => m.type === 'transaction').at(-1)).toMatchObject(
    { type: 'transaction', id: 'valid', state: 'confirmed' },
  );
});
test('payment submission rejects a different account, amount, and unnamed payment mode', () => {
  const node = (textContent: string): any => ({
    textContent,
    getClientRects: () => [{}],
    getAttribute: () => null,
    closest: () => null,
  });
  const submit = { ...node('Save'), click: jest.fn() };
  const method = {
    ...node(''),
    tagName: 'SELECT',
    selectedOptions: [node('Cash')],
    value: 'C',
  };
  const f = fixture('echawadi.mahabhumi.gov.in', {
    button: [submit],
    '#register_khataNo': [{ ...node(''), value: '001' }],
    '#register_ModeOfPayment': [method],
    'input[id^="register_"]': [
      { ...node(''), value: '100', labels: [node('Amount')] },
    ],
    '.ant-select-selection-item,select option:checked': [node('Village 1')],
  });
  f.location.hash = '#/transactions/receive-money';
  f.location.href = echawadiUrl('receipts');
  f.window.__lekhpalEchawadi.scan();
  f.command('submit', {
    id: 'wrong',
    context: 'Village 1',
    account: '002',
    amount: 100,
  });
  expect(submit.click).not.toHaveBeenCalled();
  expect(f.messages.at(-1).type).toBe('error');
  method.selectedOptions[0].textContent = 'C';
  f.window.__lekhpalEchawadi.scan();
  f.command('submit', {
    id: 'mode',
    context: 'Village 1',
    account: '001',
    amount: 100,
  });
  expect(submit.click).not.toHaveBeenCalled();
  method.selectedOptions[0].textContent = 'Cash';
  f.window.__lekhpalEchawadi.scan();
  f.command('submit', {
    id: 'amount',
    context: 'Village 1',
    account: '001',
    amount: 500,
  });
  expect(submit.click).not.toHaveBeenCalled();
});
