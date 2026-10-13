import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrapatraQueuePanel from '../src/components/revenue/PrapatraQueuePanel';
import {
  propertyNumbers,
  receivePropertyResult,
  PropertyQueue,
} from '../src/domain/prapatraQueue';
import { RevenueSnapshot } from '../src/domain/revenueFeeding';
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));
const context = { village: 'v1', survey: '2026', gata: '12' };
const queue: PropertyQueue = {
  context,
  items: [
    { number: '1', status: 'prepared' },
    { number: '2', status: 'pending' },
  ],
};
const page: RevenueSnapshot = {
  channel: 'lekhpal-revenue-v1',
  type: 'snapshot',
  module: 'prapatra5',
  documentId: 'doc',
  revision: 1,
  url: 'https://svamitva.up.gov.in/entryF5/propertyDetailEntry.jsp?formType=5',
  stage: 'property',
  busy: false,
  failed: false,
  ownersReady: false,
  fields: Object.entries({
    village: 'v1',
    survey: '2026',
    khasraNo: '12',
    entrySeqNo: '',
  }).map(([key, value]) => ({
    key,
    ref: key,
    label: key,
    value,
    kind: 'text',
    readOnly: false,
    required: false,
    options: [],
  })),
  actions: [],
  selection: { gata: '', owner: '' },
  ownerCounts: {},
  notice: '',
  result: 'unconfirmed',
};
const KEY = 'lekhpal-prapatra5-property-queue-v1';
let tree: Renderer.ReactTestRenderer;
const fill = jest.fn();
const button = (label: string) =>
  tree.root.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  )[0];
const tap = async (label: string) =>
  act(async () => {
    expect(button(label).props.disabled).not.toBe(true);
    button(label).props.onPress();
  });
async function open() {
  await act(async () => {
    tree = Renderer.create(
      <PrapatraQueuePanel page={page} enabled receipt={null} onFill={fill} />,
    );
  });
}
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  jest.spyOn(AsyncStorage, 'setItem');
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  jest.restoreAllMocks();
});
test('ranges and custom numbers are bounded, Hindi-aware and deduplicated', () => {
  expect(propertyNumbers('१', '३', '')).toEqual(['1', '2', '3']);
  expect(propertyNumbers('', '', '9,2,9;३')).toEqual(['9', '2', '3']);
  expect(() => propertyNumbers('1', '1001', '')).toThrow();
  expect(() => propertyNumbers('', '', '1/2')).toThrow();
});
test('completion belongs only to the prepared property in the same village/year/gata', () => {
  expect(
    receivePropertyResult(queue, {
      id: 'a',
      number: '1',
      context: { ...context, gata: '13' },
      confirmed: true,
    }),
  ).toBe(queue);
  expect(
    receivePropertyResult(queue, {
      id: 'a',
      number: '2',
      context,
      confirmed: true,
    }).items[1].status,
  ).toBe('pending');
  expect(
    receivePropertyResult(queue, {
      id: 'a',
      number: '1',
      context,
      confirmed: false,
    }).items[0].status,
  ).toBe('uncertain');
});
test('queue is persisted before preparing, and storage failure cannot fill the portal', async () => {
  await open();
  await tap('Create property queue');
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(Error('full'));
  await tap('Prepare current property');
  expect(fill).not.toHaveBeenCalled();
  await tap('Prepare current property');
  expect(fill).toHaveBeenCalledWith({ entrySeqNo: '1' });
  expect(JSON.parse((await AsyncStorage.getItem(KEY))!).items[0].status).toBe(
    'prepared',
  );
});
test('reopening marks unfinished preparation uncertain and never automatically refills', async () => {
  await AsyncStorage.setItem(KEY, JSON.stringify(queue));
  await open();
  expect(fill).not.toHaveBeenCalled();
  expect(JSON.parse((await AsyncStorage.getItem(KEY))!).items[0].status).toBe(
    'uncertain',
  );
  await act(async () =>
    tree.update(
      <PrapatraQueuePanel
        page={{
          ...page,
          fields: page.fields.map(f =>
            f.key === 'village' ? { ...f, value: 'v2' } : f,
          ),
        }}
        enabled
        receipt={null}
        onFill={fill}
      />,
    ),
  );
  expect(button('Prepare current property').props.disabled).toBe(true);
});
test('a confirmed receipt advances the queue without submitting the next property', async () => {
  await open();
  await tap('Create property queue');
  await tap('Prepare current property');
  fill.mockClear();
  await act(async () =>
    tree.update(
      <PrapatraQueuePanel
        page={page}
        enabled
        receipt={{ id: 'save', context, number: '1', confirmed: true }}
        onFill={fill}
      />,
    ),
  );
  expect(JSON.parse((await AsyncStorage.getItem(KEY))!).items[0].status).toBe(
    'confirmed',
  );
  expect(fill).not.toHaveBeenCalled();
});

test('Stop while preparation is being saved prevents a late form fill', async () => {
  await open();
  await tap('Create property queue');
  let release!: () => void;
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        release = resolve;
      }),
  );
  await tap('Prepare current property');
  await act(async () =>
    tree.update(
      <PrapatraQueuePanel
        page={page}
        enabled
        receipt={null}
        stopToken={1}
        onFill={fill}
      />,
    ),
  );
  await act(async () => release());
  expect(fill).not.toHaveBeenCalled();
});
