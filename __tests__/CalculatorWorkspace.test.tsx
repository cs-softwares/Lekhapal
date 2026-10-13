// Preserve coverage of paid-mode behaviour while the shipping UI is temporarily hidden.
jest.mock('../src/config/releaseFeatures', () => ({
  ...jest.requireActual('../src/config/releaseFeatures'),
  RELEASE_FEATURES: {...jest.requireActual('../src/config/releaseFeatures').RELEASE_FEATURES, premium: true},
}));
import {setPremiumAccount,setPremiumEntitlement,clearPremiumAccess,registerPremiumNavigation} from '../src/services/premiumAccess';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CalculatorWorkspace from '../src/components/calculator/CalculatorWorkspace';
import { CalculatorButton } from '../src/components/calculator/CalculatorUI';
import { DeskCalculatorId } from '../src/domain/lekhpalCalculator';
import { loadWorkspaceRecords } from '../src/utils/workspaceStorage';
import {
  shareTextSummary,
  exportSummaryAsPdf,
} from '../src/utils/workspaceExport';
import { WorkspaceRecord } from '../src/types/workspace';
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));
jest.mock('../src/context/SelectedStateContext', () => ({
  useSelectedState: () => ({ stateCode: 'UP' }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useAppTheme: () => ({
    isDarkTheme: false,
    colors: require('../src/theme/palette').LIGHT_COLORS,
  }),
}));
jest.mock(
  'react-native-vector-icons/MaterialCommunityIcons',
  () => require('react-native').View,
);
jest.mock('../src/utils/workspaceExport', () => ({
  shareTextSummary: jest.fn(async () => {}),
  exportSummaryAsPdf: jest.fn(async () => {}),
}));
const setup = async (
  toolId: DeskCalculatorId,
  externalRecord?: WorkspaceRecord,
) => {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <CalculatorWorkspace
        toolId={toolId}
        externalRecord={externalRecord}
        onOpenOfficial={() => {}}
      />,
    );
  });
  return tree;
};
const field = (tree: Renderer.ReactTestRenderer, label: string) =>
  tree.root
    .findAllByType(TextInput)
    .find(f => f.props.accessibilityLabel === label)!;
const change = async (
  tree: Renderer.ReactTestRenderer,
  label: string,
  value: string,
) => act(() => field(tree, label).props.onChangeText(value));
const button = (tree: Renderer.ReactTestRenderer, title: string) =>
  tree.root.findAllByType(CalculatorButton).find(b => b.props.title === title)!;
beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('lekhpal-selected-state', 'UP');
  jest.clearAllMocks();
  setPremiumAccount('calculator-user');
  setPremiumEntitlement({userId:'calculator-user',active:true,serverTime:new Date().toISOString(),verifiedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),validUntil:new Date(Date.now()+60000).toISOString(),features:['gps_capture','pdf_reports']});
});
afterEach(()=>{clearPremiumAccess();registerPremiumNavigation(null);});
test('co-owner calculation saves, shares and exports the same complete worksheet; saved note reopens all inputs', async () => {
  const tree = await setup('share-calculator');
  expect(button(tree, 'Save calculation').props.disabled).toBe(true);
  await change(tree, 'Recorded area', '1.2');
  await change(tree, 'Owner 1', 'Ram');
  await change(tree, 'Share 1', '1/3');
  await change(tree, 'Share 2', '2/3');
  expect(button(tree, 'Save calculation').props.disabled).toBe(false);
  await act(async () => button(tree, 'Save calculation').props.onPress());
  const [record] = await loadWorkspaceRecords('share-calculator');
  expect(record.values.unit).toBe('hectare');
  expect(record.summaryLines).toContain('Ram: 1/3 · 33.3333% · 0.4 ha');
  await act(async () => button(tree, 'Share').props.onPress());
  await act(async () => button(tree, 'PDF').props.onPress());
  expect(shareTextSummary).toHaveBeenCalledWith(
    expect.objectContaining({ summaryLines: record.summaryLines }),
  );
  expect(exportSummaryAsPdf).toHaveBeenCalledWith(
    expect.objectContaining({ summaryLines: record.summaryLines }),
  );
  await act(() => tree.unmount());
  const restored = await setup('share-calculator', record);
  expect(field(restored, 'Owner 1').props.value).toBe('Ram');
  expect(field(restored, 'Share 2').props.value).toBe('2/3');
  await act(() => restored.unmount());
});
test('drafts survive remounts and stay separate between tools', async () => {
  const a = await setup('rate-finder');
  await change(a, 'Recorded area', '4');
  await change(a, 'Total amount ₹', '12000');
  await act(() => a.unmount());
  const b = await setup('registry-estimate');
  expect(field(b, 'Recorded area').props.value).toBe('');
  await act(() => b.unmount());
  const restored = await setup('rate-finder');
  expect(field(restored, 'Recorded area').props.value).toBe('4');
  expect(field(restored, 'Total amount ₹').props.value).toBe('12000');
  await act(() => restored.unmount());
});
test('overallocated shares block saving and export, and removing an owner recomputes', async () => {
  const tree = await setup('share-calculator');
  await change(tree, 'Recorded area', '2');
  await change(tree, 'Share 1', '3/4');
  await change(tree, 'Share 2', '1/2');
  expect(button(tree, 'Save calculation').props.disabled).toBe(true);
  expect(button(tree, 'PDF').props.disabled).toBe(true);
  await change(tree, 'Share 2', '1/4');
  expect(button(tree, 'Save calculation').props.disabled).toBe(false);
  await act(() => tree.unmount());
});
test.each([
  [
    'crop-loss',
    [
      ['Affected area', '1'],
      ['Expected yield · q/ha', '40'],
      ['Actual yield · q/ha', '25'],
      ['Crop price · ₹/quintal', '2000'],
    ],
    'Estimated crop value loss: ₹30,000',
  ],
  [
    'recovery-balance',
    [
      ['Current demand ₹', '1000'],
      ['Opening arrears ₹', '200'],
      ['Amount collected ₹', '700'],
      ['Approved adjustment ₹', '100'],
    ],
    'Balance to recover: ₹400',
  ],
])('%s exports a calculated field worksheet', async (id, inputs, expected) => {
  const tree = await setup(id as DeskCalculatorId);
  for (const [key, value] of inputs as string[][])
    await change(tree, key, value);
  await act(async () => button(tree, 'Share').props.onPress());
  expect(shareTextSummary).toHaveBeenCalledWith(
    expect.objectContaining({
      summaryLines: expect.arrayContaining([expected]),
    }),
  );
  await act(() => tree.unmount());
});

 test('free users see an upgrade sample for advanced tools while basic fractions stay editable',async()=>{
 clearPremiumAccess();const open=jest.fn();registerPremiumNavigation(open);
 const tree=await setup('share-calculator');expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
 expect(JSON.stringify(tree.toJSON())).toContain('0.4 ha');await act(()=>button(tree,'Unlock with Premium').props.onPress());expect(open).toHaveBeenCalledTimes(1);
 await act(()=>tree.unmount());const free=await setup('fraction-hissa-calculator');expect(free.root.findAllByType(TextInput).length).toBeGreaterThan(0);await act(()=>free.unmount());
 });
 test('expiry removes editable advanced worksheets while preserving saved record viewing',async()=>{
 const record={id:'saved',toolId:'share-calculator',title:'Existing result',values:{},summaryLines:['Recorded result: 0.4 ha'],createdAt:'',updatedAt:''};
 const tree=await setup('share-calculator',record);await act(()=>clearPremiumAccess());
 expect(tree.root.findAllByType(TextInput)).toHaveLength(0);expect(JSON.stringify(tree.toJSON())).toContain('Recorded result: 0.4 ha');await act(()=>tree.unmount());
 });

test.each([
  ['percentage-calculator', [['Value', '800'], ['Percentage %', '12.5']], 'Percentage amount: 100'],
  ['date-difference', [['Start date', '28/02/2024'], ['End date', '01/03/2024']], 'Elapsed days: 2 days'],
  ['interest-calculator', [['Principal ₹', '10000'], ['Annual rate %', '10'], ['Time in years', '2']], 'Interest: ₹2,000'],
  ['loan-emi', [['Principal ₹', '12000'], ['Annual rate %', '0'], ['Time in months', '12']], 'Monthly EMI: ₹1,000'],
  ['number-words', [['Amount ₹', '100000.05']], 'Amount in English words: One Lakh Rupees and Five Paise Only'],
  ['length-converter', [['Length to convert', '1']], 'Converted length: 3.2808399 feet'],
  ['scientific-calculator', [['Expression', '(125+75)*3']], 'Result: 600'],
  ['seed-rate', [['Field area', '1'], ['Seed rate kg per selected unit', '20']], 'Seed required: 49.42107629 kg'],
  ['fertilizer-quantity', [['Field area', '1'], ['Fertilizer kg per selected unit', '50']], 'Fertilizer required: 123.55269073 kg'],
  ['spray-dose', [['Tank capacity L', '15'], ['Dose per full tank', '30'], ['Total water L', '40']], 'Total dose quantity: 80 ml'],
  ['yield-estimate', [['Field area', '1'], ['Yield q per selected unit', '10']], 'Estimated production: 24.7105 q'],
  ['irrigation-date', [['Last irrigation date', '25/12/2026'], ['Interval in days', '10']], 'Next date: 04/01/2027'],
])('%s produces the same result in saved, shared and PDF worksheets', async (id, inputs, expected) => {
  const tree = await setup(id as DeskCalculatorId);
  for (const [label, value] of inputs as string[][]) await change(tree, label, value);
  expect(button(tree, 'Save calculation').props.disabled).toBe(false);
  await act(async () => button(tree, 'Save calculation').props.onPress());
  const [record] = await loadWorkspaceRecords(id as string);
  expect(record.summaryLines).toContain(expected);
  await act(async () => button(tree, 'Share').props.onPress());
  await act(async () => button(tree, 'PDF').props.onPress());
  expect(shareTextSummary).toHaveBeenCalledWith(expect.objectContaining({ summaryLines: record.summaryLines }));
  expect(exportSummaryAsPdf).toHaveBeenCalledWith(expect.objectContaining({ summaryLines: record.summaryLines }));
  await act(() => tree.unmount());
  const restored = await setup(id as DeskCalculatorId, record);
  for (const [label, value] of inputs as string[][]) expect(field(restored, label).props.value).toBe(value);
  await act(() => restored.unmount());
});

