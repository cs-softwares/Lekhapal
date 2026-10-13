jest.mock('../src/context/SelectedStateContext', () => ({ useSelectedState: () => ({stateCode: 'UP'}) }));
jest.mock('../src/context/PremiumContext',()=>({usePremium:()=>({entitlement:null})}));
jest.mock('../src/context/AuthSessionContext',()=>({useAuthSession:()=>({session:{email:'test@example.com'}})}));
jest.mock('../src/services/passwordRecovery',()=>({openPasswordRecovery:jest.fn()}));
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DeskHelpScreen,
  SavedWorkScreen,
  SimpleSettingsScreen,
} from '../src/screens/desk/AppUtilityScreens';
import { RELEASE_FEATURES } from '../src/config/releaseFeatures';
import { persistWorkspaceRecords } from '../src/utils/workspaceStorage';
import { consumePendingMeasurementRecordSelection } from '../src/utils/measurementRecordBridge';
const mockNavigate = jest.fn();
const mockLanguage = jest.fn();
const mockTheme = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (fn: () => void) => require('react').useEffect(fn, [fn]),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: require('../src/theme/palette').LIGHT_COLORS,
    isDarkTheme: false,
    setThemeMode: mockTheme,
  }),
}));
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: mockLanguage }),
}));
jest.mock(
  'react-native-vector-icons/MaterialCommunityIcons',
  () => require('react-native').View,
);
let tree: Renderer.ReactTestRenderer;
const mount = async (component: React.ReactElement) =>
  act(async () => {
    tree = Renderer.create(component);
  });
const buttons = (label: string) =>
  tree.root.findAll(
    p =>
      p.props.accessibilityLabel === label &&
      typeof p.props.onPress === 'function',
  );
const tap = async (label: string) =>
  act(async () => {
    buttons(label)[0].props.onPress();
  });
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.replaceProperty(RELEASE_FEATURES, 'multiState', false);
  consumePendingMeasurementRecordSelection();
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.restoreAllMocks();
});
test('simple settings use live preference actions and hide state switching', async () => {
  await mount(<SimpleSettingsScreen />);
  expect(buttons('Change state')).toHaveLength(0);
  await tap('Dark');
  expect(mockTheme).toHaveBeenCalledWith('dark');
  await tap('हिन्दी');
  expect(mockLanguage).toHaveBeenCalledWith('hi');
  await tap('Profile & work area');
  expect(mockNavigate).toHaveBeenCalledWith('Officer');
  await tap('Saved work');
  expect(mockNavigate).toHaveBeenCalledWith('SavedWork');
});
test('saved work reopens the correct calculator with original inputs', async () => {
  const note = {
    id: 'r1',
    toolId: 'rate-finder',
    title: 'Village A',
    subtitle: 'Rate 500',
    summaryLines: ['Gata 12'],
    values: {
      calculatorVersion: '3',
      area: '2',
      value: '1000',
      unit: 'hectare',
    },
    createdAt: '2026-09-24',
    updatedAt: '2026-09-24',
  };
  await persistWorkspaceRecords('rate-finder', [note]);
  await mount(<SavedWorkScreen />);
  await tap('Open Village A');
  expect(consumePendingMeasurementRecordSelection()).toEqual({
    moduleId: 'rate-finder',
    record: note,
  });
  expect(mockNavigate).toHaveBeenCalledWith('GovernmentPortals', {
    screen: 'Calculator',
    params: { focusToolId: 'rate-finder' },
  });
});
test('saved work searches full note text and distinguishes measurement workspace storage IDs', async () => {
  const note = {
    id: 'm1',
    toolId: 'field-area-workspace',
    title: 'Field A',
    summaryLines: ['Gata 112'],
    values: { length: '20', width: '10' },
    createdAt: '2026-09-24',
    updatedAt: '2026-09-24',
  };
  await persistWorkspaceRecords('field-area-workspace', [note]);
  await mount(<SavedWorkScreen />);
  await act(() => tree.root.findByType(TextInput).props.onChangeText('112'));
  expect(buttons('Open Field A').length).toBeGreaterThan(0);
  await tap('Open Field A');
  expect(consumePendingMeasurementRecordSelection()?.moduleId).toBe(
    'field-area',
  );
  expect(mockNavigate).toHaveBeenCalledWith('GovernmentPortals', {
    screen: 'Measurement',
    params: { focusToolId: 'field-area' },
  });
  await act(() =>
    tree.root.findByType(TextInput).props.onChangeText('missing'),
  );
  expect(buttons('Open Field A')).toHaveLength(0);
});
test('help search and expandable guides work', async () => {
  await mount(<DeskHelpScreen />);
  await act(() =>
    tree.root.findByType(TextInput).props.onChangeText('quasi-unmatched'),
  );
  expect(buttons('Calculate recorded shares')).toHaveLength(0);
  await act(() =>
    tree.root.findByType(TextInput).props.onChangeText('Khatauni'),
  );
  await tap('Calculate recorded shares');
  expect(
    buttons('Calculate recorded shares')[0].props.accessibilityState.expanded,
  ).toBe(true);
});
