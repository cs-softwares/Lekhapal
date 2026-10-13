import evidence from '../docs/reference/fastwork-state-menus.json';
import { getStatePortals } from '../src/data/statePortalCatalog';
import { getBundledStateConfig } from '../src/config/states';
import {
  WORKSPACE_STATE_CODES,
  effectiveWorkspaceState,
} from '../src/config/releaseFeatures';
import { stateConfigSchema } from '../src/config/states/schema';
import { UP_OFFICIAL_PORTALS } from '../src/data/upOfficialPortals';
import { matchingOfficialWork } from '../src/components/revenue/OfficialWorkLinks';

test('every reference state menu action has its own working navigation destination', () => {
  expect(WORKSPACE_STATE_CODES).toHaveLength(19);
  expect(evidence).toHaveLength(144);
  for (const reference of evidence) {
    const entries = getStatePortals(reference.stateCode);
    const entry = entries.find(e => e.id === reference.serviceId);
    expect(entry?.action).toEqual({
      type: 'portal',
      url: reference.destination,
      title: entry?.title,
    });
    expect(
      stateConfigSchema.safeParse(getBundledStateConfig(reference.stateCode))
        .success,
    ).toBe(true);
    expect(
      entries.some(
        e =>
          e.action.type === 'portal' &&
          /upbhulekh|ekhasra\.up\./.test(e.action.url),
      ),
    ).toBe(false);
  }
  expect(getStatePortals('TN')).toHaveLength(10);
  expect(new Set(getStatePortals('TN').map(e => e.id)).size).toBe(10);
  expect(getStatePortals('UP')).toBe(UP_OFFICIAL_PORTALS);
});
test('UP is default and unrelated state services do not expose UP feeding', () => {
  expect(effectiveWorkspaceState(null)).toBe('UP');
  expect(effectiveWorkspaceState('DL')).toBe('UP');
  expect(effectiveWorkspaceState('BR')).toBe('BR');
  expect(matchingOfficialWork('MH')).toEqual(['census', 'echawadi']);
  expect(matchingOfficialWork('BR')).toEqual(['census']);
  expect(matchingOfficialWork('UP')).not.toContain('echawadi');
});
test.each([
  'https://hsac.org.in.evil.com/eodb/',
  'https://other.eregistrationukgov.in/',
  'http://hsac.org.in/',
  'https://hsac.org.in:444/',
])('rejects a lookalike or insecure exception host: %s', url => {
  const config = JSON.parse(JSON.stringify(getBundledStateConfig('HR')));
  config.services[0].url = url;
  expect(stateConfigSchema.safeParse(config).success).toBe(false);
});
