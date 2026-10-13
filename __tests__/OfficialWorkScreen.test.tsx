import React from 'react';
import { REVENUE_PORTAL_PRESENTATION } from '../src/utils/revenuePortalPresentation';
import { PortalWorkPanel } from '../src/components/revenue/PortalWorkControls';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OfficialWorkScreen from '../src/screens/OfficialWorkScreen';
import { DEFAULT_CENSUS_RULES } from '../src/domain/census';
import {
  OfficialWorkModule,
  OfficialWorkSnapshot,
} from '../src/domain/officialWork';
jest.mock('react-native-html-to-pdf', () => ({ generatePDF: jest.fn() }));
jest.mock('react-native-share', () => ({ open: jest.fn() }));
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
const page: OfficialWorkSnapshot = {
  channel: 'lekhpal-official-work-v1',
  type: 'snapshot',
  documentId: 'doc',
  revision: 1,
  url: 'https://svamitva.up.gov.in/entry/form9.jsp',
  stage: 'entry',
  busy: false,
  identity: 'plot1',
  context: 'village=123456',
  fields: [],
  actions: [{ ref: 'approve', label: 'Approve', kind: 'approve' }],
  entries: [],
  notice: '',
  success: false,
  error: false,
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
      .find(b => b.text === 'Start')!.onPress!();
  });
