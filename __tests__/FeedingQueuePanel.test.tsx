import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FeedingQueuePanel from '../src/components/khasra/FeedingQueuePanel';
import { FeedingSnapshot, feedingScopeKey } from '../src/domain/khasraFeeding';
import { addQueueGatas, emptyFeedingQueue } from '../src/domain/khasraQueue';

jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));

const context = {
  year: '1433',
  season: 'kharif' as const,
  village: 'A',
  villageCode: '117944',
};
const scope = feedingScopeKey(context),
  key = `${scope}-queue`;
const page: FeedingSnapshot = {
  type: 'snapshot',
  channel: 'lekhpal-feeding-v1',
  documentId: 'doc',
  revision: 1,
  url: 'https://ekhasra.up.gov.in/#/lekhpalGataList',
  stage: 'list',
  busy: false,
  unsupported: false,
  fields: [],
  actions: [],
  heading: '',
  message: '',
  plots: [
    { ref: 'p12', gata: '12', status: 'available' },
    { ref: 'p13', gata: '13', status: 'available' },
  ],
};
let tree: Renderer.ReactTestRenderer;
let props: React.ComponentProps<typeof FeedingQueuePanel>;
const button = (label: string) =>
  tree.root.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  )[0];
const tap = async (label: string) => {
  await act(async () => {
    button(label).props.onPress();
  });
};
const confirm = async () => {
  await act(async () => {
    jest.mocked(Alert.alert).mock.calls.slice(-1)[0][2]![1].onPress!();
  });
};
const update = async (patch: Partial<typeof props>) => {
  props = { ...props, ...patch };
  await act(async () => {
    tree.update(<FeedingQueuePanel {...props} />);
  });
};
const saved = async () => JSON.parse((await AsyncStorage.getItem(key))!);
async function open(snapshot = page) {
  await AsyncStorage.setItem(
    key,
    JSON.stringify(addQueueGatas(emptyFeedingQueue(scope), ['12', '13'])),
  );
  props = {
    context,
    snapshot,
    disabled: false,
    stopEpoch: 0,
    receipt: null,
    onCommand: jest.fn(),
    onActiveGata: jest.fn(),
    onPause: jest.fn(),
  };
  await act(async () => {
    tree = Renderer.create(<FeedingQueuePanel {...props} />);
  });
}
async function start() {
  await tap('Start / resume queue');
  await confirm();
}
beforeEach(async () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(AsyncStorage, 'setItem');
  await AsyncStorage.clear();
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('persists the opening gata before dispatch and does not advance on a return to the list', async () => {
  await open();
  (props.onCommand as jest.Mock).mockImplementation(() => {
    expect(
      jest.mocked(AsyncStorage.setItem).mock.calls.slice(-1)[0][1],
    ).toContain('"status":"opening"');
  });
  await start();
  expect(props.onCommand).toHaveBeenCalledWith(
    { type: 'plot', plotRef: 'p12', gata: '12' },
    'Open gata 12',
  );
  await update({
    snapshot: { ...page, stage: 'owner', plotIdentity: '12', revision: 2 },
  });
  await update({ snapshot: { ...page, revision: 3 } });
  expect(props.onCommand).toHaveBeenCalledTimes(1);
  await tap('Mark gata reviewed');
  await confirm();
  expect(props.onCommand).toHaveBeenLastCalledWith(
    { type: 'plot', plotRef: 'p13', gata: '13' },
    'Open gata 13',
  );
});
test('reports queue activity so Stop remains available with settings hidden', async () => {
  await open();
  const onRunningChange = jest.fn();
  await update({ onRunningChange });
  expect(onRunningChange).toHaveBeenLastCalledWith(false);
  await start();
  expect(onRunningChange).toHaveBeenLastCalledWith(true);
  await update({ stopEpoch: 1 });
  expect(onRunningChange).toHaveBeenLastCalledWith(false);
  expect((await saved()).running).toBe(false);
});
test('skips locked rows and never opens a subdivision as a match for its parent', async () => {
  await open({
    ...page,
    plots: [{ ref: 'p12', gata: '12', status: 'locked' }, page.plots![1]],
  });
  await start();
  expect((await saved()).items[0].status).toBe('skipped');
  expect(props.onCommand).toHaveBeenCalledTimes(1);
  expect(props.onCommand).toHaveBeenCalledWith(
    expect.objectContaining({ gata: '13' }),
    expect.any(String),
  );
});
test('searches for missing exact gata once, without clicking a partial match', async () => {
  await open({
    ...page,
    plots: [{ ref: 'sub', gata: '12/1', status: 'available' }],
    listSearch: { ref: 'search', value: '' },
  });
  await start();
  expect(props.onCommand).toHaveBeenCalledWith(
    { type: 'search', query: '12', gata: '12' },
    'Search gata 12',
  );
  await update({ snapshot: { ...props.snapshot!, revision: 2 } });
  expect(props.onCommand).toHaveBeenCalledTimes(1);
  expect((await saved()).items[0].status).toBe('queued');
});
test('government skip applies only to the matching active gata', async () => {
  await open();
  await start();
  await update({ skipRequest: { id: 1, gata: '13' } });
  expect((await saved()).items[0].status).toBe('opening');
  await update({ skipRequest: { id: 2, gata: '12' } });
  expect((await saved()).items[0].status).toBe('skipped');
  expect(props.onCommand).toHaveBeenLastCalledWith(
    expect.objectContaining({ gata: '13' }),
    expect.any(String),
  );
});
test('rejects a start confirmation after the official page changes', async () => {
  await open();
  await tap('Start / resume queue');
  await update({ snapshot: { ...page, revision: 2 } });
  await confirm();
  expect(props.onCommand).not.toHaveBeenCalled();
  expect((await saved()).running).toBe(false);
});
test('storage failure prevents dispatch', async () => {
  await open();
  jest
    .mocked(AsyncStorage.setItem)
    .mockRejectedValueOnce(new Error('disk full'));
  await start();
  expect(props.onCommand).not.toHaveBeenCalled();
  expect(props.onPause).toHaveBeenCalled();
});
test('stop while persistence is pending prevents opening a gata', async () => {
  await open();
  let resolve!: () => void;
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(
    () =>
      new Promise<void>(r => {
        resolve = r;
      }),
  );
  await start();
  await update({ stopEpoch: 1 });
  await act(async () => {
    resolve();
  });
  expect(props.onCommand).not.toHaveBeenCalled();
  expect((await saved()).running).toBe(false);
});
test('only a matching lock success advances a plot; failures require review', async () => {
  await open();
  await start();
  const receipt = {
    id: 'result1',
    at: new Date().toISOString(),
    context,
    stage: 'remarks' as const,
    action: 'Lock',
    actionKind: 'lock' as const,
    gata: '12',
    outcome: 'portal-success' as const,
    message: 'Gata Locked Success',
  };
  await update({
    receipt: { ...receipt, context: { ...context, villageCode: '000000' } },
  });
  expect((await saved()).items[0].status).toBe('opening');
  await update({
    receipt: { ...receipt, id: 'result2', outcome: 'uncertain' },
  });
  expect((await saved()).items[0].status).toBe('uncertain');
  expect((await saved()).running).toBe(false);
  expect(props.onCommand).toHaveBeenCalledTimes(1);
});
test('a matching lock result advances and a recovered active plot never resumes automatically', async () => {
  await open();
  await start();
  await update({
    receipt: {
      id: 'lock12',
      at: new Date().toISOString(),
      context,
      stage: 'remarks',
      action: 'Lock',
      actionKind: 'lock',
      gata: '12',
      outcome: 'portal-success',
      message: 'Gata Locked Success',
    },
  });
  expect((await saved()).items[0].status).toBe('reviewed');
  expect(props.onCommand).toHaveBeenCalledTimes(2);
  await act(async () => tree.unmount());
  props = { ...props, receipt: null, onCommand: jest.fn() };
  await act(async () => {
    tree = Renderer.create(<FeedingQueuePanel {...props} />);
  });
  expect(props.onCommand).not.toHaveBeenCalled();
  expect(button('Start / resume queue').props.disabled).toBe(true);
});

test('completed queue lets the final lock return to the list, then stops the controller', async () => {
  await open();
  await start();
  const receipt = {
    id: 'lock12',
    at: new Date().toISOString(),
    context,
    stage: 'remarks' as const,
    action: 'Lock',
    actionKind: 'lock' as const,
    gata: '12',
    outcome: 'portal-success' as const,
    message: 'Gata Locked Success',
  };
  await update({ receipt });
  await update({
    snapshot: { ...page, stage: 'remarks', plotIdentity: '13', revision: 2 },
  });
  await update({ receipt: { ...receipt, id: 'lock13', gata: '13' } });
  expect(
    (await saved()).items.every(
      (item: { status: string }) => item.status === 'reviewed',
    ),
  ).toBe(true);
  expect((await saved()).running).toBe(true);
  expect(props.onPause).not.toHaveBeenCalled();
  await update({ snapshot: { ...page, revision: 3 } });
  expect((await saved()).running).toBe(false);
  expect(props.onPause).toHaveBeenCalledTimes(1);
});

test('walks identified list pages once and opens only the exact queued gata', async () => {
  await open({
    ...page,
    plots: [],
    listPagination: { key: '1', nextRef: 'next1' },
  });
  await start();
  expect(props.onCommand).toHaveBeenCalledWith(
    { type: 'page', actionRef: 'next1', gata: '12' },
    expect.any(String),
  );
  await act(() => tree.update(<FeedingQueuePanel {...props} />));
  expect(props.onCommand).toHaveBeenCalledTimes(1);
  props = {
    ...props,
    snapshot: { ...page, revision: 2, listPagination: { key: '2' } },
  };
  await act(async () => tree.update(<FeedingQueuePanel {...props} />));
  expect(props.onCommand).toHaveBeenLastCalledWith(
    { type: 'plot', plotRef: 'p12', gata: '12' },
    expect.any(String),
  );
});
test('a different official village pauses before list pagination', async () => {
  await open({
    ...page,
    plots: [],
    listPagination: { key: '1', nextRef: 'next1' },
    officialContext: { villageCode: '999999' },
  });
  await start();
  expect(props.onCommand).not.toHaveBeenCalled();
  expect(props.onPause).toHaveBeenCalled();
});

test('reset archives work before clearing the queue and failed archiving keeps existing work', async () => {
  await open();
  const original = await saved();
  await tap('Reset queue');
  await confirm();
  expect((await saved()).items).toEqual([]);
  const archiveKey = (await AsyncStorage.getAllKeys()).find(k =>
    k.startsWith(`${scope}-queue-archive-`),
  )!;
  expect(JSON.parse((await AsyncStorage.getItem(archiveKey))!).items).toEqual(
    original.items,
  );
  await act(async () => tree.unmount());
  await open();
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(Error('Disk full'));
  await tap('Reset queue');
  await confirm();
  expect((await saved()).items).toHaveLength(2);
});
test('imported queue does not open plots without complete official context', async () => {
  await open();
  await act(async () => tree.unmount());
  const {
    importKhasraBulk,
    parseKhasraBulk,
  } = require('../src/domain/khasraBulk');
  await AsyncStorage.setItem(
    key,
    JSON.stringify(
      importKhasraBulk(
        emptyFeedingQueue(scope),
        parseKhasraBulk('12|धान|1|yes'),
      ),
    ),
  );
  props = { ...props, onStartBulk: jest.fn() };
  await act(async () => {
    tree = Renderer.create(<FeedingQueuePanel {...props} />);
  });
  await start();
  expect(props.onCommand).not.toHaveBeenCalled();
  expect((await saved()).running).toBe(false);
});
