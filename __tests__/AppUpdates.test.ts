jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'android' },
  NativeModules: { AppUpdates: { check: jest.fn(), start: jest.fn() } },
}));
jest.mock('../src/utils/appActions', () => ({
  openAppStore: jest.fn().mockResolvedValue(undefined),
}));

function setup() {
  jest.resetModules();
  const bridge = require('react-native').NativeModules.AppUpdates;
  const store = require('../src/utils/appActions').openAppStore;
  const service = require('../src/services/appUpdates');
  bridge.check.mockResolvedValue({ available: false, inProgress: false });
  return { bridge, store, service };
}
test('manual check confirms latest version without opening the store', async () => {
  const { service, store } = setup();
  const alert = require('react-native').Alert.alert;
  await service.requestAppUpdate('en');
  expect(alert).toHaveBeenCalledWith(
    'App is up to date',
    expect.stringContaining('already up to date'),
  );
  expect(store).not.toHaveBeenCalled();
});
test('failed manual check never claims the app is current', async () => {
  const { service, bridge } = setup();
  const alert = require('react-native').Alert.alert;
  bridge.check.mockRejectedValue(new Error('offline'));
  await service.requestAppUpdate('en');
  expect(alert).toHaveBeenCalledWith(
    'Could not check for updates',
    expect.any(String),
  );
});
test('manual check starts a confirmed update instead of showing latest-version message', async () => {
  const { service, bridge } = setup();
  bridge.check.mockResolvedValue({ available: true });
  bridge.start.mockResolvedValue('cancelled');
  await service.requestAppUpdate('hi');
  expect(bridge.start).toHaveBeenCalledTimes(1);
  expect(require('react-native').Alert.alert).not.toHaveBeenCalled();
});
test('shares concurrent checks and only flags a Play-confirmed update', async () => {
  const { bridge, service } = setup();
  let resolve!: (value: object) => void;
  bridge.check.mockReturnValue(
    new Promise(r => {
      resolve = r;
    }),
  );
  const a = service.checkAppUpdate();
  const b = service.checkAppUpdate();
  expect(bridge.check).toHaveBeenCalledTimes(1);
  expect(service.updateSnapshot().available).toBe(false);
  resolve({ available: true, versionCode: 9 });
  await Promise.all([a, b]);
  expect(service.updateSnapshot()).toMatchObject({
    available: true,
    versionCode: 9,
    checking: false,
  });
});
test('offline unknown check does not block; known update survives failure until Play clears it', async () => {
  const { bridge, service } = setup();
  bridge.check.mockRejectedValueOnce(new Error('offline'));
  await service.checkAppUpdate();
  expect(service.updateSnapshot().available).toBe(false);
  bridge.check.mockResolvedValueOnce({ available: true });
  await service.checkAppUpdate();
  bridge.check.mockRejectedValueOnce(new Error('offline'));
  await service.checkAppUpdate();
  expect(service.updateSnapshot().available).toBe(true);
  await service.checkAppUpdate();
  expect(service.updateSnapshot().available).toBe(false);
});
test('cancelled update keeps the update requirement and prevents duplicate launches', async () => {
  const { bridge, service, store } = setup();
  bridge.check.mockResolvedValue({ available: true });
  await service.checkAppUpdate();
  let resolve!: (value: string) => void;
  bridge.start.mockReturnValue(
    new Promise(r => {
      resolve = r;
    }),
  );
  const first = service.startAppUpdate();
  await service.startAppUpdate();
  expect(bridge.start).toHaveBeenCalledTimes(1);
  expect(service.updateSnapshot().busy).toBe(true);
  resolve('cancelled');
  await first;
  expect(service.updateSnapshot()).toMatchObject({
    available: true,
    busy: false,
  });
  expect(store).not.toHaveBeenCalled();
});
test('uses store fallback if immediate updates cannot launch', async () => {
  const { bridge, service, store } = setup();
  bridge.check.mockResolvedValue({ available: true });
  bridge.start.mockRejectedValue(new Error('not allowed'));
  await service.checkAppUpdate();
  await service.startAppUpdate();
  expect(store).toHaveBeenCalledTimes(1);
});
test('drawer action opens store when current and reports a failure without dismissing known update', async () => {
  const { bridge, service, store } = setup();
  await service.startAppUpdate();
  expect(store).toHaveBeenCalledTimes(1);
  bridge.check.mockResolvedValue({ available: true });
  bridge.start.mockResolvedValue('store');
  store.mockRejectedValue(new Error('unavailable'));
  await service.checkAppUpdate();
  await service.startAppUpdate();
  // A successful version check is separate from whether the store can open.
  expect(service.updateSnapshot().available).toBe(true);
  expect(service.updateSnapshot().busy).toBe(false);
  expect(service.updateSnapshot().error).toBe(true);
});
