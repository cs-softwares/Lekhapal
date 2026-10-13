import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AppState, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EroPdfScreen from '../src/screens/EroPdfScreen';
import { ERO_STORAGE, EroSnapshot } from '../src/domain/eroPdf';
import { saveOfficialPdf } from '../src/native/workFiles';
const mockInject = jest.fn(),
  mockBack = jest.fn();
jest.mock('../src/components/ero/EroPortal', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: R.forwardRef((props: any, ref: any) => {
      R.useImperativeHandle(ref, () => ({
        injectJavaScript: mockInject,
        goBack: mockBack,
      }));
      return R.createElement('EroPortal', props);
    }),
  };
});
jest.mock('../src/native/workFiles', () => ({
  saveOfficialPdf: jest.fn(),
  exportOfficialPdf: jest.fn(),
  printOfficialPdf: jest.fn(),
}));
jest.mock('../src/components/AppScreen', () => 'AppScreen');
jest.mock('../src/components/AppHeader', () => 'AppHeader');
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));
const page: EroSnapshot = {
  channel: 'lekhpal-ero-v1',
  type: 'snapshot',
  documentId: 'list',
  revision: 1,
  url: 'https://officials.eci.gov.in/suomotoDSE',
  stage: 'list',
  busy: false,
  context: 'AC=20',
  page: 1,
  rows: [1, 2, 3, 4, 5].map(n => ({
    ref: 'r' + n,
    key: 'id' + n,
    serial: n,
    label: 'Record ' + n,
  })),
  next: 'next',
};
const record = (n = 5): EroSnapshot => ({
  ...page,
  documentId: 'record' + n,
  url:
    'https://officials.eci.gov.in/ero/suomotoDSE/checklist-processing-action/' +
    n,
  stage: 'record',
  rows: [],
  download: 'download',
  back: 'back',
});
let root: Renderer.ReactTestRenderer;
const button = (label: string) =>
  root.root.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  )[0];
const event = async (kind: string, data: any = {}, url = page.url) =>
  act(async () =>
    root.root.findByType('EroPortal' as any).props.onEvent({
      kind,
      data: JSON.stringify(data),
      url,
      canGoBack: true,
    }),
  );
const message = (data: any) => event('message', data, data.url || page.url);
const last = () => {
  const script = mockInject.mock.calls.at(-1)?.[0] || '';
  return JSON.parse(script.match(/\.command\((.+)\);true;/)[1]);
};
const storage = async () =>
  JSON.parse((await AsyncStorage.getItem(ERO_STORAGE))!);
const range = async (from = '5', to = '6') =>
  act(async () => {
    for (const [label, value] of [
      ['From serial', from],
      ['Through serial', to],
    ])
      root.root
        .findAllByType(TextInput)
        .find(n => n.props.accessibilityLabel === label)!
        .props.onChangeText(value);
  });
const start = async () =>
  act(async () => button('Download selected range').props.onPress());
const pdf = async (command = last(), p = record()) =>
  message({
    channel: page.channel,
    type: 'pdf',
    id: command.id,
    documentId: p.documentId,
    url: p.url,
    base64: 'JVBERi0xLjc=',
  });
