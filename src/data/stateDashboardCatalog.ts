import {
  STATE_OFFICIAL_PORTAL_BLOCKS,
  hasLiveStateWorkspace,
} from './stateOfficialPortalCatalog';
import {LocalizedText} from '../types/tool';
import {UpBhulekhLaunchAction} from '../types/upBhulekh';

export const STATE_SELECTION_STORAGE_KEY =
  'smart-work-selected-state';

export type HomeTabRoute =
  | 'Services'
  | 'Measurement'
  | 'Calculator'
  | 'Profile';

export type DashboardBlockAction =
  | {
      type: 'assistant-launch';
      launchAction: UpBhulekhLaunchAction;
    }
  | {
      type: 'screen';
      screen: 'BiharBhumiOfficer';
    }
  | {
      type: 'tab';
      tab: HomeTabRoute;
      params?: Record<string, unknown>;
    }
  | {
      type: 'tool';
      toolId: string;
    }
  | {
      type: 'portal';
      url: string;
    }
  | {
      type: 'coming-soon';
    };

export type DashboardBlock = {
  accentColor: string;
  action: DashboardBlockAction;
  helper: LocalizedText;
  icon: string;
  id: string;
  label: LocalizedText;
};

export type DashboardSection = {
  id: string;
  title: LocalizedText;
  blocks: DashboardBlock[];
};

export type StateOption = {
  code: string;
  isLive: boolean;
  name: LocalizedText;
};

const text = (en: string, hi: string): LocalizedText => ({
  en,
  hi,
});

export const INDIA_STATE_OPTIONS: StateOption[] = [
  {code: 'AN', isLive: false, name: text('Andaman and Nicobar Islands', 'अंडमान और निकोबार द्वीपसमूह')},
  {code: 'AP', isLive: false, name: text('Andhra Pradesh', 'आंध्र प्रदेश')},
  {code: 'AR', isLive: false, name: text('Arunachal Pradesh', 'अरुणाचल प्रदेश')},
  {code: 'AS', isLive: false, name: text('Assam', 'असम')},
  {code: 'BR', isLive: false, name: text('Bihar', 'बिहार')},
  {code: 'CH', isLive: false, name: text('Chandigarh', 'चंडीगढ़')},
  {code: 'CG', isLive: false, name: text('Chhattisgarh', 'छत्तीसगढ़')},
  {code: 'DN', isLive: false, name: text('Dadra and Nagar Haveli and Daman and Diu', 'दादरा और नगर हवेली और दमन और दीव')},
  {code: 'DL', isLive: false, name: text('Delhi', 'दिल्ली')},
  {code: 'GA', isLive: false, name: text('Goa', 'गोवा')},
  {code: 'GJ', isLive: false, name: text('Gujarat', 'गुजरात')},
  {code: 'HR', isLive: false, name: text('Haryana', 'हरियाणा')},
  {code: 'HP', isLive: false, name: text('Himachal Pradesh', 'हिमाचल प्रदेश')},
  {code: 'JK', isLive: false, name: text('Jammu and Kashmir', 'जम्मू और कश्मीर')},
  {code: 'JH', isLive: false, name: text('Jharkhand', 'झारखंड')},
  {code: 'KA', isLive: false, name: text('Karnataka', 'कर्नाटक')},
  {code: 'KL', isLive: false, name: text('Kerala', 'केरल')},
  {code: 'LA', isLive: false, name: text('Ladakh', 'लद्दाख')},
  {code: 'LD', isLive: false, name: text('Lakshadweep', 'लक्षद्वीप')},
  {code: 'MP', isLive: false, name: text('Madhya Pradesh', 'मध्य प्रदेश')},
  {code: 'MH', isLive: false, name: text('Maharashtra', 'महाराष्ट्र')},
  {code: 'MN', isLive: false, name: text('Manipur', 'मणिपुर')},
  {code: 'ML', isLive: false, name: text('Meghalaya', 'मेघालय')},
  {code: 'MZ', isLive: false, name: text('Mizoram', 'मिज़ोरम')},
  {code: 'NL', isLive: false, name: text('Nagaland', 'नागालैंड')},
  {code: 'OD', isLive: false, name: text('Odisha', 'ओडिशा')},
  {code: 'PY', isLive: false, name: text('Puducherry', 'पुडुचेरी')},
  {code: 'PB', isLive: false, name: text('Punjab', 'पंजाब')},
  {code: 'RJ', isLive: false, name: text('Rajasthan', 'राजस्थान')},
  {code: 'SK', isLive: false, name: text('Sikkim', 'सिक्किम')},
  {code: 'TN', isLive: false, name: text('Tamil Nadu', 'तमिलनाडु')},
  {code: 'TS', isLive: false, name: text('Telangana', 'तेलंगाना')},
  {code: 'TR', isLive: false, name: text('Tripura', 'त्रिपुरा')},
  {code: 'UP', isLive: true, name: text('Uttar Pradesh', 'उत्तर प्रदेश')},
  {code: 'UK', isLive: false, name: text('Uttarakhand', 'उत्तराखंड')},
  {code: 'WB', isLive: false, name: text('West Bengal', 'पश्चिम बंगाल')},
];

