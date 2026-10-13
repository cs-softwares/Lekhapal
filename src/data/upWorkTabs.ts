import { UP_OFFICIAL_PORTALS } from './upOfficialPortals';
import type { StatePortalEntry } from './statePortalCatalog';

export const UP_WORK_TABS = [
  {
    id: 'records',
    en: 'Land records',
    hi: 'भू-अभिलेख',
    icon: 'file-search-outline',
    detailEn: 'Khatauni, Khasra, Varasat and record corrections',
    detailHi: 'खतौनी, खसरा, वरासत और अभिलेख सुधार',
  },
  {
    id: 'feeding',
    en: 'Feeding',
    hi: 'फीडिंग',
    icon: 'form-select',
    detailEn: 'Crop entries, shares, Farmer Registry and agricultural census',
    detailHi: 'फसल प्रविष्टि, अंश, किसान रजिस्ट्री और कृषि गणना',
  },
  {
    id: 'fieldwork',
    en: 'Fieldwork',
    hi: 'मैदानी कार्य',
    icon: 'map-marker-path',
    detailEn: 'Measurement, maps, surveys, public land and relief work',
    detailHi: 'पैमाइश, नक्शे, सर्वेक्षण, सार्वजनिक भूमि और राहत कार्य',
  },
  {
    id: 'documents',
    en: 'Documents',
    hi: 'आवेदन / पत्र',
    icon: 'file-document-edit-outline',
    detailEn: 'Certificates, applications, drafts and PDF documents',
    detailHi: 'प्रमाणपत्र, आवेदन, मसौदे और पीडीएफ दस्तावेज़',
  },
] as const;
export type UpWorkTab = (typeof UP_WORK_TABS)[number]['id'];

export function upPortalWorkTab(portal: StatePortalEntry): UpWorkTab {
  if (portal.category === 'Certificates') return 'documents';
  if (
    ['Maps & survey', 'Public land', 'Relief & disaster'].includes(
      portal.category,
    )
  )
    return 'fieldwork';
  return 'records';
}

export function upWorkPortals(tab: UpWorkTab) {
  // Put the record lookup menu first without changing the underlying catalog or routes.
  const priority = [
    'up-bhulekh-services',
    'up-khasra',
    'up-officer-login',
    'up-varasat',
    'up-record-correction',
  ];
  return UP_OFFICIAL_PORTALS.filter(
    portal => upPortalWorkTab(portal) === tab,
  ).sort((a, b) => {
    const rank = (id: string) =>
      priority.includes(id) ? priority.indexOf(id) : priority.length;
    return rank(a.id) - rank(b.id);
  });
}
