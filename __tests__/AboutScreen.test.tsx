import React from 'react';
import Renderer, {act} from 'react-test-renderer';
import {Alert, Linking, NativeModules, Platform} from 'react-native';
import AboutScreen from '../src/screens/AboutScreen';
import AppPressable from '../src/components/AppPressable';
import {openSupportEmail} from '../src/native/appDetails';
const mockNavigate = jest.fn();
let mockLanguage = 'en';
jest.mock('@react-navigation/native', () => ({useIsFocused: () => true, useNavigation: () => ({navigate: mockNavigate})}));
jest.mock('../src/context/LanguageContext', () => ({useLanguage: () => ({language: mockLanguage})}));
jest.mock('../src/context/ThemeContext', () => ({useAppTheme: () => ({colors: require('../src/theme/palette').LIGHT_COLORS})}));
jest.mock('../src/components/AppHeader', () => require('react-native').View);
jest.mock('../src/components/AppScreen', () => require('react-native').View);
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => require('react-native').View);
let tree: Renderer.ReactTestRenderer;
const originalNative = NativeModules.AppDetails;
const mount = async () => { await act(async () => { tree = Renderer.create(<AboutScreen />); }); };
const press = async (id: string) => {
  await act(async () => { await tree.root.findAllByType(AppPressable).find(b => b.props.testID === id)!.props.onPress?.({} as any); });
};
beforeEach(() => { mockLanguage = 'en'; jest.replaceProperty(Platform, 'OS', 'android'); NativeModules.AppDetails = {version: '1.7', build: '29', packageId: 'com.lekhpal', openSupportEmail: jest.fn().mockResolvedValue(null)}; });
afterEach(async () => { if (tree) await act(() => tree.unmount()); NativeModules.AppDetails = originalNative; jest.restoreAllMocks(); });
test('contact rows and footer open the specified destinations; email uses native Gmail preference', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await mount();
  await press('about-developer');
  expect(open).toHaveBeenLastCalledWith('https://www.linkedin.com/in/sneha-shankhwar-573348344/');
  await press('about-phone'); expect(open).toHaveBeenLastCalledWith('tel:+919286642290');
  await press('about-email'); expect(NativeModules.AppDetails.openSupportEmail).toHaveBeenCalledTimes(1);
  for (const id of ['about-company', 'about-footer']) {
    await press(id); expect(open).toHaveBeenLastCalledWith('https://creative-softwares-sandy.vercel.app/');
  }
  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain('1.7'); expect(text).toContain('29');
  expect(text).toContain('9286642290'); expect(text).not.toContain('9548488443');
});
test('Hindi screen displays actionable error when an email app is missing', async () => {
  mockLanguage = 'hi'; NativeModules.AppDetails.openSupportEmail.mockRejectedValue(new Error('missing'));
  const alert = jest.spyOn(Alert, 'alert'); await mount(); await press('about-email');
  expect(alert).toHaveBeenCalledWith('खुल नहीं पाया', expect.stringContaining('creativesoftwares96@gmail.com'));
  expect(JSON.stringify(tree.toJSON())).toContain('वर्ज़न कोड / बिल्ड');
});
test('older native builds can still compose using the default email app', async () => {
  NativeModules.AppDetails = undefined;
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await openSupportEmail(); expect(open).toHaveBeenCalledWith('mailto:creativesoftwares96@gmail.com');
});