const mount = async () =>
  act(async () => {
    root = Renderer.create(<EroPdfScreen navigation={{ goBack: jest.fn() }} />);
  });
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  (saveOfficialPdf as jest.Mock).mockResolvedValue('/files/ero-pdfs/test.pdf');
  await mount();
  await message(page);
  await range();
});
afterEach(async () => act(() => root.unmount()));
test('downloads records 5 and 6 across page boundary, saves progress before advancing, then stops', async () => {
  await start();
  expect(last()).toMatchObject({ type: 'open', ref: 'r5', record: 'id5' });
  expect((await storage()).batch.next).toBe(5);
  await message(record());
  expect(last()).toMatchObject({ type: 'download', ref: 'download' });
  await pdf();
  expect((await storage()).batch).toMatchObject({ next: 6, done: [5] });
  expect(last()).toMatchObject({ type: 'navigate', ref: 'back' });
  await message(page);
  expect(last()).toMatchObject({ type: 'navigate', ref: 'next' });
  const nextPage = {
    ...page,
    revision: 2,
    page: 2,
    rows: [{ ref: 'r6', key: 'id6', serial: 6, label: 'Record 6' }],
    next: undefined,
    previous: 'previous',
  };
  await message(nextPage);
  expect(last()).toMatchObject({ type: 'open', ref: 'r6' });
  await message(record(6));
  await pdf(last(), record(6));
  expect((await storage()).batch).toMatchObject({ next: 7, done: [5, 6] });
  expect((await storage()).files).toHaveLength(2);
  expect(last()).toEqual({ type: 'stop' });
});
test('save must finish before return; replayed PDF message is not saved twice', async () => {
  let resolve: any;
  (saveOfficialPdf as jest.Mock).mockImplementation(
    () =>
      new Promise(r => {
        resolve = r;
      }),
  );
  await start();
  await message(record());
  const command = last();
  await pdf(command);
  await pdf(command);
  expect(saveOfficialPdf).toHaveBeenCalledTimes(1);
  expect((await storage()).batch.next).toBe(5);
  expect(last()).toEqual(command);
  await act(async () => resolve('/files/ero-pdfs/5.pdf'));
  expect(last()).toMatchObject({ type: 'navigate', ref: 'back' });
  expect((await storage()).batch.next).toBe(6);
});
test('native save failure leaves the current record uncompleted and stops', async () => {
  (saveOfficialPdf as jest.Mock).mockRejectedValue(Error('Disk full'));
  await start();
  await message(record());
  await pdf();
  expect((await storage()).batch.next).toBe(5);
  expect((await storage()).files).toHaveLength(0);
  expect(last()).toEqual({ type: 'stop' });
  expect(JSON.stringify(root.toJSON())).toContain('Disk full');
});
test('storage failure after native save stops without skipping a record', async () => {
  await start();
  await message(record());
  const write = jest
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(Error('Storage failed'));
  await pdf();
  expect((await storage()).batch.next).toBe(5);
  expect(last()).toEqual({ type: 'stop' });
  write.mockRestore();
});
test('touch pause rejects late PDF, and restored progress never starts itself', async () => {
  await start();
  await message(record());
  const command = last();
  await event('touch');
  await pdf(command);
  expect(saveOfficialPdf).not.toHaveBeenCalled();
  expect(last()).toEqual({ type: 'stop' });
  await act(() => root.unmount());
  mockInject.mockClear();
  await mount();
  await message(page);
  expect(mockInject).not.toHaveBeenCalled();
  expect(JSON.stringify(root.toJSON())).toContain('paused');
  await act(async () => button('Resume saved range').props.onPress());
  expect(last()).toMatchObject({ type: 'open', ref: 'r5' });
});
test('Stop during native save records the finished file but does not continue', async () => {
  let resolve: any;
  (saveOfficialPdf as jest.Mock).mockImplementation(
    () =>
      new Promise(r => {
        resolve = r;
      }),
  );
  await start();
  await message(record());
  await pdf();
  await event('touch');
  await act(async () => resolve('/files/ero-pdfs/5.pdf'));
  expect((await storage()).batch.next).toBe(6);
  expect(last()).toEqual({ type: 'stop' });
});
test('changed list filters and navigation to login stop a range', async () => {
  await start();
  await message(record());
  await pdf();
  await message({ ...page, context: 'AC=99' });
  expect(last()).toEqual({ type: 'stop' });
  expect((await storage()).batch.next).toBe(6);
  await message({ ...page, stage: 'login' });
  expect(last()).toEqual({ type: 'stop' });
});
test('untrusted origin or wrong record PDF cannot reach native storage', async () => {
  await start();
  await message(record());
  const command = last();
  const data = {
    channel: page.channel,
    type: 'pdf',
    id: command.id,
    documentId: 'record5',
    url: record().url,
    base64: 'JVBERi0xLjc=',
  };
  await event('message', data, 'https://evil.test');
  await message({ ...data, documentId: 'different' });
  expect(saveOfficialPdf).not.toHaveBeenCalled();
});
test('pending transitions time out without incrementing progress', async () => {
  jest.useFakeTimers();
  await start();
  await act(() => jest.advanceTimersByTime(45001));
  expect(last()).toEqual({ type: 'stop' });
  expect((await storage()).batch.next).toBe(5);
  jest.useRealTimers();
});
test('app background pauses an armed download', async () => {
  const listener = jest.spyOn(AppState, 'addEventListener');
  await act(() => root.unmount());
  await mount();
  const change = listener.mock.calls
    .filter(([name]) => name === 'change')
    .at(-1)![1];
  await message(page);
  await range();
  await start();
  await message(record());
  const command = last();
  await act(() => change('background'));
  await pdf(command);
  expect(saveOfficialPdf).not.toHaveBeenCalled();
  listener.mockRestore();
});
