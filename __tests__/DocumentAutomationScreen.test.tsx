import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AppState, AppStateStatus, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateDocumentPdf } from '../src/native/workFiles';
import DocumentAutomationScreen from '../src/screens/DocumentAutomationScreen';
import {
  docStorageKey,
  emptyDocStore,
  newDocDraft,
} from '../src/domain/documentAutomation';
import OfficialWorkLinks, {
  matchingDocumentAutomation,
} from '../src/components/revenue/OfficialWorkLinks';
jest.mock('@react-navigation/native', () => ({ usePreventRemove: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));
jest.mock('../src/components/AppHeader', () => 'AppHeader');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../src/native/workFiles', () => ({
  generateDocumentPdf: jest.fn(async () => '/Documents/Lekhpal-test.pdf'),
  validateDocumentPdf: jest.fn(async p => p),
  exportDocumentPdf: jest.fn(),
  printDocumentPdf: jest.fn(),
}));
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({ colors: require('../src/theme/palette').LIGHT_COLORS }),
}));
let root: Renderer.ReactTestRenderer;
const button = (label: string) =>
  root.root.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  )[0];
const press = async (label: string) =>
  act(async () => {
    button(label).props.onPress();
  });
const fill = async (label: string, value: string) =>
  act(async () => {
    root.root
      .findAllByType(TextInput)
      .find(n => n.props.accessibilityLabel === label)!
      .props.onChangeText(value);
  });
const mount = async () =>
  act(async () => {
    root = Renderer.create(
      <DocumentAutomationScreen
        navigation={{ goBack: jest.fn(), dispatch: jest.fn() } as any}
        route={{ params: { stateCode: 'UP' } } as any}
      />,
    );
  });
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
});
test('Services finds document automation and preserves the selected state', async () => {
  expect(matchingDocumentAutomation('MH', 'application')).toBe(true);
  expect(matchingDocumentAutomation('UP', 'आवेदन')).toBe(true);
  expect(matchingDocumentAutomation('UP', 'Khasra')).toBe(false);
  const navigate = jest.fn();
  await act(() => {
    root = Renderer.create(
      <OfficialWorkLinks
        stateCode="BR"
        query="document"
        navigation={{ navigate }}
      />,
    );
  });
  await press('Document automation');
  expect(navigate).toHaveBeenCalledWith('DocumentAutomation', {
    stateCode: 'BR',
  });
});
test('user saves an incomplete draft, reopens it and generates a PDF after preview', async () => {
  await mount();
  await press('General application');
  await fill('Office / recipient', 'Tehsil office');
  await press('Next');
  await fill('Applicant / concerned person', 'Ram Kumar');
  await press('Next');
  await press('Save draft');
  let saved = JSON.parse((await AsyncStorage.getItem(docStorageKey('UP')))!);
  expect(saved.drafts[0].values.person).toBe('Ram Kumar');
  await act(() =>
    root.root.findByType('AppHeader' as any).props.onRightPress(),
  );
  await press('Edit draft');
  await press('3. Content');
  await fill('Subject', 'Records');
  await fill('Requested action', 'Please verify.');
  await press('Preview document');
  await press('Save this PDF');
  expect(generateDocumentPdf).toHaveBeenCalledTimes(1);
  expect(jest.mocked(generateDocumentPdf).mock.calls[0][1]).toContain(
    'Ram Kumar',
  );
  saved = JSON.parse((await AsyncStorage.getItem(docStorageKey('UP')))!);
  expect(saved.files).toHaveLength(1);
  expect(saved.batch.next).toBe(1);
  expect(await AsyncStorage.getItem(docStorageKey('MH'))).toBeNull();
});
test('background pause journals in-flight PDF and UI Resume generates only remaining rows', async () => {
  const d = newDocDraft('application', 'en');
  d.values = {
    office: 'Office',
    date: '12-10-2026',
    subject: 'Review',
    request: 'Check records',
  };
  await AsyncStorage.setItem(
    docStorageKey('UP'),
    JSON.stringify({ ...emptyDocStore(), drafts: [d] }),
  );
  let background: ((state: AppStateStatus) => void) | undefined;
  const listener = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_, fn) => {
      background = fn;
      return { remove: jest.fn() };
    });
  await mount();
  await press('Saved work');
  await press('Edit draft');
  await press('3. Content');
  await fill('Batch rows', 'First|||101|1\nSecond|||102|2');
  await press('Review batch');
  let finish!: (value: string) => void;
  jest.mocked(generateDocumentPdf).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  await press('Generate 2 PDFs');
  expect(generateDocumentPdf).toHaveBeenCalledTimes(1);
  await act(async () => {
    background?.('background');
    finish('/Documents/Lekhpal-first.pdf');
  });
  expect(
    JSON.parse((await AsyncStorage.getItem(docStorageKey('UP')))!).batch.next,
  ).toBe(1);
  await press('Resume batch');
  expect(generateDocumentPdf).toHaveBeenCalledTimes(2);
  expect(
    JSON.parse((await AsyncStorage.getItem(docStorageKey('UP')))!).batch.next,
  ).toBe(2);
  listener.mockRestore();
});
