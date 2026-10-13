import { RELEASE_FEATURES } from '../src/config/releaseFeatures';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SelectedStateProvider,
  useSelectedState,
} from '../src/context/SelectedStateContext';
import { STATE_SELECTION_STORAGE_KEY } from '../src/data/stateDashboardCatalog';

let state: ReturnType<typeof useSelectedState>;
let root: Renderer.ReactTestRenderer;
function Probe() {
  state = useSelectedState();
  return null;
}
async function mount() {
  await act(async () => {
    root = Renderer.create(
      <SelectedStateProvider>
        <Probe />
      </SelectedStateProvider>,
    );
  });
}
beforeEach(async () => {
  jest.replaceProperty(RELEASE_FEATURES, 'multiState', true);
  await AsyncStorage.clear();
});
afterEach(async () => {
  await act(async () => root.unmount());
  jest.restoreAllMocks();
});
test('first run keeps UP; selection survives an app restart', async () => {
  await mount();
  expect(state.ready).toBe(true);
  expect(state.stateCode).toBe('UP');
  await act(async () => {
    await state.selectState('BR');
  });
  await act(async () => root.unmount());
  await mount();
  expect(state.stateCode).toBe('BR');
});
test('invalid or out-of-scope saved state keeps UP', async () => {
  await AsyncStorage.setItem(STATE_SELECTION_STORAGE_KEY, 'invalid');
  await mount();
  expect(state.stateCode).toBe('UP');
  await expect(state.selectState('invalid')).rejects.toThrow('valid state');
});
test('failed state save preserves the active workspace', async () => {
  await AsyncStorage.setItem(STATE_SELECTION_STORAGE_KEY, 'UP');
  await mount();
  jest
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('Disk full'));
  await expect(state.selectState('BR')).rejects.toThrow('Disk full');
  expect(state.stateCode).toBe('UP');
});

test('a delayed restore cannot overwrite an explicit state selection', async () => {
  let finish!: (value: string | null) => void;
  jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  await mount();
  await act(async () => state.selectState('MH'));
  await act(async () => finish('BR'));
  expect(state.stateCode).toBe('MH');
  expect(await AsyncStorage.getItem(STATE_SELECTION_STORAGE_KEY)).toBe('MH');
});
