import { RELEASE_FEATURES } from '../src/config/releaseFeatures';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileScreen from '../src/screens/ProfileScreen';
import { DeskProvider } from '../src/context/DeskContext';
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockSignOut = jest.fn(async () => {});
const mockSetLanguage = jest.fn();
const mockSetThemeMode = jest.fn();
let mockSession: any = {
  isGuest: true,
  displayName: 'Guest User',
  email: null,
  phoneNumber: null,
  plan: 'guest',
};
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: mockReset,
    getParent: () => undefined,
    getState: () => ({ routeNames: ['Home', 'Profile'] }),
  }),
}));
jest.mock('../src/context/AuthSessionContext', () => ({
  useAuthSession: () => ({ session: mockSession, signOut: mockSignOut }),
}));
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: mockSetLanguage }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: require('../src/theme/palette').LIGHT_COLORS,
    isDarkTheme: false,
    setThemeMode: mockSetThemeMode,
  }),
}));
jest.mock('../src/context/SelectedStateContext', () => ({
  useSelectedState: () => ({ stateCode: 'UP' }),
}));
jest.mock(
  'react-native-vector-icons/MaterialCommunityIcons',
  () => require('react-native').View,
);
jest.mock('react-native-linear-gradient', () => require('react-native').View);
jest.mock('../src/components/profile/ProfileUI', () => ({
  ...jest.requireActual('../src/components/profile/ProfileUI'),
  useProfileMotion: () => false,
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
let tree: Renderer.ReactTestRenderer;
const setup = async () =>
  act(async () => {
    tree = Renderer.create(
      <DeskProvider stateCode="UP">
        <ProfileScreen />
      </DeskProvider>,
    );
  });
const press = async (label: string) =>
  act(async () => {
    await tree.root
      .findAll(
        p =>
          p.props.accessibilityLabel === label &&
          typeof p.props.onPress === 'function',
      )[0]
      .props.onPress();
  });
const edit = async (label: string, value: string) =>
  act(() =>
    tree.root
      .findAllByType(TextInput)
      .find(p => p.props.accessibilityLabel === label)!
      .props.onChangeText(value),
  );
beforeEach(async () => {
  jest.replaceProperty(RELEASE_FEATURES, 'multiState', true);
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockSession = {
    isGuest: true,
    displayName: 'Guest User',
    email: null,
    phoneNumber: null,
    plan: 'guest',
  };
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.restoreAllMocks();
});
test('profile edit persists trimmed details and reopens them after a remount', async () => {
  await setup();
  await press('Edit profile');
  await edit('Your name', '  Test Officer  ');
  await edit('District / tehsil / circle', '  Tehsil A  ');
  await press('Save profile');
  const stored = JSON.parse(
    (await AsyncStorage.getItem('lekhpal-field-desk-v1-UP'))!,
  );
  expect(stored.settings.officer).toBe('Test Officer');
  expect(stored.settings.circle).toBe('Tehsil A');
  expect(stored.queue).toHaveLength(0);
  await act(() => tree.unmount());
  await setup();
  await press('Edit profile');
  expect(
    tree.root
      .findAllByType(TextInput)
      .find(p => p.props.accessibilityLabel === 'Your name')!.props.value,
  ).toBe('Test Officer');
});
test('blank names do not save; a failed save preserves inputs for retry', async () => {
  await setup();
  await press('Edit profile');
  await edit('Your name', '   ');
  await press('Save profile');
  expect(await AsyncStorage.getItem('lekhpal-field-desk-v1-UP')).toBeNull();
  await edit('Your name', 'Retry Name');
  const alert = jest.spyOn(Alert, 'alert');
  jest
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('Storage full'));
  await press('Save profile');
  expect(alert).toHaveBeenCalledWith('Profile not saved', expect.any(String));
  expect(
    tree.root
      .findAllByType(TextInput)
      .find(p => p.props.accessibilityLabel === 'Your name')!.props.value,
  ).toBe('Retry Name');
  await press('Save profile');
  expect(
    JSON.parse((await AsyncStorage.getItem('lekhpal-field-desk-v1-UP'))!)
      .settings.officer,
  ).toBe('Retry Name');
});
test('language, appearance, state and guest sign-in actions use real app controls', async () => {
  await setup();
  await press('Language');
  await press('हिन्दी');
  expect(mockSetLanguage).toHaveBeenCalledWith('hi');
  await press('Appearance');
  await press('Dark');
  expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
  await press('State / union territory');
  expect(mockNavigate).toHaveBeenCalledWith('StateSelection', { change: true });
  await press('Sign in');
  expect(mockNavigate).toHaveBeenCalledWith('Login');
});
test('sign-out requires confirmation and failed sign-out does not reset navigation', async () => {
  mockSession = {
    isGuest: false,
    displayName: 'Account User',
    email: 'test@example.com',
    phoneNumber: null,
    plan: 'premium',
  };
  const alert = jest.spyOn(Alert, 'alert');
  await setup();
  await press('Sign out');
  expect(mockSignOut).not.toHaveBeenCalled();
  const buttons = alert.mock.calls[0][2]!;
  mockSignOut.mockRejectedValueOnce(new Error('offline'));
  await act(async () => buttons.find(b => b.text === 'Sign out')!.onPress!());
  expect(mockReset).not.toHaveBeenCalled();
  expect(alert).toHaveBeenLastCalledWith(
    'Could not sign out',
    'Please try again.',
  );
  await press('Sign out');
  await act(async () =>
    alert.mock.calls.at(-1)![2]!.find(b => b.text === 'Sign out')!.onPress!(),
  );
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Login' }],
  });
});
