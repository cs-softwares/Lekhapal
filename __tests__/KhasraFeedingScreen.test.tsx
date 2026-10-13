import React from 'react';
import { PortalWorkPanel } from '../src/components/revenue/PortalWorkControls';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KhasraFeedingScreen from '../src/screens/KhasraFeedingScreen';
import {
  FeedingSnapshot,
  FeedingField,
  feedingScopeKey,
  createFeedingPreset,
} from '../src/domain/khasraFeeding';
import { DEFAULT_ADVANCED_RULES } from '../src/domain/khasraAdvanced';
import { openPortalBrowser } from '../src/native/portalBrowser';

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
jest.mock('../src/native/portalBrowser', () => ({
  openPortalBrowser: jest.fn().mockResolvedValue(undefined),
}));

const context = {
  year: '1433',
  village: 'Village A',
  villageCode: '117944',
  season: 'kharif' as const,
};
const page: FeedingSnapshot = {
  type: 'snapshot',
  channel: 'lekhpal-feeding-v1',
  documentId: 'doc',
  revision: 1,
  url: 'https://ekhasra.up.gov.in/#/lekhpalInsertFasal',
  stage: 'crop',
  busy: false,
  unsupported: false,
  heading: 'Crop entry',
  message: '',
  fields: [
    {
      ref: 'area',
      key: 'INPUT|number|area',
      label: 'Area',
      kind: 'number',
      value: '1',
      required: true,
      options: [],
    },
  ],
  actions: [
    { ref: 'save', label: 'Save', kind: 'save' },
    { ref: 'lock', label: 'Lock', kind: 'lock' },
  ],
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
    control(label).props.onPress();
  });
const field = (label: string) =>
  tree.root.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onChangeText === 'function',
  )[0];
const type = async (label: string, value: string) =>
  act(async () => {
    field(label).props.onChangeText(value);
  });
const message = async (data: unknown, url = page.url) =>
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
    const buttons = jest.mocked(Alert.alert).mock.calls.slice(-1)[0][2]!;
    buttons.find(b => b.text === 'Continue')!.onPress!();
  });
