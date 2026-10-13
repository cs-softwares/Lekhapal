import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeskProvider, useDesk } from '../src/context/DeskContext';
let desk: ReturnType<typeof useDesk>;
function Probe() {
  desk = useDesk();
  return null;
}
let root: Renderer.ReactTestRenderer;
beforeEach(async () => {
  await AsyncStorage.clear();
  await act(async () => {
    root = Renderer.create(
      <DeskProvider>
        <Probe />
      </DeskProvider>,
    );
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  jest.restoreAllMocks();
});
test('concurrent saves serialize without losing actions and survive remount', async () => {
  await act(async () => {
    await Promise.all([
      desk.commit('First', s => ({ ...s, online: false })),
      desk.commit('Second', s => ({
        ...s,
        settings: { ...s.settings, officer: 'Test Officer' },
      })),
    ]);
  });
  expect(desk.state.queue).toHaveLength(2);
  expect(desk.state.online).toBe(false);
  await act(async () => root.unmount());
  await act(async () => {
    root = Renderer.create(
      <DeskProvider>
        <Probe />
      </DeskProvider>,
    );
  });
  expect(desk.state.settings.officer).toBe('Test Officer');
  expect(desk.state.queue).toHaveLength(2);
  await expect(desk.sync()).rejects.toThrow('Online');
  await act(async () => {
    await desk.commit('', s => ({ ...s, online: true }));
    await desk.sync();
  });
  expect(desk.state.queue.every(q => q.syncedAt)).toBe(true);
  await act(async () => {
    await desk.sync();
  });
  expect(desk.state.queue).toHaveLength(2);
});
test('failed durable save does not claim success or discard the previous state', async () => {
  jest
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('Disk full'));
  await expect(
    desk.commit('Unsaved', s => ({ ...s, online: false })),
  ).rejects.toThrow('Disk full');
  expect(desk.state.online).toBe(true);
  expect(desk.state.queue).toHaveLength(0);
  await act(async () => {
    await desk.commit('Retry', s => ({ ...s, online: false }));
  });
  expect(desk.state.online).toBe(false);
  expect(desk.state.queue).toHaveLength(1);
});
