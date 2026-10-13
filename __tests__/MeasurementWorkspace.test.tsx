// Preserve coverage of paid-mode behaviour while the shipping UI is temporarily hidden.
jest.mock('../src/config/releaseFeatures', () => ({
  ...jest.requireActual('../src/config/releaseFeatures'),
  RELEASE_FEATURES: {
    ...jest.requireActual('../src/config/releaseFeatures').RELEASE_FEATURES,
    premium: true,
  },
}));
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MeasurementCalculator, {
  restoreMeasurementValues,
} from '../src/components/measurement/MeasurementCalculator';
import AppPressable from '../src/components/AppPressable';
import ConversionUnitPicker from '../src/components/measurement/ConversionUnitPicker';
import { MeasurementButton } from '../src/components/measurement/MeasurementUI';
import {
  shareTextSummary,
  exportSummaryAsPdf,
} from '../src/utils/workspaceExport';
import {
  loadWorkspaceRecords,
  persistWorkspaceRecords,
} from '../src/utils/workspaceStorage';
import type { WorkspaceRecord } from '../src/types/workspace';

jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/SelectedStateContext', () => ({
  useSelectedState: () => ({ stateCode: 'UP' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: require('../src/theme/palette').LIGHT_COLORS,
    isDarkTheme: false,
  }),
}));
jest.mock('react-native-linear-gradient', () => require('react-native').View);
jest.mock(
  'react-native-vector-icons/MaterialCommunityIcons',
  () => require('react-native').View,
);
jest.mock('../src/utils/workspaceExport', () => ({
  shareTextSummary: jest.fn(async () => {}),
  exportSummaryAsPdf: jest.fn(async () => {}),
}));
jest.mock('../src/components/measurement/MeasurementUI', () => ({
  ...jest.requireActual('../src/components/measurement/MeasurementUI'),
  useMeasurementMotion: () => false,
  ParcelSketch: () => null,
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('lekhpal-selected-state', 'UP');
  jest.clearAllMocks();
});
const change = async (
  tree: Renderer.ReactTestRenderer,
  label: string,
  value: string,
) => {
  await act(() =>
    tree.root
      .findAllByType(TextInput)
      .find(input => input.props.accessibilityLabel === label)!
      .props.onChangeText(value),
  );
};
const action = (tree: Renderer.ReactTestRenderer, title: string) =>
  tree.root
    .findAllByType(MeasurementButton)
    .find(button => button.props.title === title)!;
const setup = async (
  moduleId: 'field-area' | 'area-converter' | 'map-scale-helper',
  record: WorkspaceRecord | null = null,
) => {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <MeasurementCalculator
        moduleId={moduleId}
        externalRecord={record}
        onRecordApplied={() => {}}
        onOpenSaved={() => {}}
      />,
    );
  });
  return tree;
};

test('empty measurements cannot save; dimensions generate a reusable saved note and share/PDF the same result', async () => {
  const tree = await setup('field-area');
  expect(action(tree, 'Save measurement').props.disabled).toBe(true);
  await change(tree, 'Length · AB', '50');
  await change(tree, 'Width · BC', '30');
  expect(action(tree, 'Save measurement').props.disabled).toBe(false);
  await act(async () => action(tree, 'Save measurement').props.onPress());
  const [record] = await loadWorkspaceRecords('field-area-workspace');
  expect(record.values.length).toBe('50');
  expect(record.summaryLines).toContain('Result: 1,500 m²');
  expect(record.summaryLines).toContain('Perimeter: 160 m');
  await act(async () => action(tree, 'Share summary').props.onPress());
  expect(shareTextSummary).toHaveBeenCalledWith(
    expect.objectContaining({ summaryLines: record.summaryLines }),
  );
  await act(async () => action(tree, 'Unlock PDF · Premium').props.onPress());
  expect(exportSummaryAsPdf).toHaveBeenCalledWith(
    expect.objectContaining({ summaryLines: record.summaryLines }),
  );
  await act(() => tree.unmount());
  const restored = await setup('field-area', record);
  expect(
    restored.root
      .findAllByType(TextInput)
      .find(input => input.props.accessibilityLabel === 'Length · AB')!.props
      .value,
  ).toBe('50');
  expect(action(restored, 'Save measurement').props.disabled).toBe(false);
  await act(() => restored.unmount());
});