async function open(season: 'kharif' | 'rabi' | 'zaid' = 'kharif') {
  await act(async () => {
    tree = Renderer.create(
      <KhasraFeedingScreen
        navigation={{ goBack: jest.fn() } as any}
        route={{ name: 'KhasraFeeding', key: 'feeding' }}
      />,
    );
  });
  await type('Fasli year', context.year);
  await type('Feeding village', context.village);
  await type('Feeding village code', context.villageCode);
  if (season !== 'kharif') await tap(season === 'rabi' ? 'Rabi' : 'Zaid');
  await tap('Open feeding browser');
  await message(page);
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

test('opens a separate official browser without subscription checks or initial form writes', async () => {
  await open();
  expect(web().props.source.uri).toBe(
    'https://ekhasra.up.gov.in/#/SelectLogin',
  );
  expect(
    web().props.onShouldStartLoadWithRequest({ url: 'https://example.com' }),
  ).toBe(false);
  expect(
    web().props.onShouldStartLoadWithRequest({
      url: 'https://rccms.up.gov.in/dashboard/login/',
    }),
  ).toBe(true);
  expect(mockInject).not.toHaveBeenCalled();
  await message({ ...page, unsupported: true });
  await tap('Open existing Khasra Login');
  expect(openPortalBrowser).toHaveBeenCalledWith(
    'https://ekhasra.up.gov.in/#/SelectLogin',
  );
});
test('saving requires a current confirmation; changed pages invalidate the confirmation', async () => {
  await open();
  await tap('Save');
  expect(mockInject).not.toHaveBeenCalled();
  await message({ ...page, revision: 2 });
  await confirm();
  expect(mockInject).not.toHaveBeenCalled();
  await tap('Save');
  await confirm();
  expect(command()).toMatchObject({
    type: 'action',
    actionRef: 'save',
    revision: 2,
  });
  expect(control('Save').props.disabled).toBe(true);
});
test('filling is distinct from saving, rejects foreign messages and synchronizes direct official edits', async () => {
  await open();
  await type('Area', '0.5');
  await message(
    { ...page, fields: [{ ...page.fields[0], value: '99' }] },
    'https://example.com',
  );
  expect(field('Area').props.value).toBe('0.5');
  await tap('Fill official form');
  const sent = command();
  expect(sent).toMatchObject({ type: 'fill', values: { area: '0.5' } });
  await message({
    type: 'result',
    channel: page.channel,
    id: sent.id,
    outcome: 'filled',
    message: 'Filled',
  });
  await message({
    ...page,
    revision: 2,
    fields: [{ ...page.fields[0], value: '0.7' }],
  });
  expect(field('Area').props.value).toBe('0.7');
  expect(control('Save').props.disabled).toBe(false);
});
test('unknown results are ignored and a missing confirmation produces uncertain history without retry', async () => {
  await open();
  await tap('Save');
  await confirm();
  await message({
    type: 'result',
    channel: page.channel,
    id: 'other-command',
    outcome: 'portal-success',
    message: 'Saved',
  });
  expect(control('Save').props.disabled).toBe(true);
  await act(async () => {
    jest.advanceTimersByTime(26000);
  });
  const rows = JSON.parse(
    (await AsyncStorage.getItem(`${feedingScopeKey(context)}-history`))!,
  );
  expect(rows[0]).toMatchObject({
    outcome: 'uncertain',
    action: 'Save',
    context,
  });
  expect(
    mockInject.mock.calls.filter(c => c[0].includes('"type":"action"')),
  ).toHaveLength(1);
});
test('leaving while a lock is pending preserves an uncertain receipt', async () => {
  await open();
  await tap('Lock');
  await confirm();
  await act(async () => tree.unmount());
  const rows = JSON.parse(
    (await AsyncStorage.getItem(`${feedingScopeKey(context)}-history`))!,
  );
  expect(rows[0]).toMatchObject({ outcome: 'uncertain', action: 'Lock' });
});
test('persists an uncertain attempt before dispatch and clears it only after recording the result', async () => {
  await open();
  await tap('Save');
  await confirm();
  const pendingKey = `${feedingScopeKey(context)}-pending`;
  const attempt = JSON.parse((await AsyncStorage.getItem(pendingKey))!);
  expect(attempt).toMatchObject({ action: 'Save', outcome: 'uncertain' });
  expect(
    jest.mocked(AsyncStorage.setItem).mock.invocationCallOrder[0],
  ).toBeLessThan(mockInject.mock.invocationCallOrder[0]);
  await message({
    type: 'result',
    channel: page.channel,
    id: attempt.id,
    outcome: 'portal-success',
    message: 'Saved',
  });
  expect(await AsyncStorage.getItem(pendingKey)).toBeNull();
  expect(
    JSON.parse(
      (await AsyncStorage.getItem(`${feedingScopeKey(context)}-history`))!,
    )[0].outcome,
  ).toBe('portal-success');
});
test('recovers an interrupted attempt after relaunch without repeating it', async () => {
  const attempt = {
    id: 'interrupted',
    context,
    stage: 'crop',
    action: 'Save',
    outcome: 'uncertain',
    at: new Date().toISOString(),
    message: 'No confirmation recorded',
  };
  await AsyncStorage.setItem(
    `${feedingScopeKey(context)}-pending`,
    JSON.stringify(attempt),
  );
  await open();
  expect(mockInject).not.toHaveBeenCalled();
  expect(
    await AsyncStorage.getItem(`${feedingScopeKey(context)}-pending`),
  ).toBeNull();
  expect(
    JSON.parse(
      (await AsyncStorage.getItem(`${feedingScopeKey(context)}-history`))!,
    )[0],
  ).toEqual(attempt);
});
test('a failed local pending write prevents dispatch to the government form', async () => {
  await open();
  jest
    .mocked(AsyncStorage.setItem)
    .mockRejectedValueOnce(new Error('Disk unavailable'));
  await tap('Save');
  await confirm();
  expect(
    mockInject.mock.calls.some(c => c[0].includes('"type":"action"')),
  ).toBe(false);
  expect(JSON.stringify(tree.toJSON())).toContain('Nothing was sent');
});
test('Stop cancels an operation still waiting for its local write', async () => {
  await open();
  let finishWrite!: () => void;
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finishWrite = resolve;
      }),
  );
  await tap('Save');
  await confirm();
  await tap('Stop');
  await act(async () => {
    finishWrite();
  });
  expect(
    mockInject.mock.calls.some(c => c[0].includes('"type":"action"')),
  ).toBe(false);
});
test('saved presets fill the next matching form only after Start and never submit it', async () => {
  await open();
  await type('Area', '0.25');
  await tap('Save preset');
  await tap('Presets');
  mockInject.mockClear();
  await message({
    ...page,
    revision: 2,
    fields: [{ ...page.fields[0], ref: 'next-area' }],
  });
  expect(mockInject).not.toHaveBeenCalled();
  await tap('Start presets');
  expect(command()).toMatchObject({
    type: 'fill',
    values: { 'next-area': '1' },
  });
  expect(
    mockInject.mock.calls.some(c => c[0].includes('"type":"action"')),
  ).toBe(false);
});

