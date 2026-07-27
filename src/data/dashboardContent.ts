import {
  CALCULATOR_TOOL_IDS,
  MEASUREMENT_TOOL_IDS,
  getToolById,
} from './toolCatalog';

const text = (en: string, hi: string) => ({en, hi});

export const DASHBOARD_STATS = [
  {
    id: 'services',
    value: '10+',
    label: text('Portal tools', 'पोर्टल टूल्स'),
  },
  {
    id: 'measurements',
    value: `${MEASUREMENT_TOOL_IDS.length}`,
    label: text('Measurement helpers', 'नापजोख हेल्पर'),
  },
  {
    id: 'calculations',
    value: `${CALCULATOR_TOOL_IDS.length}`,
    label: text('Calculation helpers', 'कैलकुलेशन हेल्पर'),
  },
];

export const QUICK_ACTION_IDS = [
  'up-bhulekh',
  'igrs-registry',
  'area-converter',
  'share-calculator',
];

export const RECENT_MODULE_IDS = [
  'village-diary',
  'mutation-tracker',
  'area-converter',
];

export const PREMIUM_HIGHLIGHT = getToolById('saved-record-locker');
