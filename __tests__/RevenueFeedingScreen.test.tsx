import React from 'react';
import { PortalWorkPanel } from '../src/components/revenue/PortalWorkControls';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RevenueFeedingScreen from '../src/screens/RevenueFeedingScreen';
import { RevenueModule, RevenueSnapshot } from '../src/domain/revenueFeeding';
import { REVENUE_PORTAL_PRESENTATION } from '../src/utils/revenuePortalPresentation';
const mockInject = jest.fn();
jest.mock('react-native-webview', () => {
  const R = require('react');
  return {
    WebView: R.forwardRef((props: any, ref: any) => {
      R.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
      return R.createElement('WebView', props);
    }),
  };
});
jest.mock('../src/components/AppHeader', () => 'AppHeader');
jest.mock('../src/components/AppScreen', () => 'AppScreen');
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));
const page: RevenueSnapshot = {
  channel: 'lekhpal-revenue-v1',
  type: 'snapshot',
  module: 'ansh',
  documentId: 'doc',
  revision: 1,
  url: 'https://upbhulekh.gov.in/bhulekh/mutAnshNirdharanInsertRtk',
  stage: 'share',
  busy: false,
  failed: false,
  ownersReady: false,
  fields: ['area', 'share', 'hissa'].map((key, i) => ({
    key,
    ref: key,
    label: key,
    kind: 'text' as const,
    value: ['1.0001', '1/1', '1.0001'][i],
    required: false,
    readOnly: i === 0,
    options: [],
  })),
  actions: [{ ref: 'save', label: 'Save share', kind: 'save' }],
  selection: { gata: '', owner: '' },
  ownerCounts: {},
  notice: '',
  result: 'unconfirmed',
};
let tree: Renderer.ReactTestRenderer;
const web = () => tree.root.findByType('WebView' as any);
const control = (label: string) =>
  tree.root.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  )[0];
const tap = async (label: string) =>
  act(async () => {
    const c = control(label);
    expect(c.props.disabled).not.toBe(true);
    c.props.onPress();
  });
const type = async (label: string, text: string) =>
  act(async () => {
    tree.root
      .findAll(
        n =>
          n.props.accessibilityLabel === label &&
          typeof n.props.onChangeText === 'function',
      )[0]
      .props.onChangeText(text);
  });
const message = async (data: any, url = data.url || page.url) =>
  act(async () => {
    web().props.onMessage({ nativeEvent: { url, data: JSON.stringify(data) } });
  });
const command = () => {
  const js = mockInject.mock.calls.slice(-1)[0][0] as string;
  return JSON.parse(
    js.slice(js.indexOf('.command(') + 9, js.lastIndexOf('); true;')),
  );
};
const confirm = async () =>
  act(async () => {
    jest
      .mocked(Alert.alert)
      .mock.calls.slice(-1)[0][2]!
      .find(b => b.text === 'Continue')!.onPress!();
  });