async function startAutomatic(autoLock = false, stagePage = page) {
  await AsyncStorage.setItem(
    `${feedingScopeKey(context)}-rules`,
    JSON.stringify({
      ...DEFAULT_ADVANCED_RULES,
      autoSubmit: true,
      autoNext: true,
      autoLock,
    }),
  );
  await AsyncStorage.setItem(
    `${feedingScopeKey(context)}-presets`,
    JSON.stringify({ [stagePage.stage]: createFeedingPreset(stagePage, {}) }),
  );
  await open();
  await message({
    ...stagePage,
    officialContext: autoLock ? context : undefined,
    plotIdentity: '12',
    actions: [
      ...stagePage.actions,
      { ref: 'next', label: 'Next', kind: 'navigate' },
    ],
  });
  await tap('Presets');
  mockInject.mockClear();
  await tap('Start presets');
  expect(mockInject).not.toHaveBeenCalled();
  await act(async () => {
    jest
      .mocked(Alert.alert)
      .mock.calls.slice(-1)[0][2]!
      .find(b => b.text === 'Start')!.onPress!();
  });
  return command();
}
test('explicit auto-submit fills once, waits for save success, then advances without locking', async () => {
  const fillCommand = await startAutomatic();
  expect(fillCommand.type).toBe('fill');
  await message({
    type: 'result',
    channel: page.channel,
    id: fillCommand.id,
    outcome: 'filled',
    message: 'Filled',
  });
  const save = command();
  expect(save).toMatchObject({ type: 'action', actionRef: 'save' });
  await message({
    type: 'result',
    channel: page.channel,
    id: save.id,
    outcome: 'portal-success',
    message: 'Saved',
  });
  const next = command();
  expect(next).toMatchObject({ type: 'action', actionRef: 'next' });
  await message({
    type: 'result',
    channel: page.channel,
    id: next.id,
    outcome: 'clicked',
    message: 'Next',
  });
  await message({
    ...page,
    plotIdentity: '12',
    revision: 3,
    fields: [{ ...page.fields[0], ref: 'recreated-area' }],
  });
  expect(
    mockInject.mock.calls.filter(([script]) =>
      script.includes('"actionRef":"save"'),
    ),
  ).toHaveLength(1);
  expect(
    mockInject.mock.calls.some(([script]) =>
      script.includes('"actionRef":"lock"'),
    ),
  ).toBe(false);
});
test('an uncertain automatic save stops progression and never retries', async () => {
  const fillCommand = await startAutomatic();
  await message({
    type: 'result',
    channel: page.channel,
    id: fillCommand.id,
    outcome: 'filled',
    message: 'Filled',
  });
  const save = command();
  await message({
    type: 'result',
    channel: page.channel,
    id: save.id,
    outcome: 'uncertain',
    message: 'Check record',
  });
  await message({ ...page, revision: 2, plotIdentity: '12' });
  expect(
    mockInject.mock.calls.filter(([script]) =>
      script.includes('"actionRef":"save"'),
    ),
  ).toHaveLength(1);
  expect(
    mockInject.mock.calls.some(([script]) =>
      script.includes('"actionRef":"next"'),
    ),
  ).toBe(false);
});
test('edits to official values after filling prevent automatic submission', async () => {
  const sent = await startAutomatic();
  await message({
    ...page,
    revision: 2,
    plotIdentity: '12',
    fields: [{ ...page.fields[0], value: '0.75' }],
  });
  await message({
    type: 'result',
    channel: page.channel,
    id: sent.id,
    outcome: 'filled',
    message: 'Filled',
  });
  expect(
    mockInject.mock.calls.some(([script]) =>
      script.includes('"actionRef":"save"'),
    ),
  ).toBe(false);
});

