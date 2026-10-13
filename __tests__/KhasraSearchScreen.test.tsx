import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import KhasraSearchScreen from '../src/screens/KhasraSearchScreen';
import * as api from '../src/services/khasraPublic';
jest.mock('../src/services/khasraPublic', () => ({
  ...jest.requireActual('../src/services/khasraPublic'),
  getKhasraPlaces: jest.fn(),
  searchKhasra: jest.fn(),
}));
jest.mock('../src/components/AppHeader', () => 'AppHeader');
jest.mock('../src/components/AppScreen', () => 'AppScreen');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));
let tree: Renderer.ReactTestRenderer;
const control = (label: string) =>
  tree.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];
const tap = async (label: string) => {
  await act(async () => {
    control(label).props.onPress();
  });
};
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(api.getKhasraPlaces)
    .mockImplementation(async (district, tehsil) =>
      !district
        ? [
            { code: '137', name: 'District A' },
            { code: '203', name: 'District B' },
          ]
        : !tehsil
        ? [{ code: '00730', name: 'Tehsil A' }]
        : [{ code: '117944', name: 'Village A' }],
    );
  jest.mocked(api.searchKhasra).mockResolvedValue([]);
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
});
test('native flow searches the chosen village and clears dependent choices on district changes', async () => {
  await act(async () => {
    tree = Renderer.create(
      <KhasraSearchScreen
        navigation={{ goBack: jest.fn() } as any}
        route={{ key: 'search', name: 'KhasraSearch' }}
      />,
    );
  });
  expect(tree.root.findByType('AppHeader' as any).props.title).toBe(
    'Khasra Dekhein',
  );
  expect(control('Choose tehsil').props.disabled).toBe(true);
  await tap('Choose district');
  await tap('District A');
  await tap('Choose tehsil');
  await tap('Tehsil A');
  await tap('Choose village');
  await tap('Village A');
  const field = tree.root.findAll(
    node =>
      node.props.accessibilityLabel === 'Khasra search value' &&
      typeof node.props.onChangeText === 'function',
  )[0];
  await act(async () => {
    field.props.onChangeText('1');
  });
  await tap('Search Khasra');
  expect(api.searchKhasra).toHaveBeenCalledWith(
    '117944',
    '1433',
    'K',
    '1',
    expect.anything(),
  );
  expect(JSON.stringify(tree.toJSON())).toContain('No matching records found');
  await tap('Choose district');
  await tap('District B');
  expect(control('Choose village').props.disabled).toBe(true);
  expect(control('Search Khasra').props.disabled).toBe(true);
  expect(JSON.stringify(tree.toJSON())).not.toContain(
    'No matching records found',
  );
});
