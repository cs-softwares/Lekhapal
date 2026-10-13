const { runInNewContext } = require('vm');
import {
  BHULEKH_SERVICE_LABELS,
  BhulekhService,
} from '../src/data/bhulekhOptions';
import {
  buildBhulekhServiceLaunch,
  isBhulekhWebsiteUrl,
} from '../src/utils/bhulekhServiceLaunch';

function harness(
  service: BhulekhService,
  duplicate = false,
  origin = 'https://upbhulekh.gov.in',
  ready = true,
) {
  let tick: (() => void) | undefined;
  let expire: (() => void) | undefined;
  const location = {
    origin,
    hash: '#/home',
    href: 'https://upbhulekh.gov.in/#/selection',
  };
  const postMessage = jest.fn();
  const buttons = Object.entries(BHULEKH_SERVICE_LABELS).map(([id, text]) => ({
    id,
    textContent: `\uF292  ${text} `,
    click: jest.fn(() => {
      location.hash = '#/selection';
    }),
  }));
  if (duplicate) {
    buttons.push({ ...buttons.find(b => b.id === service)! });
  }
  const context = {
    location,
    window: {
      ReactNativeWebView: { postMessage },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    document: {
      documentElement: {},
      querySelectorAll: jest.fn(() => (ready ? buttons : [])),
    },
    MutationObserver: class {
      constructor(callback: () => void) {
        tick = callback;
      }
      observe() {}
      disconnect() {
        tick = undefined;
      }
    },
    setTimeout: (callback: () => void) => {
      expire = callback;
      return 1;
    },
    clearTimeout: () => {
      expire = undefined;
    },
  };
  const script = buildBhulekhServiceLaunch(service);
  runInNewContext(script, context);
  return {
    buttons,
    location,
    postMessage,
    context,
    script,
    step: () => tick?.(),
    expire: () => expire?.(),
    reveal: () => {
      ready = true;
      tick?.();
    },
  };
}

test.each(Object.keys(BHULEKH_SERVICE_LABELS) as BhulekhService[])(
  '%s selects only its exact official menu button, once',
  service => {
    const h = harness(service);
    h.step();
    h.step();
    h.step();
    for (const button of h.buttons) {
      expect(button.click).toHaveBeenCalledTimes(button.id === service ? 1 : 0);
    }
    expect(h.postMessage).toHaveBeenCalledWith(
      JSON.stringify({ type: 'bhulekh-service', service, status: 'ready' }),
    );
    runInNewContext(h.script, h.context);
    h.step();
    expect(h.buttons.find(b => b.id === service)!.click).toHaveBeenCalledTimes(
      1,
    );
  },
);

test('changed or ambiguous menu fails without selecting a different service', () => {
  const h = harness('copy', true);
  h.expire();
  expect(h.buttons.every(b => b.click.mock.calls.length === 0)).toBe(true);
  expect(h.postMessage).toHaveBeenCalledWith(
    JSON.stringify({
      type: 'bhulekh-service',
      service: 'copy',
      status: 'unavailable',
    }),
  );
});

test('launcher does nothing outside the official Bhulekh origin', () => {
  const h = harness('copy', false, 'https://example.com');
  h.step();
  expect(h.context.document.querySelectorAll).not.toHaveBeenCalled();
  expect(h.postMessage).not.toHaveBeenCalled();
});

test('Android origin-only messages are accepted without accepting other hosts', () => {
  expect(isBhulekhWebsiteUrl('https://upbhulekh.gov.in')).toBe(true);
  expect(isBhulekhWebsiteUrl('https://upbhulekh.gov.in/#/selection')).toBe(
    true,
  );
  expect(isBhulekhWebsiteUrl('https://upbhulekh.gov.in.example.com/')).toBe(
    false,
  );
  expect(isBhulekhWebsiteUrl('https://upbhulekh.gov.in@example.com/')).toBe(
    false,
  );
  expect(isBhulekhWebsiteUrl('http://upbhulekh.gov.in/')).toBe(false);
});

test('starts immediately when menu appears, without waiting for a polling interval', () => {
  const h = harness('copy', false, 'https://upbhulekh.gov.in', false);
  expect(h.postMessage).not.toHaveBeenCalled();
  h.reveal();
  expect(h.buttons.find(b => b.id === 'copy')!.click).toHaveBeenCalledTimes(1);
  expect(h.postMessage).toHaveBeenCalledWith(
    JSON.stringify({
      type: 'bhulekh-service',
      service: 'copy',
      status: 'ready',
    }),
  );
});

test('a homepage taking longer than 60 seconds still launches when ready', () => {
  const h = harness('certified', false, 'https://upbhulekh.gov.in', false);
  h.expire();
  h.reveal();
  expect(
    h.buttons.find(b => b.id === 'certified')!.click,
  ).toHaveBeenCalledTimes(1);
  expect(h.postMessage).toHaveBeenLastCalledWith(
    JSON.stringify({
      type: 'bhulekh-service',
      service: 'certified',
      status: 'ready',
    }),
  );
});