test('opt-in final locking waits for confirmed remarks, then returns to the gata list only after lock success', async () => {
  const remarks: FeedingSnapshot = {
    ...page,
    stage: 'remarks',
    url: 'https://ekhasra.up.gov.in/#/lekhpalRemark',
    fields: [
      {
        ...page.fields[0],
        kind: 'text',
        key: 'remark',
        ref: 'remark',
        label: 'Remark',
        value: 'Verified',
      },
    ],
    actions: [
      ...page.actions,
      { ref: 'list', label: 'Gata list', kind: 'navigate' },
    ],
  };
  const fill = await startAutomatic(true, remarks);
  const receive = async (id: string, outcome: string) =>
    message(
      { type: 'result', channel: page.channel, id, outcome, message: outcome },
      remarks.url,
    );
  await receive(fill.id, 'filled');
  const save = command();
  expect(save.actionRef).toBe('save');
  await receive(save.id, 'portal-success');
  const lock = command();
  expect(lock.actionRef).toBe('lock');
  await receive(lock.id, 'portal-success');
  expect(command().actionRef).toBe('list');
});

test('portal changes never reopen settings and the same browser survives settings navigation', async () => {
  await open();
  const browser = web();
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
  const settingsBody = panel().findByProps({ testID: 'portal-work-settings' });
  await act(async () => panel().props.onClose());
  expect(panel().props.visible).toBe(false);
  expect(web()).toBe(browser);
  expect(panel().findByProps({ testID: 'portal-work-settings' })).toBe(
    settingsBody,
  );
  await message({ ...page, revision: 2, stage: 'remarks' });
  expect(panel().props.visible).toBe(false);
});

const sectionFieldFixture = (
  name: string,
  kind: FeedingField['kind'],
  value: string,
  options: FeedingField['options'] = [],
): FeedingField => ({
  ref: name,
  key: `INPUT|${kind}|${name}|${name}`,
  label: name,
  kind,
  value,
  required: false,
  options,
});
async function startSections(
  land: 'cultivated' | 'fallow' | 'nonAgricultural' = 'cultivated',
  season = context.season as 'kharif' | 'rabi' | 'zaid',
) {
  const setup = { ...context, season };
  await AsyncStorage.setItem(
    `${feedingScopeKey(setup)}-rules`,
    JSON.stringify({
      ...DEFAULT_ADVANCED_RULES,
      autoSubmit: true,
      autoNext: true,
      autoLock: true,
      sections: {
        ...DEFAULT_ADVANCED_RULES.sections,
        enabled: true,
        land,
        landType: 'road',
        crop: `${season}-crop`,
      },
    }),
  );
  await open(season);
  let current: FeedingSnapshot = {
    ...page,
    stage: 'land',
    url: 'https://ekhasra.up.gov.in/#/lekhpalCroppingPattern',
    plotIdentity: '12',
    plotArea: '1.25',
    remainingArea: '1.25',
    officialContext: setup,
    governmentLandSignal: false,
    landRows: [],
    fields: [
      sectionFieldFixture('option1', 'radio', 'false'),
      sectionFieldFixture('agriculturalType', 'select', '0', [
        { value: '0', label: 'None' },
        { value: 'road', label: 'Road' },
      ]),
      sectionFieldFixture('area', 'number', '9'),
    ],
    actions: [{ ref: 'save', kind: 'save', label: 'Save' }],
  };
  const emit = async (next: FeedingSnapshot) => {
    current = { ...next, revision: current.revision + 1 };
    await message(current, current.url);
  };
  const result = async (id: string, outcome: string) =>
    message(
      { type: 'result', channel: page.channel, id, outcome, message: outcome },
      current.url,
    );
  const fill = async () => {
    const sent = command();
    expect(sent.type).toBe('fill');
    await emit({
      ...current,
      fields: current.fields.map(f => ({
        ...f,
        value: sent.values[f.ref] ?? f.value,
      })),
    });
    await result(sent.id, 'filled');
    return sent.values;
  };
  await emit(current);
  await tap('Presets');
  await tap('Start presets');
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls.slice(-1)[0][2]!
      .find(b => b.text === 'Start')!.onPress!(),
  );
  return { emit, result, fill, current: () => current };
}

