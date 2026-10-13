import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { BackHandler } from 'react-native';
import WebViewPortalScreen from '../src/screens/WebViewPortalScreen';
const mockBack = jest.fn();
const mockInject = jest.fn();
jest.mock('react-native-webview', () => {
  const R = require('react');
  return {
    WebView: R.forwardRef((props: any, ref: any) => {
      R.useImperativeHandle(ref, () => ({
        goBack: mockBack,
        injectJavaScript: mockInject,
      }));
      return R.createElement('WebView', props);
    }),
  };
});
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: any) => require('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/components/AppScreen', () => 'AppScreen');
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', strings: { reloadPortal: 'Retry' } }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));
let tree: Renderer.ReactTestRenderer;
let back: () => boolean;
const navigation = { goBack: jest.fn() } as any;
const render = (url: string, extra = {}) => (
  <WebViewPortalScreen
    navigation={navigation}
    route={{
      name: 'WebViewPortal',
      key: 'portal',
      params: { url, title: 'Service', ...extra },
    }}
  />
);
const web = () => tree.root.findByType('WebView' as any);
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_, listener) => {
      back = listener as () => boolean;
      return { remove: jest.fn() };
    });
});
afterEach(() => {
  act(() => tree?.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('reusing a portal screen loads the new URL and resets history', async () => {
  await act(() => {
    tree = Renderer.create(render('https://rccms.up.gov.in/'));
  });
  await act(() =>
    web().props.onNavigationStateChange({
      url: 'https://rccms.up.gov.in/next',
      canGoBack: true,
      canGoForward: true,
    }),
  );
  await act(() => tree.update(render('https://upbhunaksha.gov.in/')));
  expect(web().props.source.uri).toBe('https://upbhunaksha.gov.in/');
  expect(web().props.androidLayerType).toBe('hardware');
  await act(() => {
    expect(back()).toBe(true);
  });
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
  expect(mockBack).not.toHaveBeenCalled();
});

test('hardware Back dismisses options, clears an error on previous-page navigation, then exits', async () => {
  await act(() => {
    tree = Renderer.create(render('https://rccms.up.gov.in/'));
  });
  const options = tree.root.findAll(
    n =>
      n.props.accessibilityLabel === 'Browser options' &&
      typeof n.props.onPress === 'function',
  )[0];
  await act(() => options.props.onPress());
  await act(() => {
    expect(back()).toBe(true);
  });
  expect(navigation.goBack).not.toHaveBeenCalled();
  await act(() =>
    web().props.onNavigationStateChange({
      url: 'https://rccms.up.gov.in/next',
      canGoBack: true,
      canGoForward: false,
    }),
  );
  await act(() =>
    web().props.onError({
      nativeEvent: {
        url: 'https://rccms.up.gov.in/next',
        description: 'Connection failed',
      },
    }),
  );
  expect(JSON.stringify(tree.toJSON())).toContain('Connection failed');
  await act(() => {
    expect(back()).toBe(true);
  });
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(tree.toJSON())).not.toContain('Connection failed');
  await act(() =>
    web().props.onNavigationStateChange({
      url: 'https://rccms.up.gov.in/',
      canGoBack: false,
      canGoForward: false,
    }),
  );
  await act(() => {
    back();
  });
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
});

test('service launch starts during document loading without a loading banner', async () => {
  await act(() => {
    tree = Renderer.create(
      render('https://upbhulekh.gov.in/#/home', {
        bhulekhService: 'certified',
      }),
    );
  });
  expect(web().props.injectedJavaScriptBeforeContentLoaded).toContain(
    '__lekhpalServiceLaunch',
  );
  expect(JSON.stringify(tree.toJSON())).not.toContain(
    'Opening official service',
  );
});

test('Corrections keeps the app header and browser visible throughout loading', async () => {
  await act(() => {
    tree = Renderer.create(
      render('https://upbhulekh.gov.in/ansh/', {
        title: 'Khatauni Corrections',
      }),
    );
  });
  expect(JSON.stringify(tree.toJSON())).not.toContain(
    'Loading official website',
  );
  expect(JSON.stringify(tree.toJSON())).toContain('Khatauni Corrections');
  expect(JSON.stringify(tree.toJSON())).toContain('Back to app');
  expect(web().props.source.uri).toBe('https://upbhulekh.gov.in/ansh/');
  await act(() => web().props.onLoadEnd());
  expect(JSON.stringify(tree.toJSON())).not.toContain(
    'Loading official website',
  );
});

test('session requests change the hash without replacing or reloading the WebView', async () => {
  const renderSession = (url: string, request: number, preloading = false) => (
    <WebViewPortalScreen
      navigation={navigation}
      route={{
        name: 'WebViewPortal',
        key: 'session',
        params: { title: 'Bhulekh', url },
      }}
      bhulekhSessionRequest={request}
      isPreloading={preloading}
    />
  );
  await act(() => {
    tree = Renderer.create(
      renderSession('https://upbhulekh.gov.in/#/home', 0, true),
    );
  });
  const original = web();
  await act(() =>
    tree.update(renderSession('https://upbhulekh.gov.in/#/districts_list', 1)),
  );
  expect(web()).toBe(original);
  expect(web().props.source.uri).toBe('https://upbhulekh.gov.in/#/home');
  expect(mockInject).toHaveBeenLastCalledWith(
    expect.stringContaining('location.hash = "#/districts_list"'),
  );
  await act(() =>
    tree.update(renderSession('https://upbhulekh.gov.in/#/home', 1, true)),
  );
  expect(web()).toBe(original);
});

test('a slow official service remains usable without a loading warning', async () => {
  await act(() => {
    tree = Renderer.create(
      render('https://upbhulekh.gov.in/#/home', {
        bhulekhService: 'certified',
      }),
    );
  });
  const message = (status: string) =>
    web().props.onMessage({
      nativeEvent: {
        url: 'https://upbhulekh.gov.in',
        data: JSON.stringify({
          type: 'bhulekh-service',
          service: 'certified',
          status,
        }),
      },
    });
  await act(() => {
    jest.advanceTimersByTime(61000);
    message('unavailable');
  });
  expect(JSON.stringify(tree.toJSON())).not.toContain('Service could not open');
  expect(JSON.stringify(tree.toJSON())).not.toContain('taking longer');
  await act(() => message('ready'));
  expect(JSON.stringify(tree.toJSON())).not.toContain('taking longer');
});

test('directory switches hide stale content immediately and ignore late readiness from a previous request', async () => {
  const screen = (url: string, request: number) => (
    <WebViewPortalScreen
      navigation={navigation}
      route={{
        name: 'WebViewPortal',
        key: 'session',
        params: { title: 'Directory', url },
      }}
      bhulekhSessionRequest={request}
    />
  );
  const content = () => tree.root.findByProps({ testID: 'portal-web-content' });
  const ready = (requestId: string, url = 'https://upbhulekh.gov.in') =>
    web().props.onMessage({
      nativeEvent: {
        url,
        data: JSON.stringify({ type: 'bhulekh-page-ready', requestId }),
      },
    });
  await act(() => {
    tree = Renderer.create(
      screen('https://upbhulekh.gov.in/#/districts_list', 1),
    );
  });
  const original = web();
  expect(content().props.pointerEvents).toBe('none');
  await act(() => ready('1:false'));
  expect(content().props.pointerEvents).toBe('auto');
  await act(() =>
    tree.update(screen('https://upbhulekh.gov.in/#/parganaReport', 2)),
  );
  expect(web()).toBe(original);
  expect(content().props.pointerEvents).toBe('none');
  await act(() => ready('1:false'));
  expect(content().props.pointerEvents).toBe('none');
  await act(() => ready('2:false', 'https://example.com'));
  expect(content().props.pointerEvents).toBe('none');
  await act(() => ready('2:false'));
  expect(content().props.pointerEvents).toBe('auto');
  expect(JSON.stringify(tree.toJSON())).not.toContain(
    'Loading official website',
  );
});

test.each(['copy', 'certified', 'sale', 'dispute'] as const)(
  '%s hides the homepage and previous service until its official page is ready',
  async service => {
    await act(() => {
      tree = Renderer.create(
        render('https://upbhulekh.gov.in/#/home', { bhulekhService: service }),
      );
    });
    const content = () =>
      tree.root.findByProps({ testID: 'portal-web-content' });
    expect(content().props.pointerEvents).toBe('none');
    expect(web().props.injectedJavaScript).not.toContain('installKhatauniCopy');
    await act(() =>
      web().props.onMessage({
        nativeEvent: {
          url: 'https://upbhulekh.gov.in',
          data: JSON.stringify({
            type: 'bhulekh-page-ready',
            requestId: `portal:${service}:https://upbhulekh.gov.in/#/home`,
          }),
        },
      }),
    );
    expect(content().props.pointerEvents).toBe('auto');
  },
);

test('public help has a direct return to the app even after website redirects', async () => {
  await act(() => {
    tree = Renderer.create(
      render(
        'https://play.google.com/store/apps/details?id=com.agristack.up.farmerregistry',
        { returnToApp: true },
      ),
    );
  });
  await act(() =>
    web().props.onNavigationStateChange({
      url: 'https://play.google.com/store/apps/details?id=com.agristack.up.farmerregistry&hl=en',
      canGoBack: true,
      canGoForward: false,
    }),
  );
  const exit = tree.root.findAll(
    n =>
      n.props.accessibilityLabel === 'Back to app' &&
      typeof n.props.onPress === 'function',
  )[0];
  await act(() => exit.props.onPress());
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
  expect(mockBack).not.toHaveBeenCalled();
  await act(() => {
    back();
  });
  expect(navigation.goBack).toHaveBeenCalledTimes(2);
  expect(web().props.setSupportMultipleWindows).toBe(false);
  expect(
    web().props.onShouldStartLoadWithRequest({
      url: 'intent://play.google.com/',
    }),
  ).toBe(false);
  expect(
    web().props.onShouldStartLoadWithRequest({
      url: 'market://details?id=com.agristack.up.farmerregistry',
    }),
  ).toBe(false);
  expect(
    web().props.onShouldStartLoadWithRequest({
      url: 'https://play.google.com/',
    }),
  ).toBe(true);
});
