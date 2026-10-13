import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KhasraBulkTools from '../src/components/khasra/KhasraBulkTools';
import { emptyFeedingQueue } from '../src/domain/khasraQueue';
import { importKhasraBulk, parseKhasraBulk } from '../src/domain/khasraBulk';
import { saveKhasraCsv, generateDocumentPdf } from '../src/native/workFiles';
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));
jest.mock('../src/native/workFiles', () => ({
  saveKhasraCsv: jest.fn().mockResolvedValue('content://csv'),
  generateDocumentPdf: jest.fn().mockResolvedValue('/report.pdf'),
  exportDocumentPdf: jest.fn(),
}));
const context = {
  year: '1433',
  season: 'kharif' as const,
  village: 'Village A',
  villageCode: '117944',
};
let tree: Renderer.ReactTestRenderer;
let props: React.ComponentProps<typeof KhasraBulkTools>;
const control = (label: string) =>
  tree.root.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  )[0];
const tap = (label: string) =>
  act(async () => {
    control(label).props.onPress();
  });
const type = (label: string, value: string) =>
  act(async () => {
    tree.root
      .findAll(
        n =>
          n.props.accessibilityLabel === label &&
          typeof n.props.onChangeText === 'function',
      )[0]
      .props.onChangeText(value);
  });
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  props = {
    context,
    queue: emptyFeedingQueue('a'),
    editable: true,
    onImport: jest.fn(),
  };
  await act(async () => {
    tree = Renderer.create(<KhasraBulkTools {...props} />);
  });
});
afterEach(async () => {
  await act(async () => tree.unmount());
});
test('editing invalidates review, errors block import and write failure keeps the editor usable', async () => {
  await tap('Import plot data');
  await type('Bulk plot data', '12|धान|0.2|yes');
  await tap('Validate and review');
  expect(control('Add reviewed plots to queue').props.disabled).toBe(false);
  await type('Bulk plot data', '12|धान|0.2|maybe');
  expect(control('Add reviewed plots to queue')).toBeUndefined();
  await tap('Validate and review');
  expect(control('Add reviewed plots to queue').props.disabled).toBe(true);
  await type('Bulk plot data', '12|धान|0.2|yes');
  await tap('Validate and review');
  await tap('Add reviewed plots to queue');
  expect(props.onImport).toHaveBeenCalledTimes(1);
  await act(async () => {
    jest.mocked(props.onImport).mock.calls[0][1]('Storage full');
  });
  expect(control('Add reviewed plots to queue').props.disabled).toBe(false);
  expect(JSON.stringify(tree.toJSON())).toContain('Storage full');
});
test('draft is scoped, saved and restored when reopened without importing', async () => {
  await tap('Import plot data');
  await type('Bulk plot data', '12|धान|0.2|yes');
  await tap('Save draft');
  expect(await AsyncStorage.getItem('a-bulk-draft')).toBe('12|धान|0.2|yes');
  await tap('Close');
  await tap('Import plot data');
  expect(
    tree.root.findAll(
      n =>
        n.props.accessibilityLabel === 'Bulk plot data' && n.props.onChangeText,
    )[0].props.value,
  ).toBe('12|धान|0.2|yes');
  expect(props.onImport).not.toHaveBeenCalled();
});
test('report includes archived work, filters before exporting and never promotes a manual review', async () => {
  const q = importKhasraBulk(
    emptyFeedingQueue('a'),
    parseKhasraBulk('12|धान|0.2|yes\n13|गेहूँ|0.3|no'),
  );
  q.items[0].status = 'reviewed';
  q.items[0].confirmation = { id: 'lock-12', at: new Date().toISOString() };
  q.items[1].status = 'reviewed';
  await AsyncStorage.setItem('a-queue-archive-old', JSON.stringify(q));
  await tap('Daily work report');
  await tap('All dates');
  await tap('Confirmed');
  await tap('Export CSV to Downloads');
  expect(jest.mocked(saveKhasraCsv).mock.calls[0][1]).toContain(
    '"12","Confirmed"',
  );
  expect(jest.mocked(saveKhasraCsv).mock.calls[0][1]).not.toContain('"13"');
  await tap('Generate PDF report');
  expect(jest.mocked(generateDocumentPdf).mock.calls[0][1]).toContain(
    'lock-12',
  );
});
test('unreadable archive blocks exporting a misleading incomplete report', async () => {
  await AsyncStorage.setItem('a-queue-archive-broken', 'bad json');
  await tap('Daily work report');
  expect(control('Export CSV to Downloads').props.disabled).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain(
    'Saved data could not be read',
  );
});
