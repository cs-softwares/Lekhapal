import {
  CALCULATOR_TOOL_IDS,
  MEASUREMENT_TOOL_IDS,
  OFFICIAL_TOOL_IDS,
} from './toolCatalog';
import {LocalizedText} from '../types/tool';

const text = (en: string, hi: string): LocalizedText => ({
  en,
  hi,
});

export const UP_BHULEKH_PRESET_STORAGE_KEY =
  'up-bhulekh-assistant-last-preset';
export const UP_BHULEKH_HISTORY_STORAGE_KEY =
  'up-bhulekh-assistant-recent-searches';

export type HomeQuickStatId =
  | 'portals'
  | 'saved-preset'
  | 'measurement'
  | 'calculators';

export type HomeQuickStat = {
  accentColor: string;
  helper: LocalizedText;
  id: HomeQuickStatId;
  iconName: string;
  label: LocalizedText;
  value: LocalizedText;
};

type HomeQuickStatsOptions = {
  hasSavedPreset: boolean;
  recentSearchCount: number;
};

export const buildHomeQuickStats = ({
  hasSavedPreset,
  recentSearchCount,
}: HomeQuickStatsOptions): HomeQuickStat[] => [
  {
    accentColor: '#0F766E',
    id: 'portals',
    iconName: 'domain',
    label: text('Gov links', 'गव लिंक'),
    value: text(
      `${OFFICIAL_TOOL_IDS.length} linked`,
      `${OFFICIAL_TOOL_IDS.length} लिंक`,
    ),
    helper: text(
      'Bhulekh, map, registry',
      'भूलेख, नक्शा, रजिस्ट्री',
    ),
  },
  {
    accentColor: '#EA580C',
    id: 'saved-preset',
    iconName: 'content-save-check-outline',
    label: text('Saved search', 'सेव्ड सर्च'),
    value: hasSavedPreset
      ? text('Ready', 'तैयार')
      : text('New', 'नई'),
    helper: hasSavedPreset
      ? recentSearchCount > 0
        ? text(
          `${recentSearchCount} recent items`,
          `${recentSearchCount} हाल के आइटम`,
          )
        : text(
            'Resume Bhulekh',
            'भूलेख फिर खोलें',
          )
      : text('Create first search', 'पहली खोज बनाएं'),
  },
  {
    accentColor: '#0284C7',
    id: 'measurement',
    iconName: 'ruler-square',
    label: text('Measurement', 'मेजरमेंट'),
    value: text(
      `${MEASUREMENT_TOOL_IDS.length} tools`,
      `${MEASUREMENT_TOOL_IDS.length} टूल`,
    ),
    helper: text(
      'Area, scale, boundary',
      'एरिया, स्केल, बाउंड्री',
    ),
  },
  {
    accentColor: '#7C3AED',
    id: 'calculators',
    iconName: 'calculator-variant-outline',
    label: text('Calculator', 'कैलकुलेटर'),
    value: text(
      `${CALCULATOR_TOOL_IDS.length} tools`,
      `${CALCULATOR_TOOL_IDS.length} टूल`,
    ),
    helper: text(
      'Registry, hissa, rate',
      'रजिस्ट्री, हिस्सा, रेट',
    ),
  },
];