test.each(['kharif', 'rabi', 'zaid'] as const)(
  'subsection sequence feeds land, fallow, both trees, %s crop and remarks without presets',
  async season => {
    const f = await startSections('cultivated', season);
    expect(await f.fill()).toEqual({ option1: 'true' });
    expect(await f.fill()).toMatchObject({ area: '0' });
    expect(command().actionRef).toBe('save');
    const saved = command();
    await f.emit({
      ...f.current(),
      actions: [
        ...f.current().actions,
        { ref: 'next', label: 'Next', kind: 'navigate' },
      ],
    });
    await f.result(saved.id, 'portal-success');
    expect(command().actionRef).toBe('next');
    await f.result(command().id, 'clicked');
    await f.emit({
      ...f.current(),
      stage: 'fallow',
      url: 'https://ekhasra.up.gov.in/#/lekhpalInsertFallow',
      fields: [
        sectionFieldFixture('option2', 'radio', 'false'),
        sectionFieldFixture('area', 'number', '8'),
      ],
      landRows: [],
      actions: [{ ref: 'save', label: 'Save', kind: 'save' }],
    });
    expect(await f.fill()).toEqual({ option2: 'true' });
    expect(await f.fill()).toMatchObject({ area: '0' });
    const fallowSave = command();
    await f.emit({
      ...f.current(),
      actions: [
        ...f.current().actions,
        { ref: 'next', label: 'Next', kind: 'navigate' },
      ],
    });
    await f.result(fallowSave.id, 'portal-success');
    expect(command().actionRef).toBe('next');
    await f.result(command().id, 'clicked');
    await f.emit({
      ...f.current(),
      stage: 'trees',
      url: 'https://ekhasra.up.gov.in/#/lekhpalInsertTree',
      fields: [
        sectionFieldFixture('vrikshType1', 'select', '1', [
          { value: '1', label: 'Category A' },
          { value: '2', label: 'Category B' },
        ]),
        sectionFieldFixture('treeCount', 'number', '5'),
      ],
      treeRows: [],
      landRows: undefined,
      actions: [{ ref: 'save', label: 'Save', kind: 'save' }],
    });
    expect(await f.fill()).toMatchObject({ vrikshType1: '1', treeCount: '0' });
    const firstTreeSave = command();
    // The table refresh can precede the save result; it must not skip category 2.
    await f.emit({
      ...f.current(),
      treeRows: [{ type: 'Category A', count: '0' }],
      actions: [
        ...f.current().actions,
        { ref: 'next', label: 'Next', kind: 'navigate' },
      ],
    });
    await f.result(firstTreeSave.id, 'portal-success');
    expect(await f.fill()).toEqual({ vrikshType1: '2' });
    expect(await f.fill()).toMatchObject({ vrikshType1: '2', treeCount: '0' });
    const secondTreeSave = command();
    await f.emit({
      ...f.current(),
      treeRows: [
        { type: 'Category A', count: '0' },
        { type: 'Category B', count: '0' },
      ],
    });
    await f.result(secondTreeSave.id, 'portal-success');
    expect(command().actionRef).toBe('next');
    await f.result(command().id, 'clicked');
    await f.emit({
      ...f.current(),
      stage: 'crop',
      url: page.url,
      treeRows: undefined,
      fields: [
        sectionFieldFixture('option3', 'radio', 'false'),
        sectionFieldFixture('crop', 'select', `${season}-crop`, [
          { value: `${season}-crop`, label: 'Season crop' },
        ]),
        sectionFieldFixture('area', 'number', '9'),
        sectionFieldFixture('flexSwitchCheckDefault', 'checkbox', 'false'),
      ],
      actions: [{ ref: 'save', label: 'Save', kind: 'save' }],
    });
    expect(await f.fill()).toEqual({ option3: 'true' });
    expect(await f.fill()).toMatchObject({
      crop: `${season}-crop`,
      area: '1.25',
    });
    const cropSave = command();
    await f.emit({
      ...f.current(),
      actions: [
        ...f.current().actions,
        { ref: 'next', label: 'Next', kind: 'navigate' },
      ],
    });
    await f.result(cropSave.id, 'portal-success');
    await f.result(command().id, 'clicked');
    await f.emit({
      ...f.current(),
      stage: 'remarks',
      url: 'https://ekhasra.up.gov.in/#/lekhpalInsertRemark',
      fields: [sectionFieldFixture('remarks', 'textarea', '')],
      actions: [
        { ref: 'save', label: 'Save', kind: 'save' },
        { ref: 'lock', label: 'Lock', kind: 'lock' },
        { ref: 'list', label: 'Gata list', kind: 'navigate' },
      ],
    });
    expect(await f.fill()).toEqual({ remarks: 'done' });
    expect(command().actionRef).toBe('save');
    await f.result(command().id, 'portal-success');
    expect(command().actionRef).toBe('lock');
    await f.result(command().id, 'portal-success');
    expect(command().actionRef).toBe('list');
    expect(
      mockInject.mock.calls.filter(([js]) => js.includes('"actionRef":"save"')),
    ).toHaveLength(6);
  },
);