test('invalid dimensions disable saving and never become zero-valued reports', async () => {
  const tree = await setup('field-area');
  await change(tree, 'Length · AB', '-4');
  await change(tree, 'Width · BC', '30');
  expect(action(tree, 'Save measurement').props.disabled).toBe(true);
  await act(() => tree.unmount());
});

test('converter cannot export a local unit before its survey convention is entered', async () => {
  const tree = await setup('area-converter');
  await change(tree, 'Area to convert', '1');
  await act(() =>
    tree.root
      .findAllByType(ConversionUnitPicker)
      .find(p => !p.props.singleLabel)!
      .props.onChange('from', 'bigha'),
  );
  expect(action(tree, 'Unlock PDF · Premium').props.disabled).toBe(true);
  await change(tree, '1 Bigha equals', '2500');
  expect(action(tree, 'Unlock PDF · Premium').props.disabled).toBe(false);
  await act(async () => action(tree, 'Share summary').props.onPress());
  expect(shareTextSummary).toHaveBeenCalledWith(
    expect.objectContaining({
      summaryLines: expect.arrayContaining([
        'Result: 0.25 Hectare',
        '1 Bigha = 2500 m²',
      ]),
    }),
  );
  await act(() => tree.unmount());
});

test('field measurements show and save all conversions with their local Bigha convention', async () => {
  const tree = await setup('field-area');
  await change(tree, 'Length · AB', '100');
  await change(tree, 'Width · BC', '100');
  await act(() =>
    tree.root
      .findAllByType(AppPressable)
      .find(
        button => button.props.accessibilityLabel === 'Local unit standards',
      )!
      .props.onPress(),
  );
  await change(tree, '1 Bigha equals', '2500');
  await change(tree, 'Biswa in 1 Bigha', '20');
  await change(tree, 'Biswansi in 1 Biswa', '20');
  await change(tree, '1 Marla equals', '25');
  await change(tree, 'Marla in 1 Kanal', '20');
  expect(tree.root.findByType(ConversionUnitPicker).props.options).toHaveLength(
    14,
  );
  expect(JSON.stringify(tree.toJSON())).not.toContain('Area in all units');
  await act(async () => action(tree, 'Share summary').props.onPress());
  expect(shareTextSummary).toHaveBeenCalledWith(
    expect.objectContaining({
      summaryLines: expect.arrayContaining([
        'Hectare: 1',
        'Bigha: 4',
        'Biswa: 80',
        'Biswansi: 1,600',
        'Marla: 400',
        'Kanal: 20',
        '1 Biswa = 20 Biswansi',
        '1 Marla = 25 m²',
        '1 Kanal = 20 Marla',
        '1 Bigha = 2500 m²',
        '1 Bigha = 20 Biswa',
      ]),
    }),
  );
  await act(async () => action(tree, 'Save measurement').props.onPress());
  const records = await loadWorkspaceRecords('field-area-workspace');
  expect(records[0].values).toMatchObject({
    bighaSqm: '2500',
    biswaPerBigha: '20',
    biswansiPerBiswa: '20',
    marlaSqm: '25',
    marlaPerKanal: '20',
  });
  await act(() => tree.unmount());
  const restored = await setup('field-area', records[0]);
  await act(async () => action(restored, 'Share summary').props.onPress());
  expect(shareTextSummary).toHaveBeenLastCalledWith(
    expect.objectContaining({ summaryLines: records[0].summaryLines }),
  );
  await act(() => restored.unmount());
});

test('map scale exports ground distance from the actual entered scale', async () => {
  const tree = await setup('map-scale-helper');
  await change(tree, 'Scale denominator · 1 :', '4000');
  await change(tree, 'Distance on map', '2.5');
  await act(async () => action(tree, 'Share summary').props.onPress());
  expect(shareTextSummary).toHaveBeenCalledWith(
    expect.objectContaining({
      summaryLines: expect.arrayContaining(['Result: 100 m', 'Scale: 1:4000']),
    }),
  );
  await act(() => tree.unmount());
});

