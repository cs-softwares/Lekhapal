import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeskProvider, useDesk } from '../src/context/DeskContext';
import { Button } from '../src/components/desk/Kit';
import { BoundaryMap } from '../src/components/desk/BoundaryMap';
import LandSearchScreen from '../src/screens/desk/LandSearchScreen';
import MutationScreen from '../src/screens/desk/MutationScreen';
import CropSurveyScreen from '../src/screens/desk/CropSurveyScreen';
import FieldMapScreen from '../src/screens/desk/FieldMapScreen';
import CertificateScreen from '../src/screens/desk/CertificateScreen';
import EncroachmentScreen from '../src/screens/desk/EncroachmentScreen';
import { createInitialDeskState } from '../test-support/deskData';
import { openUpHomeEntry } from '../src/navigation/upEntryNavigation';
import { TOP_UP_ACCESS_ENTRIES } from '../src/data/upHomeCatalog';
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: () => {},
  useNavigation: () => ({
    dispatch: jest.fn(),
    getState: () => ({ type: 'tab' }),
  }),
}));
let desk: ReturnType<typeof useDesk>, root: Renderer.ReactTestRenderer;
const navigation = { navigate: jest.fn(), setParams: jest.fn() };
function testProps<T>(): T {
  return { navigation, route: { params: undefined } } as T;
}
function Probe() {
  desk = useDesk();
  return null;
}
async function mount(element: React.ReactElement) {
  await act(async () => {
    root = Renderer.create(
      <DeskProvider>
        <Probe />
        {element}
      </DeskProvider>,
    );
  });
}
async function button(title: string) {
  const item = root.root
    .findAllByType(Button)
    .find(b => b.props.title === title);
  if (!item) {
    throw new Error('Missing button ' + title);
  }
  await act(async () => {
    await item.props.onPress();
  });
}
async function field(label: string, value: string) {
  const item = root.root
    .findAllByType(TextInput)
    .find(b => b.props.accessibilityLabel === label);
  if (!item) {
    throw new Error('Missing field ' + label);
  }
  await act(async () => item.props.onChangeText(value));
}
async function card(name: string) {
  const target = root.root
    .findAllByType(TouchableOpacity)
    .find(b => b.findAllByType(Text).some(t => t.props.children === name));
  if (!target) {
    throw new Error('Missing card ' + name);
  }
  await act(async () => target.props.onPress());
}
beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    'lekhpal-field-desk-v1',
    JSON.stringify(createInitialDeskState()),
  );
  jest.clearAllMocks();
});
afterEach(async () => {
  if (root) {
    await act(async () => root.unmount());
  }
});
test('land search filters and connects the selected plot to mapping and mutation', async () => {
  await mount(
    <LandSearchScreen
      {...testProps<React.ComponentProps<typeof LandSearchScreen>>()}
    />,
  );
  await field('Search land records', '142');
  const expanded = root.root
    .findAllByType(TouchableOpacity)
    .filter(n =>
      String(n.props.accessibilityLabel).startsWith('Expand Khasra'),
    );
  expect(expanded).toHaveLength(1);
  await act(async () => expanded[0].props.onPress());
  await button('Map plot boundary');
  expect(navigation.navigate).toHaveBeenCalledWith('FieldMap', {
    landId: 'land-142',
  });
  await button('Apply mutation');
  expect(navigation.navigate).toHaveBeenCalledWith('Mutations', {
    landId: 'land-142',
    create: true,
    status: 'Pending',
  });
  await button('Flag for mutation');
  expect(desk.state.lands[0].flagged).toBe(true);
});
test('new mutation validates seller share, records identity and notice, blocks premature approval', async () => {
  await mount(
    <MutationScreen
      {...testProps<React.ComponentProps<typeof MutationScreen>>()}
    />,
  );
  await button('New mutation application');
  await field('Buyer / beneficiary full name', 'QA Beneficiary');
  await field('Share to transfer (%)', '50');
  await button('File mutation application');
  expect(desk.state.mutations[0].buyer).toBe('QA Beneficiary');
  await field(
    'Decision / objection resolution notes',
    'Verified documents during field visit',
  );
  await button('Record identity verification (demo)');
  await button('Issue public notice (15 days)');
  expect(desk.state.mutations[0].buyerVerified).toBe(true);
  expect(desk.state.mutations[0].noticeAt).toBeDefined();
  await expect(button('Approve & update Khatauni')).rejects.toThrow('15-day');
  await button('Reject with legal reason');
  expect(desk.state.mutations[0].status).toBe('Rejected');
});
test('rapid map taps retain all corners and save a valid survey', async () => {
  await mount(
    <FieldMapScreen
      {...testProps<React.ComponentProps<typeof FieldMapScreen>>()}
    />,
  );
  const points = [
    { latitude: 26.8467, longitude: 80.9462 },
    { latitude: 26.8477, longitude: 80.9462 },
    { latitude: 26.8477, longitude: 80.9472 },
    { latitude: 26.8467, longitude: 80.9472 },
  ];
  await act(async () => {
    const onPoint = root.root.findByType(BoundaryMap).props.onPoint;
    points.forEach(onPoint);
  });
  await button('Save geo-fence to survey log');
  expect(desk.state.surveys).toHaveLength(1);
  expect(desk.state.surveys[0].points).toEqual(points);
  expect(desk.state.surveys[0].areaSqm).toBeGreaterThan(10000);
});
test('crop assessment saves calculated relief and timestamped simulated evidence', async () => {
  await mount(
    <CropSurveyScreen
      {...testProps<React.ComponentProps<typeof CropSurveyScreen>>()}
    />,
  );
  await act(async () => {
    await desk.commit('', st => ({ ...st, online: false }));
  });
  await button('Capture simulated photo proof');
  await button('Submit crop inspection');
  expect(desk.state.crops[0].payout).toBe(7438);
  expect(desk.state.crops[0].photo.simulated).toBe(true);
  expect(desk.state.crops[0].photo.createdAt).toBeTruthy();
});
test('certificate recommendation persists verified findings', async () => {
  await mount(<CertificateScreen />);
  await card('Kavita Prasad');
  await field(
    'Verification findings / rejection reason',
    'Income and land assets verified in person',
  );
  await button('Recommend approval to Tehsildar');
  expect(desk.state.certificates[0].status).toBe('Recommended');
  expect(desk.state.certificates[0].reason).toContain('verified');
});
test('encroachment report proceeds through notice, inspection and resolution', async () => {
  await mount(<EncroachmentScreen />);
  await button('Report encroachment · #301');
  await field('Violator full name / entity', 'QA Occupier');
  await field(
    'Incident details & observed occupation',
    'Temporary fencing occupies the pond approach',
  );
  await button('Tag registered parcel coordinates');
  await button('Submit incident report');
  await button('Generate eviction notice');
  expect(desk.state.incidents[0].noticeAt).toBeTruthy();
  await button('Schedule physical inspection');
  await button('Mark case resolved');
  expect(desk.state.incidents[0].status).toBe('Resolved');
});
test('original government service rows retain in-app website and officer navigation', () => {
  const khasra = TOP_UP_ACCESS_ENTRIES.find(e => e.id === 'up-home-khasra')!;
  openUpHomeEntry(navigation, khasra, 'en');
  expect(navigation.navigate).toHaveBeenCalledWith('UpBhulekhAssistant', {
    launchAction: 'khasra-portal',
  });
  const district = TOP_UP_ACCESS_ENTRIES.find(
    e => e.title.en === 'eDistrict Login',
  )!;
  openUpHomeEntry(navigation, district, 'en');
  expect(navigation.navigate).toHaveBeenCalledWith(
    'WebViewPortal',
    expect.objectContaining({
      toolId: 'edistrict-up',
      url: expect.stringMatching(/^https?:/),
    }),
  );
});

test('an ownership update does not erase an in-progress crop assessment', async () => {
  const route = {
    key: 'crop',
    name: 'CropSurvey' as const,
    params: { landId: 'land-142' },
  };
  await mount(
    <CropSurveyScreen
      {...testProps<React.ComponentProps<typeof CropSurveyScreen>>()}
      route={route}
    />,
  );
  await button('Capture simulated photo proof');
  await act(async () => {
    await desk.commit('Ownership updated', st => ({
      ...st,
      lands: st.lands.map(l => ({ ...l })),
    }));
  });
  await button('Submit crop inspection');
  expect(desk.state.crops).toHaveLength(1);
});
