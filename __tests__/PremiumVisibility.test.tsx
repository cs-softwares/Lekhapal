import React from 'react';
import Renderer, {act} from 'react-test-renderer';
import {RELEASE_FEATURES} from '../src/config/releaseFeatures';
import {clearPremiumAccess, hasFeatureAccess, hasPremiumAccess, registerPremiumNavigation, requestPremiumAccess} from '../src/services/premiumAccess';
import {usePremiumFeatures} from '../src/hooks/usePremiumFeatures';
import PremiumStatus from '../src/components/premium/PremiumStatus';
import {PremiumLockBadge, PremiumLockNotice} from '../src/components/premium/PremiumLock';
jest.mock('../src/context/LanguageContext', () => ({useLanguage: () => ({language: 'en'})}));
jest.mock('../src/context/ThemeContext', () => ({useAppTheme: () => ({colors: {}, isDarkTheme: false})}));
let tree: Renderer.ReactTestRenderer;
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  RELEASE_FEATURES.premium = false;
  clearPremiumAccess();
  registerPremiumNavigation(null);
});
test('shipping testing flag hides premium while feature access does not confer paid/ad-free membership', async () => {
  expect(RELEASE_FEATURES.premium).toBe(false);
  clearPremiumAccess();
  const navigate = jest.fn();
  registerPremiumNavigation(navigate);
  expect(hasFeatureAccess('gps_capture')).toBe(true);
  expect(requestPremiumAccess('pdf_reports')).toBe(true);
  expect(hasPremiumAccess('gps_capture')).toBe(false);
  expect(navigate).not.toHaveBeenCalled();
  let accessible = false;
  function Probe() {accessible = usePremiumFeatures(); return null;}
  await act(() => {tree = Renderer.create(<><Probe/><PremiumStatus/><PremiumLockBadge/><PremiumLockNotice title="GPS" description="Upgrade"/></>);});
  expect(accessible).toBe(true);
  expect(tree.toJSON()).toBe(null);
});
test('the same switch restores paid gates and lock UI without changing membership', async () => {
  RELEASE_FEATURES.premium = true;
  clearPremiumAccess();
  const navigate = jest.fn();
  registerPremiumNavigation(navigate);
  expect(hasFeatureAccess('gps_capture')).toBe(false);
  expect(requestPremiumAccess('pdf_reports')).toBe(false);
  expect(navigate).toHaveBeenCalledTimes(1);
  await act(() => {tree = Renderer.create(<PremiumLockBadge/>);});
  expect(JSON.stringify(tree.toJSON())).toContain('Locked · Premium');
});