async function open(module: RevenueModule = 'ansh') {
  await act(async () => {
    tree = Renderer.create(
      <RevenueFeedingScreen
        navigation={{ goBack: jest.fn() } as any}
        route={{ name: 'RevenueFeeding', key: module, params: { module } }}
      />,
    );
  });
}
const result = async (outcome: string, url?: string) =>
  message(
    {
      channel: page.channel,
      type: 'result',
      id: command().id,
      outcome,
      message: outcome,
    },
    url,
  );
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
test('opens separate official modules without initial writes and rejects unrelated origins', async () => {
  await open();
  expect(web().props.source.uri).toBe('https://upbhulekh.gov.in/bhulekh/');
  expect(mockInject).not.toHaveBeenCalled();
  expect(
    web().props.onShouldStartLoadWithRequest({
      url: 'https://upbhulekh.gov.in.evil.test',
    }),
  ).toBe(false);
  await message(page, 'https://example.com');
  expect(control('Save share')).toBeUndefined();
});
test('calculates share and fills only changed fields without resending unrelated selectors', async () => {
  await open();
  await message(page);
  await type('Share fraction', '1/2');
  await tap('Calculate share area');
  expect(control('Save share').props.disabled).toBe(true);
  await tap('Fill official form');
  expect(command().values).toEqual({ share: '1/2', hissa: '0.5001' });
});
test('destructive confirmation is bound to the exact page and Stop invalidates it', async () => {
  await open('ansh-delete');
  const deletion = {
    ...page,
    module: 'ansh-delete',
    stage: 'delete',
    actions: [
      { ref: 'remove', label: 'Remove this share entry', kind: 'delete' },
    ],
  };
  await message(deletion);
  await tap('Remove this share entry');
  expect(mockInject).not.toHaveBeenCalled();
  await message({ ...deletion, revision: 2 });
  await confirm();
  expect(mockInject).not.toHaveBeenCalled();
  await tap('Remove this share entry');
  await tap('Stop');
  mockInject.mockClear();
  await confirm();
  expect(mockInject).not.toHaveBeenCalled();
});
test('persists pending write before dispatch and never dispatches when storage fails', async () => {
  await open();
  await message(page);
  jest
    .mocked(AsyncStorage.setItem)
    .mockRejectedValueOnce(new Error('disk full'));
  await tap('Save share');
  await confirm();
  expect(mockInject).not.toHaveBeenCalled();
  await tap('Save share');
  await confirm();
  const pending = JSON.parse(
    (await AsyncStorage.getItem('lekhpal-revenue-ansh-pending'))!,
  );
  expect(pending.id).toBe(command().id);
  expect(pending.outcome).toBe('pending');
  await result('confirmed');
  expect(await AsyncStorage.getItem('lekhpal-revenue-ansh-pending')).toBeNull();
  expect(
    JSON.parse((await AsyncStorage.getItem('lekhpal-revenue-ansh-history'))!)[0]
      .outcome,
  ).toBe('confirmed');
});
test('a Prapatra owner toast is insufficient; a matching new owner-table row confirms across navigation', async () => {
  await open('prapatra5');
  const owners = {
    ...page,
    module: 'prapatra5',
    url: 'https://svamitva.up.gov.in/entryF5/addMoreandnewpage',
    stage: 'owners',
    ownerProof: { key: 'hashram', count: 1 },
    ownerCounts: { hashram: 1 },
    actions: [{ ref: 'owner', label: 'Save owner', kind: 'owner-save' }],
  };
  await message(owners);
  await tap('Save owner');
  await confirm();
  await message({
    ...owners,
    revision: 2,
    notice: 'Saved successfully',
    result: 'saved',
  });
  expect(control('Save owner').props.disabled).toBe(true);
  await message({ ...owners, documentId: 'next', ownerCounts: { hashram: 2 } });
  const history = JSON.parse(
    (await AsyncStorage.getItem('lekhpal-revenue-prapatra5-history'))!,
  );
  expect(history[0].outcome).toBe('confirmed');
});
test('a new document success toast alone cannot confirm an owner save', async () => {
  await open('prapatra5');
  const owners = {
    ...page,
    module: 'prapatra5',
    url: 'https://svamitva.up.gov.in/entryF5/addMoreandnewpage',
    stage: 'owners',
    ownerProof: { key: 'hashram', count: 0 },
    actions: [{ ref: 'owner', label: 'Save owner', kind: 'owner-save' }],
  };
  await message(owners);
  await tap('Save owner');
  await confirm();
  await message({ ...owners, documentId: 'next', result: 'saved' });
  expect(control('Save owner').props.disabled).toBe(true);
});
test('Stop before delayed journal persistence prevents the official write', async () => {
  await open();
  await message(page);
  let release!: () => void;
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        release = resolve;
      }),
  );
  await tap('Save share');
  await confirm();
  await tap('Stop');
  mockInject.mockClear();
  await act(async () => release());
  expect(mockInject).not.toHaveBeenCalled();
});
test('Ansh success needs a freshly loaded pending-owner list for the same gata', async () => {
  await open();
  const selection = {
    ...page,
    stage: 'selection',
    selection: { gata: 'g1', owner: 'o1' },
    ownersReady: true,
    fields: [
      {
        ...page.fields[1],
        ref: 'gata',
        key: 'gataNumber',
        value: 'g1',
        kind: 'select',
        options: [{ value: 'g1', label: '1' }],
      },
      {
        ...page.fields[1],
        ref: 'owner',
        key: 'ownerName',
        value: 'o1',
        kind: 'select',
        options: [{ value: 'o1', label: 'Ram' }],
      },
    ],
    actions: [],
  };
  await message(selection);
  await message(page);
  await tap('Save share');
  await confirm();
  await message({ ...selection, documentId: 'next', ownersReady: false });
  expect(command().type).toBe('fill');
  await message({
    ...selection,
    documentId: 'next',
    revision: 2,
    ownersReady: true,
    fields: [
      selection.fields[0],
      { ...selection.fields[1], value: '', options: [] },
    ],
  });
  expect(
    JSON.parse((await AsyncStorage.getItem('lekhpal-revenue-ansh-history'))!)[0]
      .outcome,
  ).toBe('confirmed');
});
test('batch selects the next owner only after gata owners are ready', async () => {
  await open();
  const selection = {
    ...page,
    stage: 'selection',
    selection: { gata: 'g1', owner: '' },
    ownersReady: false,
    fields: [
      {
        ...page.fields[1],
        ref: 'gata',
        key: 'gataNumber',
        value: 'g1',
        kind: 'select',
        options: [{ value: 'g1', label: '1' }],
      },
      {
        ...page.fields[1],
        ref: 'owner',
        key: 'ownerName',
        value: '',
        kind: 'select',
        options: [
          { value: '', label: 'Choose' },
          { value: 'o1', label: 'Ram' },
        ],
      },
    ],
    actions: [{ ref: 'open', label: 'Open selected owner', kind: 'navigate' }],
  };
  await message(selection);
  await tap('Normal · current gata');
  expect(command().values).toEqual({ gata: 'g1' });
  await result('filled');
  await message({ ...selection, revision: 2, ownersReady: true });
  expect(command().values).toEqual({ owner: 'o1' });
});
test('interrupted saved operations recover as uncertain without automatic replay', async () => {
  await AsyncStorage.setItem(
    'lekhpal-revenue-ansh-pending',
    JSON.stringify({
      id: 'old',
      module: 'ansh',
      at: 'now',
      documentId: 'old-doc',
      url: page.url,
      action: 'Save',
      kind: 'save',
      stage: 'share',
      gata: 'g1',
      owner: 'o1',
      outcome: 'pending',
      message: '',
    }),
  );
  await open();
  await message(page);
  expect(mockInject).not.toHaveBeenCalled();
  expect(
    JSON.parse((await AsyncStorage.getItem('lekhpal-revenue-ansh-history'))!)[0]
      .outcome,
  ).toBe('uncertain');
});

