import {LocalizedText} from '../types/tool';
import {UpBhulekhLaunchAction} from '../types/upBhulekh';

const text = (en: string, hi: string): LocalizedText => ({
  en,
  hi,
});

type UpHomeEntryAction =
  | {
      type: 'assistant';
      launchAction: UpBhulekhLaunchAction;
    }
  | {
      type: 'portal';
      title: LocalizedText;
      url: string;
    }
  | {
      type: 'tool';
      toolId: string;
    };

export type UpHomeEntry = {
  accentColor: string;
  action: UpHomeEntryAction;
  icon: string;
  id: string;
  searchTerms: string[];
  subtitle: LocalizedText;
  title: LocalizedText;
};

export type UpHomeSection = {
  entries: UpHomeEntry[];
  id: string;
  subtitle: LocalizedText;
  title: LocalizedText;
};

const UP_BHULEKH_HOME_URL = 'https://upbhulekh.gov.in/#/home';

export const TOP_UP_ACCESS_ENTRIES: UpHomeEntry[] = [
  {
    accentColor: '#0EA5E9',
    action: {
      launchAction: 'khasra-portal',
      type: 'assistant',
    },
    icon: 'map-search-outline',
    id: 'up-home-khasra',
    searchTerms: [
      'khasra',
      'ekhasra',
      'khasra login',
      'khasra dekhe',
      'khsra',
      'खसरा',
      'खसरा देखें',
      'खसरा लॉगिन',
    ],
    subtitle: text(
      'Choose between Khasra Login and Khasra Dekhen (View Record).',
      'खसरा लॉगिन और खसरा देखें (रिकॉर्ड व्यू) में से चुनें।',
    ),
    title: text('Khasra Portal', 'खसरा पोर्टल'),
  },
  {
    accentColor: '#16A34A',
    action: {
      launchAction: 'real-time-khatoni-login',
      type: 'assistant',
    },
    icon: 'clock-fast',
    id: 'up-home-rc9',
    searchTerms: [
      'rc9',
      'rc-9',
      'realtime',
      'real time',
      'lekhpal login',
      'rccms',
      'लेखपाल लॉगिन',
      'आरसी 9',
    ],
    subtitle: text(
      'Open the RCCMS lekhpal login screen directly.',
      'RCCMS लेखपाल लॉगिन स्क्रीन सीधे खोलें।',
    ),
    title: text('RC-9 / Lekhpal Login', 'RC-9 / लेखपाल लॉगिन'),
  },
  {
    accentColor: '#7C3AED',
    action: {
      toolId: 'edistrict-up',
      type: 'tool',
    },
    icon: 'office-building-outline',
    id: 'up-home-edistrict',
    searchTerms: [
      'edistrict',
      'e district',
      'certificate',
      'service login',
      'ई डिस्ट्रिक्ट',
      'प्रमाण पत्र',
    ],
    subtitle: text(
      'Open UP eDistrict services and login flow.',
      'UP eDistrict सेवाएं और लॉगिन फ्लो खोलें।',
    ),
    title: text('eDistrict Login', 'eDistrict लॉगिन'),
  },
  {
    accentColor: '#0891B2',
    action: {
      toolId: 'up-bhunaksha',
      type: 'tool',
    },
    icon: 'map-outline',
    id: 'up-home-bhunaksha',
    searchTerms: [
      'bhunaksha',
      'bhu naksha',
      'map',
      'plot map',
      'भू नक्शा',
      'नक्शा',
    ],
    subtitle: text(
      'Open the village map and plot boundary portal.',
      'ग्राम नक्शा और प्लॉट सीमा वाला पोर्टल खोलें।',
    ),
    title: text('Bhu Naksha', 'भू नक्शा'),
  },
  {
    accentColor: '#F97316',
    action: {
      launchAction: 'varasat-login',
      type: 'assistant',
    },
    icon: 'file-account-outline',
    id: 'up-home-varasat',
    searchTerms: [
      'varasat',
      'warasat',
      'inheritance',
      'mutation login',
      'वरासत',
      'वरासत आवेदन',
    ],
    subtitle: text(
      'Open the official Varasat Aavedan login route.',
      'आधिकारिक वरासत आवेदन लॉगिन रूट खोलें।',
    ),
    title: text('Varasat Aavedan', 'वरासत आवेदन'),
  },
  {
    accentColor: '#DC2626',
    action: {
      launchAction: 'khatoni-copy',
      type: 'assistant',
    },
    icon: 'file-search-outline',
    id: 'up-home-khatauni',
    searchTerms: [
      'khatoni',
      'khatauni',
      'khatauni copy',
      'adhikar abhilekh',
      'nakal',
      'खतौनी',
      'अधिकार अभिलेख',
      'नकल',
    ],
    subtitle: text(
      'Open the Khatauni rights-copy flow directly.',
      'खतौनी अधिकार प्रति वाला फ्लो सीधे खोलें।',
    ),
    title: text('Khatauni Dekhen', 'खतौनी देखें'),
  },
];