test.each(['fallow', 'nonAgricultural'] as const)(
  '%s finishes at the correct early section after confirmed save',
  async land => {
    const f = await startSections(land);
    await f.fill();
    if (land === 'nonAgricultural') {
      expect(await f.fill()).toEqual({ agriculturalType: 'road' });
      expect(await f.fill()).toMatchObject({ area: '1.25' });
    } else {
      await f.fill();
      const save = command();
      await f.emit({
        ...f.current(),
        actions: [
          ...f.current().actions,
          { ref: 'next', label: 'Next', kind: 'navigate' },
        ],
      });
      await f.result(save.id, 'portal-success');
      await f.result(command().id, 'clicked');
      await f.emit({
        ...f.current(),
        stage: 'fallow',
        url: 'https://ekhasra.up.gov.in/#/lekhpalInsertFallow',
        fields: [sectionFieldFixture('area', 'number', '9')],
        actions: [{ ref: 'save', label: 'Save', kind: 'save' }],
      });
      expect(await f.fill()).toEqual({ area: '1.25' });
    }
    const save = command();
    await f.emit({
      ...f.current(),
      actions: [
        ...f.current().actions,
        { ref: 'lock', label: 'Lock', kind: 'lock' },
        { ref: 'next', label: 'Next', kind: 'navigate' },
        { ref: 'list', label: 'Gata list', kind: 'navigate' },
      ],
    });
    await f.result(save.id, 'portal-success');
    expect(command().actionRef).toBe('lock');
    await f.result(command().id, 'portal-success');
    expect(command().actionRef).toBe('list');
  },
);

test('an unconfirmed subsection save stops the sequence and does not lock or advance', async () => {
  const f = await startSections('nonAgricultural');
  await f.fill();
  await f.fill();
  await f.fill();
  const save = command();
  expect(save.actionRef).toBe('save');
  await f.result(save.id, 'uncertain');
  await f.emit({
    ...f.current(),
    actions: [
      ...f.current().actions,
      { ref: 'lock', label: 'Lock', kind: 'lock' },
      { ref: 'next', label: 'Next', kind: 'navigate' },
    ],
  });
  expect(
    mockInject.mock.calls.filter(([js]) => js.includes('"actionRef":"save"')),
  ).toHaveLength(1);
  expect(
    mockInject.mock.calls.some(
      ([js]) =>
        js.includes('"actionRef":"lock"') || js.includes('"actionRef":"next"'),
    ),
  ).toBe(false);
});

