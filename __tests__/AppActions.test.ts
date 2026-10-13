import { Linking, Platform, Share } from 'react-native';
import { openAppStore, shareApp } from '../src/utils/appActions';
import { APP_INFO } from '../src/config/appInfo';
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());
test('store actions use the installed Play Store when available', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await openAppStore();
  expect(open).toHaveBeenCalledTimes(1);
  expect(open).toHaveBeenCalledWith(APP_INFO.marketUrl);
});
test('store actions fall back to the matching web listing and propagate failure for a visible UI error', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const open = jest
    .spyOn(Linking, 'openURL')
    .mockRejectedValueOnce(new Error('No handler'))
    .mockResolvedValueOnce(undefined);
  await openAppStore();
  expect(open).toHaveBeenNthCalledWith(2, APP_INFO.storeUrl);
  open.mockRejectedValue(new Error('Unavailable'));
  await expect(openAppStore()).rejects.toThrow('Unavailable');
});
test('share app opens a share sheet containing the exact app listing, without auto-sending', async () => {
  const share = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: Share.dismissedAction });
  await shareApp('en');
  expect(share).toHaveBeenCalledWith({
    title: APP_INFO.name,
    message: expect.stringContaining(APP_INFO.storeUrl),
  });
});
