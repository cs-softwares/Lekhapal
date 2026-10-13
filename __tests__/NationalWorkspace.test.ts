import { RELEASE_FEATURES } from '../src/config/releaseFeatures';
import { Alert } from 'react-native';
import * as portalBrowser from '../src/native/portalBrowser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  INDIA_STATE_OPTIONS,
  STATE_SELECTION_STORAGE_KEY,
} from '../src/data/stateDashboardCatalog';
import {
  BHULEKH_OPTIONS,
  BHULEKH_DIRECTORY_OPTIONS,
  BHULEKH_RELATED_LINKS,
} from '../src/data/bhulekhOptions';
import { KHASRA_OPTIONS } from '../src/data/khasraOptions';
import { getStatePortals } from '../src/data/statePortalCatalog';
import { getToolById } from '../src/data/toolCatalog';
import { openUpHomeEntry } from '../src/navigation/upEntryNavigation';
import { openToolWorkspace } from '../src/navigation/toolNavigation';
import {
  createInitialDeskState,
  removeSampleData,
} from '../src/data/initialDeskState';
import { createInitialDeskState as createFixture } from '../test-support/deskData';
import {
  loadWorkspaceRecords,
  persistWorkspaceRecords,
} from '../src/utils/workspaceStorage';

test('UP services open official pages in the shared browser without an assistant overlay', () => {
  const entries = getStatePortals('UP').filter(
    e => e.action.type !== 'khasra-menu' && e.action.type !== 'bhulekh-menu',
  );
  expect(entries.some(e => e.category === 'Registration')).toBe(true);
  expect(entries.some(e => e.id === 'up-revenue-court')).toBe(true);
  const urls = entries.map(e => {
    expect(e.action.type).toBe('portal');
    const navigation = { navigate: jest.fn() };
    openUpHomeEntry(navigation, e, 'en');
    expect(navigation.navigate.mock.calls[0][0]).toBe('WebViewPortal');
    return navigation.navigate.mock.calls[0][1].url;
  });
  expect(new Set(urls).size).toBe(urls.length);
  expect(urls).toContain('https://rccms.up.gov.in/dashboard/login/');
  expect(urls).toContain('https://edistrict.up.gov.in/edistrictup/');
  expect(urls).toContain('https://igrsup.gov.in/igrsup/defaultAction.action');
});

test('Bhulekh tool links also open the official in-app browser', () => {
  const navigation = { navigate: jest.fn() };
  openToolWorkspace(navigation, 'up-bhulekh', 'en');
  expect(navigation.navigate).toHaveBeenCalledWith('WebViewPortal', {
    title: 'UP Bhulekh',
    toolId: 'up-bhulekh',
    url: 'https://upbhulekh.gov.in',
  });
});

test('all 36 states/UTs have usable official portal actions, isolated from UP', () => {
  expect(INDIA_STATE_OPTIONS).toHaveLength(36);
  for (const state of INDIA_STATE_OPTIONS) {
    const entries = getStatePortals(state.code);
    expect(entries.length).toBeGreaterThan(0);
    expect(new Set(entries.map(e => e.id)).size).toBe(entries.length);
    for (const entry of entries) {
      const navigation = { navigate: jest.fn() };
      if (entry.action.type === 'tool') {
        expect(getToolById(entry.action.toolId)?.url).toMatch(/^https?:\/\//);
      }
      if (entry.action.type === 'portal') {
        const url = new URL(entry.action.url);
        expect(['http:', 'https:']).toContain(url.protocol);
        expect(url.hostname).not.toMatch(/^(localhost|10\.|127\.|192\.168\.)/);
        if (state.code !== 'UP') {
          expect(url.hostname).not.toMatch(
            /(^|\.)up\.gov\.in$|upbhulekh|upbhunaksha/,
          );
        }
      }
      openUpHomeEntry(navigation, entry, 'en');
      expect(navigation.navigate).toHaveBeenCalledTimes(1);
      expect([
        'WebViewPortal',
        'UpBhulekhAssistant',
        'KhasraOptions',
        'BhulekhOptions',
      ]).toContain(navigation.navigate.mock.calls[0][0]);
    }
  }
});
test('new workspaces contain no people, records or invented identity', () => {
  const state = createInitialDeskState();
  for (const key of [
    'lands',
    'mutations',
    'certificates',
    'surveys',
    'crops',
    'publicLands',
    'incidents',
  ] as const) {
    expect(state[key]).toEqual([]);
  }
  expect(state.settings.officer).toBe('');
  expect(state.settings.circle).toBe('');
});
test('old samples are removed while user-created records and details survive', () => {
  const legacy = { ...createFixture(), sampleDataRemoved: undefined };
  legacy.certificates.push({
    ...legacy.certificates[0],
    id: 'own-application',
    name: 'My applicant',
  });
  legacy.settings.officer = 'My name';
  legacy.queue = [
    { id: 'own', label: 'My saved note', createdAt: '2026-09-22' },
  ];
  const clean = removeSampleData(legacy);
  expect(clean.certificates.map(c => c.name)).toEqual(['My applicant']);
  expect(clean.lands).toEqual([]);
  expect(clean.settings.officer).toBe('My name');
  expect(clean.queue).toEqual(legacy.queue);
  expect(removeSampleData(clean)).toBe(clean);
});
test('saved tool results stay with their selected state', async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(STATE_SELECTION_STORAGE_KEY, 'UP');
  const record = {
    id: 'saved',
    toolId: 'area-converter',
    title: 'My field',
    values: {},
    summaryLines: [],
    createdAt: '2026-09-22',
    updatedAt: '2026-09-22',
  };
  await persistWorkspaceRecords('area-converter', [record]);
  await AsyncStorage.setItem(STATE_SELECTION_STORAGE_KEY, 'BR');
  expect(await loadWorkspaceRecords('area-converter')).toEqual([]);
  await AsyncStorage.setItem(STATE_SELECTION_STORAGE_KEY, 'UP');
  expect(await loadWorkspaceRecords('area-converter')).toEqual([record]);
});