test('calculator keypad evaluates, continues from equals, starts a new number and clears without losing saved reports', async () => {
  const tree = await setup('scientific-calculator');
  const press = async (label: string) => act(() => tree.root.findAll(b => b.props.accessibilityLabel === label && typeof b.props.onPress === 'function')[0].props.onPress());
  for (const key of ['1', '2', '+', '3', 'Equals']) await press(key);
  expect(tree.root.findByProps({testID:'scientific-result'}).props.children).toBe('15');
  for (const key of ['×', '2', 'Equals']) await press(key);
  expect(field(tree, 'Expression').props.value).toBe('15×2');
  expect(tree.root.findByProps({testID:'scientific-result'}).props.children).toBe('30');
  await act(async () => button(tree, 'Save calculation').props.onPress());
  await press('7');
  expect(field(tree, 'Expression').props.value).toBe('7');
  await press('Backspace');
  expect(button(tree, 'Save calculation').props.disabled).toBe(true);
  expect((await loadWorkspaceRecords('scientific-calculator'))[0].summaryLines).toContain('Result: 30');
  await act(() => tree.unmount());
});

test('scientific angle toggle and invalid calculation use the same result as saved reports', async () => {
  const tree = await setup('scientific-calculator');
  const press = async (label: string) => act(() => tree.root.findAll(b => b.props.accessibilityLabel === label && typeof b.props.onPress === 'function')[0].props.onPress());
  await change(tree, 'Expression', 'sin(pi/2)');
  await press('Change angle unit');
  expect(tree.root.findByProps({testID:'scientific-result'}).props.children).toBe('1');
  await act(async () => button(tree, 'Share').props.onPress());
  expect(shareTextSummary).toHaveBeenLastCalledWith(expect.objectContaining({summaryLines:expect.arrayContaining(['Result: 1', 'Angles: Radians'])}));
  await change(tree, 'Expression', '1/0');
  await press('Equals');
  expect(button(tree, 'Save calculation').props.disabled).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain('This calculation is not valid');
  await press('All clear');
  expect(field(tree, 'Expression').props.value).toBe('');
  await act(() => tree.unmount());
});

test('unit popup selection and swap update the correct conversion and report', async () => {
  const tree = await setup('length-converter');
  const press = async (label: string) => act(() => tree.root.findAll(b => b.props.accessibilityLabel === label && typeof b.props.onPress === 'function')[0].props.onPress());
  await change(tree, 'Length to convert', '1');
  await press('From');
  await press('Mile');
  await act(async () => button(tree, 'Share').props.onPress());
  expect(shareTextSummary).toHaveBeenLastCalledWith(expect.objectContaining({summaryLines:expect.arrayContaining(['Converted length: 5,280 feet'])}));
  await press('To');
  await press('Metre');
  await act(async () => button(tree, 'Share').props.onPress());
  expect(shareTextSummary).toHaveBeenLastCalledWith(expect.objectContaining({summaryLines:expect.arrayContaining(['Converted length: 1,609.344 meter'])}));
  await press('Swap units');
  await act(async () => button(tree, 'Save calculation').props.onPress());
  const [record] = await loadWorkspaceRecords('length-converter');
  expect(record.values).toMatchObject({lengthFrom:'meter',lengthTo:'mile'});
  await act(() => tree.unmount());
});

test('calendar selects leap day and edits a distant year without accepting an invalid year', async () => {
  const tree = await setup('date-difference');
  const press = async (label: string) => act(() => tree.root.findAll(b => b.props.accessibilityLabel === label && typeof b.props.onPress === 'function')[0].props.onPress());
  await change(tree, 'Start date', '28/02/2024');
  await press('Open calendar: Start date');
  await press('29/02/2024');
  expect(field(tree,'Start date').props.value).toBe('29/02/2024');
  await change(tree,'End date','01/03/2024');
  await act(async () => button(tree,'Share').props.onPress());
  expect(shareTextSummary).toHaveBeenLastCalledWith(expect.objectContaining({summaryLines:expect.arrayContaining(['Elapsed days: 1 day'])}));
  await press('Open calendar: Start date');
  await press('Change year');
  await change(tree,'Year','1899');
  await press('Apply year');
  expect(JSON.stringify(tree.toJSON())).toContain('Enter a year from 1900 to 2199');
  await change(tree,'Year','1900');
  await press('Apply year');
  expect(tree.root.findAll(n => n.props.accessibilityLabel === '29/02/1900')).toHaveLength(0);
  await press('28/02/1900');
  expect(field(tree,'Start date').props.value).toBe('28/02/1900');
  await act(() => tree.unmount());
});
