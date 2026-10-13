let mockFocused = true;
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockFocused,
}));
import React from 'react';
import { Platform } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import FreeAccountAd from '../src/components/ads/FreeAccountAd';
let mockActive = false;
let mockEntitlement: any = { userId: 'user', active: false };
const mockGather = jest.fn(async () => ({
  canRequestAds: true,
  privacyOptionsRequirementStatus: 'REQUIRED',
}));
const mockInit = jest.fn(async () => []);
const mockPrivacy = jest.fn(async () => {});
jest.mock('../src/context/PremiumContext', () => ({
  usePremium: () => ({ entitlement: mockEntitlement }),
}));
jest.mock('../src/hooks/usePremiumActive', () => ({
  usePremiumActive: () => mockActive,
}));
jest.mock('../src/context/AuthSessionContext', () => ({
  useAuthSession: () => ({ session: { userId: 'user', active: false } }),
}));
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({ initialize: mockInit }),
  BannerAd: require('react-native').View,
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'adaptive' },
  TestIds: { BANNER: 'test-banner' },
  AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED' },
  AdsConsent: {
    gatherConsent: () => mockGather(),
    showPrivacyOptionsForm: () => mockPrivacy(),
    getConsentInfo: async () => ({ canRequestAds: false }),
  },
}));
let tree: Renderer.ReactTestRenderer;
beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  mockFocused = true;
  mockActive = false;
  mockEntitlement = { userId: 'user', active: false };
  jest.clearAllMocks();
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.restoreAllMocks();
});
const mount = async () =>
  act(async () => {
    tree = Renderer.create(<FreeAccountAd />);
  });
test('unknown purchase status or active Premium never requests an ad', async () => {
  mockEntitlement = null;
  await mount();
  expect(mockGather).not.toHaveBeenCalled();
  expect(tree.toJSON()).toBeNull();
  mockEntitlement = { userId: 'user', active: false };
  mockActive = true;
  await act(() => tree.update(<FreeAccountAd />));
  expect(mockGather).not.toHaveBeenCalled();
  expect(tree.toJSON()).toBeNull();
});
test('basic accounts get consented test banners and upgrading removes them immediately', async () => {
  await mount();
  expect(mockGather).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(tree.toJSON())).toContain('test-banner');
  mockActive = true;
  await act(() => tree.update(<FreeAccountAd />));
  expect(tree.toJSON()).toBeNull();
});
test('ad failure retains required privacy choices; withdrawing consent prevents further banners', async () => {
  await mount();
  const banner = tree.root.findAll(n => n.props.unitId === 'test-banner')[0];
  await act(() => banner.props.onAdFailedToLoad());
  const privacy = tree.root.findAll(
    n =>
      n.props.accessibilityLabel === 'Ad privacy choices' && !!n.props.onPress,
  )[0];
  expect(privacy).toBeDefined();
  await act(async () => privacy.props.onPress());
  expect(mockPrivacy).toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).not.toContain('test-banner');
});

test('a hidden screen and a different account never render banners', async () => {
  mockFocused = false;
  await mount();
  expect(tree.toJSON()).toBeNull();
  mockFocused = true;
  mockEntitlement = { userId: 'other' };
  await act(() => tree.update(<FreeAccountAd />));
  expect(tree.toJSON()).toBeNull();
});

test('an expired Premium lease awaiting verification does not turn into a Basic ad request', async () => {
  mockEntitlement = { userId: 'user', active: true };
  mockActive = false;
  await mount();
  expect(tree.toJSON()).toBeNull();
  expect(mockGather).not.toHaveBeenCalled();
});