test.each<RevenueModule>(['ansh', 'ansh-delete', 'prapatra5'])(
  '%s gives the official form the full screen and retains its settings',
  async module => {
    await open(module);
    const browser = web();
    expect(browser.props.injectedJavaScriptBeforeContentLoaded).toBe(
      REVENUE_PORTAL_PRESENTATION,
    );
    expect(browser.props.injectedJavaScript).toContain(
      REVENUE_PORTAL_PRESENTATION,
    );
    const panel = () => tree.root.findByType(PortalWorkPanel);
    expect(panel().props.visible).toBe(false);
    const openSettings = () =>
      tree.root
        .findAllByType('AppHeader' as any)
        .find(header =>
          header.props.rightIcons?.some(
            (action: any) => action.accessibilityLabel === 'Work settings',
          ),
        )!
        .props.rightIcons.find(
          (action: any) => action.accessibilityLabel === 'Work settings',
        )
        .onPress();
    await act(async () => openSettings());
    expect(panel().props.visible).toBe(true);
    const settingsBody = panel().findByProps({
      testID: 'portal-work-settings',
    });
    await act(async () => panel().props.onClose());
    expect(panel().props.visible).toBe(false);
    expect(web()).toBe(browser);
    expect(panel().findByProps({ testID: 'portal-work-settings' })).toBe(
      settingsBody,
    );
    if (module === 'ansh') {
      await message(page);
      expect(panel().props.visible).toBe(false);
    }
  },
);
