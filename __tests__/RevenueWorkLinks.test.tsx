import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import RevenueWorkLinks, {
  matchingRevenueLinks,
} from '../src/components/revenue/RevenueWorkLinks';
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));
test('visible revenue cards navigate to each real helper', async () => {
  const navigate = jest.fn();
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<RevenueWorkLinks navigation={{ navigate }} />);
  });
  for (const label of [
    'Khasra Feeding',
    'Ansh Nirdharan',
    'Remove Ansh Entry',
    'Prapatra-5 Feeding',
  ])
    await act(async () => {
      tree.root
        .findAll(
          n =>
            n.props.accessibilityLabel === label &&
            typeof n.props.onPress === 'function',
        )[0]
        .props.onPress();
    });
  expect(navigate.mock.calls).toEqual([
    ['KhasraFeeding'],
    ['RevenueFeeding', { module: 'ansh' }],
    ['RevenueFeeding', { module: 'ansh-delete' }],
    ['RevenueFeeding', { module: 'prapatra5' }],
  ]);
  await act(async () => tree.unmount());
});
test('Services search finds English and Hindi revenue modules', () => {
  expect(matchingRevenueLinks('Prapatra')[0].id).toBe('prapatra5');
  expect(matchingRevenueLinks('अंश').map(x => x.id)).toEqual([
    'ansh',
    'ansh-delete',
  ]);
});