test('Khasra login uses the portal browser and public search uses the native mobile screen', async () => {
  const open = jest
    .spyOn(portalBrowser, 'openPortalBrowser')
    .mockResolvedValue(undefined);
  const navigation = { navigate: jest.fn() };
  const entry = getStatePortals('UP').find(e => e.id === 'up-khasra')!;
  openUpHomeEntry(navigation, entry, 'en');
  expect(navigation.navigate).toHaveBeenCalledWith('KhasraOptions');
  expect(KHASRA_OPTIONS).toHaveLength(2);
  const destinations = [
    'https://ekhasra.up.gov.in/#/SelectLogin',
    'https://ekhasra.up.gov.in/#/khasrareport',
  ];
  for (const [index, option] of KHASRA_OPTIONS.entries()) {
    for (const language of ['en', 'hi'] as const) {
      navigation.navigate.mockClear();
      open.mockClear();
      await openUpHomeEntry(navigation, option, language);
      if (index === 0) {
        expect(open).toHaveBeenLastCalledWith(destinations[index]);
        expect(navigation.navigate).not.toHaveBeenCalled();
      } else {
        expect(navigation.navigate).toHaveBeenCalledWith('KhasraSearch');
        expect(open).not.toHaveBeenCalled();
      }
    }
  }
});

test('Khasra browser launch failure shows a localized error instead of the blocked WebView', async () => {
  jest
    .spyOn(portalBrowser, 'openPortalBrowser')
    .mockRejectedValue(new Error('No browser'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const navigation = { navigate: jest.fn() };
  await openUpHomeEntry(navigation, KHASRA_OPTIONS[0], 'hi');
  expect(alert).toHaveBeenCalledWith(
    'ब्राउज़र नहीं खुल सका',
    expect.any(String),
  );
  expect(navigation.navigate).not.toHaveBeenCalled();
});

test('Bhulekh opens its choices and preserves the selected official workflow', () => {
  const navigation = { navigate: jest.fn() };
  openUpHomeEntry(
    navigation,
    getStatePortals('UP').find(e => e.id === 'up-bhulekh-services')!,
    'en',
  );
  expect(navigation.navigate).toHaveBeenCalledWith('BhulekhOptions');
  expect(BHULEKH_OPTIONS).toHaveLength(6);
  BHULEKH_OPTIONS.slice(2).forEach((option, i) => {
    navigation.navigate.mockClear();
    openUpHomeEntry(navigation, option, 'hi');
    expect(navigation.navigate).toHaveBeenCalledWith('WebViewPortal', {
      title: option.title.hi,
      url: 'https://upbhulekh.gov.in/#/home',
      bhulekhService: ['copy', 'certified', 'sale', 'dispute'][i],
    });
  });
});

test('both Khatauni logins live inside Bhulekh choices without duplicate directory entries', () => {
  const navigation = { navigate: jest.fn() };
  const urls = [
    'https://upbhulekh.gov.in/bhulekh_login/',
    'https://upbhulekh.gov.in/bhulekh/',
  ];
  BHULEKH_OPTIONS.slice(0, 2).forEach((entry, i) => {
    openUpHomeEntry(navigation, entry, 'en');
    expect(navigation.navigate).toHaveBeenLastCalledWith('WebViewPortal', {
      title: entry.title.en,
      url: urls[i],
    });
    expect(getStatePortals('UP').some(p => p.id === entry.id)).toBe(false);
  });
});

test('Bhulekh directories and related links open their distinct official pages', () => {
  const navigation = { navigate: jest.fn() };
  const paths = [
    'districts_list',
    'tehsils_list',
    'parganaReport',
    'landTypeReports',
    'login',
  ];
  expect(BHULEKH_DIRECTORY_OPTIONS).toHaveLength(paths.length);
  BHULEKH_DIRECTORY_OPTIONS.forEach((entry, index) => {
    openUpHomeEntry(navigation, entry, 'hi');
    expect(navigation.navigate).toHaveBeenLastCalledWith('WebViewPortal', {
      title: entry.title.hi,
      url: `https://upbhulekh.gov.in/#/${paths[index]}`,
    });
  });
  for (const entry of BHULEKH_RELATED_LINKS) {
    expect(entry.action.type).toBe('portal');
    openUpHomeEntry(navigation, entry, 'en');
    expect(navigation.navigate).toHaveBeenLastCalledWith(
      'WebViewPortal',
      expect.objectContaining({
        title: entry.title.en,
        url: expect.stringMatching(/^https:\/\//),
      }),
    );
  }
});

beforeEach(() => {
  jest.replaceProperty(RELEASE_FEATURES, 'multiState', true);
});
afterEach(() => jest.restoreAllMocks());
