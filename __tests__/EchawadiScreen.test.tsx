import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EchawadiScreen from '../src/screens/EchawadiScreen';
import { echawadiUrl, EchawadiSnapshot } from '../src/domain/echawadi';
const mockInject = jest.fn();
jest.mock('react-native-webview', () => {
  const R = require('react');
  return {
    WebView: R.forwardRef((props: any, ref: any) => {
      R.useImperativeHandle(ref, () => ({
        injectJavaScript: mockInject,
        reload: jest.fn(),
      }));
      return R.createElement('WebView', props);
    }),
  };
});
jest.mock('react-native-html-to-pdf', () => ({ generatePDF: jest.fn() }));
jest.mock('react-native-share', () => ({ open: jest.fn() }));
jest.mock('../src/components/AppScreen', () => 'AppScreen');
jest.mock('../src/components/AppHeader', () => 'AppHeader');
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));
let root: Renderer.ReactTestRenderer;
const page: EchawadiSnapshot = {
  channel: 'lekhpal-echawadi-v1',
  type: 'snapshot',
  documentId: 'one',
  revision: 1,
  url: echawadiUrl('demand'),
  mode: 'demand',
  busy: false,
  page: 1,
  next: true,
  context: 'Village 1',
  headers: ['Account', 'Amount'],
  rows: [
    {
      key: '1',
      cells: ['1', '100'],
      amount: 100,
      selectable: true,
      checked: false,
    },
  ],
};
const button = (label: string) =>
  root.root.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  )[0];
const message = async (value: any) =>
  act(async () =>
    root.root.findByType('WebView' as any).props.onMessage({
      nativeEvent: { url: value.url, data: JSON.stringify(value) },
    }),
  );
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await act(async () => {
    root = Renderer.create(
      <EchawadiScreen
        navigation={{ goBack: jest.fn() } as any}
        route={{ name: 'Echawadi', key: 'mh' }}
      />,
    );
  });
});
beforeEach(async () => {
  await act(() =>
    root.root
      .findAllByType('AppHeader' as any)[0]
      .props.rightIcons[0].onPress(),
  );
});
afterEach(async () => {
  await act(() => root.unmount());
});
test('demand pagination waits for selection confirmation, then stops at the requested page without submitting', async () => {
  await message(page);
  await act(() =>
    root.root
      .findAllByType(TextInput)
      .find(n => n.props.accessibilityLabel === 'Through page')!
      .props.onChangeText('2'),
  );
  await act(() => button('Prepare demand selection').props.onPress());
  expect(mockInject.mock.calls.at(-1)[0]).toContain('"action":"select"');
  await message({
    ...page,
    revision: 2,
    rows: [{ ...page.rows[0], checked: true }],
  });
  expect(mockInject.mock.calls.at(-1)[0]).toContain('"action":"next"');
  await message({
    ...page,
    revision: 3,
    page: 2,
    next: false,
    rows: [{ ...page.rows[0], checked: true }],
  });
  expect(JSON.stringify(root.toJSON())).toContain('Selection prepared');
  expect(mockInject.mock.calls).toHaveLength(2);
  expect(mockInject.mock.calls.flat().join('')).not.toMatch(
    /submit|generateDemand|receiveMoney/,
  );
});
test('changing village interrupts a batch and rejects further automatic actions', async () => {
  await message(page);
  await act(() => button('Prepare demand selection').props.onPress());
  const count = mockInject.mock.calls.length;
  await message({ ...page, revision: 2, context: 'Village 2' });
  expect(mockInject.mock.calls).toHaveLength(count);
  expect(JSON.stringify(root.toJSON())).toContain('village changed');
});
test('official page remains full-size and links cannot escape into another state', () => {
  const web = root.root.findByType('WebView' as any);
  expect(web.props.setSupportMultipleWindows).toBe(false);
  expect(
    web.props.onShouldStartLoadWithRequest({
      url: 'https://upbhulekh.gov.in/',
    }),
  ).toBe(false);
  expect(
    web.props.onShouldStartLoadWithRequest({ url: echawadiUrl('receipts') }),
  ).toBe(true);
});

test('opens home for login before protected demand routes', () => {
  expect(root.root.findByType('WebView' as any).props.source.uri).toBe(
    'https://echawadi.mahabhumi.gov.in/',
  );
});

test('Cash batch searches the exact account and waits for persisted confirmation before the next', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const receipts = {
    ...page,
    url: echawadiUrl('receipts'),
    mode: 'receipts',
    rows: [],
    page: 0,
    next: false,
  };
  await message(receipts);
  await act(() =>
    root.root
      .findAllByType(TextInput)
      .find(n => n.props.accessibilityLabel === 'Receipt account numbers')!
      .props.onChangeText('001\n002'),
  );
  await act(() => button('Load accounts').props.onPress());
  await act(() => button('Start Cash payment batch').props.onPress());
  await act(async () => {
    alert.mock.calls.at(-1)![2]!.find(b => b.text === 'Start')!.onPress!();
  });
  expect(mockInject.mock.calls.at(-1)[0]).toContain(
    '"action":"search","value":"001"',
  );
  await message({
    ...receipts,
    revision: 2,
    canSubmit: true,
    payment: { account: '009', amount: 100, method: 'Cash' },
  });
  expect(mockInject.mock.calls.flat().join('')).not.toContain(
    '"action":"submit"',
  );
  await message({
    ...receipts,
    revision: 3,
    canSubmit: true,
    payment: { account: '001', amount: 100, method: 'Cash' },
  });
  const command = JSON.parse(
    mockInject.mock.calls.at(-1)[0].match(/command\((.*)\); true;/)[1],
  );
  expect(command).toMatchObject({
    action: 'submit',
    value: { account: '001', amount: 100 },
  });
  expect(mockInject.mock.calls.flat().join('')).not.toContain(
    '"action":"search","value":"002"',
  );
  await message({
    channel: 'lekhpal-echawadi-v1',
    type: 'transaction',
    id: command.value.id,
    state: 'confirmed',
    message: 'Official success',
    url: receipts.url,
  });
  expect(mockInject.mock.calls.at(-1)[0]).toContain(
    '"action":"search","value":"002"',
  );
  alert.mockRestore();
});
