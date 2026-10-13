import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEchawadiWrite } from '../src/hooks/useEchawadiWrite';
import { EchawadiSnapshot, echawadiUrl } from '../src/domain/echawadi';
const KEY = 'lekhpal-MH-echawadi-transactions-v1';
const page: EchawadiSnapshot = {
  channel: 'lekhpal-echawadi-v1',
  type: 'snapshot',
  documentId: 'doc',
  revision: 1,
  url: echawadiUrl('receipts'),
  mode: 'receipts',
  busy: false,
  page: 0,
  next: false,
  context: 'Village 1 | 2026',
  headers: [],
  rows: [],
  canSubmit: true,
  payment: { account: '001', method: 'Cash', amount: 125.5 },
};
const inject = jest.fn(),
  status = jest.fn();
let api: ReturnType<typeof useEchawadiWrite>, tree: Renderer.ReactTestRenderer;
function Probe({ snapshot = page }: { snapshot?: EchawadiSnapshot }) {
  api = useEchawadiWrite(snapshot, inject, status);
  return null;
}
const open = async () => {
  await act(async () => {
    tree = Renderer.create(<Probe />);
  });
};
const confirm = async () => {
  const args = (Alert.alert as jest.Mock).mock.calls.at(-1);
  await act(async () =>
    args[2].find((b: any) => b.text === 'Submit').onPress(),
  );
};
beforeEach(async () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  await AsyncStorage.clear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});
test('persists pending before submit and only a matching fresh transaction confirms it', async () => {
  await open();
  await act(() => api.submit());
  expect(inject).not.toHaveBeenCalled();
  await confirm();
  const history = JSON.parse((await AsyncStorage.getItem(KEY))!);
  expect(history[0]).toMatchObject({
    state: 'pending',
    account: '001',
    amount: 125.5,
  });
  expect(inject.mock.calls.at(-1)[0]).toContain('"action":"submit"');
  await act(() => {
    api.receive({
      type: 'transaction',
      id: 'wrong',
      state: 'confirmed',
      message: 'Success',
    });
  });
  expect(api.busy).toBe(true);
  await act(async () => {
    api.receive({
      type: 'transaction',
      id: history[0].id,
      state: 'confirmed',
      message: 'Official success',
    });
  });
  expect(JSON.parse((await AsyncStorage.getItem(KEY))!)[0].state).toBe(
    'confirmed',
  );
});
test('a changed record after review is never submitted', async () => {
  await open();
  await act(() => api.submit());
  await act(() =>
    tree.update(
      <Probe
        snapshot={{
          ...page,
          revision: 2,
          payment: { ...page.payment!, account: '002' },
        }}
      />,
    ),
  );
  await confirm();
  expect(inject).not.toHaveBeenCalled();
});
test('interrupted pending writes recover as uncertain and block another payment', async () => {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify([
      {
        id: 'prior',
        at: '2026-10-11',
        context: page.context,
        account: '001',
        amount: 125.5,
        mode: 'receipts',
        state: 'pending',
        message: '',
      },
    ]),
  );
  await open();
  await act(() => api.submit());
  expect(api.history[0].state).toBe('uncertain');
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(inject).not.toHaveBeenCalled();
});
test('a persistence failure sends no financial action', async () => {
  await open();
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(Error('disk full'));
  await act(() => api.submit());
  await confirm();
  expect(inject).not.toHaveBeenCalled();
  expect(api.ready).toBe(false);
});
test('a missing bridge response times out uncertain rather than permitting a retry', async () => {
  await open();
  await act(() => api.submit('batch-approved'));
  await act(async () => {
    jest.advanceTimersByTime(30001);
  });
  expect(api.history[0].state).toBe('uncertain');
  expect(api.busy).toBe(false);
});