export const UP_BHULEKH_SERVICE_ENTRIES: UpHomeEntry[] = [
  {
    accentColor: '#2563EB',
    action: {
      launchAction: 'khatoni-login',
      type: 'assistant',
    },
    icon: 'login-variant',
    id: 'up-home-khatoni-login',
    searchTerms: [
      'khatoni login',
      'khatauni login',
      'otp',
      'खतौनी लॉगिन',
      'ओटीपी',
    ],
    subtitle: text(
      'Open the official Khatoni login route from UP Bhulekh.',
      'UP Bhulekh से आधिकारिक खतौनी लॉगिन रूट खोलें।',
    ),
    title: text('Khatoni Login', 'खतौनी लॉगिन'),
  },
  {
    accentColor: '#D97706',
    action: {
      launchAction: 'khatoni-online-payment',
      type: 'assistant',
    },
    icon: 'credit-card-outline',
    id: 'up-home-online-payment',
    searchTerms: [
      'online payment',
      'payment copy',
      'certified copy',
      'ऑनलाइन पेमेंट',
      'प्रमाणित प्रति',
    ],
    subtitle: text(
      'Open the certified copy flow through online payment.',
      'ऑनलाइन पेमेंट से प्रमाणित प्रति वाला फ्लो खोलें।',
    ),
    title: text('Online Payment Copy', 'ऑनलाइन पेमेंट प्रति'),
  },
  {
    accentColor: '#DC2626',
    action: {
      launchAction: 'bhukhand-sale-status',
      type: 'assistant',
    },
    icon: 'home-search-outline',
    id: 'up-home-bhukhand-vikray',
    searchTerms: [
      'vikray',
      'sale status',
      'bhukhand',
      'gata',
      'विक्रय',
      'भूखंड',
      'गाटा',
    ],
    subtitle: text(
      'Check the official Bhukhand or Gata Vikray Sthiti page.',
      'आधिकारिक भूखंड या गाटा विक्रय स्थिति पेज खोलें।',
    ),
    title: text('Bhukhand Vikray Sthiti', 'भूखंड विक्रय स्थिति'),
  },
  {
    accentColor: '#7C3AED',
    action: {
      launchAction: 'bhukhand-grast-status',
      type: 'assistant',
    },
    icon: 'home-alert-outline',
    id: 'up-home-bhukhand-grast',
    searchTerms: [
      'grast',
      'grast status',
      'vaad',
      'भूखंड ग्रस्त',
      'वाद',
      'ग्रस्त स्थिति',
    ],
    subtitle: text(
      'Check the official Bhukhand Grast status flow.',
      'आधिकारिक भूखंड ग्रस्त स्थिति वाला फ्लो खोलें।',
    ),
    title: text('Bhukhand Grast Sthiti', 'भूखंड ग्रस्त स्थिति'),
  },
  {
    accentColor: '#0F766E',
    action: {
      launchAction: 'rajasva-gram-code',
      type: 'assistant',
    },
    icon: 'barcode-scan',
    id: 'up-home-gram-code',
    searchTerms: [
      'gram code',
      'unique code',
      'village code',
      'ग्राम कोड',
      'यूनिक कोड',
    ],
    subtitle: text(
      'Find the revenue village code and unique code.',
      'राजस्व ग्राम कोड और यूनिक कोड देखें।',
    ),
    title: text('Gram Code / Unique Code', 'ग्राम कोड / यूनिक कोड'),
  },
  {
    accentColor: '#2563EB',
    action: {
      launchAction: 'district-directory',
      type: 'assistant',
    },
    icon: 'office-building-marker-outline',
    id: 'up-home-jila',
    searchTerms: ['district', 'jila', 'janpad', 'जिला', 'जनपद'],
    subtitle: text(
      'Open the district-wise UP Bhulekh directory.',
      'जिला-वार UP Bhulekh सूची खोलें।',
    ),
    title: text('Jila Directory', 'जिला सूची'),
  },
  {
    accentColor: '#16A34A',
    action: {
      launchAction: 'tehsil-directory',
      type: 'assistant',
    },
    icon: 'map-marker-radius-outline',
    id: 'up-home-tehsil',
    searchTerms: ['tehsil', 'tahsil', 'तहसील'],
    subtitle: text(
      'Open the tehsil-wise UP Bhulekh directory.',
      'तहसील-वार UP Bhulekh सूची खोलें।',
    ),
    title: text('Tehsil Directory', 'तहसील सूची'),
  },
  {
    accentColor: '#9333EA',
    action: {
      launchAction: 'pargana-directory',
      type: 'assistant',
    },
    icon: 'map-legend',
    id: 'up-home-pargana',
    searchTerms: ['pargana', 'परगना'],
    subtitle: text(
      'Open the pargana-wise UP Bhulekh directory.',
      'परगना-वार UP Bhulekh सूची खोलें।',
    ),
    title: text('Pargana Directory', 'परगना सूची'),
  },
  {
    accentColor: '#F97316',
    action: {
      launchAction: 'bhumi-prakar',
      type: 'assistant',
    },
    icon: 'terrain',
    id: 'up-home-bhumi-prakar',
    searchTerms: ['bhumi prakar', 'land type', 'भूमि प्रकार', 'भूमि सूची'],
    subtitle: text(
      'Open the official Bhumi Prakar Suchi page.',
      'आधिकारिक भूमि प्रकार सूची वाला पेज खोलें।',
    ),
    title: text('Bhumi Prakar Suchi', 'भूमि प्रकार सूची'),
  },
  {
    accentColor: '#B91C1C',
    action: {
      launchAction: 'sarkari-bhumi',
      type: 'assistant',
    },
    icon: 'shield-search-outline',
    id: 'up-home-sarkari-bhumi',
    searchTerms: ['sarkari bhumi', 'government land', 'सरकारी भूमि'],
    subtitle: text(
      'Search the official Sarkari Bhumi route.',
      'आधिकारिक सरकारी भूमि खोज वाला रूट खोलें।',
    ),
    title: text('Sarkari Bhumi Khoje', 'सरकारी भूमि खोजें'),
  },
  {
    accentColor: '#0891B2',
    action: {
      launchAction: 'cyber-guidelines',
      type: 'assistant',
    },
    icon: 'shield-lock-outline',
    id: 'up-home-cyber-guidelines',
    searchTerms: ['cyber', 'guidelines', 'security', 'साइबर', 'गाइडलाइन'],
    subtitle: text(
      'Open the UP Bhulekh cyber guideline page.',
      'UP Bhulekh साइबर गाइडलाइन पेज खोलें।',
    ),
    title: text('Cyber Guidelines', 'साइबर गाइडलाइंस'),
  },
];