const GENERIC_FEATURED_BLOCKS: DashboardBlock[] = [
  {
    accentColor: '#0ea5e9',
    action: {type: 'tab', tab: 'Services'},
    helper: text('Open official and record modules', 'आधिकारिक और रिकॉर्ड मॉड्यूल खोलें'),
    icon: 'file-search-outline',
    id: 'state-records',
    label: text('State Records', 'स्टेट रिकॉर्ड्स'),
  },
  {
    accentColor: '#14b8a6',
    action: {type: 'tab', tab: 'Services'},
    helper: text('Maps and plot-related services', 'मैप और प्लॉट से जुड़ी सेवाएँ'),
    icon: 'map-outline',
    id: 'state-maps',
    label: text('Village Maps', 'विलेज मैप्स'),
  },
  {
    accentColor: '#2563eb',
    action: {type: 'tab', tab: 'Measurement'},
    helper: text('Area and field measurement tools', 'एरिया और फील्ड मेजरमेंट टूल्स'),
    icon: 'ruler-square',
    id: 'state-measurement',
    label: text('Measurement', 'मेजरमेंट'),
  },
  {
    accentColor: '#f97316',
    action: {type: 'tool', toolId: 'mutation-tracker'},
    helper: text('Track pending mutation follow-up', 'पेंडिंग नामांतरण फॉलो-अप ट्रैक करें'),
    icon: 'file-sync-outline',
    id: 'state-mutation',
    label: text('Mutation Follow-up', 'नामांतरण फॉलो-अप'),
  },
  {
    accentColor: '#8b5cf6',
    action: {type: 'tab', tab: 'Calculator'},
    helper: text('Rates, estimates, and quick calculations', 'रेट, अनुमान और क्विक कैलकुलेशन'),
    icon: 'calculator-variant-outline',
    id: 'state-calculator',
    label: text('Calculator', 'कैलकुलेटर'),
  },
  {
    accentColor: '#ef4444',
    action: {type: 'tool', toolId: 'village-diary'},
    helper: text('Village notes and daily work record', 'ग्राम नोट्स और डेली वर्क रिकॉर्ड'),
    icon: 'notebook-outline',
    id: 'state-diary',
    label: text('Village Diary', 'ग्राम डायरी'),
  },
];

const buildPortalDashboardBlock = ({
  accentColor,
  helperEn,
  helperHi,
  icon,
  id,
  labelEn,
  labelHi,
  url,
}: {
  accentColor: string;
  helperEn: string;
  helperHi: string;
  icon: string;
  id: string;
  labelEn: string;
  labelHi: string;
  url: string;
}): DashboardBlock => ({
  accentColor,
  action: {
    type: 'portal',
    url,
  },
  helper: text(helperEn, helperHi),
  icon,
  id,
  label: text(labelEn, labelHi),
});

