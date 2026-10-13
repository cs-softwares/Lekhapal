import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import OfficialWorkLinks, {
  matchingEroPdf,
} from '../src/components/revenue/OfficialWorkLinks';
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));
test('ERO can be found from every state and opens its dedicated PDF workflow', async () => {
  for (const state of ['UP', 'MH', 'DL', 'BR'])
    expect(matchingEroPdf(state, 'ERO')).toBe(true);
  expect(matchingEroPdf('UP', 'ईआरओ')).toBe(true);
  expect(matchingEroPdf('UP', 'Khasra')).toBe(false);
  const navigate = jest.fn();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <OfficialWorkLinks
        stateCode="UP"
        query="ERO"
        navigation={{ navigate }}
      />,
    );
  });
  await act(() =>
    tree.root
      .findAll(
        n =>
          n.props.accessibilityLabel === 'ERO PDFs' &&
          typeof n.props.onPress === 'function',
      )[0]
      .props.onPress(),
  );
  expect(navigate).toHaveBeenCalledWith('EroPdf');
  await act(() => tree.unmount());
});