export const UP_DAILY_WORK_ENTRIES: UpHomeEntry[] = [
  {
    accentColor: '#EF4444',
    action: {
      toolId: 'village-diary',
      type: 'tool',
    },
    icon: 'notebook-outline',
    id: 'up-home-village-diary',
    searchTerms: [
      'village diary',
      'daily work',
      'field diary',
      'gram diary',
      'gaon diary',
      'village notes',
      'ग्राम डायरी',
      'विलेज डायरी',
    ],
    subtitle: text(
      'Write village visit notes, pending work, and next follow-up.',
      'गांव विजिट नोट्स, पेंडिंग काम और अगली फॉलो-अप कार्रवाई लिखें।',
    ),
    title: text('Village Diary', 'ग्राम डायरी'),
  },
  {
    accentColor: '#F97316',
    action: {
      toolId: 'mutation-tracker',
      type: 'tool',
    },
    icon: 'file-sync-outline',
    id: 'up-home-mutation-tracker',
    searchTerms: [
      'mutation tracker',
      'mutation follow up',
      'mutation diary',
      'dakhil kharij',
      'mutation status notes',
      'नामांतरण',
      'म्यूटेशन',
      'दाखिल खारिज',
    ],
    subtitle: text(
      'Track mutation case status, pending papers, and next action.',
      'नामांतरण केस की स्थिति, पेंडिंग कागजात और अगली कार्रवाई ट्रैक करें।',
    ),
    title: text('Mutation Tracker', 'नामांतरण ट्रैकर'),
  },
];