const BIHAR_FEATURED_BLOCKS: DashboardBlock[] = [
  {
    accentColor: '#0ea5e9',
    action: {
      type: 'screen',
      screen: 'BiharBhumiOfficer',
    },
    helper: text(
      'Open BiharBhumi officer login options first.',
      'पहले बिहारभूमि अधिकारी लॉगिन विकल्प खोलें।',
    ),
    icon: 'home-city-outline',
    id: 'br-biharbhumi-home',
    label: text('BiharBhumi', 'बिहारभूमि'),
  },
  buildPortalDashboardBlock({
    accentColor: '#14b8a6',
    helperEn:
      'Open the Bihar cadastral map portal for plot lookup.',
    helperHi:
      'प्लॉट खोज के लिए बिहार भू-नक्शा पोर्टल खोलें।',
    icon: 'map-outline',
    id: 'br-bhunaksha-home',
    labelEn: 'Bhu Naksha',
    labelHi: 'भू-नक्शा',
    url: 'http://bhunaksha.bihar.gov.in/10/index.jsp',
  }),
  buildPortalDashboardBlock({
    accentColor: '#2563eb',
    helperEn:
      'Check jamabandi and register details from the official report flow.',
    helperHi:
      'आधिकारिक रिपोर्ट फ्लो से जमाबंदी और रजिस्टर विवरण देखें।',
    icon: 'file-document-outline',
    id: 'br-jamabandi-view',
    labelEn: 'Jamabandi Dekhen',
    labelHi: 'जमाबंदी देखें',
    url: 'https://emutation.bihar.gov.in/biharBhumireport/ViewJamabandi',
  }),
  buildPortalDashboardBlock({
    accentColor: '#f97316',
    helperEn:
      'Track mutation progress from the Bihar status page.',
    helperHi:
      'बिहार स्टेटस पेज से दाखिल-खारिज प्रगति देखें।',
    icon: 'file-sync-outline',
    id: 'br-mutation-status',
    labelEn: 'Mutation Status',
    labelHi: 'दाखिल-खारिज स्थिति',
    url: 'https://emutation.bihar.gov.in/biharBhumireport/MutationStatusNew',
  }),
  buildPortalDashboardBlock({
    accentColor: '#8b5cf6',
    helperEn:
      'Open the official Bihar mutation login route.',
    helperHi:
      'आधिकारिक बिहार दाखिल-खारिज लॉगिन रूट खोलें।',
    icon: 'account-key-outline',
    id: 'br-mutation-login',
    labelEn: 'Mutation Login',
    labelHi: 'दाखिल-खारिज लॉगिन',
    url: 'https://biharbhumi.bihar.gov.in/Biharbhumi/UserLogin',
  }),
  buildPortalDashboardBlock({
    accentColor: '#ef4444',
    helperEn:
      'Open the Bihar digital record archive portal.',
    helperHi:
      'बिहार डिजिटल भू-अभिलेख पोर्टल खोलें।',
    icon: 'archive-outline',
    id: 'br-bhuabhilekh',
    labelEn: 'Bhu Abhilekh',
    labelHi: 'भू-अभिलेख',
    url: 'https://bhuabhilekh.bihar.gov.in/',
  }),
];

const BIHAR_REVENUE_WORKFLOW_BLOCKS: DashboardBlock[] = [
  buildPortalDashboardBlock({
    accentColor: '#1d4ed8',
    helperEn:
      'Revenue staff transfer application login.',
    helperHi:
      'राजस्व कर्मचारी स्थानांतरण आवेदन लॉगिन।',
    icon: 'account-switch-outline',
    id: 'br-emp-transfer',
    labelEn: 'Employee Transfer',
    labelHi: 'कर्मचारी ट्रांसफर',
    url: 'https://biharbhumiplus.bihar.gov.in/EmpTransfer/Default',
  }),
  buildPortalDashboardBlock({
    accentColor: '#0f9d58',
    helperEn:
      'Open Parimarjan Plus for record correction workflows.',
    helperHi:
      'रिकॉर्ड सुधार फ्लो के लिए परिमार्जन प्लस खोलें।',
    icon: 'file-edit-outline',
    id: 'br-parimarjan-plus',
    labelEn: 'Parimarjan Plus',
    labelHi: 'परिमार्जन प्लस',
    url: 'https://parimarjanplus.bihar.gov.in/ParimarjanNew/userDashboard.aspx',
  }),
  buildPortalDashboardBlock({
    accentColor: '#7c3aed',
    helperEn:
      'Open e-Mapi for survey and boundary-related workflow.',
    helperHi:
      'सर्वे और सीमा कार्य के लिए ई-मैपी खोलें।',
    icon: 'ruler-square-compass',
    id: 'br-emapi',
    labelEn: 'e-Mapi',
    labelHi: 'ई-मैपी',
    url: 'https://emapi.bihar.gov.in/default.aspx?ReturnUrl=%2f',
  }),
  buildPortalDashboardBlock({
    accentColor: '#dc2626',
    helperEn:
      'Open Bihar revenue court management system.',
    helperHi:
      'बिहार राजस्व न्यायालय प्रबंधन प्रणाली खोलें।',
    icon: 'scale-balance',
    id: 'br-rcms',
    labelEn: 'Revenue Court',
    labelHi: 'राजस्व न्यायालय',
    url: 'https://biharbhumi.bihar.gov.in/Biharbhumi/RCMS/RCMSDefault',
  }),
  buildPortalDashboardBlock({
    accentColor: '#14b8a6',
    helperEn:
      'Open Bihar land tribunal services.',
    helperHi:
      'बिहार भूमि न्यायाधिकरण सेवाएं खोलें।',
    icon: 'gavel',
    id: 'br-land-tribunal',
    labelEn: 'Land Tribunal',
    labelHi: 'भूमि न्यायाधिकरण',
    url: 'https://land.bihar.gov.in/LandTribunal/Default.aspx',
  }),
  buildPortalDashboardBlock({
    accentColor: '#f59e0b',
    helperEn:
      'Open the Bihar land conversion portal.',
    helperHi:
      'बिहार भूमि रूपांतरण पोर्टल खोलें।',
    icon: 'swap-horizontal',
    id: 'br-land-conversion',
    labelEn: 'Land Conversion',
    labelHi: 'भूमि रूपांतरण',
    url: 'https://landconversion.bihar.gov.in/',
  }),
];

