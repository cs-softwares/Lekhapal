import { INDIA_STATE_OPTIONS } from './stateDashboardCatalog';
import {
  LAND_PORTALS,
  REGISTRATION_PORTALS,
  MAP_PORTALS,
  SERVICE_PORTALS,
} from './nationalPortalLinks';
import { STATE_OFFICIAL_PORTAL_BLOCKS } from './stateOfficialPortalCatalog';
import { UpHomeEntry } from './upHomeCatalog';
import { UP_OFFICIAL_PORTALS } from './upOfficialPortals';
import { BIHAR_BHUMI_OFFICER_ITEMS } from './biharBhumiOfficerCatalog';
import { getBundledStateConfig } from '../config/states';
import type { StateServiceConfig } from '../config/states/schema';
export type PortalCategory =
  | 'Land records'
  | 'Maps & survey'
  | 'Registration'
  | 'Revenue services'
  | 'Relief & disaster'
  | 'Public land'
  | 'Certificates';
export type StatePortalEntry = UpHomeEntry & {
  category: PortalCategory;
  browserMode?: StateServiceConfig['browserMode'];
  review?: StateServiceConfig['review'];
};
const text = (en: string, hi = en) => ({ en, hi });
function entry(
  id: string,
  title: string,
  url: string,
  category: PortalCategory,
  subtitle: string,
): StatePortalEntry {
  return {
    id,
    title: text(title),
    subtitle: text(subtitle),
    category,
    icon:
      category === 'Maps & survey'
        ? 'map-outline'
        : category === 'Registration'
        ? 'file-sign'
        : category === 'Revenue services'
        ? 'office-building-outline'
        : 'file-document-outline',
    accentColor: '#2457A7',
    searchTerms: [category],
    action: { type: 'portal', title: text(title), url },
  };
}
export function getStatePortals(code: string): StatePortalEntry[] {
  const state = INDIA_STATE_OPTIONS.find(s => s.code === code);
  if (!state) {
    return [];
  }
  if (code === 'UP') {
    return UP_OFFICIAL_PORTALS;
  }
  const configured = getBundledStateConfig(code);
  if (configured?.catalog === 'configured') {
    // Service identity is explicit. Different services may share an entry URL.
    return configured.services.map(service => ({
      id: service.id,
      title: service.title,
      subtitle: service.subtitle,
      category: service.category,
      icon: service.icon,
      searchTerms: service.searchTerms,
      accentColor: '#2457A7',
      browserMode: service.browserMode,
      review: service.review,
      action: { type: 'portal', title: service.title, url: service.url },
    }));
  }
  const departmentOnly = ['ML', 'MZ', 'NL', 'LD'].includes(code);
  const result: StatePortalEntry[] = [
    entry(
      `${code}-records`,
      departmentOnly
        ? 'Land & revenue department'
        : 'Land records & revenue services',
      LAND_PORTALS[code],
      departmentOnly ? 'Revenue services' : 'Land records',
      `${state.name.en} · Official government portal`,
    ),
  ];
  if (code === 'BR') {
    result.push(
      ...BIHAR_BHUMI_OFFICER_ITEMS.map(p =>
        entry(
          p.id,
          p.label.en,
          p.url,
          /naksha|map/.test(p.id) ? 'Maps & survey' : 'Revenue services',
          'BiharBhumi · Official service',
        ),
      ),
    );
  }
  for (const p of STATE_OFFICIAL_PORTAL_BLOCKS[code] || []) {
    result.push({
      ...entry(
        p.id,
        p.label.en,
        p.url,
        /naksha|map|survey|emapi/.test(p.id)
          ? 'Maps & survey'
          : 'Revenue services',
        p.helper.en,
      ),
      title: p.label,
      subtitle: p.helper,
      icon: p.icon,
    });
  }
  const map = MAP_PORTALS[code];
  if (map) {
    result.push(
      entry(
        `${code}-map`,
        'Village maps & survey',
        map,
        'Maps & survey',
        `${state.name.en} - Cadastral maps and plot boundaries`,
      ),
    );
  }
  const services = SERVICE_PORTALS[code];
  if (services) {
    result.push(
      entry(
        `${code}-certificates`,
        'Certificates & applications',
        services,
        'Certificates',
        `${state.name.en} - State service portal; select the relevant department after login`,
      ),
    );
  }
  const registration = REGISTRATION_PORTALS[code];
  if (registration) {
    result.push(
      entry(
        `${code}-registration`,
        'Registration & stamp services',
        registration,
        'Registration',
        `${state.name.en} · Deeds, registration and stamp services`,
      ),
    );
  }
  const seen = new Set<string>();
  return result.filter(e => {
    const key =
      e.action.type === 'portal' ? e.action.url.replace(/\/$/, '') : e.id;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function getStateDashboardPortals(code: string): StatePortalEntry[] {
  const portals = getStatePortals(code);
  const config = getBundledStateConfig(code);
  if (config) {
    return config.dashboardServiceIds.flatMap(id =>
      portals.filter(portal => portal.id === id),
    );
  }
  // Preserve catalogs outside the initial Hindi-speaking rollout.
  return portals.filter(
    (portal, index) =>
      index === 0 ||
      portal.id === `${code}-map` ||
      portal.id === `${code}-certificates`,
  );
}