export const OTHER_UP_PORTAL_ENTRIES: UpHomeEntry[] = [
  {
    accentColor: '#1D4ED8',
    action: {
      title: text('UP Bhulekh Main Portal', 'UP भूलेख मुख्य पोर्टल'),
      type: 'portal',
      url: UP_BHULEKH_HOME_URL,
    },
    icon: 'web',
    id: 'up-home-bhulekh-main-portal',
    searchTerms: [
      'up bhulekh',
      'bhulekh main portal',
      'home portal',
      'भूलेख पोर्टल',
      'मुख्य पोर्टल',
    ],
    subtitle: text(
      'Open the main UP Bhulekh portal directly inside the app.',
      'मुख्य UP Bhulekh पोर्टल को सीधे ऐप में खोलें।',
    ),
    title: text('UP Bhulekh Main Portal', 'UP भूलेख मुख्य पोर्टल'),
  },
  {
    accentColor: '#EA580C',
    action: {
      toolId: 'igrs-registry',
      type: 'tool',
    },
    icon: 'file-certificate-outline',
    id: 'up-home-igrs',
    searchTerms: [
      'igrs',
      'registry',
      'valuation',
      'stamp',
      'आईजीआरएस',
      'रजिस्ट्री',
    ],
    subtitle: text(
      'Open registry and valuation support from the official IGRS portal.',
      'आधिकारिक IGRS पोर्टल से रजिस्ट्री और मूल्यांकन सेवाएं खोलें।',
    ),
    title: text('IGRS Registry', 'IGRS रजिस्ट्री'),
  },
  {
    accentColor: '#6D28D9',
    action: {
      toolId: 'revenue-court',
      type: 'tool',
    },
    icon: 'scale-balance',
    id: 'up-home-revenue-court',
    searchTerms: [
      'revenue court',
      'court status',
      'vaad',
      'राजस्व न्यायालय',
      'वाद',
    ],
    subtitle: text(
      'Open the public revenue court portal and case pages.',
      'राजस्व न्यायालय पोर्टल और केस पेज खोलें।',
    ),
    title: text('Revenue Court', 'राजस्व न्यायालय'),
  },
];

export const UP_HOME_SECTIONS: UpHomeSection[] = [
  {
    entries: TOP_UP_ACCESS_ENTRIES,
    id: 'top-access',
    subtitle: text(
      'Most-used direct routes for UP lekhpal work.',
      'UP लेखपाल कार्य के सबसे अधिक उपयोग होने वाले सीधे रूट।',
    ),
    title: text('Top Access', 'मुख्य पहुंच'),
  },
  {
    entries: UP_DAILY_WORK_ENTRIES,
    id: 'daily-work',
    subtitle: text(
      'Keep daily follow-up records ready from the home screen.',
      'होम स्क्रीन से ही दैनिक फॉलो-अप रिकॉर्ड तैयार रखें।',
    ),
    title: text('Daily Work', 'डेली वर्क'),
  },
  {
    entries: UP_BHULEKH_SERVICE_ENTRIES,
    id: 'up-bhulekh-services',
    subtitle: text(
      'More official flows from UP Bhulekh.',
      'UP Bhulekh के और आधिकारिक फ्लो।',
    ),
    title: text('UP Bhulekh Services', 'UP भूलेख सेवाएं'),
  },
  {
    entries: OTHER_UP_PORTAL_ENTRIES,
    id: 'other-up-portals',
    subtitle: text(
      'Support portals often used with revenue work.',
      'राजस्व कार्य के साथ उपयोग होने वाले सपोर्ट पोर्टल।',
    ),
    title: text('Other Official Portals', 'अन्य आधिकारिक पोर्टल'),
  },
];