test('subsection crop plans prepare each crop and irrigation before allocating both rows', async () => {
  const sections = {
    ...DEFAULT_ADVANCED_RULES.sections,
    enabled: true,
    crop: 'rice',
  };
  await AsyncStorage.setItem(
    `${feedingScopeKey(context)}-rules`,
    JSON.stringify({
      ...DEFAULT_ADVANCED_RULES,
      sections,
      autoSubmit: true,
      autoNext: true,
      cropPlan: [
        { crop: 'rice', percent: '50', irrigated: false },
        { crop: 'wheat', percent: '50', irrigated: false },
      ],
    }),
  );
  await open();
  let current: FeedingSnapshot = {
    ...page,
    plotIdentity: '12',
    plotArea: '1',
    remainingArea: '1',
    cropRows: [],
    fields: [
      sectionFieldFixture('crop', 'select', 'rice', [
        { value: 'rice', label: 'Rice' },
        { value: 'wheat', label: 'Wheat' },
      ]),
      sectionFieldFixture('area', 'number', '1'),
      sectionFieldFixture('flexSwitchCheckDefault', 'checkbox', 'false'),
    ],
  };
  await message(current);
  await tap('Presets');
  await tap('Start presets');
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls.slice(-1)[0][2]!
      .find(b => b.text === 'Start')!.onPress!(),
  );
  const result = async (id: string, outcome: string) =>
    message({
      type: 'result',
      channel: page.channel,
      id,
      outcome,
      message: outcome,
    });
  const filled = async () => {
    const sent = command();
    current = {
      ...current,
      revision: current.revision + 1,
      fields: current.fields.map(f => ({
        ...f,
        value: sent.values[f.ref] ?? f.value,
      })),
    };
    await message(current);
    await result(sent.id, 'filled');
    return sent;
  };
  expect((await filled()).values.area).toBe('0.5000');
  const firstSave = command();
  current = {
    ...current,
    revision: current.revision + 1,
    cropRows: [{ crop: 'Rice', area: '0.5000', irrigated: false }],
    remainingArea: '0.5000',
  };
  await message(current);
  await result(firstSave.id, 'portal-success');
  expect((await filled()).values).toEqual({ crop: 'wheat' });
  expect((await filled()).values.area).toBe('0.5000');
  expect(command().actionRef).toBe('save');
  expect(
    mockInject.mock.calls.filter(([js]) => js.includes('"actionRef":"save"')),
  ).toHaveLength(2);
});

