import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AppState, BackHandler, Modal } from 'react-native';
import AppUpdatePrompt from '../src/components/updates/AppUpdatePrompt';
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function Modal({ children, ...props }: any) {
      return React.createElement(
        'Modal',
        props,
        props.visible ? children : null,
      );
    },
  };
});
let mockState = {
  available: false,
  busy: false,
  error: false,
  inProgress: false,
};
const mockCheck = jest.fn(async () => {});
const mockStart = jest.fn(async () => {});
jest.mock('../src/services/appUpdates', () => ({
  useAppUpdates: () => mockState,
  updateSnapshot: () => mockState,
  checkAppUpdate: () => mockCheck(),
  startAppUpdate: () => mockStart(),
}));
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: {
      surface: '#fff',
      text: '#000',
      textMuted: '#555',
      primary: '#123',
    },
  }),
}));
let tree: Renderer.ReactTestRenderer;
beforeEach(() => {
  mockState = {
    available: false,
    busy: false,
    error: false,
    inProgress: false,
  };
  jest.clearAllMocks();
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.restoreAllMocks();
});
test('checks at launch and foreground, with no blocking popup for unknown/current version', async () => {
  let resume!: (state: import('react-native').AppStateStatus) => void;
  const remove = jest.fn();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      resume = listener;
      return { remove };
    });
  await act(async () => {
    tree = Renderer.create(<AppUpdatePrompt />);
  });
  expect(mockCheck).toHaveBeenCalledTimes(1);
  expect(tree.root.findByType(Modal).props.visible).toBe(false);
  await act(async () => {
    resume('active');
  });
  expect(mockCheck).toHaveBeenCalledTimes(2);
  await act(() => tree.unmount());
  expect(remove).toHaveBeenCalled();
});
test('confirmed update gates use, invokes update and offers close instead of dismiss', async () => {
  mockState.available = true;
  const exit = jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => {});
  await act(async () => {
    tree = Renderer.create(<AppUpdatePrompt />);
  });
  expect(tree.root.findByType(Modal).props.visible).toBe(true);
  await act(async () => {
    tree.root.findByProps({ testID: 'update-now' }).props.onPress();
  });
  expect(mockStart).toHaveBeenCalledTimes(1);
  tree.root.findByProps({ testID: 'close-for-update' }).props.onPress();
  tree.root.findByType(Modal).props.onRequestClose();
  expect(exit).toHaveBeenCalledTimes(2);
});
test('pending native flow cannot be double-started and failures show recovery text', async () => {
  mockState = { available: true, busy: true, error: true, inProgress: false };
  await act(async () => {
    tree = Renderer.create(<AppUpdatePrompt />);
  });
  expect(tree.root.findByType(Modal).props.visible).toBe(true);
  expect(tree.root.findByProps({ testID: 'update-now' }).props.disabled).toBe(
    true,
  );
  expect(
    tree.root.findByProps({ accessibilityRole: 'alert' }).props.children,
  ).toContain('Could not open Google Play');
});
