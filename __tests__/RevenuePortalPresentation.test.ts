import { REVENUE_PORTAL_PRESENTATION } from '../src/utils/revenuePortalPresentation';
import { isRevenueUrl } from '../src/domain/revenueFeeding';
import { isOfficialWorkUrl } from '../src/domain/officialWork';
const { runInNewContext } = require('vm');

function fixture(
  url: string,
  loading = false,
  hasRoleList = true,
  hasLogin = false,
) {
  const added: any[] = [];
  const links: any[] = [];
  const listeners: Record<string, () => void> = {};
  const window: any = {};
  window.top = window.self = window;
  const document = {
    readyState: loading ? 'loading' : 'complete',
    head: { appendChild: (node: any) => added.push(node) },
    createElement: (tagName: string) => ({ tagName }),
    querySelector: (selector: string) => {
      if (selector === 'main .login-types') return hasRoleList;
      if (selector === '#frmLogin input[type="password"]') return hasLogin;
      return added.find(node => node.name === 'viewport');
    },
    querySelectorAll: (selector: string) =>
      selector === 'header a' ? links : [],
    getElementById: (id: string) => added.find(node => node.id === id),
    addEventListener: (event: string, fn: () => void) => {
      listeners[event] = fn;
    },
  };
  const run = () =>
    runInNewContext(REVENUE_PORTAL_PRESENTATION, {
      location: new URL(url),
      window,
      document,
    });
  return { added, document, listeners, links, run };
}

function link(href: string) {
  return {
    href,
    getAttribute: function () {
      return this.href;
    },
    setAttribute: function (_name: string, value: string) {
      this.href = value;
    },
  };
}

test('SVAMITVA login Home returns to an allowed role selector and preserves other links', () => {
  const f = fixture(
    'https://svamitva.up.gov.in/app/indexLogin.jsp',
    false,
    false,
    true,
  );
  const home = link('http://svamitva.up.gov.in/');
  const help = link('/manual.pdf');
  f.links.push(home, help);
  f.run();
  f.run();
  expect(home.href).toBe(
    'https://svamitva.up.gov.in/public/homePage_login.jsp',
  );
  expect(isRevenueUrl('prapatra5', home.href)).toBe(true);
  expect(isOfficialWorkUrl('survey9', home.href)).toBe(true);
  expect(help.href).toBe('/manual.pdf');
});

test('entry Home keeps its public-home destination over HTTPS', () => {
  const f = fixture('https://svamitva.up.gov.in/public/homePage_login.jsp');
  const home = link('http://svamitva.up.gov.in/');
  f.links.push(home);
  f.run();
  expect(home.href).toBe('https://svamitva.up.gov.in/');
});

test('Bhulekh login Home retains its existing destination for Ansh and removal', () => {
  const f = fixture(
    'https://upbhulekh.gov.in/bhulekh/indexLogin',
    false,
    false,
    true,
  );
  const home = link('/bhulekh/');
  f.links.push(home);
  f.run();
  expect(home.href).toBe('/bhulekh/');
});

test.each([
  'https://upbhulekh.gov.in/bhulekh/',
  'https://svamitva.up.gov.in/public/homePage_login.jsp',
])('applies a zoomable phone viewport once on %s', url => {
  const f = fixture(url);
  f.run();
  f.run();
  expect(f.added).toHaveLength(2);
  expect(f.added[0].content).toBe('width=device-width, initial-scale=1');
  expect(f.added[1].textContent).toContain('grid-template-columns: repeat(2');
});

test('waits for the original role list when injected before HTML is parsed', () => {
  const f = fixture('https://upbhulekh.gov.in/bhulekh/', true);
  const select = f.document.querySelector;
  f.document.querySelector = () => undefined;
  f.run();
  expect(f.added).toHaveLength(0);
  f.document.querySelector = select;
  f.listeners.DOMContentLoaded();
  expect(f.added).toHaveLength(2);
});

test.each([
  'https://upbhulekh.gov.in/bhulekh/indexLogin',
  'https://upbhulekh.gov.in/bhulekh/Login',
  'https://svamitva.up.gov.in/app/indexLogin.jsp',
  'https://svamitva.up.gov.in/app/Login',
])('fits the recognized original login form on %s', url => {
  const f = fixture(url, false, false, true);
  f.run();
  f.run();
  expect(f.added).toHaveLength(2);
  expect(f.added[0].content).toBe('width=device-width, initial-scale=1');
  expect(f.added[1].textContent).toContain('#frmLogin #btnLogin');
  expect(f.added[1].textContent).toContain('min-height: 48px');
});

test('does not restyle a login endpoint after the login form is gone', () => {
  const f = fixture('https://svamitva.up.gov.in/app/Login', false, false);
  f.run();
  expect(f.added).toHaveLength(0);
});

test.each([
  'https://upbhulekh.gov.in/#/selection',
  'https://upbhulekh.gov.in/bhulekh/mutAnshNirdharanInsertRtk',
  'https://svamitva.up.gov.in/entryF5/addMoreandnewpage',
  'https://upbhulekh.gov.in.evil.test/bhulekh/',
  'http://upbhulekh.gov.in/bhulekh/',
])(
  'leaves public services, authenticated forms and other origins alone: %s',
  url => {
    const f = fixture(url);
    f.run();
    expect(f.added).toHaveLength(0);
  },
);

test('leaves an unexpected replacement document untouched', () => {
  const f = fixture('https://upbhulekh.gov.in/bhulekh/', false, false);
  f.run();
  expect(f.added).toHaveLength(0);
});
