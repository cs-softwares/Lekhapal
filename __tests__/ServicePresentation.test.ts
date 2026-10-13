import { UP_PORTAL_PRESENTATION_SCRIPT } from '../src/utils/upPortalPresentation';
import { backToKhatauniPlace } from '../src/utils/khatauniCopyPresentation';
const { runInNewContext } = require('vm');

test('presentation can be injected before the document element exists', () => {
  const document = {
    documentElement: null,
    head: null,
    addEventListener: jest.fn(),
  };
  expect(() =>
    runInNewContext(UP_PORTAL_PRESENTATION_SCRIPT, {
      location: {
        origin: 'https://upbhulekh.gov.in',
        hostname: 'upbhulekh.gov.in',
        pathname: '/',
        hash: '#/districts_list',
      },
      document,
      window: { addEventListener: jest.fn(), removeEventListener: jest.fn() },
    }),
  ).not.toThrow();
  expect(document.addEventListener).toHaveBeenCalledWith(
    'DOMContentLoaded',
    expect.any(Function),
    { once: true },
  );
});

test('location back uses the previous-location button rather than the homepage Back button', () => {
  let level = 'village';
  const home = jest.fn();
  const click = jest.fn(() => {
    level = level === 'village' ? 'tehsil' : 'district';
  });
  const root = {
    querySelector: () => ({ placeholder: 'Search ' + level }),
    querySelectorAll: () => [
      { textContent: 'Back', click: home },
      { textContent: 'वापस जाएँ', click },
    ],
  };
  runInNewContext(backToKhatauniPlace('district'), {
    location: { origin: 'https://upbhulekh.gov.in' },
    document: { querySelector: () => root },
    setTimeout: (callback: () => void) => callback(),
  });
  expect(level).toBe('district');
  expect(click).toHaveBeenCalledTimes(2);
  expect(home).not.toHaveBeenCalled();
});

test('approved masthead hiding survives a cold document, service switching and reinjection', () => {
  const elements: any[] = [];
  const documentListeners = new Map<string, () => void>();
  const windowListeners = new Map<string, () => void>();
  const head = {
    appendChild: (element: any) => {
      element.parentNode = head;
      elements.push(element);
    },
  };
  const document: any = {
    head: null,
    documentElement: null,
    createElement: (tagName: string) => ({ tagName }),
    getElementById: (id: string) => elements.find(element => element.id === id),
    querySelector: () => elements.find(element => element.tagName === 'link'),
    addEventListener: (event: string, listener: () => void) =>
      documentListeners.set(event, listener),
  };
  const location = {
    origin: 'https://upbhulekh.gov.in',
    hostname: 'upbhulekh.gov.in',
    pathname: '/',
    hash: '#/home',
  };
  const window = {
    addEventListener: (event: string, listener: () => void) =>
      windowListeners.set(event, listener),
    removeEventListener: (event: string, listener: () => void) => {
      if (windowListeners.get(event) === listener)
        windowListeners.delete(event);
    },
  };
  const context = { document, location, window };
  runInNewContext(UP_PORTAL_PRESENTATION_SCRIPT, context);
  expect(elements).toHaveLength(0);
  document.head = head;
  document.documentElement = { toggleAttribute: jest.fn() };
  documentListeners.get('DOMContentLoaded')!();
  const approvedStyle = document.getElementById('lekhpal-portal-presentation');
  expect(approvedStyle).toBeDefined();

  for (const hash of [
    '#/selection',
    '#/khatauni_rtk',
    '#/index-login',
    '#/gata_wise',
    '#/vaad_grasht',
    '#/districts_list',
    '#/tehsils_list',
    '#/parganaReport',
  ]) {
    location.hash = hash;
    windowListeners.get('hashchange')!();
    runInNewContext(UP_PORTAL_PRESENTATION_SCRIPT, context);
    expect(document.getElementById('lekhpal-portal-presentation')).toBe(
      approvedStyle,
    );
    // The approved masthead rule must apply to all services, outside a
    // directory-only or screen-size condition. Form styling is separate.
    const mastheadRule = approvedStyle.textContent.split('}')[0];
    expect(mastheadRule).toContain(
      'app-root > section:has(img[alt="State Emblem of India"])',
    );
    expect(mastheadRule).toContain('PM Narendra Modi');
    expect(mastheadRule).toContain('CM Yogi Adityanath');
    expect(mastheadRule).toMatch(/display:\s*none\s*!important/);
    expect(mastheadRule).not.toContain('data-lekhpal-directory');
    expect(mastheadRule).not.toContain('@media');
    expect(
      elements.filter(element => element.tagName === 'style'),
    ).toHaveLength(1);
  }
});