async function open(module: OfficialWorkModule = 'survey9') {
  await act(async () => {
    tree = Renderer.create(
      <OfficialWorkScreen
        navigation={{ goBack: jest.fn() } as any}
        route={{ name: 'OfficialWork', key: module, params: { module } }}
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
      state: outcome,
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

test('Census Phase 2 journals Save before dispatch and starts the next holding only after confirmation', async () => {
  const rules = {
    ...DEFAULT_CENSUS_RULES,
    mode: 'phase2',
    phase2Crops: [{ code: '106', areaPercent: '100', irrigatedPercent: '0' }],
  };
  await AsyncStorage.setItem(
    'lekhpal-official-census-census',
    JSON.stringify({ rules, presets: {} }),
  );
  await open('census');
  let p: OfficialWorkSnapshot = {
    ...page,
    identity: '1',
    url: 'https://agcensus.gov.in/AgriCensus/Schedule_H.jsp',
    censusOperatedStatus: 'Fully operated',
    censusOperatedArea: '1',
    censusCropCodes: ['106'],
    fields: [
      ['tot_crops', '1'],
      ['field_05', '0'],
      ['field_06', '1'],
      ['irri_ar_10', '0'],
      ['unirri_ar_10', '1'],
    ].map(([key, value]) => ({
      key,
      ref: key,
      label: key,
      value,
      kind: 'text',
      options: [],
    })),
    actions: [
      { ref: 'calculate', label: 'Calculate census area', kind: 'navigate' },
      { ref: 'save', label: 'Save census entry', kind: 'save' },
      { ref: 'serial', label: 'Open serial list', kind: 'navigate' },
    ],
  };
  await message(p);
  await type('Batch from', '1');
  await type('Batch to', '2');
  await tap('Start selected batch');
  await confirm();
  expect(command()).toMatchObject({ type: 'action', ref: 'calculate' });
  await result('navigated', p.url);
  p = { ...p, revision: 2, censusCalculated: true };
  await message(p);
  const save = command();
  expect(save).toMatchObject({
    type: 'action',
    ref: 'save',
    record: '1',
    confirmDialogs: true,
  });
  expect(
    JSON.parse(
      (await AsyncStorage.getItem('lekhpal-official-census-pending'))!,
    ),
  ).toMatchObject({ id: save.id, record: '1', state: 'pending' });
  await message({ ...p, revision: 3 });
  expect(command().id).toBe(save.id);
  await result('confirmed', p.url);
  expect(
    JSON.parse((await AsyncStorage.getItem('lekhpal-official-census-batch'))!)
      .done,
  ).toEqual(['1']);
  expect(command()).toMatchObject({
    type: 'action',
    ref: 'serial',
    record: '2',
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('persists approval before dispatch and recovers an interrupted batch without automatic resubmission', async () => {
  await open();
  await message(page);
  await tap('Start selected batch');
  await confirm();
  const item = JSON.parse(
    (await AsyncStorage.getItem('lekhpal-official-survey9-pending'))!,
  );
  expect(item.id).toBe(command().id);
  expect(command().type).toBe('action');
  await act(async () => tree.unmount());
  mockInject.mockClear();
  await open();
  await message(page);
  expect(mockInject).not.toHaveBeenCalled();
  await tap('Resume saved batch');
  expect(mockInject).not.toHaveBeenCalled();
  expect(
    JSON.parse(
      (await AsyncStorage.getItem('lekhpal-official-survey9-history'))!,
    )[0].state,
  ).toBe('uncertain');
});
test('Farmer Registry refuses automatic approval when names are not a complete match', async () => {
  await open('registry');
  await message({
    ...page,
    url: 'https://upfr.agristack.gov.in/farmer-registry-up/#/approval',
    nameMatch: 92,
  });
  await tap('Start selected batch');
  await confirm();
  expect(
    mockInject.mock.calls.some(([js]) => js.includes('"type":"action"')),
  ).toBe(false);
});
test('inspector fills exactly the requested range before submitting a durable approval', async () => {
  await open('inspector');
  const inspector = {
    ...page,
    url: 'https://ekhasra.up.gov.in/#/inspector',
    fields: ['A', 'B', 'C'].map(key => ({
      ref: key,
      key: 'approval:' + key,
      label: key,
      value: key === 'A' ? 'true' : 'false',
      kind: 'checkbox',
      options: [],
    })),
  };
  await message(inspector);
  await type('Batch from', '2');
  await type('Batch to', '3');
  await tap('Start selected batch');
  await confirm();
  expect(command().values).toEqual({ A: 'false', B: 'true', C: 'true' });
  await result('filled', inspector.url);
  await message({
    ...inspector,
    revision: 2,
    fields: inspector.fields.map(f => ({
      ...f,
      value: f.ref === 'A' ? 'false' : 'true',
    })),
  });
  expect(command().type).toBe('action');
  expect(
    await AsyncStorage.getItem('lekhpal-official-inspector-pending'),
  ).not.toBeNull();
});
test('Stop while journal persistence is pending prevents dispatch', async () => {
  await open();
  await message(page);
  let release!: () => void;
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        release = () => resolve();
      }),
  );
  await tap('Start selected batch');
  await confirm();
  await tap('Stop');
  mockInject.mockClear();
  await act(async () => release());
  expect(mockInject).not.toHaveBeenCalled();
});

test.each<OfficialWorkModule>([
  'survey9',
  'inspector',
  'registry',
  'census',
  'echawadi',
  'svamitva-pdf',
])(
  '%s keeps the browser mounted when settings are opened and dismissed',
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
  },
);

test('Farmer Registry help links open inside the app while the login browser stays mounted', async () => {
  await open('registry');
  const original = web();
  const navigate = jest.fn();
  await act(async () => {
    tree.update(
      <OfficialWorkScreen
        navigation={{ goBack: jest.fn(), navigate } as any}
        route={{
          name: 'OfficialWork',
          key: 'registry',
          params: { module: 'registry' },
        }}
      />,
    );
  });
  expect(web().props.setSupportMultipleWindows).toBe(false);
  for (const url of [
    'https://upfr.agristack.gov.in/farmer-registry-up/assets/pdf/User_Manual_TRNG_Hindi.pdf',
    'https://play.google.com/store/apps/details?id=com.agristack.up.farmerregistry',
  ]) {
    expect(
      web().props.onShouldStartLoadWithRequest({ url, isTopFrame: true }),
    ).toBe(false);
  }
  expect(navigate.mock.calls[0]).toEqual([
    'WebViewPortal',
    expect.objectContaining({
      url: expect.stringContaining(
        'https://docs.google.com/gview?embedded=1&url=',
      ),
      returnToApp: true,
    }),
  ]);
  expect(navigate.mock.calls[1]).toEqual([
    'WebViewPortal',
    expect.objectContaining({
      url: 'https://play.google.com/store/apps/details?id=com.agristack.up.farmerregistry',
      returnToApp: true,
    }),
  ]);
  expect(web()).toBe(original);
  expect(web().props.source.uri).toBe(
    'https://upfr.agristack.gov.in/farmer-registry-up/#/',
  );
  expect(
    web().props.onShouldStartLoadWithRequest({
      url: 'https://upfr.agristack.gov.in/farmer-registry-up/#/login',
    }),
  ).toBe(true);
  expect(
    web().props.onShouldStartLoadWithRequest({ url: 'https://example.com/' }),
  ).toBe(false);
  expect(navigate).toHaveBeenCalledTimes(2);
});
