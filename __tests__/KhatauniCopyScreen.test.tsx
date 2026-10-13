import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import KhatauniCopyScreen from '../src/screens/KhatauniCopyScreen';
import PlotSaleStatusScreen from '../src/screens/PlotSaleStatusScreen';
import PlotDisputeStatusScreen from '../src/screens/PlotDisputeStatusScreen';
import {
  PLOT_SALE_SCRIPT,
  PLOT_DISPUTE_SCRIPT,
} from '../src/utils/khatauniCopyPresentation';
const mockInject = jest.fn();
jest.mock('react-native-webview', () => {
  const ReactModule = require('react');
  return {
    WebView: ReactModule.forwardRef((props: any, ref: any) => {
      ReactModule.useImperativeHandle(ref, () => ({
        injectJavaScript: mockInject,
      }));
      return ReactModule.createElement('WebView', props);
    }),
  };
});
jest.mock('@react-navigation/native', () => ({ useFocusEffect: () => {} }));
jest.mock('../src/components/AppHeader', () => 'AppHeader');
jest.mock('../src/components/AppScreen', () => 'AppScreen');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));
let tree: Renderer.ReactTestRenderer;
const control = (label: string) =>
  tree.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];
const tap = (label: string) => act(() => control(label).props.onPress());
const message = (data: any, url = 'https://upbhulekh.gov.in/#/selection') =>
  act(() =>
    tree.root.findByType('WebView' as any).props.onMessage({
      nativeEvent: {
        url,
        data: JSON.stringify({ type: 'khatauni-copy', ...data }),
      },
    }),
  );
beforeEach(() => {
  jest.useFakeTimers();
  mockInject.mockClear();
});
afterEach(() => {
  act(() => tree.unmount());
  jest.useRealTimers();
});
test('official location choices drive dependent native pickers and hand off to the same session', async () => {
  await act(() => {
    tree = Renderer.create(
      <KhatauniCopyScreen
        navigation={{ goBack: jest.fn() } as any}
        route={{ name: 'KhatauniCopy', key: 'copy' }}
      />,
    );
  });
  expect(tree.root.findByType('AppHeader' as any).props.title).toBe(
    'Khatauni Copy',
  );
  await message(
    { stage: 'location', level: 'district', choices: ['Injected place'] },
    'https://example.com/',
  );
  expect(control('Choose district')).toBeUndefined();
  await message({
    stage: 'location',
    level: 'district',
    choices: ['District A', 'District B'],
  });
  expect(control('Choose tehsil').props.disabled).toBe(true);
  await tap('Choose district');
  await tap('District A');
  expect(mockInject).toHaveBeenLastCalledWith(
    expect.stringContaining('"District A"'),
  );
  expect(control('Choose district').props.disabled).toBe(true);
  await message({ stage: 'location', level: 'tehsil', choices: ['Tehsil A'] });
  await tap('Choose tehsil');
  await tap('Tehsil A');
  await message({
    stage: 'location',
    level: 'village',
    choices: ['Village A'],
  });
  await tap('Choose district');
  expect(mockInject).toHaveBeenLastCalledWith(
    expect.stringContaining('"district"'),
  );
  await message({
    stage: 'location',
    level: 'district',
    choices: ['District A', 'District B'],
  });
  await tap('District B');
  expect(JSON.stringify(tree.toJSON())).not.toContain('Tehsil A');
  await message(
    { stage: 'official' },
    'https://upbhulekh.gov.in/#/khatauni_rtk',
  );
  expect(control('Choose district')).toBeUndefined();
  expect(tree.root.findByType('WebView' as any).props.source.uri).toBe(
    'https://upbhulekh.gov.in/#/home',
  );
});

test.each(['sale', 'dispute'] as const)(
  'plot %s uses the mobile location flow and restores it when changing location',
  async service => {
    const dispute = service === 'dispute';
    const url =
      'https://upbhulekh.gov.in/#/' + (dispute ? 'vaad_grasht' : 'gata_wise');
    await act(() => {
      tree = Renderer.create(
        dispute ? (
          <PlotDisputeStatusScreen
            navigation={{ goBack: jest.fn() } as any}
            route={{ name: 'PlotDisputeStatus', key: 'dispute' }}
          />
        ) : (
          <PlotSaleStatusScreen
            navigation={{ goBack: jest.fn() } as any}
            route={{ name: 'PlotSaleStatus', key: 'sale' }}
          />
        ),
      );
    });
    const browser = tree.root.findByType('WebView' as any);
    expect(tree.root.findByType('AppHeader' as any).props.title).toBe(
      dispute ? 'Plot Dispute Status' : 'Plot Sale Status',
    );
    expect(browser.props.injectedJavaScript).toBe(
      dispute ? PLOT_DISPUTE_SCRIPT : PLOT_SALE_SCRIPT,
    );
    await message({
      stage: 'location',
      level: 'district',
      choices: ['District A'],
    });
    await tap('Choose district');
    await tap('District A');
    await message({
      stage: 'location',
      level: 'tehsil',
      choices: ['Tehsil A'],
    });
    await tap('Choose tehsil');
    await tap('Tehsil A');
    await message({
      stage: 'location',
      level: 'village',
      choices: ['Village A', 'Village B'],
    });
    await tap('Choose village');
    await tap('Village A');
    await message({ stage: 'official' }, url);
    expect(control('Choose district')).toBeUndefined();
    expect(tree.root.findByType('WebView' as any)).toBe(browser);
    await message({ stage: 'change-location' }, url);
    expect(control('Choose district').props.disabled).toBe(true);
    await message({
      stage: 'location',
      level: 'district',
      choices: ['District A'],
    });
    expect(mockInject).toHaveBeenLastCalledWith(
      expect.stringContaining('"District A"'),
    );
    await message({
      stage: 'location',
      level: 'tehsil',
      choices: ['Tehsil A'],
    });
    expect(mockInject).toHaveBeenLastCalledWith(
      expect.stringContaining('"Tehsil A"'),
    );
    await message({
      stage: 'location',
      level: 'village',
      choices: ['Village A', 'Village B'],
    });
    expect(control('Choose district').props.disabled).toBe(false);
    expect(control('Choose tehsil').props.disabled).toBe(false);
    await tap('Choose village');
    await tap('Village B');
    expect(mockInject).toHaveBeenLastCalledWith(
      expect.stringContaining('"Village B"'),
    );
    await message({ stage: 'official' }, url);
    expect(tree.root.findByType('WebView' as any)).toBe(browser);
  },
);

test('Back closes choices, then returns to the previous location level before leaving', async () => {
  const navigation = { goBack: jest.fn() } as any;
  await act(() => {
    tree = Renderer.create(
      <KhatauniCopyScreen
        navigation={navigation}
        route={{ name: 'KhatauniCopy', key: 'copy' }}
      />,
    );
  });
  await message({
    stage: 'location',
    level: 'village',
    choices: ['Village A'],
  });
  await tap('Choose village');
  const back = () =>
    act(() => tree.root.findByType('AppHeader' as any).props.onLeftPress());
  await back();
  expect(mockInject).not.toHaveBeenCalled();
  expect(navigation.goBack).not.toHaveBeenCalled();
  await back();
  expect(mockInject).toHaveBeenLastCalledWith(
    expect.stringContaining('"tehsil"'),
  );
  await message({ stage: 'location', level: 'tehsil', choices: ['Tehsil A'] });
  await back();
  expect(mockInject).toHaveBeenLastCalledWith(
    expect.stringContaining('"district"'),
  );
  await message({
    stage: 'location',
    level: 'district',
    choices: ['District A'],
  });
  await back();
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
});
