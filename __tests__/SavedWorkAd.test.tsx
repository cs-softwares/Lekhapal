import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { View } from 'react-native';
import SavedWorkAd from '../src/components/ads/SavedWorkAd';
let mockState: any;
const mockCreate = jest.fn();
jest.mock('../src/hooks/useAds', () => ({ useAds: () => mockState }));
jest.mock('../src/config/ads', () => ({ adUnitId: () => 'test-native' }));
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: {
      text: '#000',
      surface: '#fff',
      primary: '#123',
      border: '#ccc',
      textMuted: '#444',
    },
  }),
}));
let tree: Renderer.ReactTestRenderer;
const ad = () => ({
  headline: 'Test advertisement',
  body: 'Test body',
  callToAction: 'Open',
  icon: { url: 'https://example.com/icon.png' },
  destroy: jest.fn(),
});
beforeEach(() => {
  jest.clearAllMocks();
  mockState = {
    ready: true,
    userId: 'basic',
    revision: 0,
    sdk: {
      NativeAd: { createForAdRequest: mockCreate },
      NativeMediaAspectRatio: { LANDSCAPE: 2 },
      NativeAdView: View,
      NativeAsset: View,
      NativeMediaView: View,
      NativeAssetType: {
        HEADLINE: 'h',
        BODY: 'b',
        ICON: 'i',
        CALL_TO_ACTION: 'cta',
      },
    },
  };
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
});
test('native ad is clearly labelled and destroyed when Premium/consent/focus disables it', async () => {
  const value = ad();
  mockCreate.mockResolvedValue(value);
  await act(async () => {
    tree = Renderer.create(<SavedWorkAd />);
  });
  expect(JSON.stringify(tree.toJSON())).toContain('Advertisement');
  mockState = { ...mockState, ready: false };
  await act(() => tree.update(<SavedWorkAd />));
  expect(tree.toJSON()).toBeNull();
  expect(value.destroy).toHaveBeenCalledTimes(1);
});
test('late load after leaving the screen is destroyed, never displayed', async () => {
  let finish: any;
  mockCreate.mockImplementation(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  await act(async () => {
    tree = Renderer.create(<SavedWorkAd />);
  });
  await act(() => tree.unmount());
  const value = ad();
  await act(async () => finish(value));
  expect(value.destroy).toHaveBeenCalledTimes(1);
});
test('no-fill leaves saved work clean and does not loop requests', async () => {
  mockCreate.mockRejectedValue(new Error('no fill'));
  await act(async () => {
    tree = Renderer.create(<SavedWorkAd />);
  });
  expect(tree.toJSON()).toBeNull();
  expect(mockCreate).toHaveBeenCalledTimes(1);
});
