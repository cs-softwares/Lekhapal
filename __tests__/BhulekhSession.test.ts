import {
  buildBhulekhSessionIdle,
  buildBhulekhPageReady,
  buildBhulekhSessionRequest,
} from '../src/utils/bhulekhSession';
const { runInNewContext } = require('vm');

test('closing a service cancels its observers without fetching the homepage again', () => {
  const location = {
    origin: 'https://upbhulekh.gov.in',
    pathname: '/',
    hash: '#/tehsils_list',
  };
  const window = {
    __lekhpalServiceLaunchCleanup: jest.fn(),
    __lekhpalKhatauniCleanup: jest.fn(),
  };
  runInNewContext(buildBhulekhSessionIdle('2:true'), { location, window });
  expect(location.hash).toBe('#/tehsils_list');
  expect(window.__lekhpalServiceLaunchCleanup).toHaveBeenCalledTimes(1);
  expect(window.__lekhpalKhatauniCleanup).toHaveBeenCalledTimes(1);
});

test('re-injection preserves in-page navigation until a new service is selected', () => {
  const location = {
    origin: 'https://upbhulekh.gov.in',
    pathname: '/',
    hash: '#/home',
  };
  const context = {
    location,
    window: {},
    document: { getElementById: () => null, addEventListener: jest.fn() },
  };
  const request = buildBhulekhSessionRequest(
    'https://upbhulekh.gov.in/#/districts_list',
    undefined,
    '1:false',
  );
  runInNewContext(request, context);
  expect(location.hash).toBe('#/districts_list');
  location.hash = '#/tehsils_list';
  runInNewContext(request, context);
  expect(location.hash).toBe('#/tehsils_list');
  runInNewContext(
    buildBhulekhSessionRequest(
      'https://upbhulekh.gov.in/#/districts_list',
      undefined,
      '2:false',
    ),
    context,
  );
  expect(location.hash).toBe('#/districts_list');
});

test('session routing never rewrites a separate department login document', () => {
  const location = {
    origin: 'https://upbhulekh.gov.in',
    pathname: '/bhulekh_login/',
    hash: '#/home',
  };
  runInNewContext(
    buildBhulekhSessionRequest(
      'https://upbhulekh.gov.in/#/login',
      undefined,
      '1:false',
    ),
    { location },
  );
  expect(location.hash).toBe('#/home');
  expect(
    buildBhulekhSessionRequest(
      'https://example.com/#/login',
      undefined,
      '1:false',
    ),
  ).toBe('');
});

test('directory readiness waits for the requested component to paint, not just its URL', () => {
  let component = 'tehsils_list';
  let mutation = () => {};
  const frames: Array<() => void> = [];
  const postMessage = jest.fn();
  const window = {
    __lekhpalSessionRequest: '3:false',
    ReactNativeWebView: { postMessage },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  const context = {
    window,
    location: {
      origin: 'https://upbhulekh.gov.in',
      pathname: '/',
      hash: '#/parganaReport',
    },
    document: {
      documentElement: {},
      querySelector: (tag: string) => (tag === component ? {} : null),
    },
    MutationObserver: class {
      constructor(callback: () => void) {
        mutation = callback;
      }
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame: (callback: () => void) => frames.push(callback),
    cancelAnimationFrame: jest.fn(),
  };
  runInNewContext(
    buildBhulekhPageReady(
      'https://upbhulekh.gov.in/#/parganaReport',
      '3:false',
    ),
    context,
  );
  expect(frames).toHaveLength(0);
  component = 'parganareport';
  mutation();
  frames.shift()!();
  expect(postMessage).not.toHaveBeenCalled();
  frames.shift()!();
  expect(postMessage).toHaveBeenCalledWith(
    JSON.stringify({ type: 'bhulekh-page-ready', requestId: '3:false' }),
  );
  mutation();
  expect(frames).toHaveLength(0);

  runInNewContext(
    buildBhulekhPageReady(
      'https://upbhulekh.gov.in/#/parganaReport',
      '4:false',
    ),
    context,
  );
  expect(frames).toHaveLength(0);
});

test.each(['copy', 'certified', 'sale', 'dispute'] as const)(
  '%s uses the official service button without injecting the custom record layout',
  service => {
    const script = buildBhulekhSessionRequest(
      'https://upbhulekh.gov.in/#/home',
      service,
      '8:false',
    );
    expect(script).toContain('launchBhulekhService');
    expect(script).toContain('bhulekh-page-ready');
    expect(script).not.toContain('installKhatauniCopy');
    expect(script).not.toContain('style.textContent');
    expect(script).not.toContain('lekhpal-location-summary');
    expect(script).toContain(
      service === 'certified' ? 'index-login' : 'selection',
    );
  },
);
