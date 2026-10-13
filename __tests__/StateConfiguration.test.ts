import { Alert } from 'react-native';
import * as registry from '../src/config/states';
import { stateConfigSchema } from '../src/config/states/schema';
import { RELEASE_FEATURES } from '../src/config/releaseFeatures';
import { INDIA_STATE_OPTIONS } from '../src/data/stateDashboardCatalog';
import {
  getStateDashboardPortals,
  getStatePortals,
} from '../src/data/statePortalCatalog';
import { UP_OFFICIAL_PORTALS } from '../src/data/upOfficialPortals';
import { openStatePortalEntry } from '../src/navigation/statePortalNavigation';
import * as browser from '../src/native/portalBrowser';

const mpConfig = () =>
  JSON.parse(JSON.stringify(registry.getBundledStateConfig('MP')));
afterEach(() => jest.restoreAllMocks());

test('retains the earlier five-region configuration group within the expanded rollout', () => {
  expect(RELEASE_FEATURES.multiState).toBe(true);
  expect(
    registry.HINDI_ROLLOUT_CONFIGS.map(config => config.stateCode),
  ).toEqual(['UP', 'MP', 'BR', 'DL', 'RJ']);
  for (const config of registry.HINDI_ROLLOUT_CONFIGS) {
    expect(stateConfigSchema.safeParse(config).success).toBe(true);
    expect(
      INDIA_STATE_OPTIONS.find(state => state.code === config.stateCode)?.name,
    ).toEqual(config.name);
    expect(
      getStateDashboardPortals(config.stateCode).map(service => service.id),
    ).toEqual(config.dashboardServiceIds);
  }
  expect(registry.getBundledStateConfig('ZZ')).toBeUndefined();
  expect(getStatePortals('ZZ')).toEqual([]);
  expect(getStatePortals('MH').length).toBeGreaterThan(0);
});

test('UP retains the exact approved catalog object, shortcut order and menu destinations', () => {
  expect(getStatePortals('UP')).toBe(UP_OFFICIAL_PORTALS);
  const shortcuts = getStateDashboardPortals('UP');
  expect(shortcuts.map(entry => entry.id)).toEqual([
    'up-bhulekh-services',
    'up-khasra',
    'up-officer-login',
    'up-edistrict',
    'up-bhunaksha',
    'up-varasat',
  ]);
  const navigation = { navigate: jest.fn() };
  openStatePortalEntry(navigation, shortcuts[0], 'hi');
  expect(navigation.navigate).toHaveBeenLastCalledWith('BhulekhOptions');
  openStatePortalEntry(navigation, shortcuts[1], 'hi');
  expect(navigation.navigate).toHaveBeenLastCalledWith('KhasraOptions');
});

test.each(['MP', 'BR', 'DL', 'RJ'])(
  '%s uses configured bilingual services and exact portal destinations',
  code => {
    const config = registry.getBundledStateConfig(code)!;
    if (config.catalog !== 'configured')
      throw new Error('Expected a configured catalog');
    const entries = getStatePortals(code);
    expect(entries.map(entry => entry.id)).toEqual(
      config.services.map(service => service.id),
    );
    for (const [index, entry] of entries.entries()) {
      const navigation = { navigate: jest.fn() };
      openStatePortalEntry(navigation, entry, 'hi');
      expect(navigation.navigate).toHaveBeenCalledWith('WebViewPortal', {
        title: config.services[index].title.hi,
        url: config.services[index].url,
      });
      expect(entry.title.hi).toMatch(/[\u0900-\u097F]/);
    }
  },
);

test('service identity survives a shared URL; dashboard ordering comes from configuration', () => {
  const config = mpConfig();
  config.services.push({ ...config.services[0], id: 'MP-another-service' });
  config.dashboardServiceIds = ['MP-another-service', 'MP-records'];
  const parsed = stateConfigSchema.parse(config);
  jest.spyOn(registry, 'getBundledStateConfig').mockReturnValue(parsed);
  expect(getStatePortals('MP')).toHaveLength(config.services.length);
  expect(getStateDashboardPortals('MP').map(entry => entry.id)).toEqual(
    config.dashboardServiceIds,
  );
});

test.each([
  [
    'duplicate service IDs',
    (config: any) => config.services.push(config.services[0]),
  ],
  [
    'missing dashboard service',
    (config: any) => config.dashboardServiceIds.push('missing'),
  ],
  [
    'executable URL',
    (config: any) => {
      // Intentionally invalid configuration: it must never reach navigation.
      // eslint-disable-next-line no-script-url
      config.services[0].url = 'javascript:alert(1)';
    },
  ],
  [
    'malformed URL',
    (config: any) => {
      config.services[0].url = 'not a URL';
    },
  ],
  [
    'non-government URL',
    (config: any) => {
      config.services[0].url = 'https://example.com/';
    },
  ],
  [
    'lookalike government URL',
    (config: any) => {
      config.services[0].url = 'https://mp.gov.in.example.com/';
    },
  ],
  [
    'embedded credentials',
    (config: any) => {
      config.services[0].url = 'https://user:pass@mpbhulekh.gov.in/';
    },
  ],
  [
    'accidental UP destination',
    (config: any) => {
      config.services[0].url = 'https://upbhulekh.gov.in/';
    },
  ],
  [
    'unknown browser adapter',
    (config: any) => {
      config.services[0].browserMode = 'evaluate-js';
    },
  ],
  [
    'injected code field',
    (config: any) => {
      config.services[0].script = 'doSomething()';
    },
  ],
  [
    'review without a date',
    (config: any) => {
      delete config.services[0].review.checkedOn;
    },
  ],
] as const)(
  'rejects %s before configuration reaches the catalog',
  (_name, mutate) => {
    const config = mpConfig();
    mutate(config);
    expect(stateConfigSchema.safeParse(config).success).toBe(false);
  },
);

test('configured browser mode opens a Custom Tab and reports failures without changing browser mode', async () => {
  const open = jest
    .spyOn(browser, 'openPortalBrowser')
    .mockResolvedValue(undefined);
  const navigation = { navigate: jest.fn() };
  const entry = {
    ...getStatePortals('MP')[0],
    browserMode: 'custom-tab' as const,
  };
  await openStatePortalEntry(navigation, entry, 'en');
  expect(open).toHaveBeenCalledWith(registry.getBundledStateConfig('MP')!.catalog === 'configured' ? (registry.getBundledStateConfig('MP') as any).services[0].url : '');
  expect(navigation.navigate).not.toHaveBeenCalled();
  open.mockRejectedValueOnce(new Error('No browser'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await openStatePortalEntry(navigation, entry, 'hi');
  expect(alert).toHaveBeenCalledWith(
    'ब्राउज़र नहीं खुल सका',
    expect.any(String),
  );
  expect(navigation.navigate).not.toHaveBeenCalled();
});