const BIHAR_SURVEY_AND_RECORD_BLOCKS: DashboardBlock[] = [
  buildPortalDashboardBlock({
    accentColor: '#0ea5e9',
    helperEn:
      'Open Bihar lagan payment services.',
    helperHi:
      'बिहार भू-लगान भुगतान सेवाएं खोलें।',
    icon: 'cash-check',
    id: 'br-bhulagan',
    labelEn: 'Bhu Lagan',
    labelHi: 'भू-लगान',
    url: 'https://www.bhulagan.bihar.gov.in/',
  }),
  buildPortalDashboardBlock({
    accentColor: '#16a34a',
    helperEn:
      'Open the DLRS Bihar home portal.',
    helperHi:
      'डीएलआरएस बिहार होम पोर्टल खोलें।',
    icon: 'office-building-outline',
    id: 'br-dlrs-home',
    labelEn: 'DLRS Bihar',
    labelHi: 'डीएलआरएस बिहार',
    url: 'https://dlrs.bihar.gov.in/',
  }),
  buildPortalDashboardBlock({
    accentColor: '#9333ea',
    helperEn:
      'Door-step revenue map and document delivery portal.',
    helperHi:
      'डोर-स्टेप राजस्व मानचित्र और दस्तावेज़ डिलीवरी पोर्टल।',
    icon: 'truck-delivery-outline',
    id: 'br-dms-delivery',
    labelEn: 'Map Delivery',
    labelHi: 'मैप डिलीवरी',
    url: 'https://dlrs.bihar.gov.in/dms1/Default.aspx',
  }),
];

const UP_FEATURED_BLOCKS: DashboardBlock[] = [
  {
    accentColor: '#0ea5e9',
    action: {
      type: 'assistant-launch',
      launchAction: 'khasra-portal',
    },
    helper: text(
      'Choose Khasra Login or Khasra Dekhen (View Record)',
      'खसरा लॉगिन या खसरा देखें (रिकॉर्ड व्यू) चुनें',
    ),
    icon: 'map-search-outline',
    id: 'up-khasra',
    label: text('Khasra Portal', 'खसरा पोर्टल'),
  },
  {
    accentColor: '#14b8a6',
    action: {type: 'tool', toolId: 'up-bhunaksha'},
    helper: text('Village map and plot overlay view', 'ग्राम नक्शा और प्लॉट ओवरले व्यू'),
    icon: 'map-outline',
    id: 'up-bhunaksha',
    label: text('Bhu Naksha', 'भूनक्शा'),
  },
  {
    accentColor: '#2563eb',
    action: {
      type: 'assistant-launch',
      launchAction: 'real-time-khatoni-login',
    },
    helper: text('Official live login route', 'आधिकारिक लाइव लॉगिन रूट'),
    icon: 'account-key-outline',
    id: 'up-rc9',
    label: text('RC-9 / Lekhpal Login', 'RC-9 / लेखपाल लॉगिन'),
  },
  {
    accentColor: '#f97316',
    action: {
      type: 'assistant-launch',
      launchAction: 'varasat-login',
    },
    helper: text('Open the official Varasat login route', 'आधिकारिक वरासत लॉगिन रूट खोलें'),
    icon: 'file-sync-outline',
    id: 'up-varasat',
    label: text('Varasat Aavedan', 'वरासत आवेदन'),
  },
  {
    accentColor: '#8b5cf6',
    action: {type: 'tool', toolId: 'edistrict-up'},
    helper: text('Open eDistrict UP services', 'eDistrict UP सेवाएँ खोलें'),
    icon: 'office-building-outline',
    id: 'up-edistrict',
    label: text('eDistrict Login', 'eDistrict लॉगिन'),
  },
  {
    accentColor: '#ef4444',
    action: {
      type: 'assistant-launch',
      launchAction: 'khatoni-copy',
    },
    helper: text('Open the khatauni rights-copy flow', 'खतौनी अधिकार प्रति फ्लो खोलें'),
    icon: 'file-document-outline',
    id: 'up-khatauni',
    label: text('Khatauni Dekhen', 'खतौनी देखें'),
  },
];

