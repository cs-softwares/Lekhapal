import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import BhulekhOptionsScreen from '../src/screens/BhulekhOptionsScreen';
import WebViewPortalScreen from '../src/screens/WebViewPortalScreen';
import UpPortalListItem from '../src/components/UpPortalListItem';

jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: { text: '#172033' } }),
}));
jest.mock('../src/components/BhulekhRelatedLinks', () => () => null);
jest.mock('../src/components/AppHeader', () => () => null);
jest.mock(
  '../src/components/AppScreen',
  () =>
    ({ children }: any) =>
      children,
);
jest.mock('../src/components/UpPortalListItem', () => () => null);
jest.mock('../src/screens/WebViewPortalScreen', () => () => null);

test('selection reuses the preloaded browser; closing returns to services and directories', async () => {
  let tree!: Renderer.ReactTestRenderer;
  const navigation = { navigate: jest.fn(), goBack: jest.fn() } as any;
  await act(() => {
    tree = Renderer.create(
      <BhulekhOptionsScreen
        navigation={navigation}
        route={{ name: 'BhulekhOptions', key: 'options' }}
      />,
    );
  });
  const browser = tree.root.findByType(WebViewPortalScreen);
  expect(browser.props.isPreloading).toBe(true);
  expect(browser.props.route.params.bhulekhService).toBeUndefined();
  expect(tree.root.findAllByType(UpPortalListItem)).toHaveLength(11);
  for (const [title, service] of [
    ['Khatauni Copy', 'copy'],
    ['Plot Sale Status', 'sale'],
    ['Plot Dispute Status', 'dispute'],
    ['Certified Khatauni Copy', 'certified'],
    ['Districts (Jila)', undefined],
    ['Tehsils', undefined],
    ['Parganas', undefined],
    ['Land Types', undefined],
    ['Government Land Search', undefined],
  ]) {
    await act(() =>
      tree.root
        .findAllByType(UpPortalListItem)
        .find(row => row.props.title === title)!
        .props.onPress(),
    );
    expect(tree.root.findByType(WebViewPortalScreen)).toBe(browser);
    expect(browser.props.isPreloading).toBe(false);
    expect(browser.props.route.params.bhulekhService).toBe(service);
    expect(navigation.navigate).not.toHaveBeenCalled();
    await act(() => browser.props.onClose());
    expect(tree.root.findByType(WebViewPortalScreen)).toBe(browser);
    expect(browser.props.isPreloading).toBe(true);
    expect(tree.root.findAllByType(UpPortalListItem)).toHaveLength(11);
  }
  await act(() => tree.unmount());
});
