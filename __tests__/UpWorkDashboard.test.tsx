import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import UpWorkDashboard from '../src/components/dashboard/UpWorkDashboard';
import { UP_WORK_TABS, upWorkPortals } from '../src/data/upWorkTabs';
import { UP_OFFICIAL_PORTALS } from '../src/data/upOfficialPortals';

let mockLanguage = 'en';
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: mockLanguage }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));
jest.mock('../src/components/ads/FreeAccountAd', () => () => null);
jest.mock('../src/components/BhulekhRelatedLinks', () => () => null);

let tree: Renderer.ReactTestRenderer;
const navigate = jest.fn();
const press = async (label: string) =>
  act(() => {
    tree.root
      .findAll(
        n =>
          n.props.accessibilityLabel === label &&
          typeof n.props.onPress === 'function',
      )[0]
      .props.onPress();
  });
beforeEach(async () => {
  mockLanguage = 'en';
  navigate.mockClear();
  await act(() => {
    tree = Renderer.create(
      <UpWorkDashboard navigation={{ navigate }} motion={false} />,
    );
  });
});
afterEach(async () => {
  await act(() => tree.unmount());
});

test('every official UP portal belongs to exactly one tab, with record lookups first', () => {
  const entries = UP_WORK_TABS.flatMap(tab => upWorkPortals(tab.id));
  expect(entries.map(e => e.id).sort()).toEqual(
    UP_OFFICIAL_PORTALS.map(e => e.id).sort(),
  );
  expect(new Set(entries.map(e => e.id)).size).toBe(entries.length);
  expect(
    upWorkPortals('records')
      .slice(0, 2)
      .map(e => e.id),
  ).toEqual(['up-bhulekh-services', 'up-khasra']);
});

test('tabs expose distinct work and preserve portal menus, automation routes and tool destinations', async () => {
  await press('Khatauni & Bhulekh Services');
  expect(navigate).toHaveBeenLastCalledWith('BhulekhOptions');
  await press('Khasra Portal');
  expect(navigate).toHaveBeenLastCalledWith('KhasraOptions');
  await press('Feeding');
  expect(
    tree.root.findAll(
      n => n.props.accessibilityLabel === 'Khatauni & Bhulekh Services',
    ),
  ).toHaveLength(0);
  for (const [label, route, params] of [
    ['Khasra Feeding', 'KhasraFeeding', undefined],
    ['Ansh Nirdharan', 'RevenueFeeding', { module: 'ansh' }],
    ['Remove Ansh Entry', 'RevenueFeeding', { module: 'ansh-delete' }],
    ['Prapatra-5 Feeding', 'RevenueFeeding', { module: 'prapatra5' }],
    ['Farmer Registry', 'OfficialWork', { module: 'registry' }],
    ['Agricultural Census', 'OfficialWork', { module: 'census' }],
    ['Revenue Inspector Approval', 'OfficialWork', { module: 'inspector' }],
  ] as const) {
    await press(label);
    expect(navigate.mock.calls.at(-1)).toEqual(
      params ? [route, params] : [route],
    );
  }
  await press('Fieldwork');
  expect(
    tree.root.findAll(n => n.props.accessibilityLabel === 'Khasra Feeding'),
  ).toHaveLength(0);
  await press('Measurement tools');
  expect(navigate).toHaveBeenLastCalledWith('Measurement');
  await press('Calculators');
  expect(navigate).toHaveBeenLastCalledWith('Calculator');
  await press('Bhunaksha map export');
  expect(navigate).toHaveBeenLastCalledWith('MapExport');
  await press('Survey-9 Approval');
  expect(navigate).toHaveBeenLastCalledWith('OfficialWork', {
    module: 'survey9',
  });
  await press('Documents');
  await press('eDistrict Login');
  expect(navigate).toHaveBeenLastCalledWith(
    'WebViewPortal',
    expect.objectContaining({
      url: 'https://edistrict.up.gov.in/edistrictup/',
    }),
  );
  await press('Document automation');
  expect(navigate).toHaveBeenLastCalledWith('DocumentAutomation', {
    stateCode: 'UP',
  });
  await press('ERO PDFs');
  expect(navigate).toHaveBeenLastCalledWith('EroPdf');
  await press('SVAMITVA / Tehsil Documents');
  expect(navigate).toHaveBeenLastCalledWith('OfficialWork', {
    module: 'svamitva-pdf',
  });
  await press('View all services');
  expect(navigate).toHaveBeenLastCalledWith('Services');
});

test('Hindi tabs retain the current selection and expose the selected accessibility state', async () => {
  await press('Feeding');
  mockLanguage = 'hi';
  await act(() => {
    tree.update(<UpWorkDashboard navigation={{ navigate }} motion={false} />);
  });
  const selected = tree.root.findAll(
    n =>
      n.props.accessibilityRole === 'tab' &&
      n.props.accessibilityState?.selected,
  );
  expect(selected.length).toBeGreaterThan(0);
  expect(selected.every(n => n.props.accessibilityLabel === 'फीडिंग')).toBe(
    true,
  );
  await press('खसरा फीडिंग');
  expect(navigate).toHaveBeenLastCalledWith('KhasraFeeding');
  await press('भू-अभिलेख');
  await press('खतौनी और भूलेख सेवाएं');
  expect(navigate).toHaveBeenLastCalledWith('BhulekhOptions');
});