const UP_LIVE_PORTAL_BLOCKS: DashboardBlock[] = [
  {
    accentColor: '#1d4ed8',
    action: {
      type: 'assistant-launch',
      launchAction: 'khatoni-login',
    },
    helper: text('Official khatauni login route', 'आधिकारिक खतौनी लॉगिन रूट'),
    icon: 'login-variant',
    id: 'up-khatoni-login',
    label: text('Khatoni Login', 'खतौनी लॉगिन'),
  },
  {
    accentColor: '#0f9d58',
    action: {
      type: 'assistant-launch',
      launchAction: 'khatoni-online-payment',
    },
    helper: text('Certified copy through online payment', 'ऑनलाइन पेमेंट से प्रमाणित प्रति'),
    icon: 'credit-card-outline',
    id: 'up-online-payment',
    label: text('Online Payment Copy', 'ऑनलाइन पेमेंट प्रति'),
  },
  {
    accentColor: '#dc2626',
    action: {
      type: 'assistant-launch',
      launchAction: 'bhukhand-sale-status',
    },
    helper: text('Check bhukhand or gata sale status', 'भूखण्ड या गाटा विक्रय स्थिति देखें'),
    icon: 'home-search-outline',
    id: 'up-sale-status',
    label: text('Bhukhand Vikray Sthiti', 'भूखण्ड विक्रय स्थिति'),
  },
  {
    accentColor: '#7c3aed',
    action: {
      type: 'assistant-launch',
      launchAction: 'bhukhand-grast-status',
    },
    helper: text('Status after land becomes grast', 'ग्रेस्ट होने के बाद की स्थिति'),
    icon: 'home-alert-outline',
    id: 'up-grast-status',
    label: text('Bhukhand Grast Sthiti', 'भूखण्ड ग्रस्त स्थिति'),
  },
  {
    accentColor: '#14b8a6',
    action: {
      type: 'assistant-launch',
      launchAction: 'rajasva-gram-code',
    },
    helper: text('Find village khatauni and unique code', 'ग्राम खतौनी और यूनिक कोड देखें'),
    icon: 'barcode-scan',
    id: 'up-gram-code',
    label: text('Gram Code / Unique Code', 'ग्राम कोड / यूनिक कोड'),
  },
  {
    accentColor: '#2563eb',
    action: {
      type: 'assistant-launch',
      launchAction: 'district-directory',
    },
    helper: text('District-wise live list', 'जिला-वार लाइव सूची'),
    icon: 'office-building-marker-outline',
    id: 'up-jila',
    label: text('Jila', 'जिला'),
  },
  {
    accentColor: '#16a34a',
    action: {
      type: 'assistant-launch',
      launchAction: 'tehsil-directory',
    },
    helper: text('Tehsil-wise live list', 'तहसील-वार लाइव सूची'),
    icon: 'map-marker-radius-outline',
    id: 'up-tehsil',
    label: text('Tehsil', 'तहसील'),
  },
  {
    accentColor: '#9333ea',
    action: {
      type: 'assistant-launch',
      launchAction: 'pargana-directory',
    },
    helper: text('Pargana-wise live list', 'परगना-वार लाइव सूची'),
    icon: 'map-legend',
    id: 'up-pargana',
    label: text('Pargana', 'परगना'),
  },
  {
    accentColor: '#f97316',
    action: {
      type: 'assistant-launch',
      launchAction: 'bhumi-prakar',
    },
    helper: text('Official land-type list', 'आधिकारिक भूमि प्रकार सूची'),
    icon: 'terrain',
    id: 'up-bhumi-prakar',
    label: text('Bhumi Prakar Suchi', 'भूमि प्रकार सूची'),
  },
  {
    accentColor: '#ef4444',
    action: {
      type: 'assistant-launch',
      launchAction: 'sarkari-bhumi',
    },
    helper: text('Search official government land list', 'आधिकारिक सरकारी भूमि खोजें'),
    icon: 'shield-search-outline',
    id: 'up-sarkari-bhumi',
    label: text('Sarkari Bhumi Khoje', 'सरकारी भूमि खोजें'),
  },
  {
    accentColor: '#06b6d4',
    action: {
      type: 'assistant-launch',
      launchAction: 'cyber-guidelines',
    },
    helper: text('UP cyber security guideline page', 'यूपी साइबर सिक्योरिटी गाइडलाइन पेज'),
    icon: 'shield-lock-outline',
    id: 'up-cyber-guidelines',
    label: text('Cyber Guidelines', 'साइबर गाइडलाइन्स'),
  },
];