test('older boundary and converter notes retain inputs and explicitly require the missing diagonal', () => {
  const base = {
    values: { north: '30', east: '40', south: '30', west: '40' },
  } as unknown as WorkspaceRecord;
  const boundary = restoreMeasurementValues(base, 'plot-boundary-guide');
  expect(boundary).toMatchObject({
    a: '30',
    b: '40',
    c: '30',
    d: '40',
    diagonal: '',
  });
  const converter = restoreMeasurementValues(
    { values: { fromUnit: 'upbigha' } } as unknown as WorkspaceRecord,
    'area-converter',
  );
  expect(converter).toMatchObject({
    fromUnit: 'bigha',
    bighaSqm: '2500',
    biswaPerBigha: '20',
  });
});

// The saved-notes screen edits storage while the calculator stays mounted.
test('saving after deleting a note elsewhere does not resurrect the deleted note', async () => {
  const tree = await setup('field-area');
  await change(tree, 'Length · AB', '50');
  await change(tree, 'Width · BC', '30');
  await act(async () => action(tree, 'Save measurement').props.onPress());
  const [deleted] = await loadWorkspaceRecords('field-area-workspace');
  await persistWorkspaceRecords('field-area-workspace', []);
  await change(tree, 'Width · BC', '40');
  await act(async () => action(tree, 'Save measurement').props.onPress());
  const records = await loadWorkspaceRecords('field-area-workspace');
  expect(records).toHaveLength(1);
  expect(records[0].id).not.toBe(deleted.id);
  expect(records[0].summaryLines).toContain('Result: 2,000 m²');
  await act(() => tree.unmount());
});

test('selected result unit changes the result and report and survives draft reload and clearing dimensions', async () => {
  const tree = await setup('field-area');
  await change(tree, 'Length · AB', '100');
  await change(tree, 'Width · BC', '100');
  await act(() =>
    tree.root
      .findByType(ConversionUnitPicker)
      .props.onChange('from', 'hectare'),
  );
  await act(async () => action(tree, 'Save measurement').props.onPress());
  const [record] = await loadWorkspaceRecords('field-area-workspace');
  expect(record.summaryLines).toContain('Result: 1 Hectare');
  expect(record.values.resultAreaUnit).toBe('hectare');
  await act(() => tree.unmount());
  const reopened = await setup('field-area');
  expect(reopened.root.findByType(ConversionUnitPicker).props.from).toBe(
    'hectare',
  );
  const alert = jest
    .spyOn(require('react-native').Alert, 'alert')
    .mockImplementation(() => {});
  await act(() => action(reopened, 'Clear inputs').props.onPress());
  const buttons = alert.mock.calls[0][2] as {
    text: string;
    onPress?: () => void;
  }[];
  await act(() => buttons.find(b => b.text === 'Clear')!.onPress!());
  expect(reopened.root.findByType(ConversionUnitPicker).props.from).toBe(
    'hectare',
  );
  expect(action(reopened, 'Save measurement').props.disabled).toBe(true);
  await change(reopened, 'Length · AB', '50');
  await change(reopened, 'Width · BC', '100');
  await act(async () => action(reopened, 'Share summary').props.onPress());
  expect(shareTextSummary).toHaveBeenLastCalledWith(
    expect.objectContaining({
      summaryLines: expect.arrayContaining(['Result: 0.5 Hectare']),
    }),
  );
  alert.mockRestore();
  await act(() => reopened.unmount());
});

test('local result unit requires its recorded standard before saving', async () => {
  const tree = await setup('field-area');
  await change(tree, 'Length · AB', '50');
  await change(tree, 'Width · BC', '50');
  await act(() =>
    tree.root.findByType(ConversionUnitPicker).props.onChange('from', 'bigha'),
  );
  expect(action(tree, 'Save measurement').props.disabled).toBe(true);
  await change(tree, '1 Bigha equals', '2500');
  await act(async () => action(tree, 'Share summary').props.onPress());
  expect(shareTextSummary).toHaveBeenLastCalledWith(
    expect.objectContaining({
      summaryLines: expect.arrayContaining([
        'Result: 1 Bigha',
        '1 Bigha = 2500 m²',
      ]),
    }),
  );
  await act(() => tree.unmount());
});
