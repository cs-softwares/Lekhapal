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

export type HomeDailyWorkflowId =
  | 'bhulekh-route'
  | 'portal-run'
  | 'measurement-route'
  | 'registry-route';

export type HomeDailyWorkflow = {
  accentColor: string;
  actionLabel: LocalizedText;
  iconName: string;
  id: HomeDailyWorkflowId;
  status: LocalizedText;
  steps: LocalizedText[];
  subtitle: LocalizedText;
  title: LocalizedText;
};

type HomeDailyWorkflowOptions = {
  hasSavedPreset: boolean;
  recentSearchCount: number;
};

export const buildHomeDailyWorkflows = ({
  hasSavedPreset,
  recentSearchCount,
}: HomeDailyWorkflowOptions): HomeDailyWorkflow[] => [
  {
    accentColor: '#0EA5E9',
    actionLabel: hasSavedPreset
      ? text('Resume search', 'खोज फिर खोलें')
      : text('Open assistant', 'असिस्टेंट खोलें'),
    iconName: 'file-search-outline',
    id: 'bhulekh-route',
    status: hasSavedPreset
      ? text('Preset ready', 'प्रीसेट तैयार')
      : recentSearchCount > 0
        ? text(
            `${recentSearchCount} recent searches`,
            `${recentSearchCount} हाल की खोज`,
          )
        : text('Start fresh', 'नई शुरुआत'),
    steps: [
      text('Select district, tehsil, and village', 'जिला, तहसील और गांव चुनें'),
      text('Choose khata, khasra, or owner mode', 'खाता, खसरा या नाम मोड चुनें'),
      text('Review khatauni from the official result', 'आधिकारिक परिणाम से खतौनी देखें'),
    ],
    subtitle: hasSavedPreset
      ? text(
          'Resume your saved UP Bhulekh route with the last preset.',
          'सेव्ड प्रीसेट के साथ अपना यूपी भूलेख रूट फिर से खोलें।',
        )
      : text(
          'Go district to tehsil to village, then search by khata, khasra, or name.',
          'जिला से तहसील से गांव तक जाएं, फिर खाता, खसरा या नाम से खोजें।',
        ),
    title: text('Khatauni workflow', 'खतौनी वर्कफ्लो'),
  },
  {
    accentColor: '#F97316',
    actionLabel: text('Open services', 'सर्विस खोलें'),
    iconName: 'lan-connect',
    id: 'portal-run',
    status: text(
      `${OFFICIAL_TOOL_IDS.length} live portals`,
      `${OFFICIAL_TOOL_IDS.length} लाइव पोर्टल`,
    ),
    steps: [
      text('Open Bhulekh, BhuNaksha, or IGRS', 'भूलेख, भूनक्शा या IGRS खोलें'),
      text('Continue on the official department page', 'आधिकारिक विभागीय पेज पर आगे बढ़ें'),
      text('Return here for the next task route', 'अगले काम के लिए यहां वापस आएं'),
    ],
    subtitle: text(
      'Keep all important government land portals in one launch route.',
      'जरूरी सरकारी भूमि पोर्टल एक ही लॉन्च रूट में रखें।',
    ),
    title: text('Portal verification', 'पोर्टल वेरिफिकेशन'),
  },
  {
    accentColor: '#10B981',
    actionLabel: text('Open measurements', 'मेजरमेंट खोलें'),
    iconName: 'ruler-square',
    id: 'measurement-route',
    status: text(
      `${MEASUREMENT_TOOL_IDS.length} tools ready`,
      `${MEASUREMENT_TOOL_IDS.length} टूल तैयार`,
    ),
    steps: [
      text('Convert area units quickly', 'एरिया यूनिट जल्दी बदलें'),
      text('Check map scale references', 'मैप स्केल रेफरेंस जांचें'),
      text('Verify boundary notes in sequence', 'बाउंड्री नोट्स क्रम से देखें'),
    ],
    subtitle: text(
      'Use area conversion, map scale, and boundary checks in one route.',
      'एरिया कन्वर्ज़न, मैप स्केल और बाउंड्री चेक एक ही रूट में करें।',
    ),
    title: text('Field measurement route', 'फील्ड माप रूट'),
  },
  {
    accentColor: '#8B5CF6',
    actionLabel: text('Open calculator', 'कैलकुलेटर खोलें'),
    iconName: 'calculator-variant-outline',
    id: 'registry-route',
    status: text(
      `${CALCULATOR_TOOL_IDS.length} calculators ready`,
      `${CALCULATOR_TOOL_IDS.length} कैलकुलेटर तैयार`,
    ),
    steps: [
      text('Estimate registry value and fees', 'रजिस्ट्री वैल्यू और फीस का अनुमान लें'),
      text('Compare rates before final work', 'अंतिम काम से पहले रेट तुलना करें'),
      text('Split hissa with live calculator', 'लाइव कैलकुलेटर से हिस्सा बांटें'),
    ],
    subtitle: text(
      'Keep registry estimate, circle rate, and hissa calculations together.',
      'रजिस्ट्री अनुमान, सर्किल रेट और हिस्सा कैलकुलेशन एक साथ रखें।',
    ),
    title: text('Registry and hissa route', 'रजिस्ट्री और हिस्सा रूट'),
  },
];