const bulkList: FeedingSnapshot = {
  ...page,
  stage: 'list',
  url: 'https://ekhasra.up.gov.in/#/lekhpalGataList',
  fields: [],
  actions: [],
  officialContext: context,
  plots: [
    { ref: 'p12', gata: '12', status: 'available' },
    { ref: 'p13', gata: '13', status: 'available' },
  ],
};
const bulkCrop: FeedingSnapshot = {
  ...page,
  officialContext: context,
  plotIdentity: '12',
  plotArea: '0.5',
  remainingArea: '0.5',
  cropRows: [],
  fields: [
    {
      ref: 'crop',
      key: 'SELECT|select|crop',
      label: 'Crop',
      kind: 'select',
      value: '',
      required: true,
      options: [
        { value: 'p', label: 'धान' },
        { value: 'w', label: 'गेहूँ' },
      ],
    },
    { ...page.fields[0], value: '' },
    {
      ref: 'irr',
      key: 'INPUT|checkbox|flexSwitchCheckDefault',
      label: 'Irrigated',
      kind: 'checkbox',
      value: 'false',
      required: false,
      options: [],
    },
  ],
};
async function seedBulk() {
  const {
    importKhasraBulk,
    parseKhasraBulk,
  } = require('../src/domain/khasraBulk');
  const { emptyFeedingQueue } = require('../src/domain/khasraQueue');
  await AsyncStorage.setItem(
    `${feedingScopeKey(context)}-queue`,
    JSON.stringify(
      importKhasraBulk(
        emptyFeedingQueue(feedingScopeKey(context)),
        parseKhasraBulk('12|धान|0.2|Yes\n12|गेहूँ|0.3|No\n13|गेहूँ|0.7|Yes'),
      ),
    ),
  );
}
async function startBulkQueue() {
  await message(bulkList, bulkList.url);
  await tap('Start / resume queue');
  await act(async () => {
    jest
      .mocked(Alert.alert)
      .mock.calls.slice(-1)[0][2]!
      .find(b => b.text === 'Start queue')!.onPress!();
  });
}
async function acknowledge(outcome: string, id = command().id) {
  await message({
    type: 'result',
    channel: page.channel,
    id,
    outcome,
    message: outcome,
  });
}
test('imported queue feeds each plot’s own exact crop areas and mixed irrigation, without reusing the previous plot', async () => {
  await seedBulk();
  await open();
  await startBulkQueue();
  expect(command()).toMatchObject({ type: 'plot', gata: '12' });
  await acknowledge('filled');
  await message(bulkCrop);
  const first = command();
  expect(first).toMatchObject({
    type: 'fill',
    values: { crop: 'p', area: '0.2000', irr: 'true' },
  });
  await message({
    ...bulkCrop,
    revision: 2,
    fields: bulkCrop.fields.map(f => ({ ...f, value: first.values[f.ref] })),
  });
  await acknowledge('filled', first.id);
  expect(command()).toMatchObject({ type: 'action', actionRef: 'save' });
  await acknowledge('portal-success');
  const secondPage = {
    ...bulkCrop,
    revision: 3,
    remainingArea: '0.3',
    cropRows: [{ crop: 'धान', area: '0.2', irrigated: true }],
  };
  await message(secondPage);
  const second = command();
  expect(second).toMatchObject({
    type: 'fill',
    values: { crop: 'w', area: '0.3000', irr: 'false' },
  });
  await message({
    ...secondPage,
    revision: 4,
    fields: bulkCrop.fields.map(f => ({ ...f, value: second.values[f.ref] })),
  });
  await acknowledge('filled', second.id);
  expect(command()).toMatchObject({ type: 'action', actionRef: 'save' });
  await acknowledge('portal-success');
  await message({
    ...secondPage,
    revision: 5,
    remainingArea: '0',
    cropRows: [
      ...secondPage.cropRows,
      { crop: 'गेहूँ', area: '0.3', irrigated: false },
    ],
  });
  await tap('Lock');
  await confirm();
  await acknowledge('portal-success');
  const saved = JSON.parse(
    (await AsyncStorage.getItem(`${feedingScopeKey(context)}-queue`))!,
  );
  expect(saved.items[0]).toMatchObject({
    status: 'reviewed',
    confirmation: { id: expect.any(String) },
  });
  await message({ ...bulkList, revision: 6 }, bulkList.url);
  expect(command()).toMatchObject({ type: 'plot', gata: '13' });
  await acknowledge('filled');
  await message({
    ...bulkCrop,
    revision: 7,
    plotIdentity: '13',
    plotArea: '0.7',
    remainingArea: '0.7',
  });
  expect(command()).toMatchObject({
    type: 'fill',
    values: { crop: 'w', area: '0.7000', irr: 'true' },
  });
});
test.each([
  { ...bulkCrop, remainingArea: '0.6' },
  { ...bulkCrop, officialContext: { ...context, villageCode: '999999' } },
  { ...bulkCrop, cropRows: undefined },
  { ...bulkCrop, plotIdentity: '99' },
])(
  'imported feeding pauses before filling mismatched official evidence',
  async invalid => {
    await seedBulk();
    await open();
    await startBulkQueue();
    await acknowledge('filled');
    mockInject.mockClear();
    await message(invalid);
    expect(
      mockInject.mock.calls.some(c => c[0].includes('"type":"fill"')),
    ).toBe(false);
  },
);
test('receipt storage failure stops automatic feeding and retains the pending journal', async () => {
  await seedBulk();
  await open();
  await startBulkQueue();
  await acknowledge('filled');
  await message(bulkCrop);
  const fill = command();
  await message({
    ...bulkCrop,
    revision: 2,
    fields: bulkCrop.fields.map(f => ({ ...f, value: fill.values[f.ref] })),
  });
  jest
    .mocked(AsyncStorage.setItem)
    .mockRejectedValueOnce(Error('Storage full'));
  await acknowledge('filled', fill.id);
  expect(command().type).toBe('stop');
  expect(
    await AsyncStorage.getItem(`${feedingScopeKey(context)}-pending`),
  ).not.toBeNull();
  expect(
    mockInject.mock.calls.some(c => c[0].includes('"actionRef":"save"')),
  ).toBe(false);
});

test('SPA history changes retain feeding, but an actual document start stops and journals a pending write', async () => {
  await seedBulk();
  await open();
  await startBulkQueue();
  expect(web().props.onLoadStart).toBeUndefined();
  expect(web().props.injectedJavaScriptBeforeContentLoaded).toContain(
    'document-start',
  );
  await acknowledge('filled');
  await message(bulkCrop);
  const fill = command();
  await message({
    ...bulkCrop,
    revision: 2,
    fields: bulkCrop.fields.map(f => ({ ...f, value: fill.values[f.ref] })),
  });
  await acknowledge('filled', fill.id);
  expect(command()).toMatchObject({ type: 'action', actionRef: 'save' });
  await message({ type: 'document-start', channel: page.channel });
  const history = JSON.parse(
    (await AsyncStorage.getItem(`${feedingScopeKey(context)}-history`))!,
  );
  expect(history[0]).toMatchObject({
    outcome: 'uncertain',
    message: expect.stringContaining('reloaded'),
  });
  expect(command().type).toBe('stop');
});
