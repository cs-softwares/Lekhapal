import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
let mockConsent: any = { ready: true };
let mockPremium = false;
jest.mock('../src/services/adConsent', () => ({
  adConsentSnapshot: () => mockConsent,
}));
jest.mock('../src/services/premiumAccess', () => ({
  hasPremiumAccess: () => mockPremium,
}));
jest.mock('../src/config/ads', () => ({ adUnitId: () => 'test-interstitial' }));
const KEY = 'lekhpal.ads.interstitial.v1';
const BASE = 1_800_000_000_000;
let service: typeof import('../src/services/interstitialAds');
let events: Record<string, () => void>;
let sdk: any;
let show: jest.Mock;
let load: jest.Mock;
beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(BASE);
  jest.resetModules();
  await AsyncStorage.clear();
  mockConsent = { ready: true };
  mockPremium = false;
  events = {};
  show = jest.fn(async () => {});
  load = jest.fn();
  sdk = {
    InterstitialAd: {
      createForAdRequest: jest.fn(() => ({
        load,
        show,
        addAdEventListener: (event: string, fn: () => void) => {
          events[event] = fn;
          return jest.fn();
        },
      })),
    },
    AdEventType: { LOADED: 'loaded', ERROR: 'error', CLOSED: 'closed' },
  };
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    value: 'active',
  });
  // Keep singleton native/storage mocks shared across module-reset tests.
  jest.doMock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: AsyncStorage,
  }));
  jest.doMock('react-native', () => ({ AppState }));
  service = require('../src/services/interstitialAds');
});
afterEach(() => jest.useRealTimers());
async function start(seen = true) {
  if (seen)
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ seenSession: true, impressions: [] }),
    );
  service.configureInterstitialAccount('basic');
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  jest.advanceTimersByTime(600_001);
}
function ready() {
  service.preloadWorkInterstitial(sdk);
  events.loaded?.();
  service.noteSuccessfulWorkSave('field-area');
}
test('first session, first ten minutes, ten-minute spacing and rolling daily cap', () => {
  const { frequencyAllows: f } = service;
  expect(f([], BASE + 600001, BASE, true)).toBe(false);
  expect(f([], BASE + 599999, BASE, false)).toBe(false);
  expect(f([], BASE + 600000, BASE, false)).toBe(true);
  expect(f([BASE + 500000], BASE + 600001, BASE, false)).toBe(false);
  expect(
    f([BASE, BASE + 600000, BASE + 1200000], BASE + 2400000, BASE, false),
  ).toBe(false);
  expect(f([BASE], BASE + 86400001, BASE, false)).toBe(true);
  expect(f([BASE + 9999999], BASE + 600001, BASE, false)).toBe(false);
});
test('only saved work with a preloaded ad can show; no late display after load', async () => {
  await start();
  service.noteSuccessfulWorkSave('field-area');
  await service.showCompletedWorkAd(() => true);
  expect(show).not.toHaveBeenCalled();
  service.preloadWorkInterstitial(sdk);
  events.loaded();
  await service.showCompletedWorkAd(() => true);
  expect(show).not.toHaveBeenCalled();
  service.noteSuccessfulWorkSave('field-area');
  await service.showCompletedWorkAd(() => true);
  expect(show).toHaveBeenCalledTimes(1);
  expect(
    JSON.parse((await AsyncStorage.getItem(KEY))!).impressions,
  ).toHaveLength(1);
  service.noteSuccessfulWorkSave('field-area');
  await service.showCompletedWorkAd(() => true);
  expect(show).toHaveBeenCalledTimes(1);
});
test('new install never loads interstitials in its first session', async () => {
  await start(false);
  ready();
  expect(load).not.toHaveBeenCalled();
});
test.each([
  'premium',
  'consent',
  'background',
  'account',
  'navigation',
  'gps',
  'cancel',
])('%s prevents display', async reason => {
  await start();
  ready();
  if (reason === 'premium') mockPremium = true;
  if (reason === 'consent') mockConsent = { ready: false };
  if (reason === 'background')
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'background',
    });
  if (reason === 'account') service.configureInterstitialAccount('other');
  if (reason === 'gps') {
    service.cancelCompletedWorkAd();
    service.noteSuccessfulWorkSave('gps-land-measure');
  }
  if (reason === 'cancel') service.cancelCompletedWorkAd();
  await service.showCompletedWorkAd(() => reason !== 'navigation');
  expect(show).not.toHaveBeenCalled();
});
test('storage failure skips the ad without failing navigation', async () => {
  await start();
  ready();
  jest
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('disk full'));
  await expect(
    service.showCompletedWorkAd(() => true),
  ).resolves.toBeUndefined();
  expect(show).not.toHaveBeenCalled();
});
test('daily history survives restarting the manager', async () => {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      seenSession: true,
      impressions: [BASE - 1000, BASE - 700000, BASE - 1400000],
    }),
  );
  service.configureInterstitialAccount('basic');
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  jest.advanceTimersByTime(600001);
  ready();
  expect(load).not.toHaveBeenCalled();
});
