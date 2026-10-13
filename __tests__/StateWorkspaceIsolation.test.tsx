import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSavedWorkspaceRecords } from '../src/hooks/useSavedWorkspaceRecords';
import { loadWorkspaceRecords } from '../src/utils/workspaceStorage';
let mockState = 'BR';
jest.mock('../src/context/SelectedStateContext', () => ({
  useSelectedState: () => ({ stateCode: mockState }),
}));
jest.mock('../src/services/interstitialAds', () => ({
  noteSuccessfulWorkSave: jest.fn(),
}));
jest.mock('../src/services/premiumAccess', () => ({
  requestPremiumAccess: () => true,
}));
let store: ReturnType<typeof useSavedWorkspaceRecords>;
function Probe() {
  store = useSavedWorkspaceRecords('area-converter');
  return null;
}
test('a save started in Bihar finishes in Bihar after switching to UP; stale results do not replace UP records', async () => {
  await AsyncStorage.clear();
  let root!: Renderer.ReactTestRenderer;
  await act(async () => {
    root = Renderer.create(<Probe />);
  });
  let release!: (value: string | null) => void;
  jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(
    () =>
      new Promise(resolve => {
        release = resolve;
      }),
  );
  let pending!: Promise<any>;
  await act(async () => {
    pending = store.saveRecord({
      title: 'Bihar field',
      summaryLines: [],
      values: {},
    });
  });
  mockState = 'UP';
  await act(async () => {
    root.update(<Probe />);
  });
  expect(store.records).toEqual([]);
  await act(async () => {
    release(null);
    await pending;
  });
  expect(store.records).toEqual([]);
  expect(await loadWorkspaceRecords('area-converter', 'UP')).toEqual([]);
  expect((await loadWorkspaceRecords('area-converter', 'BR'))[0].title).toBe(
    'Bihar field',
  );
  await act(() => root.unmount());
  jest.restoreAllMocks();
});
