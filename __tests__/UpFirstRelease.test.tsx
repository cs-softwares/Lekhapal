import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RELEASE_FEATURES,
  effectiveWorkspaceState,
  postAuthDestination,
} from '../src/config/releaseFeatures';
import {
  SelectedStateProvider,
  useSelectedState,
} from '../src/context/SelectedStateContext';
import { STATE_SELECTION_STORAGE_KEY, LEGACY_STATE_SELECTION_STORAGE_KEY } from '../src/data/stateDashboardCatalog';
import {
  loadWorkspaceRecords,
  persistWorkspaceRecords,
} from '../src/utils/workspaceStorage';
let selected: ReturnType<typeof useSelectedState>;
function Probe() {
  selected = useSelectedState();
  return null;
}
let tree: Renderer.ReactTestRenderer;
const mount = async () =>
  act(async () => {
    tree = Renderer.create(
      <SelectedStateProvider>
        <Probe />
      </SelectedStateProvider>,
    );
  });
beforeEach(async () => {
  jest.replaceProperty(RELEASE_FEATURES, 'multiState', false);
  await AsyncStorage.clear();
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.restoreAllMocks();
});
test('enabling states keeps UP until explicit selection, preserving the legacy choice', async () => {
  await AsyncStorage.setItem(LEGACY_STATE_SELECTION_STORAGE_KEY, 'BR');
  await mount();
  expect(selected.stateCode).toBe('UP');
  expect(postAuthDestination()).toBe('MainDrawer');
  expect(await AsyncStorage.getItem(LEGACY_STATE_SELECTION_STORAGE_KEY)).toBe('BR');
  await act(() => tree.unmount());
  jest.replaceProperty(RELEASE_FEATURES, 'multiState', true);
  await mount();
  expect(selected.stateCode).toBe('UP');
  await act(async () => selected.selectState('BR'));
  expect(selected.stateCode).toBe('BR');
  expect(await AsyncStorage.getItem(STATE_SELECTION_STORAGE_KEY)).toBe('BR');
  expect(postAuthDestination()).toBe('MainDrawer');
});
test('first run resolves UP without manufacturing a permanent saved state choice', async () => {
  await mount();
  expect(selected.ready).toBe(true);
  expect(selected.stateCode).toBe('UP');
  expect(await AsyncStorage.getItem(STATE_SELECTION_STORAGE_KEY)).toBeNull();
  expect(effectiveWorkspaceState(null)).toBe('UP');
});
test('UP-only note storage remains aligned with the active workspace and preserves other states', async () => {
  await AsyncStorage.setItem(STATE_SELECTION_STORAGE_KEY, 'BR');
  const br = {
    id: 'br',
    toolId: 'rate-finder',
    title: 'Bihar note',
    summaryLines: [],
    values: {},
    createdAt: '2026-09-24',
    updatedAt: '2026-09-24',
  };
  const up = { ...br, id: 'up', title: 'UP note' };
  await AsyncStorage.setItem(
    'smart-work-records-BR-rate-finder',
    JSON.stringify([br]),
  );
  await persistWorkspaceRecords('rate-finder', [up]);
  expect(await loadWorkspaceRecords('rate-finder')).toEqual([up]);
  expect(
    JSON.parse(
      (await AsyncStorage.getItem('smart-work-records-BR-rate-finder'))!,
    ),
  ).toEqual([br]);
  jest.replaceProperty(RELEASE_FEATURES, 'multiState', true);
  expect(await loadWorkspaceRecords('rate-finder')).toEqual([br]);
});