export const getStateByCode = (stateCode: string | null) =>
  (() => {
    const state =
      INDIA_STATE_OPTIONS.find(
        currentState => currentState.code === stateCode,
      ) ?? null;

    if (!state) {
      return null;
    }

    return {
      ...state,
      isLive: hasLiveStateWorkspace(state.code),
    };
  })();

export {hasLiveStateWorkspace};

const buildOfficialStatePortalBlocks = (
  stateCode: string,
): DashboardBlock[] =>
  (STATE_OFFICIAL_PORTAL_BLOCKS[stateCode] || []).map(portalBlock => ({
    accentColor: portalBlock.accentColor,
    action: {
      type: 'portal',
      url: portalBlock.url,
    },
    helper: portalBlock.helper,
    icon: portalBlock.icon,
    id: portalBlock.id,
    label: portalBlock.label,
  }));

export const getDashboardSectionsForState = (
  stateCode: string,
): DashboardSection[] => {
  if (stateCode === 'UP') {
    return [
      {
        blocks: UP_FEATURED_BLOCKS,
        id: 'featured',
        title: text('Fast Access', 'फास्ट एक्सेस'),
      },
      {
        blocks: UP_LIVE_PORTAL_BLOCKS,
        id: 'portal',
        title: text('UP Live Portal Blocks', 'यूपी लाइव पोर्टल ब्लॉक्स'),
      },
    ];
  }

  if (stateCode === 'BR') {
    return [
      {
        blocks: BIHAR_FEATURED_BLOCKS,
        id: 'bihar-featured',
        title: text(
          'Bihar Fast Access',
          'बिहार फास्ट एक्सेस',
        ),
      },
      {
        blocks: BIHAR_REVENUE_WORKFLOW_BLOCKS,
        id: 'bihar-revenue-workflows',
        title: text(
          'Revenue Workflows',
          'राजस्व वर्कफ्लो',
        ),
      },
      {
        blocks: BIHAR_SURVEY_AND_RECORD_BLOCKS,
        id: 'bihar-survey-records',
        title: text(
          'Survey and Record Services',
          'सर्वे और रिकॉर्ड सेवाएं',
        ),
      },
    ];
  }

  const officialPortalBlocks =
    buildOfficialStatePortalBlocks(stateCode);

  if (officialPortalBlocks.length) {
    return [
      {
        blocks: officialPortalBlocks,
        id: 'official-portals',
        title: text(
          'Official State Portals',
          'आधिकारिक राज्य पोर्टल',
        ),
      },
      {
        blocks: GENERIC_FEATURED_BLOCKS,
        id: 'workspace-tools',
        title: text(
          'Field and Office Tools',
          'फील्ड और ऑफिस टूल्स',
        ),
      },
    ];
  }

  return [
    {
      blocks: GENERIC_FEATURED_BLOCKS,
      id: 'featured',
      title: text('State Workspace', 'स्टेट वर्कस्पेस'),
    },
  ];
};
