import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import MeasurementScreen from '../src/screens/MeasurementScreen';
import MeasurementCalculator from '../src/components/measurement/MeasurementCalculator';
import AppPressable from '../src/components/AppPressable';

let mockParams: { focusToolId?: string } = {};
const mockNavigation = {
  navigate: jest.fn(),
  setParams: jest.fn((params: typeof mockParams) => {
    mockParams = { ...mockParams, ...params };
  }),
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockParams }),
  useIsFocused: () => true,
  useFocusEffect: () => {},
}));
jest.mock('../src/components/AppScreen', () => require('react-native').View);
jest.mock('../src/components/AppHeader', () => require('react-native').View);
jest.mock('../src/components/measurement/MeasurementCalculator', () =>
  jest.fn(() => null),
);
jest.mock(
  '../src/components/workspaces/GpsLandMeasureWorkspace',
  () => () => null,
);
jest.mock('../src/components/measurement/MeasurementUI', () => ({
  useMeasurementMotion: () => false,
}));
jest.mock('../src/hooks/usePremiumFeatures', () => ({
  usePremiumFeatures: () => true,
}));
jest.mock('../src/services/interstitialAds', () => ({
  cancelCompletedWorkAd: jest.fn(),
}));
jest.mock('../src/context/SelectedStateContext', () => ({
  useSelectedState: () => ({ stateCode: 'UP' }),
}));
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: {} }),
}));
jest.mock(
  'react-native-vector-icons/MaterialCommunityIcons',
  () => require('react-native').View,
);

test('the same dashboard shortcut opens its tool again after an in-screen tool change', async () => {
  mockParams = { focusToolId: 'area-converter' };
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<MeasurementScreen />);
  });
  expect(tree.root.findByType(MeasurementCalculator).props.moduleId).toBe(
    'area-converter',
  );
  expect(mockParams.focusToolId).toBeUndefined();
  await act(() => {
    tree.update(<MeasurementScreen />);
  });
  await act(() => {
    tree.root.findAllByType(AppPressable)[0].props.onPress();
  });
  expect(tree.root.findByType(MeasurementCalculator).props.moduleId).toBe(
    'field-area',
  );
  mockParams = { focusToolId: 'area-converter' };
  await act(() => {
    tree.update(<MeasurementScreen />);
  });
  expect(tree.root.findByType(MeasurementCalculator).props.moduleId).toBe(
    'area-converter',
  );
  expect(mockParams.focusToolId).toBeUndefined();
  await act(() => tree.unmount());
});
