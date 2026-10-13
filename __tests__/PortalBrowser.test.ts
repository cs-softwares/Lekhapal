import { Linking, NativeModules, Platform } from 'react-native';
import { openPortalBrowser } from '../src/native/portalBrowser';

const originalBrowser = NativeModules.PortalBrowser;
afterEach(() => {
  NativeModules.PortalBrowser = originalBrowser;
  jest.restoreAllMocks();
});

test('Android opens the exact Khasra route in the native browser view', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const open = jest.fn().mockResolvedValue(undefined);
  NativeModules.PortalBrowser = { open };
  const external = jest.spyOn(Linking, 'openURL');
  const url = 'https://ekhasra.up.gov.in/#/khasrareport';
  await openPortalBrowser(url);
  expect(open).toHaveBeenCalledWith(url);
  expect(external).not.toHaveBeenCalled();
});

test('an outdated Android build does not silently switch to a separate browser', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  NativeModules.PortalBrowser = undefined;
  const external = jest.spyOn(Linking, 'openURL');
  await expect(
    openPortalBrowser('https://ekhasra.up.gov.in/#/SelectLogin'),
  ).rejects.toThrow('updated Android build');
  expect(external).not.toHaveBeenCalled();
});
