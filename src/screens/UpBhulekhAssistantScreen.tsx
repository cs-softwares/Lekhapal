import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  WebView,
  WebViewMessageEvent,
} from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import AppSectionTitle from '../components/AppSectionTitle';
import {STANDARD_MOBILE_BROWSER_USER_AGENT} from '../config/webView';
import {useLanguage} from '../context/LanguageContext';
import {COLORS} from '../theme/colors';
import {RootStackParamList} from '../types/navigation';
import {UpBhulekhLaunchAction} from '../types/upBhulekh';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'UpBhulekhAssistant'
>;

type PortalOption = {
  label: string;
  value: string;
};

type PortalField = {
  key: string;
  label: string;
  options: PortalOption[];
  type: 'click' | 'radio' | 'select';
  value: string;
};

type PortalInput = {
  key: string;
  label: string;
  placeholder: string;
  value: string;
};

type PortalAction = {
  key: string;
  label: string;
};

type ParsedResult = {
  looksLikeResult: boolean;
  summaryLines: string[];
  tables: string[][][];
  title: string;
};

type PortalSnapshot = {
  buttons: PortalAction[];
  inputs: PortalInput[];
  links: PortalAction[];
  pageTitle: string;
  radios: PortalField[];
  result: ParsedResult;
  selects: PortalField[];
  url: string;
};

type SearchWorkflowId =
  | 'khasra'
  | 'uniqueCode'
  | 'khata'
  | 'name';

type SearchWorkflowOption = {
  accentColor: string;
  id: SearchWorkflowId;
  keywords: string[];
  subtitle: string;
  title: string;
};

type PortalHomeActionMode =
  | 'open-khasra-menu'
  | 'open-live-route'
  | 'open-search-menu'
  | 'open-search-workflow';

type PortalLandingMode =
  | 'home'
  | 'search'
  | 'live'
  | 'khasra-menu';

type PortalHomeAction = {
  accentColor: string;
  blockedKeywords?: string[];
  description: string;
  directUrl?: string;
  exactLabels?: string[];
  id: UpBhulekhLaunchAction;
  icon: string;
  keywords: string[];
  mode: PortalHomeActionMode;
  title: string;
  workflowId?: SearchWorkflowId;
};

type PortalQuickRoute = PortalAction & {
  source: 'button' | 'link';
};

type SearchSnapshot = {
  fieldValues: Record<string, string>;
  inputValues: Record<string, string>;
  labels: string[];
};

type PendingPortalRouteRequest = {
  blockedKeywords: string[];
  exactLabels: string[];
  headerTitle: string;
  keywords: string[];
  sourceUrl: string;
};

type KhasraMenuAction = {
  accentColor: string;
  description: string;
  directUrl: string;
  exactLabels: string[];
  icon: string;
  id: 'login' | 'view';
  keywords: string[];
  title: string;
};

type SavedPreset = SearchSnapshot;

type RecentSearch = SearchSnapshot & {
  id: string;
};

const UP_BHULEKH_HOME_HASH = '#/home';
const UP_BHULEKH_BASE_URL = 'https://upbhulekh.gov.in/';
const EKHASRA_BASE_URL = 'https://ekhasra.up.gov.in/';
const buildEkhasraRouteUrl = (routePath: string) =>
  `${EKHASRA_BASE_URL}#/${routePath.replace(/^\/+/, '')}`;
const EKHASRA_HOME_URL = buildEkhasraRouteUrl('home');
const EKHASRA_LOGIN_URL = buildEkhasraRouteUrl('SelectLogin');
const EKHASRA_REPORT_URL = buildEkhasraRouteUrl('khasrareport');
const UP_RCCMS_LEKHPAL_LOGIN_URL =
  'https://rccms.up.gov.in/dashboard/login/';
const UP_VARASAT_LOGIN_URL =
  'https://rccms.up.gov.in/Varasat/userlogin';
const buildEmbeddedPdfViewerUrl = (documentUrl: string) =>
  `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
    documentUrl,
  )}`;
const UP_BHULEKH_CYBER_GUIDELINES_PDF_URL = `${UP_BHULEKH_BASE_URL}documents/cyber_security_guidelines.pdf`;
const UP_BHULEKH_CYBER_GUIDELINES_URL = buildEmbeddedPdfViewerUrl(
  UP_BHULEKH_CYBER_GUIDELINES_PDF_URL,
);
const UP_BHULEKH_URL = `https://upbhulekh.gov.in/${UP_BHULEKH_HOME_HASH}`;
const UP_BHULEKH_ASSISTANT_SCRIPT_VERSION =
  '2026-06-23-village-parser-1';
const PORTAL_QUICK_ROUTE_CARD_WIDTH = 98;
const PORTAL_QUICK_ROUTE_CARD_GAP = 10;
const PORTAL_QUICK_ROUTE_ITEM_SPAN =
  PORTAL_QUICK_ROUTE_CARD_WIDTH + PORTAL_QUICK_ROUTE_CARD_GAP;
const PORTAL_QUICK_ROUTE_TONES = [
  {
    backgroundColor: '#0f766e',
    borderColor: '#14b8a6',
    textColor: '#f0fdfa',
  },
  {
    backgroundColor: '#1d4ed8',
    borderColor: '#60a5fa',
    textColor: '#eff6ff',
  },
  {
    backgroundColor: '#7c3aed',
    borderColor: '#c4b5fd',
    textColor: '#f5f3ff',
  },
  {
    backgroundColor: '#be123c',
    borderColor: '#fb7185',
    textColor: '#fff1f2',
  },
  {
    backgroundColor: '#b45309',
    borderColor: '#fbbf24',
    textColor: '#fffbeb',
  },
];
const PRESET_STORAGE_KEY = 'up-bhulekh-assistant-last-preset';
const HISTORY_STORAGE_KEY = 'up-bhulekh-assistant-recent-searches';
const MAX_RECENT_SEARCHES = 6;

const LOCATION_KEYWORDS = [
  'district',
  'jila',
  'janpad',
  'tehsil',
  'tahsil',
  'village',
  'gram',
  'gaon',
  'district select',
  'select tehsil',
  'select village',
  '\u091c\u093f\u0932\u093e',
  '\u091c\u0928\u092a\u0926',
  '\u0924\u0939\u0938\u0940\u0932',
  '\u0917\u094d\u0930\u093e\u092e',
  '\u0917\u093e\u0902\u0935',
  '\u0917\u093e\u0901\u0935',
  'जिला',
  'जनपद',
  'तहसील',
  'ग्राम',
  'गांव',
  'गाँव',
  'जिला',
  'जनपद',
  'तहसील',
  'ग्राम',
  'गाँव',
];

const SEARCH_MODE_KEYWORDS = [
  'search',
  'type',
  'khata',
  'gata',
  'khasra',
  'unique',
  'code',
  'owner',
  'name',
  'search by',
  '\u0928\u093e\u092e',
  '\u0916\u093e\u0924\u093e',
  '\u0917\u093e\u091f\u093e',
  '\u0916\u0938\u0930\u093e',
  '\u0916\u094b\u091c',
  '\u0916\u094b\u091c\u0947\u0902',
  '\u0915\u094b\u0921',
  '\u092f\u0942\u0928\u093f\u0915',
  '\u0916\u093e\u0924\u0947\u0926\u093e\u0930',
  '\u0938\u0902\u0916\u094d\u092f\u093e',
  '\u0926\u094d\u0935\u093e\u0930\u093e',
  'नाम',
  'खाता',
  'गाटा',
  'खसरा',
  'खोज',
  'खोजें',
  'कोड',
  'यूनिक',
  'खातेदार',
  'संख्या',
  'द्वारा',
  'नाम',
  'खाता',
  'गाटा',
  'खसरा',
  'खोज',
  'खातेदार',
];

const PRIMARY_LINK_KEYWORDS = [
  'bhulekh',
  'copy of khatauni',
  'khatauni',
  'adhikar',
  'abhilekh',
  '\u092d\u0942\u0932\u0947\u0916',
  '\u0905\u0927\u093f\u0915\u093e\u0930',
  '\u0916\u0924\u094c\u0928\u0940',
  '\u0905\u092d\u093f\u0932\u0947\u0916',
  'भूलेख',
  'अधिकार',
  'खतौनी',
  'अभिलेख',
  'अधिकार',
  'खतौनी',
  'अभिलेख',
];

const DISTRICT_KEYWORDS = [
  'district',
  'jila',
  'janpad',
  '\u091c\u093f\u0932\u093e',
  '\u091c\u0928\u092a\u0926',
  'जिला',
  'जनपद',
  'जिला',
  'जनपद',
];

const TEHSIL_KEYWORDS = [
  'tehsil',
  'tahsil',
  '\u0924\u0939\u0938\u0940\u0932',
  'तहसील',
  'तहसील',
];

const VILLAGE_KEYWORDS = [
  'village',
  'gram',
  'gaon',
  '\u0917\u094d\u0930\u093e\u092e',
  '\u0917\u093e\u0902\u0935',
  '\u0917\u093e\u0901\u0935',
  'ग्राम',
  'गांव',
  'गाँव',
  'ग्राम',
  'गाँव',
];

const FIRST_LETTER_KEYWORDS = [
  'first letter',
  'first character',
  'pehla',
  '\u092a\u0939\u0932\u093e',
  '\u0905\u0915\u094d\u0937\u0930',
  '\u092a\u0939\u0932\u093e \u0905\u0915\u094d\u0937\u0930',
  '\u0928\u093e\u092e ka pehla akshar',
  '\u0928\u093e\u092e \u0915\u093e \u092a\u0939\u0932\u093e \u0905\u0915\u094d\u0937\u0930',
  '\u0905\u0915\u094d\u0937\u0930 \u091a\u0941\u0928\u0947\u0902',
  'पहला',
  'अक्षर',
  'पहला अक्षर',
  'नाम ka pehla akshar',
  'नाम का पहला अक्षर',
  'पहला अक्षर',
  'अक्षर चुनें',
];

const NUMERIC_INPUT_KEYWORDS = [
  'khasra',
  'khata',
  'gata',
  'unique',
  'code',
  'number',
  'sankhya',
  '\u0916\u0938\u0930\u093e',
  '\u0916\u093e\u0924\u093e',
  '\u0917\u093e\u091f\u093e',
  '\u0915\u094b\u0921',
  '\u0938\u0902\u0916\u094d\u092f\u093e',
  '\u092f\u0942\u0928\u093f\u0915',
  'खसरा',
  'खाता',
  'गाटा',
  'कोड',
  'संख्या',
  'यूनिक',
  'खसरा',
  'खाता',
  'गाटा',
  'कोड',
  'संख्या',
];

const SEARCH_INPUT_KEYWORDS = [
  ...NUMERIC_INPUT_KEYWORDS,
  'name',
  'owner',
  'khatedar',
  '\u0928\u093e\u092e',
  '\u0916\u093e\u0924\u0947\u0926\u093e\u0930',
];

const SEARCH_ACTION_KEYWORDS = [
  'search',
  'find',
  'go',
  '\u0916\u094b\u091c',
  '\u0916\u094b\u091c\u0947\u0902',
  '\u0926\u0947\u0916\u0947\u0902',
  'खोज',
  'खोजें',
  'देखें',
  'खोज',
  'खोजें',
  'देखें',
];

const SERVICE_MENU_KEYWORDS = [
  'complaint',
  'registry',
  'stamp',
  'litigation',
  'guideline',
  'guidelines',
  'pargana',
  '\u0936\u093f\u0915\u093e\u092f\u0924',
  '\u0938\u094d\u091f\u093e\u092e\u094d\u092a',
  '\u0930\u091c\u093f\u0938\u094d\u091f\u094d\u0930\u0940',
  '\u0930\u093e\u091c\u0938\u094d\u0935 \u0935\u093e\u0926',
  '\u092a\u0930\u0917\u0928\u093e',
  '\u092d\u0942\u092e\u093f \u092a\u094d\u0930\u0915\u093e\u0930',
  '\u0938\u0930\u0915\u093e\u0930\u0940 \u092d\u0942\u092e\u093f',
  '\u0938\u093e\u0907\u092c\u0930',
  '\u0917\u093e\u0907\u0921\u0932\u093e\u0907\u0928',
  '\u0921\u0940\u0906\u0908\u090f\u0932\u0906\u0930\u090f\u092e\u092a\u0940',
  '\u0908 - \u0921\u093f\u0938\u094d\u091f\u094d\u0930\u093f\u0915\u094d\u091f',
  '\u0908-\u0921\u093f\u0938\u094d\u091f\u094d\u0930\u093f\u0915\u094d\u091f',
  'शिकायत',
  'स्टाम्प',
  'रजिस्ट्री',
  'राजस्व वाद',
  'परगना',
  'भूमि प्रकार',
  'सरकारी भूमि',
  'साइबर',
  'गाइडलाइन',
  'डीआईएलआरएमपी',
  'ई - डिस्ट्रिक्ट',
  'ई-डिस्ट्रिक्ट',
];

const PRIMARY_ROUTE_EXACT_LABELS = [
  '\u0916\u0924\u094c\u0928\u0940 (\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916) \u0915\u0940 \u0928\u0958\u0932 \u0926\u0947\u0916\u0947',
  '\u0916\u0924\u094c\u0928\u0940 (\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916) \u0915\u0940 \u0928\u0958\u0932 \u0926\u0947\u0916\u0947\u0902',
  '\u0916\u0924\u094c\u0928\u0940',
  '\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916',
];

const KHATAUNI_COPY_ROUTE_EXACT_LABELS = [
  '\u0916\u0924\u094c\u0928\u0940 (\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916) \u0915\u0940 \u0928\u0958\u0932 \u0926\u0947\u0916\u0947',
  '\u0916\u0924\u094c\u0928\u0940 (\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916) \u0915\u0940 \u0928\u0958\u0932 \u0926\u0947\u0916\u0947\u0902',
  '\u0916\u0924\u094c\u0928\u0940 (\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916) \u0915\u0940 \u0928\u0915\u093c\u0932 \u0926\u0947\u0916\u0947',
  '\u0916\u0924\u094c\u0928\u0940 (\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916) \u0915\u0940 \u0928\u0915\u093c\u0932 \u0926\u0947\u0916\u0947\u0902',
  '\u0916\u0924\u094c\u0928\u0940 (\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916) \u0915\u0940 \u0928\u0915\u0932 \u0926\u0947\u0916\u0947',
  '\u0916\u0924\u094c\u0928\u0940 (\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916) \u0915\u0940 \u0928\u0915\u0932 \u0926\u0947\u0916\u0947\u0902',
  'copy of khatauni',
  'copy of khatauni rights record',
  'khatauni rights record',
  'rights record copy',
];

const KHATAUNI_COPY_ROUTE_KEYWORDS = [
  'copy of khatauni',
  'khatauni copy',
  'khatauni rights record',
  'rights record',
  'adhikar abhilekh',
  'nakal',
  'khatauni',
  'khatoni',
  '\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916',
  '\u0928\u0958\u0932',
  '\u0928\u0915\u093c\u0932',
  '\u0928\u0915\u0932',
  '\u0916\u0924\u094c\u0928\u0940',
];

const KHATAUNI_LOGIN_BLOCK_KEYWORDS = [
  'login',
  'send otp',
  'otp',
  'real time khatoni login',
  'real time khatauni login',
  'khatoni login',
  'khatauni login',
  '\u0932\u0949\u0917\u093f\u0928',
  '\u0913\u091f\u0940\u092a\u0940',
];

const ASSISTANT_MATCH_KEYWORDS = [
  ...LOCATION_KEYWORDS,
  ...SEARCH_MODE_KEYWORDS,
  ...FIRST_LETTER_KEYWORDS,
  ...NUMERIC_INPUT_KEYWORDS,
  ...SEARCH_ACTION_KEYWORDS,
];

const PORTAL_GOVT_BANNER_TEXT =
  '\u0930\u093e\u091c\u0938\u094d\u0935 \u092a\u0930\u093f\u0937\u0926\u094d | \u0909\u0924\u094d\u0924\u0930 \u092a\u094d\u0930\u0926\u0947\u0936 \u0938\u0930\u0915\u093e\u0930';

const PORTAL_STAGE_LABELS = {
  district:
    '\u091c\u0928\u092a\u0926 \u091a\u0941\u0928\u0947\u0902',
  tehsil:
    '\u0924\u0939\u0938\u0940\u0932 \u091a\u0941\u0928\u0947\u0902',
  village:
    '\u0917\u094d\u0930\u093e\u092e \u0915\u093e \u0928\u093e\u092e \u0917\u094d\u0930\u093e\u092e \u0915\u094b\u0921 \u091a\u0941\u0928\u0947\u0902',
} as const;

const PORTAL_FIRST_LETTER_LABEL =
  '\u0917\u094d\u0930\u093e\u092e \u0915\u093e \u092a\u0939\u0932\u093e \u0905\u0915\u094d\u0937\u0930 \u091a\u0941\u0928\u0947\u0902';

const PORTAL_EMPTY_RESULT_TEXT = 'No data available.';

const NON_FLOW_OPTION_KEYWORDS = [
  'back',
  'previous',
  'next',
  'select option',
  'search district',
];

const SEARCH_WORKFLOW_OPTIONS: SearchWorkflowOption[] = [
  {
    accentColor: '#2563eb',
    id: 'khasra',
    keywords: [
      'ऑनलाइन पेमेंट द्वारा खतौनी की प्रमाणित प्रति प्राप्त करने के लिये यहाँ क्लिक करें',
      'khasra',
      'khasara',
      'gata',
      'gata sankhya',
      '\u0916\u0938\u0930\u093e',
      '\u0917\u093e\u091f\u093e',
      '\u0916\u0938\u0930\u093e \u0938\u0902\u0916\u094d\u092f\u093e \u0926\u094d\u0935\u093e\u0930\u093e \u0916\u094b\u091c\u0947\u0902',
    ],
    subtitle:
      'Open the khasra or gata number flow, then continue with district, tehsil, village, and lookup.',
    title:
      '\u0916\u0938\u0930\u093e \u0938\u0902\u0916\u094d\u092f\u093e \u0926\u094d\u0935\u093e\u0930\u093e \u0916\u094b\u091c\u0947\u0902',
  },
  {
    accentColor: '#0f9d58',
    id: 'uniqueCode',
    keywords: [
      'unique',
      'code',
      '\u092f\u0942\u0928\u093f\u0915',
      '\u0915\u094b\u0921',
      '\u092f\u0942\u0928\u093f\u0915 \u0915\u094b\u0921 \u0926\u094d\u0935\u093e\u0930\u093e \u0916\u094b\u091c\u0947\u0902',
    ],
    subtitle:
      'Open the unique code search flow and continue deeper on the next screen.',
    title:
      '\u092f\u0942\u0928\u093f\u0915 \u0915\u094b\u0921 \u0926\u094d\u0935\u093e\u0930\u093e \u0916\u094b\u091c\u0947\u0902',
  },
  {
    accentColor: '#f59e0b',
    id: 'khata',
    keywords: [
      'khata',
      'khata sankhya',
      '\u0916\u093e\u0924\u093e',
      '\u0938\u0902\u0916\u094d\u092f\u093e',
      '\u0916\u093e\u0924\u093e \u0938\u0902\u0916\u094d\u092f\u093e \u0926\u094d\u0935\u093e\u0930\u093e \u0916\u094b\u091c\u0947\u0902',
    ],
    subtitle:
      'Open the khata number flow and continue with location selection before searching.',
    title:
      '\u0916\u093e\u0924\u093e \u0938\u0902\u0916\u094d\u092f\u093e \u0926\u094d\u0935\u093e\u0930\u093e \u0916\u094b\u091c\u0947\u0902',
  },
  {
    accentColor: '#7c3aed',
    id: 'name',
    keywords: [
      'name',
      'khatedar',
      'khatedar ke naam',
      '\u0928\u093e\u092e',
      '\u0916\u093e\u0924\u0947\u0926\u093e\u0930',
      '\u0916\u093e\u0924\u0947\u0926\u093e\u0930 \u0915\u0947 \u0928\u093e\u092e \u0926\u094d\u0935\u093e\u0930\u093e \u0916\u094b\u091c\u0947\u0902',
    ],
    subtitle:
      'Open the khatedar name flow and go deeper through the next search screen.',
    title:
      '\u0916\u093e\u0924\u0947\u0926\u093e\u0930 \u0915\u0947 \u0928\u093e\u092e \u0926\u094d\u0935\u093e\u0930\u093e \u0916\u094b\u091c\u0947\u0902',
  },
];

const KHASRA_MENU_ACTIONS: KhasraMenuAction[] = [
  {
    accentColor: '#2563eb',
    description:
      'Open the official khasra login flow from the ekhasra portal.',
    directUrl: EKHASRA_LOGIN_URL,
    exactLabels: ['खसरा लॉगिन'],
    icon: 'account-key-outline',
    id: 'login',
    keywords: ['खसरा लॉगिन', 'khasra login'],
    title: 'खसरा लॉगिन (Official)',
  },
  {
    accentColor: '#0f9d58',
    description:
      'Open the official khasra viewing flow from the ekhasra portal.',
    directUrl: EKHASRA_REPORT_URL,
    exactLabels: ['खसरा देखें'],
    icon: 'file-search-outline',
    id: 'view',
    keywords: ['खसरा देखें', 'khasra dekhe', 'khasra dekhen'],
    title: 'खसरा देखें (View Record)',
  },
];

const PORTAL_LOGIN_ACTIONS: PortalHomeAction[] = [
  {
    accentColor: '#2563eb',
    description:
      'Open the official khatoni login route from UP Bhulekh.',
    exactLabels: ['Khatoni Login', 'खतौनी लॉगिन'],
    id: 'khatoni-login',
    icon: 'account-key-outline',
    keywords: ['khatoni', 'khatauni', 'login', 'खतौनी', 'लॉगिन'],
    mode: 'open-live-route',
    title: 'Khatoni Login',
  },
  {
    accentColor: '#0f9d58',
    description:
      'Open the official RC-9 Lekhpal login page from RCCMS.',
    directUrl: UP_RCCMS_LEKHPAL_LOGIN_URL,
    exactLabels: ['Real Time Khatoni Login', 'रियल टाइम खतौनी लॉगिन'],
    id: 'real-time-khatoni-login',
    icon: 'clock-fast',
    keywords: [
      'real time',
      'realtime',
      'khatoni',
      'khatauni',
      'login',
      'रियल',
      'टाइम',
      'खतौनी',
      'लॉगिन',
    ],
    mode: 'open-live-route',
    title: 'RC-9 / Lekhpal Login',
  },
  {
    accentColor: '#7c3aed',
    description:
      'Open the official Varasat Aavedan login page from RCCMS.',
    directUrl: UP_VARASAT_LOGIN_URL,
    exactLabels: ['Varasat Aavedan', 'वरासत आवेदन'],
    id: 'varasat-login',
    icon: 'file-account-outline',
    keywords: [
      'varasat',
      'aavedan',
      'application',
      'mutation',
      'inheritance',
      'वरासत',
      'आवेदन',
    ],
    mode: 'open-live-route',
    title: 'Varasat Aavedan',
  },
  {
    accentColor: '#7c3aed',
    description:
      'Open the app-native khasra menu with direct official login and viewing flows.',
    id: 'khasra-portal',
    icon: 'map-search-outline',
    keywords: ['खसरा लॉगिन', 'खसरा देखें', 'khasra login', 'khasra dekhe'],
    mode: 'open-khasra-menu',
    title: 'Khasra',
  },
];

const PORTAL_PRIMARY_SERVICE_ACTIONS: PortalHomeAction[] = [
  {
    accentColor: '#0ea5e9',
    blockedKeywords: KHATAUNI_LOGIN_BLOCK_KEYWORDS,
    description:
      'View a copy of the Khatauni rights record through the official Bhulekh search flow.',
    exactLabels: [
      ...PRIMARY_ROUTE_EXACT_LABELS,
      '\u0916\u0924\u094c\u0928\u0940 (\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916) \u0915\u0940 \u0928\u0958\u0932 \u0926\u0947\u0916\u0947',
      '\u0916\u0924\u094c\u0928\u0940 (\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916) \u0915\u0940 \u0928\u0915\u093c\u0932 \u0926\u0947\u0916\u0947\u0902',
      'खतौनी (अधिकार अभिलेख) की नक़ल देखें',
      'खतौनी (अधिकार अभिलेख) की नक़ल देखे',
    ],
    id: 'khatoni-copy',
    icon: 'file-search-outline',
    keywords: [
      ...PRIMARY_LINK_KEYWORDS,
      'nakal',
      'नक़ल',
      'नकल',
      'अधिकार अभिलेख',
    ],
    mode: 'open-live-route',
    title: 'खतौनी (अधिकार अभिलेख) की नक़ल देखें',
  },
  {
    accentColor: '#f59e0b',
    description:
      'Get a certified Khatauni copy through the official online payment route.',
    exactLabels: [
      'ऑनलाइन पेमेंट द्वारा खतौनी की प्रमाणित प्रति प्राप्त करने के लिये यहाँ क्लिक करें',
    ],
    id: 'khatoni-online-payment',
    icon: 'credit-card-outline',
    keywords: [
      'online payment',
      'payment',
      'khatoni',
      'khatauni',
      'भुगतान',
      'ऑनलाइन',
      'खतौनी',
    ],
    mode: 'open-live-route',
    title:
      'ऑनलाइन पेमेंट द्वारा खतौनी की प्रमाणित प्रति प्राप्त करने के लिये यहाँ क्लिक करें',
  },
  {
    accentColor: '#ef4444',
    description:
      'Open the official bhukhand or gata vikray sthiti page.',
    exactLabels: [
      '\u092d\u0942\u0916\u0923\u094d\u0921/\u0917\u093e\u091f\u0947 \u0915\u0947 \u0935\u093f\u0915\u094d\u0930\u092f \u0915\u0940 \u0938\u094d\u0925\u093f\u0924\u093f \u091c\u093e\u0928\u0947',
    ],
    id: 'bhukhand-sale-status',
    icon: 'home-search-outline',
    keywords: [
      'bhukhand',
      'gata',
      'vikray',
      'sthiti',
      '\u0935\u093f\u0915\u094d\u0930\u092f',
      '\u092d\u0942\u0916\u0923\u094d\u0921',
      '\u0917\u093e\u091f\u0947',
      'भूखण्ड',
      'गाटा',
      'विक्रय',
      'स्थिति',
    ],
    mode: 'open-live-route',
    title:
      '\u092d\u0942\u0916\u0923\u094d\u0921/\u0917\u093e\u091f\u0947 \u0915\u0947 \u0935\u093f\u0915\u094d\u0930\u092f \u0915\u0940 \u0938\u094d\u0925\u093f\u0924\u093f \u091c\u093e\u0928\u0947',
  },
  {
    accentColor: '#8b5cf6',
    description:
      'Open the grast hone ke baad ki sthiti route from the official portal.',
    id: 'bhukhand-grast-status',
    icon: 'home-alert-outline',
    keywords: [
      'grast',
      'grast hone ke baad',
      'bhukhand',
      'gata',
      'स्थिति',
      'ग्रस्त',
      'भूखण्ड',
    ],
    mode: 'open-live-route',
    title:
      '\u092d\u0942\u0916\u0923\u094d\u0921/\u0917\u093e\u091f\u0947 \u0915\u0947 \u0935\u093e\u0926 \u0917\u094d\u0930\u0938\u094d\u0924 \u0939\u094b\u0928\u0947 \u0915\u0940 \u0938\u094d\u0925\u093f\u0924\u093f \u091c\u093e\u0928\u0947',
  },
  {
    accentColor: '#14b8a6',
    description:
      'Open the official code and unique code lookup route.',
    id: 'rajasva-gram-code',
    icon: 'barcode-scan',
    keywords: [
      'rajasva gram',
      'rajasav gram',
      'gram khatoni code',
      'unique code',
      'bhukhand',
      'gata',
      'राजस्व ग्राम',
      'कोड',
      'यूनिक',
    ],
    mode: 'open-live-route',
    title:
      '\u0930\u093e\u091c\u0938\u094d\u0935 \u0917\u094d\u0930\u093e\u092e \u0916\u0924\u094c\u0928\u0940 \u0915\u093e \u0915\u094b\u0921 \u0935 \u092d\u0942\u0916\u0923\u094d\u0921/\u0917\u093e\u091f\u0947 \u0915\u093e \u092f\u0942\u0928\u0940\u0915 \u0915\u094b\u0921 \u091c\u093e\u0928\u0947',
  },
];

const PORTAL_DIRECTORY_ACTIONS: PortalHomeAction[] = [
  {
    accentColor: '#2563eb',
    description:
      'Open the district list from the official Bhulekh portal.',
    id: 'district-directory',
    icon: 'office-building-marker-outline',
    keywords: ['district', 'jila', 'janpad', 'जिला', 'जनपद'],
    mode: 'open-live-route',
    title: '\u091c\u093f\u0932\u093e',
  },
  {
    accentColor: '#0f9d58',
    description:
      'Open the tehsil list from the official Bhulekh portal.',
    id: 'tehsil-directory',
    icon: 'map-marker-radius-outline',
    keywords: ['tehsil', 'tahsil', 'तहसील'],
    mode: 'open-live-route',
    title: '\u0924\u0939\u0938\u0940\u0932',
  },
  {
    accentColor: '#7c3aed',
    description:
      'Open the pargana list directly from the live portal.',
    id: 'pargana-directory',
    icon: 'map-legend',
    keywords: ['pargana', 'परगना'],
    mode: 'open-live-route',
    title: '\u092a\u0930\u0917\u0928\u093e',
  },
  {
    accentColor: '#f97316',
    description:
      'Open the official bhumi prakar ki suchi page.',
    exactLabels: [
      '\u092d\u0942\u092e\u093f \u092a\u094d\u0930\u0915\u093e\u0930 \u0915\u0940 \u0938\u0942\u091a\u0940',
    ],
    id: 'bhumi-prakar',
    icon: 'terrain',
    keywords: ['bhumi prakar', 'भूमि प्रकार', 'suchi', 'सूची'],
    mode: 'open-live-route',
    title:
      '\u092d\u0942\u092e\u093f \u092a\u094d\u0930\u0915\u093e\u0930 \u0915\u0940 \u0938\u0942\u091a\u0940',
  },
  {
    accentColor: '#ef4444',
    description:
      'Open the sarkari bhumi khoje route in the portal.',
    exactLabels: [
      '\u0938\u0930\u0915\u093e\u0930\u0940 \u092d\u0942\u092e\u093f \u0916\u094b\u091c\u0947\u0902',
    ],
    id: 'sarkari-bhumi',
    icon: 'shield-search-outline',
    keywords: ['sarkari bhumi', 'सरकारी भूमि', 'khoje', 'खोजे'],
    mode: 'open-live-route',
    title:
      '\u0938\u0930\u0915\u093e\u0930\u0940 \u092d\u0942\u092e\u093f \u0916\u094b\u091c\u0947\u0902',
  },
  {
    accentColor: '#06b6d4',
    description:
      'Open the Uttar Pradesh cyber security guideline page.',
    directUrl: UP_BHULEKH_CYBER_GUIDELINES_URL,
    id: 'cyber-guidelines',
    icon: 'shield-lock-outline',
    keywords: [
      'cyber security',
      'guideline',
      'guidelines',
      'साइबर',
      'गाइडलाइन',
    ],
    mode: 'open-live-route',
    title:
      '\u0909\u0924\u094d\u0924\u0930 \u092a\u094d\u0930\u0926\u0947\u0936 \u0938\u093e\u0907\u092c\u0930 \u0938\u093f\u0915\u094d\u092f\u094b\u0930\u093f\u091f\u0940 \u0917\u093e\u0907\u0921\u0932\u093e\u0907\u0928\u094d\u0938',
  },
];

const PORTAL_PRIMARY_SERVICE_ACTIONS_RESOLVED: PortalHomeAction[] =
  PORTAL_PRIMARY_SERVICE_ACTIONS.map((action, index) => {
    if (index === 0) {
      return {
        ...action,
        blockedKeywords: KHATAUNI_LOGIN_BLOCK_KEYWORDS,
        exactLabels: KHATAUNI_COPY_ROUTE_EXACT_LABELS,
        keywords: KHATAUNI_COPY_ROUTE_KEYWORDS,
        mode: 'open-live-route',
        title:
          '\u0916\u0924\u094c\u0928\u0940 (\u0905\u0927\u093f\u0915\u093e\u0930 \u0905\u092d\u093f\u0932\u0947\u0916) \u0915\u0940 \u0928\u0915\u0932 \u0926\u0947\u0916\u0947\u0902',
      };
    }

    if (index === 1) {
      return {
        ...action,
        exactLabels: [
          '\u0911\u0928\u0932\u093e\u0907\u0928 \u092a\u0947\u092e\u0947\u0902\u091f \u0926\u094d\u0935\u093e\u0930\u093e \u0916\u0924\u094c\u0928\u0940 \u0915\u0940 \u092a\u094d\u0930\u092e\u093e\u0923\u093f\u0924 \u092a\u094d\u0930\u0924\u093f \u092a\u094d\u0930\u093e\u092a\u094d\u0924 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u092f\u0947 \u092f\u0939\u093e\u0901 \u0915\u094d\u0932\u093f\u0915 \u0915\u0930\u0947\u0902',
          '\u0911\u0928\u0932\u093e\u0907\u0928 \u092a\u0947\u092e\u0947\u0928\u094d\u091f \u0926\u094d\u0935\u093e\u0930\u093e \u0916\u0924\u094c\u0928\u0940 \u0915\u0940 \u092a\u094d\u0930\u092e\u093e\u0923\u093f\u0924 \u092a\u094d\u0930\u0924\u093f \u092a\u094d\u0930\u093e\u092a\u094d\u0924 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u092f\u0947 \u092f\u0939\u093e\u0901 \u0915\u094d\u0932\u093f\u0915 \u0915\u0930\u0947\u0902',
        ],
        keywords: [
          'online payment',
          'payment',
          'khatoni',
          'khatauni',
          'certified copy',
          '\u092a\u094d\u0930\u092e\u093e\u0923\u093f\u0924',
          '\u0911\u0928\u0932\u093e\u0907\u0928',
          '\u0916\u0924\u094c\u0928\u0940',
        ],
        title:
          '\u0911\u0928\u0932\u093e\u0907\u0928 \u092a\u0947\u092e\u0947\u0902\u091f \u0926\u094d\u0935\u093e\u0930\u093e \u0916\u0924\u094c\u0928\u0940 \u0915\u0940 \u092a\u094d\u0930\u092e\u093e\u0923\u093f\u0924 \u092a\u094d\u0930\u0924\u093f \u092a\u094d\u0930\u093e\u092a\u094d\u0924 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u092f\u0947 \u092f\u0939\u093e\u0901 \u0915\u094d\u0932\u093f\u0915 \u0915\u0930\u0947\u0902',
      };
    }

    return action;
  });

const normalize = (value: string) => value.toLowerCase();

const matchesKeywords = (value: string, keywords: string[]) => {
  const normalizedValue = normalize(value);

  return keywords.some(keyword =>
    normalizedValue.includes(keyword.toLowerCase()),
  );
};

const CHOOSE_FIELD_LABEL_KEYWORDS = [
  'choose',
  'select',
  'chune',
  '\u091a\u0941\u0928\u0947\u0902',
  '\u091a\u0941\u0928\u0947',
  'चुनें',
  'चुने',
];

const getSearchWorkflowId = (
  value: string,
): SearchWorkflowId | null => {
  const matchedWorkflow = SEARCH_WORKFLOW_OPTIONS.find(workflow =>
    matchesKeywords(value, workflow.keywords),
  );

  return matchedWorkflow?.id || null;
};

const buildAttributeSelector = (
  attribute: string,
  key: string,
) => `[${attribute}=${JSON.stringify(key)}]`;

const getFieldDisplayValue = (field: PortalField) => {
  const option = field.options.find(
    currentOption => currentOption.value === field.value,
  );

  return option?.label || field.value;
};

const getFieldKeywordText = (field: PortalField) =>
  [
    field.label,
    ...field.options
      .slice(0, 16)
      .map(option => option.label),
  ].join(' ');

const fieldMatchesKeywords = (
  field: PortalField,
  keywords: string[],
) => matchesKeywords(getFieldKeywordText(field), keywords);

const fieldLabelMatchesKeywords = (
  field: PortalField,
  keywords: string[],
) => matchesKeywords(field.label, keywords);

const fieldLooksLikeServiceMenu = (field: PortalField) =>
  fieldMatchesKeywords(field, SERVICE_MENU_KEYWORDS);

const hasAlphabetOptions = (field: PortalField) =>
  field.options.filter(option => {
    const label = option.label.trim();
    return label.length > 0 && label.length <= 3;
  }).length >= 8;

const getFieldPriority = (field: PortalField) => {
  let score = 0;
  const normalizedLabel = normalize(field.label.trim());
  const stageMatchCount = [
    fieldLabelMatchesKeywords(field, DISTRICT_KEYWORDS),
    fieldLabelMatchesKeywords(field, TEHSIL_KEYWORDS),
    fieldLabelMatchesKeywords(field, VILLAGE_KEYWORDS),
    fieldLabelMatchesKeywords(field, FIRST_LETTER_KEYWORDS),
  ].filter(Boolean).length;

  if (fieldLabelMatchesKeywords(field, DISTRICT_KEYWORDS)) {
    score += 50;
  }

  if (fieldLabelMatchesKeywords(field, TEHSIL_KEYWORDS)) {
    score += 45;
  }

  if (fieldLabelMatchesKeywords(field, VILLAGE_KEYWORDS)) {
    score += 40;
  }

  if (fieldLabelMatchesKeywords(field, FIRST_LETTER_KEYWORDS)) {
    score += 35;
  }

  if (fieldMatchesKeywords(field, SEARCH_MODE_KEYWORDS)) {
    score += 10;
  }

  if (fieldLabelMatchesKeywords(field, CHOOSE_FIELD_LABEL_KEYWORDS)) {
    score += 18;
  }

  if (normalizedLabel.includes('back')) {
    score -= 60;
  }

  if (normalizedLabel === 'options' || normalizedLabel === 'select') {
    score -= 45;
  }

  if (stageMatchCount > 1) {
    score -= (stageMatchCount - 1) * 55;
  }

  return score - field.label.length * 0.01;
};

type LocationFieldStage =
  | 'district'
  | 'tehsil'
  | 'village'
  | 'firstLetter';

const getLocationFieldStageScore = (
  field: PortalField,
  stage: LocationFieldStage,
) => {
  const labelHasDistrict = fieldLabelMatchesKeywords(
    field,
    DISTRICT_KEYWORDS,
  );
  const labelHasTehsil = fieldLabelMatchesKeywords(
    field,
    TEHSIL_KEYWORDS,
  );
  const labelHasVillage = fieldLabelMatchesKeywords(
    field,
    VILLAGE_KEYWORDS,
  );
  const labelHasFirstLetter = fieldLabelMatchesKeywords(
    field,
    FIRST_LETTER_KEYWORDS,
  );
  const hasChooseLabel = fieldLabelMatchesKeywords(
    field,
    CHOOSE_FIELD_LABEL_KEYWORDS,
  );
  const normalizedLabel = normalize(field.label.trim());
  const labelStageCount = [
    labelHasDistrict,
    labelHasTehsil,
    labelHasVillage,
    labelHasFirstLetter,
  ].filter(Boolean).length;

  let score = field.type === 'click' ? 12 : 0;

  if (hasChooseLabel) {
    score += 24;
  }

  if (normalizedLabel.includes('back')) {
    score -= 140;
  }

  if (normalizedLabel === 'options' || normalizedLabel === 'select') {
    score -= 100;
  }

  if (labelStageCount > 1) {
    score -= (labelStageCount - 1) * 95;
  }

  if (hasAlphabetOptions(field)) {
    score += stage === 'firstLetter' ? 80 : -90;
  }

  if (stage === 'district') {
    if (labelHasDistrict) {
      score += 160;
    }
    if (field.options.length >= 40) {
      score += 25;
    }
    if (field.options.length >= 70) {
      score += 10;
    }
  }

  if (stage === 'tehsil') {
    if (labelHasTehsil) {
      score += 160;
    }
    if (field.options.length >= 2) {
      score += 15;
    }
  }

  if (stage === 'village' && labelHasVillage) {
    score += 160;
  }

  if (stage === 'firstLetter' && labelHasFirstLetter) {
    score += 160;
  }

  if (stage !== 'district' && labelHasDistrict) {
    score -= 70;
  }

  if (stage !== 'tehsil' && labelHasTehsil) {
    score -= 70;
  }

  if (stage !== 'village' && labelHasVillage) {
    score -= 70;
  }

  if (stage !== 'firstLetter' && labelHasFirstLetter) {
    score -= 70;
  }

  return score;
};

const getLocationFieldCandidates = (
  fields: PortalField[],
  stage: LocationFieldStage,
  excludedKeys: string[] = [],
) =>
  fields
    .filter(field => !excludedKeys.includes(field.key))
    .filter(field => {
      if (stage === 'district') {
        return !hasAlphabetOptions(field) && field.options.length >= 10;
      }

      if (stage === 'tehsil') {
        return !hasAlphabetOptions(field) && field.options.length >= 2;
      }

      if (stage === 'village') {
        return !hasAlphabetOptions(field) && field.options.length >= 1;
      }

      return (
        hasAlphabetOptions(field) ||
        fieldLabelMatchesKeywords(field, FIRST_LETTER_KEYWORDS)
      );
    })
    .sort((leftField, rightField) => {
      const scoreDifference =
        getLocationFieldStageScore(rightField, stage) -
        getLocationFieldStageScore(leftField, stage);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return rightField.options.length - leftField.options.length;
    });

const pickBestLocationField = (
  fields: PortalField[],
  stage: LocationFieldStage,
  excludedKeys: string[] = [],
) => getLocationFieldCandidates(fields, stage, excludedKeys)[0];

const dedupePortalFields = (fields: PortalField[]) => {
  const uniqueFields = new Map<string, PortalField>();

  fields.forEach(field => {
    const signature = [
      field.type,
      field.options.length,
      field.options
        .slice(0, 12)
        .map(option => normalize(option.label.trim()))
        .join('|'),
    ].join('::');

    const existingField = uniqueFields.get(signature);

    if (
      !existingField ||
      getFieldPriority(field) > getFieldPriority(existingField)
    ) {
      uniqueFields.set(signature, field);
    }
  });

  return [...uniqueFields.values()];
};

const isUsefulPortalOption = (label: string) => {
  const normalizedLabel = normalize(label.trim());

  if (!normalizedLabel) {
    return false;
  }

  return !NON_FLOW_OPTION_KEYWORDS.some(keyword =>
    normalizedLabel.includes(keyword),
  );
};

const getCleanPortalOptions = (field?: PortalField | null) =>
  field
    ? field.options.filter(option =>
        isUsefulPortalOption(option.label),
      )
    : [];

const UP_BHULEKH_ASSISTANT_SCRIPT = `
  (function () {
    if (window.__RN_BHULEKH_ASSISTANT__) {
      window.__RN_BHULEKH_ASSISTANT__.sync();
      true;
    } else {
      var clean = function (value) {
        return (value || '').replace(/\\s+/g, ' ').trim();
      };

      var matchesAssistantKeywords = function (value) {
        return /district|jila|janpad|tehsil|tahsil|village|gram|gaon|first letter|first character|pehla|khata|khasra|gata|code|name|search|unique|जिला|जनपद|तहसील|ग्राम|गांव|गाँव|अक्षर|खाता|खसरा|गाटा|कोड|नाम|खोज|खोजें|यूनिक|संख्या/i.test(
          clean(value).toLowerCase()
        );
      };

      var looksLikeServiceMenu = function (value) {
        return /complaint|registry|stamp|litigation|guideline|guidelines|pargana|शिकायत|स्टाम्प|रजिस्ट्री|राजस्व वाद|परगना|भूमि प्रकार|सरकारी भूमि|साइबर|गाइडलाइन|डीआईएलआरएमपी|ई\\s*-\\s*डिस्ट्रिक्ट|ई-डिस्ट्रिक्ट/i.test(
          clean(value).toLowerCase()
        );
      };

      var assistantKeywords = ${JSON.stringify(
        ASSISTANT_MATCH_KEYWORDS,
      )};
      var primaryRouteKeywords = ${JSON.stringify(
        PRIMARY_LINK_KEYWORDS,
      )};
      var primaryRouteExactLabels = ${JSON.stringify(
        PRIMARY_ROUTE_EXACT_LABELS,
      )};
      var serviceMenuKeywords = ${JSON.stringify(
        SERVICE_MENU_KEYWORDS,
      )};
      window.__RN_BHULEKH_AUTO_ROUTE_ENABLED__ =
        window.__RN_BHULEKH_AUTO_ROUTE_ENABLED__ === true;

      var keywordMatch = function (value, keywords) {
        var normalizedValue = clean(value).toLowerCase();

        return keywords.some(function (keyword) {
          return (
            normalizedValue.indexOf(
              clean(keyword).toLowerCase()
            ) !== -1
          );
        });
      };

      matchesAssistantKeywords = function (value) {
        return keywordMatch(value, assistantKeywords);
      };

      looksLikeServiceMenu = function (value) {
        return keywordMatch(value, serviceMenuKeywords);
      };

      var forceInAppNavigation = function (url) {
        var normalizedUrl = clean(url);

        if (
          !normalizedUrl ||
          normalizedUrl === '#' ||
          normalizedUrl.toLowerCase().indexOf('javascript:') === 0
        ) {
          return false;
        }

        window.location.assign(normalizedUrl);
        return true;
      };

      var normalizePortalLinkTargets = function () {
        Array.prototype.forEach.call(
          document.querySelectorAll('a[target], form[target]'),
          function (element) {
            var target = clean(
              element.getAttribute('target') || ''
            ).toLowerCase();

            if (target && target !== '_self') {
              element.setAttribute('target', '_self');
            }
          }
        );
      };

      var originalWindowOpen = window.open;
      window.open = function (url) {
        if (forceInAppNavigation(url)) {
          return window;
        }

        if (typeof originalWindowOpen === 'function') {
          return originalWindowOpen.apply(window, arguments);
        }

        return null;
      };

      document.addEventListener(
        'click',
        function (event) {
          var clickedElement = event.target;

          if (
            !clickedElement ||
            typeof clickedElement.closest !== 'function'
          ) {
            return;
          }

          var anchor = clickedElement.closest('a[href]');
          if (!anchor) {
            return;
          }

          var href = anchor.href || anchor.getAttribute('href');
          var target = clean(
            anchor.getAttribute('target') || ''
          ).toLowerCase();

          if (target && target !== '_self') {
            anchor.setAttribute('target', '_self');
          }

          if (target === '_blank' && href) {
            event.preventDefault();
            forceInAppNavigation(href);
          }
        },
        true
      );

      var applyEmbeddedSkin = function () {
        var styleId = 'rn-land-records-embedded-skin';
        var styleElement = document.getElementById(styleId);

        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = styleId;
          styleElement.textContent = [
            'html, body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }',
            'header, footer, iframe, .adsbygoogle, .google-auto-placed { display: none !important; }',
            '[id*="google_ads"], [class*="google_ads"], [id*="advert"], [class*="advert"], [id*="ads"], [class*="ads"] { display: none !important; }',
            '[id*="footer"], [class*="footer"], [id*="navbar"], [class*="navbar"], [id*="brand"], [class*="brand"], [id*="logo"], [class*="logo"] { display: none !important; }',
            'body > div, body > section, body > header, body > nav { max-width: 100% !important; }',
            'table, .table, [role="table"] { width: 100% !important; }',
          ].join('\\n');

          (document.head || document.documentElement).appendChild(
            styleElement
          );
        }

        Array.prototype.forEach.call(
          document.querySelectorAll(
            'div, section, nav, aside, p, span, strong, h1, h2, h3, h4'
          ),
          function (element) {
            var text = clean(element.textContent).toLowerCase();

            if (!text) {
              return;
            }

            var shouldHide =
              text.indexOf('राजस्व परिषद') !== -1 ||
              text.indexOf('उत्तर प्रदेश सरकार') !== -1 ||
              text.indexOf('revenue board') !== -1 ||
              text.indexOf('blinkit') !== -1 ||
              text.indexOf('flat 50 off') !== -1;

            if (!shouldHide) {
              return;
            }

            var block =
              element.closest('header, nav, section, aside, div') ||
              element;

            if (!block || !block.style) {
              return;
            }

            if (
              block.getBoundingClientRect &&
              block.getBoundingClientRect().height >
                window.innerHeight * 0.55
            ) {
              return;
            }

            block.style.setProperty('display', 'none', 'important');
          }
        );
      };

      var optimizePortalSearchLayout = function () {
        var keypadSelectors = 'table, [role="table"], div';
        var keypadCandidates = Array.prototype.filter.call(
          document.querySelectorAll(keypadSelectors),
          function (element) {
            if (!isVisible(element)) {
              return false;
            }

            var text = clean(element.textContent).toLowerCase();
            return (
              text.indexOf('0') !== -1 &&
              text.indexOf('1') !== -1 &&
              text.indexOf('8') !== -1 &&
              text.indexOf('9') !== -1 &&
              (text.indexOf('clear') !== -1 ||
                text.indexOf('खोजें') !== -1 ||
                text.indexOf('khoje') !== -1 ||
                text.indexOf('कोड') !== -1)
            );
          }
        );

        keypadCandidates.forEach(function (candidate) {
          var current = candidate;
          var depth = 0;

          while (current && depth < 6) {
            if (current.style) {
              current.style.setProperty(
                'overflow',
                'visible',
                'important'
              );
              current.style.setProperty(
                'height',
                'auto',
                'important'
              );
              current.style.setProperty(
                'max-height',
                'none',
                'important'
              );
              current.style.setProperty(
                'min-height',
                '0',
                'important'
              );
            }

            current = current.parentElement;
            depth += 1;
          }

          if (candidate.style) {
            candidate.style.setProperty(
              'width',
              '100%',
              'important'
            );
            candidate.style.setProperty(
              'table-layout',
              'fixed',
              'important'
            );
          }

          Array.prototype.forEach.call(
            candidate.querySelectorAll(
              'table, tbody, tr, td, th, button, input[type="button"], input[type="submit"], a'
            ),
            function (cell) {
              if (!cell.style) {
                return;
              }

              cell.style.setProperty(
                'overflow',
                'visible',
                'important'
              );

              var tagName = (
                cell.tagName || ''
              ).toLowerCase();

              if (
                tagName === 'table' ||
                tagName === 'tbody' ||
                tagName === 'tr'
              ) {
                cell.style.setProperty(
                  'height',
                  'auto',
                  'important'
                );
                cell.style.setProperty(
                  'min-height',
                  '0',
                  'important'
                );
                cell.style.setProperty(
                  'max-height',
                  'none',
                  'important'
                );
                return;
              }

              cell.style.setProperty(
                'height',
                'auto',
                'important'
              );
              cell.style.setProperty(
                'min-height',
                '44px',
                'important'
              );
              cell.style.setProperty(
                'line-height',
                '1.2',
                'important'
              );
            }
          );
        });

        if (keypadCandidates.length && document.body) {
          document.body.style.setProperty(
            'padding-bottom',
            '28px',
            'important'
          );
        }
      };

      var isVisible = function (element) {
        if (!element) {
          return false;
        }

        var style = window.getComputedStyle(element);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden'
        ) {
          return false;
        }

        var rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      var getLabel = function (element, fallback) {
        if (!element) {
          return fallback || 'Field';
        }

        if (element.id) {
          var labelByFor = Array.prototype.find.call(
            document.querySelectorAll('label'),
            function (label) {
              return label.getAttribute('for') === element.id;
            }
          );

          if (labelByFor) {
            return clean(labelByFor.textContent) || fallback || 'Field';
          }
        }

        var tableRow = element.closest('tr');
        if (tableRow) {
          var rowLabel = tableRow.querySelector('th, td');
          if (rowLabel && !rowLabel.contains(element)) {
            var rowText = clean(rowLabel.textContent);
            if (rowText) {
              return rowText;
            }
          }
        }

        var previous = element.previousElementSibling;
        if (previous) {
          var previousText = clean(previous.textContent);
          if (previousText) {
            return previousText;
          }
        }

        var parent = element.parentElement;
        while (parent) {
          var label = parent.querySelector('label');
          if (label && !label.contains(element)) {
            var parentText = clean(label.textContent);
            if (parentText) {
              return parentText;
            }
          }
          parent = parent.parentElement;
        }

        return (
          clean(
            element.getAttribute('aria-label') ||
              element.getAttribute('placeholder') ||
              element.name ||
              element.id
          ) ||
          fallback ||
          'Field'
        );
      };

      var getText = function (element) {
        return clean(
          element.innerText ||
            element.textContent ||
            element.value ||
            ''
        );
      };

      var getContainerLabel = function (element, fallback) {
        if (!element) {
          return fallback || 'Options';
        }

        var previous = element.previousElementSibling;
        while (previous) {
          var previousText = clean(previous.textContent);
          if (previousText && previousText.length < 80) {
            return previousText;
          }
          previous = previous.previousElementSibling;
        }

        var parent = element.parentElement;
        while (parent) {
          var heading = Array.prototype.find.call(
            parent.querySelectorAll('h1, h2, h3, h4, th, strong, b, caption'),
            function (candidate) {
              return (
                isVisible(candidate) &&
                candidate !== element &&
                clean(candidate.textContent)
              );
            }
          );

          if (heading) {
            return clean(heading.textContent);
          }

          parent = parent.parentElement;
        }

        return fallback || 'Options';
      };

      var isLikelySelectedOption = function (element) {
        if (!element) {
          return false;
        }

        var className = (
          element.className &&
          typeof element.className === 'string'
        )
          ? element.className.toLowerCase()
          : '';

        var attributes = (
          clean(element.getAttribute('aria-selected')) +
          ' ' +
          clean(element.getAttribute('aria-current')) +
          ' ' +
          clean(element.getAttribute('class'))
        ).toLowerCase();

        if (
          element.getAttribute('data-rn-click-selected') === 'true' ||
          attributes.indexOf('true') !== -1 ||
          className.indexOf('active') !== -1 ||
          className.indexOf('selected') !== -1 ||
          className.indexOf('current') !== -1
        ) {
          return true;
        }

        var style = window.getComputedStyle(element);
        return (
          style.fontWeight === '700' ||
          style.fontWeight === '800' ||
          style.fontWeight === '900'
        );
      };

      var buildClickableGroups = function () {
        var containers = Array.prototype.slice.call(
          document.querySelectorAll(
            'div, section, td, ul, ol, nav, table'
          )
        );
        var groups = [];
        var seenKeys = {};
        var assignedClickElements = [];

        containers.reverse();

        Array.prototype.forEach.call(containers, function (container, containerIndex) {
          if (!isVisible(container)) {
            return;
          }

          var clickableElements = Array.prototype.filter.call(
            container.querySelectorAll(
              'a, button, input[type="button"], input[type="submit"], [role="button"], [onclick], li, td'
            ),
            function (element) {
              if (!isVisible(element)) {
                return false;
              }

              if (assignedClickElements.indexOf(element) !== -1) {
                return false;
              }

              var label = getText(element);
              return Boolean(label) && label.length <= 40;
            }
          );

          if (
            clickableElements.length < 3 ||
            clickableElements.length > 400
          ) {
            return;
          }

          var optionLabels = clickableElements
            .map(function (element) {
              return getText(element);
            })
            .filter(Boolean);

          var uniqueLabels = optionLabels.filter(function (label, index) {
            return optionLabels.indexOf(label) === index;
          });

          if (uniqueLabels.length < 3) {
            return;
          }

          var groupLabel = getContainerLabel(
            container,
            'Options'
          );
          var normalizedGroupLabel = groupLabel.toLowerCase();
          var looksRelevant =
            /district|jila|janpad|tehsil|tahsil|village|gram|gaon|first letter|pehla|khata|khasra|gata|code|name|जिला|जनपद|तहसील|ग्राम|खसरा|नाम|कोड|पहला/.test(
              normalizedGroupLabel
            ) ||
            uniqueLabels.length >= 10;
          var combinedText = clean(
            groupLabel + ' ' + uniqueLabels.join(' ')
          );
          var looksAlphabetGrid =
            uniqueLabels.filter(function (label) {
              var trimmedLabel = clean(label);
              return trimmedLabel.length > 0 && trimmedLabel.length <= 3;
            }).length >= 8;
          looksRelevant =
            matchesAssistantKeywords(combinedText) ||
            looksAlphabetGrid;

          if (
            !looksRelevant ||
            looksLikeServiceMenu(combinedText)
          ) {
            return;
          }

          var groupKey = 'click-group-' + containerIndex;
          if (seenKeys[groupKey]) {
            return;
          }
          seenKeys[groupKey] = true;

          var selectedValue = '';
          var options = clickableElements.map(function (element, optionIndex) {
            var optionValue = groupKey + '-option-' + optionIndex;
            element.setAttribute('data-rn-click-group', groupKey);
            element.setAttribute('data-rn-click-value', optionValue);
            assignedClickElements.push(element);

            if (!selectedValue && isLikelySelectedOption(element)) {
              selectedValue = optionValue;
            }

            return {
              label: getText(element),
              value: optionValue,
            };
          });

          groups.push({
            key: groupKey,
            label: groupLabel,
            options: options,
            type: 'click',
            value: selectedValue,
          });
        });

        return groups;
      };

      var primaryRouteKeywords = [
        'bhulekh',
        'copy of khatauni',
        'khatauni',
        'adhikar',
        'भूलेख',
        'अधिकार',
        'खतौनी',
        'अभिलेख',
        'अधिकार',
        'खतौनी',
        'अभिलेख'
      ];

      var matchesPrimaryRoute = function (value) {
        var normalizedValue = clean(value).toLowerCase();
        return primaryRouteKeywords.some(function (keyword) {
          return normalizedValue.indexOf(keyword.toLowerCase()) !== -1;
        });
      };

      var findPrimaryRouteElement = function () {
        var candidates = document.querySelectorAll(
          'a, button, input[type="button"], input[type="submit"], [role="button"]'
        );

        var matchedCandidate = Array.prototype.find.call(
          candidates,
          function (element) {
            if (!isVisible(element)) {
              return false;
            }

            return matchesPrimaryRoute(getText(element));
          }
        );

        if (matchedCandidate) {
          return matchedCandidate;
        }

        var labelledElement = Array.prototype.find.call(
          document.querySelectorAll(
            'h1, h2, h3, h4, strong, span, div'
          ),
          function (element) {
            if (!isVisible(element)) {
              return false;
            }

            return matchesPrimaryRoute(getText(element));
          }
        );

        if (!labelledElement) {
          return null;
        }

        if (typeof labelledElement.closest === 'function') {
          var wrappedClickable = labelledElement.closest(
            'a, button, [role="button"]'
          );
          if (wrappedClickable && isVisible(wrappedClickable)) {
            return wrappedClickable;
          }
        }

        var nestedClickable = labelledElement.querySelector(
          'a, button, [role="button"]'
        );
        if (nestedClickable && isVisible(nestedClickable)) {
          return nestedClickable;
        }

        var parentClickable = labelledElement.parentElement
          ? labelledElement.parentElement.querySelector(
              'a, button, [role="button"]'
            )
          : null;

        if (parentClickable && isVisible(parentClickable)) {
          return parentClickable;
        }

        return null;
      };

      primaryRouteKeywords = ${JSON.stringify(
        PRIMARY_LINK_KEYWORDS,
      )};

      var resolveRouteClickTarget = function (element) {
        if (!element || !isVisible(element)) {
          return null;
        }

        var clickableSelector =
          'a, button, input[type="button"], input[type="submit"], [role="button"], [onclick]';

        if (
          element.matches &&
          element.matches(clickableSelector)
        ) {
          return element;
        }

        if (typeof element.closest === 'function') {
          var closestClickable = element.closest(
            clickableSelector
          );
          if (closestClickable && isVisible(closestClickable)) {
            return closestClickable;
          }
        }

        var nestedClickable = element.querySelector
          ? element.querySelector(clickableSelector)
          : null;
        if (nestedClickable && isVisible(nestedClickable)) {
          return nestedClickable;
        }

        return element;
      };

      var isRouteTargetClickable = function (element) {
        if (!element) {
          return false;
        }

        var clickableSelector =
          'a, button, input[type="button"], input[type="submit"], [role="button"], [onclick]';

        if (
          element.matches &&
          element.matches(clickableSelector)
        ) {
          return true;
        }

        return Boolean(
          clean(element.getAttribute('href') || '') ||
            clean(element.getAttribute('onclick') || '')
        );
      };

      var triggerElementClick = function (element) {
        var target = resolveRouteClickTarget(element);
        if (!target) {
          return false;
        }

        var initialUrl = window.location.href;
        var targetHref =
          (target.href && clean(target.href)) ||
          clean(target.getAttribute('href') || '');
        var targetWindow = clean(
          target.getAttribute('target') || ''
        ).toLowerCase();

        if (targetWindow && targetWindow !== '_self') {
          target.setAttribute('target', '_self');
        }

        ['pointerdown', 'mousedown', 'touchstart', 'mouseup', 'touchend', 'click'].forEach(
          function (eventName) {
            try {
              var event = new MouseEvent(eventName, {
                bubbles: true,
                cancelable: true,
                view: window,
              });
              target.dispatchEvent(event);
            } catch (error) {}
          }
        );

        if (typeof target.click === 'function') {
          target.click();
        }

        setTimeout(function () {
          if (
            targetHref &&
            window.location.href === initialUrl
          ) {
            forceInAppNavigation(targetHref);
          }
        }, 120);

        return true;
      };

      var getPrimaryRouteScore = function (value) {
        var normalizedValue = clean(value).toLowerCase();
        if (!normalizedValue) {
          return -1;
        }

        var exactScore = primaryRouteExactLabels.reduce(
          function (score, label) {
            var normalizedLabel = clean(label).toLowerCase();
            if (
              normalizedLabel &&
              normalizedValue.indexOf(normalizedLabel) !== -1
            ) {
              return score + 100;
            }

            return score;
          },
          0
        );

        var keywordScore = primaryRouteKeywords.reduce(
          function (score, keyword) {
            var normalizedKeyword = clean(keyword).toLowerCase();
            if (
              normalizedKeyword &&
              normalizedValue.indexOf(normalizedKeyword) !== -1
            ) {
              return score + 10;
            }

            return score;
          },
          0
        );

        return exactScore + keywordScore;
      };

      matchesPrimaryRoute = function (value) {
        return getPrimaryRouteScore(value) > 0;
      };

      findPrimaryRouteElement = function () {
        var bestElement = null;
        var bestScore = -1;

        Array.prototype.forEach.call(
          document.querySelectorAll(
            'a, button, input[type="button"], input[type="submit"], [role="button"], [onclick], div, span, li, td, p, h1, h2, h3, h4'
          ),
          function (element) {
            if (!isVisible(element)) {
              return;
            }

            var text = getText(element);
            if (!text || text.length > 1200) {
              return;
            }

            if (looksLikeServiceMenu(text)) {
              return;
            }

            var score = getPrimaryRouteScore(text);
            if (score <= bestScore) {
              return;
            }

            bestScore = score;
            bestElement = element;
          }
        );

        return resolveRouteClickTarget(bestElement);
      };

      var getKeywordRouteScore = function (
        value,
        keywords,
        exactLabels
      ) {
        var normalizedValue = clean(value).toLowerCase();
        if (!normalizedValue) {
          return -1;
        }

        var exactScore = (exactLabels || []).reduce(
          function (score, label) {
            var normalizedLabel = clean(label).toLowerCase();
            if (
              normalizedLabel &&
              normalizedValue.indexOf(normalizedLabel) !== -1
            ) {
              return score + 100;
            }

            return score;
          },
          0
        );

        var keywordScore = (keywords || []).reduce(
          function (score, keyword) {
            var normalizedKeyword = clean(keyword).toLowerCase();
            if (
              normalizedKeyword &&
              normalizedValue.indexOf(normalizedKeyword) !== -1
            ) {
              return score + 10;
            }

            return score;
          },
          0
        );

        return exactScore + keywordScore;
      };

      var matchesBlockedRoute = function (
        value,
        blockedKeywords
      ) {
        var normalizedValue = clean(value).toLowerCase();
        if (!normalizedValue) {
          return false;
        }

        return (blockedKeywords || []).some(function (keyword) {
          var normalizedKeyword = clean(keyword).toLowerCase();
          return (
            normalizedKeyword &&
            normalizedValue.indexOf(normalizedKeyword) !== -1
          );
        });
      };

      var findRouteElementByKeywords = function (
        keywords,
        exactLabels,
        blockedKeywords
      ) {
        var exactMatchElement = null;
        var exactMatchScore = -1;

        if (exactLabels && exactLabels.length) {
          Array.prototype.forEach.call(
            document.querySelectorAll(
              'a, button, input[type="button"], input[type="submit"], [role="button"], [onclick], div, span, li, td, p, h1, h2, h3, h4'
            ),
            function (element) {
              if (!isVisible(element)) {
                return;
              }

              var text = getText(element);
              if (!text || text.length > 1200) {
                return;
              }

              if (matchesBlockedRoute(text, blockedKeywords)) {
                return;
              }

              var elementScore = (exactLabels || []).reduce(function (
                score,
                label
              ) {
                var normalizedLabel = clean(label).toLowerCase();
                var normalizedText = clean(text).toLowerCase();

                if (!normalizedLabel) {
                  return score;
                }

                if (normalizedText === normalizedLabel) {
                  return Math.max(score, 400);
                }

                if (
                  normalizedText.indexOf(normalizedLabel) !== -1
                ) {
                  return Math.max(score, 220);
                }

                return score;
              }, -1);

              if (elementScore < 0) {
                return;
              }

              var target = resolveRouteClickTarget(element);
              if (isRouteTargetClickable(target)) {
                elementScore += 80;
              } else if (target && target !== element) {
                elementScore += 30;
              } else {
                elementScore -= 40;
              }

              if (elementScore <= exactMatchScore) {
                return;
              }

              exactMatchScore = elementScore;
              exactMatchElement = target;
            }
          );
        }

        if (exactMatchElement) {
          return exactMatchElement;
        }

        var bestElement = null;
        var bestScore = -1;

        Array.prototype.forEach.call(
          document.querySelectorAll(
            'a, button, input[type="button"], input[type="submit"], [role="button"], [onclick], div, span, li, td, p, h1, h2, h3, h4'
          ),
          function (element) {
            if (!isVisible(element)) {
              return;
            }

            var text = getText(element);
            if (!text || text.length > 1200) {
              return;
            }

            if (matchesBlockedRoute(text, blockedKeywords)) {
              return;
            }

            var score = getKeywordRouteScore(
              text,
              keywords,
              exactLabels
            );

            if (score <= bestScore) {
              return;
            }

            bestScore = score;
            bestElement = element;
          }
        );

        return resolveRouteClickTarget(bestElement);
      };

      var buildParsedResult = function () {
        var bodyText = clean(document.body ? document.body.innerText : '');
        var keywordPattern =
          /khata|khasra|gata|owner|village|tehsil|district|khatauni|खाता|खसरा|गाटा|खातेदार|ग्राम|तहसील|जिला|खतौनी/i;

        keywordPattern =
          /khata|khasra|gata|owner|village|tehsil|district|khatauni|खाता|खसरा|गाटा|खातेदार|ग्राम|तहसील|जिला|जनपद|खतौनी/i;

        keywordPattern = {
          test: function (value) {
            return (
              matchesAssistantKeywords(value) ||
              matchesPrimaryRoute(value)
            );
          },
        };

        var summaryLines = [];

        Array.prototype.forEach.call(
          document.querySelectorAll('h1, h2, h3, h4, p, li, caption'),
          function (element) {
            if (!isVisible(element)) {
              return;
            }

            var text = clean(element.textContent).slice(0, 180);
            if (!text) {
              return;
            }

            if (
              summaryLines.indexOf(text) === -1 &&
              (keywordPattern.test(text) || summaryLines.length < 3)
            ) {
              summaryLines.push(text);
            }
          }
        );

        var tables = Array.prototype.map
          .call(document.querySelectorAll('table'), function (table) {
            if (!isVisible(table)) {
              return null;
            }

            var rows = Array.prototype.map
              .call(table.querySelectorAll('tr'), function (row) {
                var cells = Array.prototype.map
                  .call(row.querySelectorAll('th, td'), function (cell) {
                    return clean(cell.textContent).slice(0, 120);
                  })
                  .filter(Boolean)
                  .slice(0, 5);

                return cells;
              })
              .filter(function (row) {
                return row.length > 0;
              })
              .slice(0, 8);

            if (rows.length < 2) {
              return null;
            }

            return rows;
          })
          .filter(Boolean)
          .slice(0, 3);

        var title = clean(document.title);

        var heading = Array.prototype.find.call(
          document.querySelectorAll('h1, h2, h3, h4'),
          function (element) {
            return isVisible(element) && clean(element.textContent);
          }
        );

        if (heading) {
          title = clean(heading.textContent);
        }

        return {
          looksLikeResult:
            keywordPattern.test(bodyText) && tables.length > 0,
          summaryLines: summaryLines.slice(0, 8),
          tables: tables,
          title: title,
        };
      };

      var sendSnapshot = function () {
        try {
          normalizePortalLinkTargets();
          applyEmbeddedSkin();
          optimizePortalSearchLayout();

          var clickableGroups = buildClickableGroups();

          var selects = Array.prototype.map
            .call(document.querySelectorAll('select'), function (element, index) {
              if (!isVisible(element)) {
                return null;
              }

              var key =
                element.getAttribute('data-rn-select-key') ||
                'select-' + index;
              element.setAttribute('data-rn-select-key', key);

              var options = Array.prototype.map
                .call(element.options || [], function (option) {
                  return {
                    label: clean(option.textContent || option.label || ''),
                    value: option.value || clean(option.textContent || ''),
                  };
                })
                .filter(function (option) {
                  return option.label;
                });

              return {
                key: key,
                label: getLabel(element, 'Select'),
                options: options,
                type: 'select',
                value: element.value || '',
              };
            })
            .filter(Boolean);

          var radioMap = {};
          Array.prototype.forEach.call(
            document.querySelectorAll('input[type="radio"]'),
            function (element, index) {
              if (!isVisible(element)) {
                return;
              }

              var groupKey =
                element.name ||
                element.getAttribute('data-rn-radio-group') ||
                'radio-' + index;
              element.setAttribute('data-rn-radio-group', groupKey);

              if (!radioMap[groupKey]) {
                radioMap[groupKey] = {
                  key: groupKey,
                  label: getLabel(element, 'Options'),
                  options: [],
                  type: 'radio',
                  value: '',
                };
              }

              var optionLabel = getLabel(
                element,
                clean(element.value || 'Option')
              );

              if (!radioMap[groupKey].options.some(function (option) {
                return option.value === element.value;
              })) {
                radioMap[groupKey].options.push({
                  label: optionLabel,
                  value: element.value,
                });
              }

              if (element.checked) {
                radioMap[groupKey].value = element.value;
              }
            }
          );

          var inputs = Array.prototype.map
            .call(
              document.querySelectorAll(
                'input[type="text"], input[type="search"], input[type="number"], input[type="tel"], textarea'
              ),
              function (element, index) {
                if (!isVisible(element)) {
                  return null;
                }

                var key =
                  element.getAttribute('data-rn-input-key') ||
                  'input-' + index;
                element.setAttribute('data-rn-input-key', key);

                return {
                  key: key,
                  label: getLabel(element, 'Input'),
                  placeholder: clean(
                    element.getAttribute('placeholder') || ''
                  ),
                  value: element.value || '',
                };
              }
            )
            .filter(Boolean);

          var buttons = Array.prototype.map
            .call(
              document.querySelectorAll(
                'button, input[type="button"], input[type="submit"]'
              ),
              function (element, index) {
                if (!isVisible(element)) {
                  return null;
                }

                var label = getText(element);
                if (!label) {
                  return null;
                }

                var key =
                  element.getAttribute('data-rn-action-key') ||
                  'action-' + index;
                element.setAttribute('data-rn-action-key', key);

                return {
                  key: key,
                  label: label,
                };
              }
            )
            .filter(Boolean)
            .slice(0, 24);

          var links = Array.prototype.map
            .call(document.querySelectorAll('a'), function (element, index) {
              if (!isVisible(element)) {
                return null;
              }

              var label = getText(element);
              if (!label || label.length > 90) {
                return null;
              }

              var key =
                element.getAttribute('data-rn-link-key') ||
                'link-' + index;
              element.setAttribute('data-rn-link-key', key);

              return {
                key: key,
                label: label,
              };
            })
            .filter(Boolean)
            .slice(0, 24);

          var hasCoreControls =
            clickableGroups.length > 0 ||
            selects.length > 0 ||
            Object.keys(radioMap).length > 0 ||
            inputs.length > 0;
          var allRadioGroups = Object.keys(radioMap).map(function (key) {
            return radioMap[key];
          });
          hasCoreControls =
            clickableGroups.length > 0 ||
            selects.some(function (field) {
              return matchesAssistantKeywords(
                field.label +
                  ' ' +
                  field.options
                    .map(function (option) {
                      return option.label;
                    })
                    .join(' ')
              );
            }) ||
            allRadioGroups.some(function (field) {
              return matchesAssistantKeywords(
                field.label +
                  ' ' +
                  field.options
                    .map(function (option) {
                      return option.label;
                    })
                    .join(' ')
              );
            }) ||
            inputs.some(function (field) {
              return matchesAssistantKeywords(
                field.label + ' ' + field.placeholder
              );
            });

          if (
            window.__RN_BHULEKH_AUTO_ROUTE_ENABLED__ &&
            !window.__RN_BHULEKH_AUTO_ROUTE_DONE__ &&
            !hasCoreControls
          ) {
            var routeElement = findPrimaryRouteElement();

            if (routeElement && triggerElementClick(routeElement)) {
              window.__RN_BHULEKH_AUTO_ROUTE_DONE__ = true;
              scheduleSnapshot();
              return;
            }
          }

          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'DOM_SNAPSHOT',
              payload: {
                buttons: buttons,
                inputs: inputs,
                links: links,
                pageTitle: clean(document.title),
                radios: clickableGroups.concat(
                  allRadioGroups
                ),
                result: buildParsedResult(),
                selects: selects,
                url: window.location.href,
              },
            })
          );
        } catch (error) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'DOM_ERROR',
              payload: String(error),
            })
          );
        }
      };

      var pending;
      var scheduleSnapshot = function () {
        clearTimeout(pending);
        pending = setTimeout(sendSnapshot, 400);
      };

      var observer = new MutationObserver(scheduleSnapshot);
      observer.observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true,
      });

      window.__RN_BHULEKH_ASSISTANT__ = {
        openPrimaryRoute: function () {
          var routeElement = findPrimaryRouteElement();
          return triggerElementClick(routeElement);
        },
        openRouteByKeywords: function (
          keywords,
          exactLabels,
          blockedKeywords
        ) {
          var routeElement = findRouteElementByKeywords(
            keywords,
            exactLabels,
            blockedKeywords
          );
          return triggerElementClick(routeElement);
        },
        setAutoRouteEnabled: function (value) {
          window.__RN_BHULEKH_AUTO_ROUTE_ENABLED__ = Boolean(
            value
          );
          if (!value) {
            window.__RN_BHULEKH_AUTO_ROUTE_DONE__ = false;
          }
          return window.__RN_BHULEKH_AUTO_ROUTE_ENABLED__;
        },
        sync: sendSnapshot,
      };

      sendSnapshot();
      true;
    }
  })();
`;

const UpBhulekhAssistantScreen = ({
  navigation,
  route,
}: Props) => {
  const launchAction = route.params?.launchAction;
  const {language, strings} = useLanguage();
  const webViewRef = useRef<WebView>(null);
  const autoRouteTriggeredRef = useRef(false);
  const launchActionHandledRef =
    useRef<UpBhulekhLaunchAction | null>(null);
  const directLaunchAttemptRef = useRef(0);
  const assistedRouteConfigRef = useRef<{
    blockedKeywords: string[];
    exactLabels: string[];
    keywords: string[];
  } | null>(null);
  const pendingPortalRouteRef =
    useRef<PendingPortalRouteRequest | null>(null);
  const portalQuickTicker = useRef(new Animated.Value(0)).current;

  const [assistantData, setAssistantData] =
    useState<PortalSnapshot | null>(null);
  const [assistantSheetVisible, setAssistantSheetVisible] =
    useState(false);
  const [inputDrafts, setInputDrafts] = useState<
    Record<string, string>
  >({});
  const [optionSearch, setOptionSearch] = useState('');
  const [parsedResult, setParsedResult] =
    useState<ParsedResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<
    RecentSearch[]
  >([]);
  const [savedPreset, setSavedPreset] =
    useState<SavedPreset | null>(null);
  const [selectedField, setSelectedField] =
    useState<PortalField | null>(null);
  const [portalLandingMode, setPortalLandingMode] =
    useState<PortalLandingMode>('home');
  const [activePortalHeaderTitle, setActivePortalHeaderTitle] =
    useState<string | null>(null);
  const [selectedSearchWorkflowId, setSelectedSearchWorkflowId] =
    useState<SearchWorkflowId | null>(null);
  const [directLaunchPending, setDirectLaunchPending] =
    useState(Boolean(launchAction));
  const [directLaunchRetryTick, setDirectLaunchRetryTick] =
    useState(0);
  const [activeSelectionStage, setActiveSelectionStage] = useState<
    'district' | 'tehsil' | 'village'
  >('district');
  const [portalFallbackVisible, setPortalFallbackVisible] =
    useState(false);
  const [portalSourceUrl, setPortalSourceUrl] =
    useState(UP_BHULEKH_URL);
  const [webKey, setWebKey] = useState(0);

  const allFields = useMemo(
    () =>
      assistantData
        ? dedupePortalFields(
            [...assistantData.selects, ...assistantData.radios].filter(
              field => !fieldLooksLikeServiceMenu(field),
            ),
          )
        : [],
    [assistantData],
  );

  const locationFields = useMemo(
    () =>
      allFields.filter(field =>
        fieldMatchesKeywords(field, LOCATION_KEYWORDS) ||
        hasAlphabetOptions(field) ||
        (!hasAlphabetOptions(field) &&
          field.options.length >= 10),
      ),
    [allFields],
  );

  const searchModeFields = useMemo(
    () =>
      allFields.filter(
        field =>
          !locationFields.some(
            locationField => locationField.key === field.key,
          ) &&
          fieldMatchesKeywords(field, SEARCH_MODE_KEYWORDS),
      ),
    [allFields, locationFields],
  );

  const otherFields = useMemo(
    () =>
      allFields.filter(
        field =>
          !locationFields.some(
            locationField => locationField.key === field.key,
          ) &&
          !searchModeFields.some(
            searchModeField => searchModeField.key === field.key,
          ),
      ),
    [allFields, locationFields, searchModeFields],
  );

  const primaryLink = useMemo(
    () =>
      assistantData?.links.find(link =>
        matchesKeywords(link.label, PRIMARY_LINK_KEYWORDS),
      ) || assistantData?.links[0],
    [assistantData],
  );

  const assistantControlCount =
    (assistantData?.links.length ?? 0) +
    (assistantData?.buttons.length ?? 0) +
    (assistantData?.inputs.length ?? 0) +
    locationFields.length +
    searchModeFields.length +
    otherFields.length;
  const livePortalHomeRoutes = useMemo(
    () =>
      assistantData
        ? [
            ...assistantData.links.map(linkItem => ({
              ...linkItem,
              source: 'link' as const,
            })),
            ...assistantData.buttons.map(buttonItem => ({
              ...buttonItem,
              source: 'button' as const,
            })),
          ]
        : [],
    [assistantData],
  );
  const extraPortalQuickRoutes = useMemo(() => {
    if (!assistantData) {
      return [];
    }

    const knownPortalActions = [
      ...PORTAL_LOGIN_ACTIONS,
      ...PORTAL_PRIMARY_SERVICE_ACTIONS_RESOLVED,
      ...PORTAL_DIRECTORY_ACTIONS,
    ];
    const seenLabels = new Set<string>();

    return livePortalHomeRoutes
      .filter(quickRoute => {
        const normalizedLabel = normalize(quickRoute.label);

        if (
          !normalizedLabel ||
          NON_FLOW_OPTION_KEYWORDS.some(keyword =>
            normalizedLabel.includes(keyword),
          )
        ) {
          return false;
        }

        if (
          knownPortalActions.some(action =>
            matchesKeywords(
              quickRoute.label,
              action.keywords,
            ) ||
            (action.exactLabels || []).some(
              label => normalize(label) === normalizedLabel,
            ),
          )
        ) {
          return false;
        }

        if (seenLabels.has(normalizedLabel)) {
          return false;
        }

        seenLabels.add(normalizedLabel);
        return true;
      })
      .slice(0, 10);
  }, [assistantData, livePortalHomeRoutes]);
  const movingPortalQuickRoutes = useMemo(
    () =>
      extraPortalQuickRoutes.length > 1
        ? [...extraPortalQuickRoutes, ...extraPortalQuickRoutes]
        : extraPortalQuickRoutes,
    [extraPortalQuickRoutes],
  );
  const visiblePrimaryServiceActions = useMemo(() => {
    const seenTitles = new Set<string>();

    return PORTAL_PRIMARY_SERVICE_ACTIONS_RESOLVED.filter(action => {
      if (seenTitles.has(action.title)) {
        return false;
      }

      seenTitles.add(action.title);
      return true;
    });
  }, []);
  const launchablePortalActions = useMemo(
    () => [
      ...PORTAL_LOGIN_ACTIONS,
      ...PORTAL_PRIMARY_SERVICE_ACTIONS_RESOLVED,
      ...PORTAL_DIRECTORY_ACTIONS,
    ],
    [],
  );
  const directLaunchAction = useMemo(
    () =>
      launchAction
        ? launchablePortalActions.find(
            action => action.id === launchAction,
          ) || null
        : null,
    [launchAction, launchablePortalActions],
  );

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PRESET_STORAGE_KEY),
      AsyncStorage.getItem(HISTORY_STORAGE_KEY),
    ])
      .then(([presetValue, historyValue]) => {
        if (presetValue) {
          setSavedPreset(JSON.parse(presetValue) as SavedPreset);
        }

        if (historyValue) {
          setRecentSearches(JSON.parse(historyValue) as RecentSearch[]);
        }
      })
      .catch(() => {
        // Ignore storage read failures and continue without saved data.
      });
  }, []);

  useEffect(() => {
    portalQuickTicker.stopAnimation();
    portalQuickTicker.setValue(0);

    if (
      portalLandingMode !== 'home' ||
      extraPortalQuickRoutes.length < 2
    ) {
      return;
    }

    const loopWidth =
      extraPortalQuickRoutes.length *
      PORTAL_QUICK_ROUTE_ITEM_SPAN;
    const animation = Animated.loop(
      Animated.timing(portalQuickTicker, {
        duration: extraPortalQuickRoutes.length * 2400,
        easing: Easing.linear,
        toValue: -loopWidth,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [
    extraPortalQuickRoutes.length,
    portalLandingMode,
    portalQuickTicker,
  ]);

  useEffect(() => {
    if (!assistantData?.inputs.length) {
      return;
    }

    setInputDrafts(previous => {
      let changed = false;
      const next = {...previous};

      assistantData.inputs.forEach(field => {
        const nextValue =
          previous[field.key] ?? field.value ?? '';

        if (next[field.key] !== nextValue) {
          next[field.key] = nextValue;
          changed = true;
        }
      });

      return changed ? next : previous;
    });
  }, [assistantData]);

  const filteredOptions = useMemo(() => {
    if (!selectedField) {
      return [];
    }

    const query = optionSearch.trim().toLowerCase();

    if (!query) {
      return selectedField.options;
    }

    return selectedField.options.filter(option =>
      option.label.toLowerCase().includes(query),
    );
  }, [optionSearch, selectedField]);

  const webViewInjectedScript = useMemo(
    () =>
      portalSourceUrl.startsWith(UP_BHULEKH_BASE_URL) ||
      portalSourceUrl.startsWith(EKHASRA_BASE_URL)
        ? UP_BHULEKH_ASSISTANT_SCRIPT
        : 'true;',
    [portalSourceUrl],
  );

  const runScript = useCallback((script: string) => {
    webViewRef.current?.injectJavaScript(`${script}\ntrue;`);
  }, []);

  const syncAssistant = useCallback(() => {
    runScript(`
      if (window.__RN_BHULEKH_ASSISTANT__) {
        window.__RN_BHULEKH_ASSISTANT__.sync();
      }
    `);
  }, [runScript]);

  const getCompactPortalTitle = useCallback((rawTitle: string) => {
    const normalizedTitle = normalize(rawTitle);

    if (
      normalizedTitle.includes('online') ||
      normalizedTitle.includes('payment') ||
      normalizedTitle.includes('\u092a\u0947\u092e')
    ) {
      return 'Online Payment';
    }

    if (
      normalizedTitle.includes('khatauni') ||
      normalizedTitle.includes('khatoni') ||
      normalizedTitle.includes('\u0916\u0924\u094c\u0928\u0940')
    ) {
      return 'Khatauni';
    }

    if (
      normalizedTitle.includes('vikray') ||
      normalizedTitle.includes('\u0935\u093f\u0915\u094d\u0930\u092f')
    ) {
      return 'Vikray Status';
    }

    if (
      normalizedTitle.includes('vaad') ||
      normalizedTitle.includes('grast') ||
      normalizedTitle.includes('\u0935\u093e\u0926') ||
      normalizedTitle.includes('\u0917\u094d\u0930\u0938\u094d\u0924')
    ) {
      return 'Grast Status';
    }

    if (
      normalizedTitle.includes('unique') ||
      normalizedTitle.includes('code') ||
      normalizedTitle.includes('\u092f\u0942\u0928\u0940\u0915') ||
      normalizedTitle.includes('\u0915\u094b\u0921')
    ) {
      return 'Code Search';
    }

    if (
      normalizedTitle.includes('district') ||
      normalizedTitle.includes('jila') ||
      normalizedTitle.includes('\u091c\u093f\u0932\u093e')
    ) {
      return 'District';
    }

    if (
      normalizedTitle.includes('tehsil') ||
      normalizedTitle.includes('tahsil') ||
      normalizedTitle.includes('\u0924\u0939\u0938\u0940\u0932')
    ) {
      return 'Tehsil';
    }

    if (
      normalizedTitle.includes('pargana') ||
      normalizedTitle.includes('\u092a\u0930\u0917\u0928\u093e')
    ) {
      return 'Pargana';
    }

    if (
      normalizedTitle.includes('sarkari') ||
      normalizedTitle.includes('\u0938\u0930\u0915\u093e\u0930\u0940')
    ) {
      return 'Sarkari Bhumi';
    }

    if (
      normalizedTitle.includes('bhumi') ||
      normalizedTitle.includes('\u092d\u0942\u092e\u093f')
    ) {
      return 'Bhumi Suchi';
    }

    if (
      normalizedTitle.includes('cyber') ||
      normalizedTitle.includes('\u0938\u093e\u0907\u092c\u0930')
    ) {
      return 'Cyber Guidelines';
    }

    return rawTitle;
  }, []);

  const openPortalHomeSurface = useCallback(() => {
    setPortalLandingMode('home');
    setActivePortalHeaderTitle(null);
    setSelectedSearchWorkflowId(null);
    setPortalFallbackVisible(false);
    pendingPortalRouteRef.current = null;
    assistedRouteConfigRef.current = null;

    if (portalSourceUrl !== UP_BHULEKH_URL) {
      setPortalSourceUrl(UP_BHULEKH_URL);
      setWebKey(current => current + 1);
      return;
    }

    runScript(`
      (function () {
        if (!window.__RN_BHULEKH_ASSISTANT__) {
          return;
        }

        if (
          window.__RN_BHULEKH_ASSISTANT__.setAutoRouteEnabled
        ) {
          window.__RN_BHULEKH_ASSISTANT__.setAutoRouteEnabled(
            false
          );
        }

        if (window.location.hash !== ${JSON.stringify(
          UP_BHULEKH_HOME_HASH,
        )}) {
          window.location.hash = ${JSON.stringify(
            UP_BHULEKH_HOME_HASH,
          )};
        }

        [500, 1200, 2200].forEach(function (delay) {
          setTimeout(
            window.__RN_BHULEKH_ASSISTANT__.sync,
            delay
          );
        });
      })();
      `);
  }, [portalSourceUrl, runScript]);

  const openKhasraMenuSurface = useCallback(() => {
    setPortalLandingMode('khasra-menu');
    setActivePortalHeaderTitle('Khasra');
    setSelectedSearchWorkflowId(null);
    setPortalFallbackVisible(false);
    pendingPortalRouteRef.current = null;
    assistedRouteConfigRef.current = null;

    if (
      portalSourceUrl !== EKHASRA_HOME_URL ||
      assistantData?.url !== EKHASRA_HOME_URL
    ) {
      setPortalSourceUrl(EKHASRA_HOME_URL);
      setWebKey(current => current + 1);
    } else {
      syncAssistant();
    }
  }, [assistantData?.url, portalSourceUrl, syncAssistant]);

  const openPortalDirectUrl = useCallback(
    (directUrl: string, headerTitle?: string) => {
      setPortalLandingMode('live');
      setActivePortalHeaderTitle(
        headerTitle ? getCompactPortalTitle(headerTitle) : null,
      );
      setSelectedSearchWorkflowId(null);
      setPortalFallbackVisible(false);
      assistedRouteConfigRef.current = null;
      setPortalSourceUrl(directUrl);
      setWebKey(current => current + 1);
    },
    [getCompactPortalTitle],
  );

  const openCurrentPortalRouteByKeywords = useCallback(
    (
      exactLabels: string[] = [],
      keywords: string[] = [],
      headerTitle?: string,
      blockedKeywords: string[] = [],
    ) => {
      setPortalLandingMode('live');
      setActivePortalHeaderTitle(
        headerTitle ? getCompactPortalTitle(headerTitle) : null,
      );
      setSelectedSearchWorkflowId(null);
      setPortalFallbackVisible(false);
      assistedRouteConfigRef.current = {
        blockedKeywords,
        exactLabels,
        keywords,
      };

      runScript(`
        (function () {
          if (!window.__RN_BHULEKH_ASSISTANT__) {
            return;
          }

          if (
            window.__RN_BHULEKH_ASSISTANT__.setAutoRouteEnabled
          ) {
            window.__RN_BHULEKH_ASSISTANT__.setAutoRouteEnabled(
              false
            );
          }

          var exactLabels = ${JSON.stringify(exactLabels)};
          var keywords = ${JSON.stringify(keywords)};
          var blockedKeywords = ${JSON.stringify(blockedKeywords)};
          var clean = function (value) {
            return (value || '').replace(/\\s+/g, ' ').trim();
          };
          var triggerElement = function (element) {
            if (!element) {
              return false;
            }

            ['pointerdown', 'mousedown', 'touchstart', 'mouseup', 'touchend', 'click'].forEach(
              function (eventName) {
                try {
                  var event = new MouseEvent(eventName, {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                  });
                  element.dispatchEvent(event);
                } catch (error) {}
              }
            );

            if (typeof element.click === 'function') {
              element.click();
            }

            return true;
          };

          var findBestRouteElement = function () {
            var menuRoot =
              document.querySelector('#navbarNav') ||
              document.body;
            var exactMatchElement = null;

            Array.prototype.some.call(
              menuRoot.querySelectorAll('*'),
              function (element) {
                var text = clean(
                  element.innerText ||
                    element.textContent ||
                    element.value ||
                    element.getAttribute('aria-label') ||
                    element.getAttribute('title') ||
                    ''
                ).toLowerCase();

                if (!text) {
                  return false;
                }

                var matched = exactLabels.some(function (label) {
                  var normalizedLabel = clean(label).toLowerCase();
                  return (
                    normalizedLabel &&
                    (text === normalizedLabel ||
                      text.indexOf(normalizedLabel) !== -1)
                  );
                });

                if (!matched) {
                  return false;
                }

                exactMatchElement =
                  element.closest(
                    'a, button, input[type="button"], input[type="submit"], [role="button"], [onclick], li'
                  ) || element;
                return Boolean(exactMatchElement);
              }
            );

            if (exactMatchElement) {
              return exactMatchElement;
            }

            var bestElement = null;
            var bestScore = -1;

            Array.prototype.forEach.call(
              document.querySelectorAll(
                'a, button, input[type="button"], input[type="submit"], [role="button"], [onclick], li, div, span'
              ),
              function (element) {
                var text = clean(
                  element.innerText ||
                    element.textContent ||
                    element.value ||
                    element.getAttribute('aria-label') ||
                    element.getAttribute('title') ||
                    ''
                ).toLowerCase();

                if (!text || text.length > 180) {
                  return;
                }

                if (
                  blockedKeywords.some(function (keyword) {
                    var normalizedKeyword = clean(keyword).toLowerCase();
                    return (
                      normalizedKeyword &&
                      text.indexOf(normalizedKeyword) !== -1
                    );
                  })
                ) {
                  return;
                }

                var score = -1;

                exactLabels.forEach(function (label) {
                  var normalizedLabel = clean(label).toLowerCase();

                  if (!normalizedLabel) {
                    return;
                  }

                  if (text === normalizedLabel) {
                    score = Math.max(score, 400);
                    return;
                  }

                  if (text.indexOf(normalizedLabel) !== -1) {
                    score = Math.max(score, 260);
                  }
                });

                keywords.forEach(function (keyword) {
                  var normalizedKeyword = clean(keyword).toLowerCase();

                  if (
                    normalizedKeyword &&
                    text.indexOf(normalizedKeyword) !== -1
                  ) {
                    score = Math.max(score, 180);
                  }
                });

                if (score <= bestScore) {
                  return;
                }

                bestScore = score;
                bestElement =
                  element.closest(
                    'a, button, input[type="button"], input[type="submit"], [role="button"], [onclick]'
                  ) || element;
              }
            );

            return bestElement;
          };

          var openEkhasraMenu = function () {
            var toggleButton = document.querySelector(
              'button[aria-controls="navbarNav"], button.navbar-toggler, [data-bs-target="#navbarNav"], [data-target="#navbarNav"]'
            );

            if (toggleButton) {
              triggerElement(toggleButton);
            }
          };

          var tryOpenRoute = function () {
            var routeElement = findBestRouteElement();

            if (routeElement && triggerElement(routeElement)) {
              [500, 1200, 2200].forEach(function (delay) {
                setTimeout(
                  window.__RN_BHULEKH_ASSISTANT__.sync,
                  delay
                );
              });
              return;
            }

            if (
              window.__RN_BHULEKH_ASSISTANT__.openRouteByKeywords
            ) {
              window.__RN_BHULEKH_ASSISTANT__.openRouteByKeywords(
                keywords,
                exactLabels,
                blockedKeywords
              );
            }

            [500, 1200, 2200].forEach(function (delay) {
              setTimeout(
                window.__RN_BHULEKH_ASSISTANT__.sync,
                delay
              );
            });
          };

          openEkhasraMenu();
          setTimeout(tryOpenRoute, 240);
          setTimeout(tryOpenRoute, 900);
        })();
      `);
    },
    [getCompactPortalTitle, runScript],
  );

  const queuePortalRouteOpen = useCallback(
    (
      sourceUrl: string,
      exactLabels: string[],
      keywords: string[],
      headerTitle: string,
      blockedKeywords: string[] = [],
      directUrl?: string,
    ) => {
      if (directUrl) {
        pendingPortalRouteRef.current = null;
        openPortalDirectUrl(directUrl, headerTitle);
        return;
      }

      pendingPortalRouteRef.current = {
        blockedKeywords,
        exactLabels,
        headerTitle,
        keywords,
        sourceUrl,
      };

      if (
        assistantData?.url?.startsWith(sourceUrl)
      ) {
        openCurrentPortalRouteByKeywords(
          exactLabels,
          keywords,
          headerTitle,
          blockedKeywords,
        );
        pendingPortalRouteRef.current = null;
        return;
      }

      setPortalLandingMode('khasra-menu');
      setActivePortalHeaderTitle('Khasra');
      setSelectedSearchWorkflowId(null);
      setPortalFallbackVisible(false);

      if (portalSourceUrl !== sourceUrl) {
        setPortalSourceUrl(sourceUrl);
        setWebKey(current => current + 1);
      } else {
        syncAssistant();
      }
    },
    [
      assistantData?.url,
      openCurrentPortalRouteByKeywords,
      openPortalDirectUrl,
      portalSourceUrl,
      syncAssistant,
    ],
  );

  const openPrimarySearchWorkspace = useCallback(
    (
      workflowId: SearchWorkflowId | null = null,
      headerTitle?: string,
      routeExactLabels: string[] = [],
      routeKeywords: string[] = [],
      blockedKeywords: string[] = [],
      initialUrl?: string,
    ) => {
      setPortalLandingMode('search');
      setActivePortalHeaderTitle(
        headerTitle ? getCompactPortalTitle(headerTitle) : null,
      );
      setSelectedSearchWorkflowId(workflowId);
      setPortalFallbackVisible(false);
      assistedRouteConfigRef.current = {
        blockedKeywords,
        exactLabels: routeExactLabels,
        keywords: routeKeywords,
      };

      if (initialUrl && portalSourceUrl !== initialUrl) {
        setPortalSourceUrl(initialUrl);
        setWebKey(current => current + 1);
        return;
      }

      runScript(`
        (function () {
          if (!window.__RN_BHULEKH_ASSISTANT__) {
            return;
          }

          if (
            window.__RN_BHULEKH_ASSISTANT__.setAutoRouteEnabled
          ) {
            window.__RN_BHULEKH_ASSISTANT__.setAutoRouteEnabled(
              true
            );
          }

          window.__RN_BHULEKH_AUTO_ROUTE_DONE__ = false;

          var syncLater = function () {
            [500, 1200, 2200].forEach(function (delay) {
              setTimeout(
                window.__RN_BHULEKH_ASSISTANT__.sync,
                delay
              );
            });
          };

          var exactLabels = ${JSON.stringify(routeExactLabels)};
          var keywords = ${JSON.stringify(routeKeywords)};
          var blockedKeywords = ${JSON.stringify(blockedKeywords)};
          var openAssistedRoute = function () {
            if (
              (exactLabels.length || keywords.length) &&
              window.__RN_BHULEKH_ASSISTANT__.openRouteByKeywords &&
              window.__RN_BHULEKH_ASSISTANT__.openRouteByKeywords(
                keywords,
                exactLabels,
                blockedKeywords
              )
            ) {
              return true;
            }

            if (
              window.__RN_BHULEKH_ASSISTANT__.openPrimaryRoute &&
              window.__RN_BHULEKH_ASSISTANT__.openPrimaryRoute()
            ) {
              return true;
            }

            return false;
          };

          if (window.location.hash !== ${JSON.stringify(
            UP_BHULEKH_HOME_HASH,
          )}) {
            window.location.hash = ${JSON.stringify(
              UP_BHULEKH_HOME_HASH,
            )};
            syncLater();
            return;
          }

          if (openAssistedRoute()) {
            syncLater();
            return;
          }

          syncLater();
        })();
      `);
    },
    [getCompactPortalTitle, portalSourceUrl, runScript],
  );

  const openPortalRouteByExactLabels = useCallback(
    (
      exactLabels: string[] = [],
      keywords: string[] = [],
      headerTitle?: string,
      blockedKeywords: string[] = [],
    ) => {
      setPortalLandingMode('live');
      setActivePortalHeaderTitle(
        headerTitle ? getCompactPortalTitle(headerTitle) : null,
      );
      setSelectedSearchWorkflowId(null);
      setPortalFallbackVisible(false);
      assistedRouteConfigRef.current = null;

      runScript(`
        (function () {
          if (!window.__RN_BHULEKH_ASSISTANT__) {
            return;
          }

          if (
            window.__RN_BHULEKH_ASSISTANT__.setAutoRouteEnabled
          ) {
            window.__RN_BHULEKH_ASSISTANT__.setAutoRouteEnabled(
              false
            );
          }

          var clean = function (value) {
            return (value || '').replace(/\\s+/g, ' ').trim();
          };

          var triggerElement = function (element) {
            if (!element) {
              return false;
            }

            ['pointerdown', 'mousedown', 'touchstart', 'mouseup', 'touchend', 'click'].forEach(
              function (eventName) {
                try {
                  var event = new MouseEvent(eventName, {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                  });
                  element.dispatchEvent(event);
                } catch (error) {}
              }
            );

            if (typeof element.click === 'function') {
              element.click();
            }

            return true;
          };

          var syncLater = function () {
            [700, 1400, 2400].forEach(function (delay) {
              setTimeout(
                window.__RN_BHULEKH_ASSISTANT__.sync,
                delay
              );
            });
          };

          var exactLabels = ${JSON.stringify(exactLabels)};
          var keywords = ${JSON.stringify(keywords)};
          var blockedKeywords = ${JSON.stringify(blockedKeywords)};

          var findExactClickable = function () {
            var bestElement = null;
            var bestScore = -1;

            Array.prototype.forEach.call(
              document.querySelectorAll(
                'a, button, input[type="button"], input[type="submit"], [role="button"], [onclick]'
              ),
              function (element) {
                var text = clean(
                  element.innerText ||
                    element.textContent ||
                    element.value ||
                    ''
                ).toLowerCase();

                if (!text || text.length > 1200) {
                  return;
                }

                if (
                  blockedKeywords.some(function (keyword) {
                    var normalizedKeyword = clean(keyword).toLowerCase();
                    return (
                      normalizedKeyword &&
                      text.indexOf(normalizedKeyword) !== -1
                    );
                  })
                ) {
                  return;
                }

                var elementScore = exactLabels.reduce(function (
                  score,
                  label
                ) {
                  var normalizedLabel = clean(label).toLowerCase();

                  if (!normalizedLabel) {
                    return score;
                  }

                  if (text === normalizedLabel) {
                    return Math.max(score, 400);
                  }

                  if (text.indexOf(normalizedLabel) !== -1) {
                    return Math.max(score, 240);
                  }

                  return score;
                }, -1);

                if (elementScore > bestScore) {
                  bestScore = elementScore;
                  bestElement = element;
                }
              }
            );

            return bestElement;
          };

          var openRoute = function () {
            var exactElement = findExactClickable();

            if (exactElement && triggerElement(exactElement)) {
              syncLater();
              return;
            }

            if (
              window.__RN_BHULEKH_ASSISTANT__.openRouteByKeywords
            ) {
              window.__RN_BHULEKH_ASSISTANT__.openRouteByKeywords(
                keywords,
                exactLabels,
                blockedKeywords
              );
            }

            syncLater();
          };

          if (window.location.hash !== ${JSON.stringify(
            UP_BHULEKH_HOME_HASH,
          )}) {
            window.location.hash = ${JSON.stringify(
              UP_BHULEKH_HOME_HASH,
            )};
            setTimeout(openRoute, 900);
            return;
          }

          openRoute();
        })();
      `);
    },
    [getCompactPortalTitle, runScript],
  );

  const retryOpenAssistedRoute = useCallback(() => {
    const routeConfig = assistedRouteConfigRef.current;
    const blockedKeywords = routeConfig?.blockedKeywords || [];
    const exactLabels = routeConfig?.exactLabels || [];
    const keywords = routeConfig?.keywords || [];

    runScript(`
      (function () {
        if (!window.__RN_BHULEKH_ASSISTANT__) {
          return;
        }

        var exactLabels = ${JSON.stringify(exactLabels)};
        var keywords = ${JSON.stringify(keywords)};
        var blockedKeywords = ${JSON.stringify(blockedKeywords)};
        var opened = false;

        if (
          (exactLabels.length || keywords.length) &&
          window.__RN_BHULEKH_ASSISTANT__.openRouteByKeywords
        ) {
          opened = window.__RN_BHULEKH_ASSISTANT__.openRouteByKeywords(
            keywords,
            exactLabels,
            blockedKeywords
          );
        }

        if (
          !opened &&
          window.__RN_BHULEKH_ASSISTANT__.openPrimaryRoute
        ) {
          opened = window.__RN_BHULEKH_ASSISTANT__.openPrimaryRoute();
        }

        if (opened) {
          setTimeout(window.__RN_BHULEKH_ASSISTANT__.sync, 800);
        }
      })();
    `);
  }, [runScript]);

  const handlePortalHomeActionPress = useCallback(
    (action: PortalHomeAction) => {
      if (action.mode === 'open-khasra-menu') {
        openKhasraMenuSurface();
        return;
      }

      if (action.mode === 'open-search-menu') {
        openPrimarySearchWorkspace(
          null,
          action.title,
          action.exactLabels || [],
          action.keywords || [],
          action.blockedKeywords || [],
          action.directUrl,
        );
        return;
      }

      if (action.directUrl) {
        openPortalDirectUrl(action.directUrl, action.title);
        return;
      }

      if (
        action.mode === 'open-search-workflow' &&
        action.workflowId
      ) {
        openPrimarySearchWorkspace(
          action.workflowId,
          action.title,
          action.exactLabels || [],
          action.keywords || [],
          action.blockedKeywords || [],
          action.directUrl,
        );
        return;
      }

      openPortalRouteByExactLabels(
        action.exactLabels || [action.title],
        action.keywords,
        action.title,
        action.blockedKeywords || [],
      );
    },
    [
      openKhasraMenuSurface,
      openPortalDirectUrl,
      openPortalRouteByExactLabels,
      openPrimarySearchWorkspace,
    ],
  );

  useEffect(() => {
    launchActionHandledRef.current = null;
    directLaunchAttemptRef.current = 0;
    setDirectLaunchPending(Boolean(launchAction));
    setDirectLaunchRetryTick(0);
  }, [launchAction]);

  useEffect(() => {
    if (
      !directLaunchPending ||
      !launchAction ||
      portalLandingMode !== 'home'
    ) {
      return;
    }

    if (
      !directLaunchAction
    ) {
      return;
    }

    if (
      directLaunchAction.mode !== 'open-khasra-menu' &&
      !directLaunchAction.directUrl &&
      !assistantData
    ) {
      return;
    }

    if (directLaunchAttemptRef.current >= 4) {
      setDirectLaunchPending(false);
      return;
    }

    launchActionHandledRef.current = launchAction;
    directLaunchAttemptRef.current += 1;

    const timer = setTimeout(
      () => {
        handlePortalHomeActionPress(directLaunchAction);
      },
      directLaunchAction.directUrl ||
        directLaunchAction.mode === 'open-khasra-menu'
        ? 0
        : 280,
    );

    const retryTimer = setTimeout(() => {
      if (portalLandingMode === 'home') {
        setDirectLaunchRetryTick(current => current + 1);
      }
    }, 1400);

    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
    };
  }, [
    assistantData,
    directLaunchAction,
    directLaunchPending,
    directLaunchRetryTick,
    handlePortalHomeActionPress,
    launchAction,
    portalLandingMode,
  ]);

  useEffect(() => {
    if (!directLaunchPending) {
      return;
    }

    if (launchAction && !directLaunchAction) {
      setDirectLaunchPending(false);
      return;
    }

    if (portalLandingMode !== 'home') {
      setDirectLaunchPending(false);
    }
  }, [
    directLaunchAction,
    directLaunchPending,
    launchAction,
    portalLandingMode,
  ]);

  useEffect(() => {
    const pendingRoute = pendingPortalRouteRef.current;

    if (
      !pendingRoute ||
      !assistantData?.url?.startsWith(pendingRoute.sourceUrl)
    ) {
      return;
    }

    openCurrentPortalRouteByKeywords(
      pendingRoute.exactLabels,
      pendingRoute.keywords,
      pendingRoute.headerTitle,
      pendingRoute.blockedKeywords,
    );
    pendingPortalRouteRef.current = null;
  }, [assistantData?.url, openCurrentPortalRouteByKeywords]);

  const buildSearchSnapshot = (): SearchSnapshot | null => {
    if (!assistantData) {
      return null;
    }

    const fieldValues = allFields.reduce<Record<string, string>>(
      (accumulator, field) => {
        if (field.value) {
          accumulator[field.key] = field.value;
        }
        return accumulator;
      },
      {},
    );

    const inputValues = assistantData.inputs.reduce<
      Record<string, string>
    >((accumulator, field) => {
      const nextValue = inputDrafts[field.key]?.trim();

      if (nextValue) {
        accumulator[field.key] = nextValue;
      }

      return accumulator;
    }, {});

    const labels = [
      ...locationFields
        .filter(field => field.value)
        .map(
          field =>
            `${field.label}: ${getFieldDisplayValue(field)}`,
        ),
      ...searchModeFields
        .filter(field => field.value)
        .map(
          field =>
            `${field.label}: ${getFieldDisplayValue(field)}`,
        ),
      ...assistantData.inputs
        .filter(field => inputDrafts[field.key]?.trim())
        .map(
          field => `${field.label}: ${inputDrafts[field.key].trim()}`,
        ),
    ].slice(0, 5);

    if (
      !Object.keys(fieldValues).length &&
      !Object.keys(inputValues).length
    ) {
      return null;
    }

    return {
      fieldValues,
      inputValues,
      labels,
    };
  };

  const persistRecentSearches = async (
    searches: RecentSearch[],
  ) => {
    setRecentSearches(searches);
    await AsyncStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(searches),
    );
  };

  const rememberCurrentSearch = async () => {
    const snapshot = buildSearchSnapshot();

    if (!snapshot) {
      return;
    }

    const nextSearch: RecentSearch = {
      id: `${Date.now()}`,
      ...snapshot,
    };

    const nextSearches = [
      nextSearch,
      ...recentSearches.filter(
        search =>
          JSON.stringify(search.fieldValues) !==
            JSON.stringify(snapshot.fieldValues) ||
          JSON.stringify(search.inputValues) !==
            JSON.stringify(snapshot.inputValues),
      ),
    ].slice(0, MAX_RECENT_SEARCHES);

    try {
      await persistRecentSearches(nextSearches);
    } catch {
      // Ignore write failures and continue with in-memory history.
      setRecentSearches(nextSearches);
    }
  };

  const applySearchState = (
    fieldValues: Record<string, string>,
    inputValues: Record<string, string>,
  ) => {
    const serializedFieldValues = JSON.stringify(fieldValues);
    const serializedInputValues = JSON.stringify(inputValues);

    runScript(`
      (function () {
        var fieldValues = ${serializedFieldValues};
        var inputValues = ${serializedInputValues};
        var fieldKeys = Object.keys(fieldValues);

        var applyInputs = function () {
          Object.keys(inputValues).forEach(function (key) {
            var inputElement = document.querySelector(
              '[data-rn-input-key="' + key + '"]'
            );

            if (inputElement) {
              inputElement.value = inputValues[key];
              inputElement.dispatchEvent(new Event('input', {bubbles: true}));
              inputElement.dispatchEvent(new Event('change', {bubbles: true}));
            }
          });

          if (window.__RN_BHULEKH_ASSISTANT__) {
            setTimeout(window.__RN_BHULEKH_ASSISTANT__.sync, 900);
          }
        };

        var applyFieldAt = function (index) {
          if (index >= fieldKeys.length) {
            applyInputs();
            return;
          }

          var key = fieldKeys[index];
          var nextValue = fieldValues[key];
          var selectElement = document.querySelector(
            '[data-rn-select-key="' + key + '"]'
          );

          if (selectElement) {
            selectElement.value = nextValue;
            selectElement.dispatchEvent(new Event('input', {bubbles: true}));
            selectElement.dispatchEvent(new Event('change', {bubbles: true}));
            setTimeout(function () {
              applyFieldAt(index + 1);
            }, 450);
            return;
          }

          var clickableElement = document.querySelector(
            '[data-rn-click-group="' +
              key +
              '"][data-rn-click-value="' +
              nextValue +
              '"]'
          );

          if (clickableElement) {
            clickableElement.click();
            setTimeout(function () {
              applyFieldAt(index + 1);
            }, 450);
            return;
          }

          var radioElements = document.querySelectorAll(
            '[data-rn-radio-group="' + key + '"]'
          );
          var appliedRadio = false;

          Array.prototype.forEach.call(radioElements, function (element) {
            element.checked = element.value === nextValue;
            if (element.checked) {
              appliedRadio = true;
              element.dispatchEvent(new Event('input', {bubbles: true}));
              element.dispatchEvent(new Event('change', {bubbles: true}));
            }
          });

          setTimeout(function () {
            applyFieldAt(index + 1);
          }, appliedRadio ? 350 : 150);
        };

        applyFieldAt(0);
      })();
    `);

    setInputDrafts(previous => ({
      ...previous,
      ...inputValues,
    }));
  };

  const applyFieldValue = (
    field: PortalField,
    optionValue: string,
  ) => {
    const escapedValue = JSON.stringify(optionValue);

    if (field.type === 'select') {
      const selector = buildAttributeSelector(
        'data-rn-select-key',
        field.key,
      );

      runScript(`
        (function () {
          var element = document.querySelector(
            ${JSON.stringify(selector)}
          );
          if (!element) {
            return;
          }
          element.value = ${escapedValue};
          element.dispatchEvent(new Event('input', {bubbles: true}));
          element.dispatchEvent(new Event('change', {bubbles: true}));
          if (window.__RN_BHULEKH_ASSISTANT__) {
            [250, 900, 1600].forEach(function (delay) {
              setTimeout(window.__RN_BHULEKH_ASSISTANT__.sync, delay);
            });
          }
        })();
      `);
    } else if (field.type === 'click') {
      const groupSelector = `[data-rn-click-group=${JSON.stringify(
        field.key,
      )}][data-rn-click-value=${JSON.stringify(optionValue)}]`;

      runScript(`
        (function () {
          var groupElements = document.querySelectorAll(
            ${JSON.stringify(
              buildAttributeSelector(
                'data-rn-click-group',
                field.key,
              ),
            )}
          );
          var element = document.querySelector(
            ${JSON.stringify(groupSelector)}
          );
          if (!element) {
            return;
          }
          Array.prototype.forEach.call(
            groupElements,
            function (groupElement) {
              groupElement.removeAttribute('data-rn-click-selected');
            }
          );
          element.setAttribute('data-rn-click-selected', 'true');
          ['pointerdown', 'mousedown', 'touchstart', 'mouseup', 'touchend', 'click'].forEach(
            function (eventName) {
              try {
                var event = new MouseEvent(eventName, {
                  bubbles: true,
                  cancelable: true,
                  view: window,
                });
                element.dispatchEvent(event);
              } catch (error) {}
            }
          );
          if (typeof element.click === 'function') {
            element.click();
          }
          if (window.__RN_BHULEKH_ASSISTANT__) {
            [450, 1100, 2000].forEach(function (delay) {
              setTimeout(window.__RN_BHULEKH_ASSISTANT__.sync, delay);
            });
          }
        })();
      `);
    } else {
      const selector = buildAttributeSelector(
        'data-rn-radio-group',
        field.key,
      );

      runScript(`
        (function () {
          var elements = document.querySelectorAll(
            ${JSON.stringify(selector)}
          );
          Array.prototype.forEach.call(elements, function (element) {
            element.checked = element.value === ${escapedValue};
            if (element.checked) {
              element.dispatchEvent(new Event('input', {bubbles: true}));
              element.dispatchEvent(new Event('change', {bubbles: true}));
            }
          });
          if (window.__RN_BHULEKH_ASSISTANT__) {
            [250, 900, 1600].forEach(function (delay) {
              setTimeout(window.__RN_BHULEKH_ASSISTANT__.sync, delay);
            });
          }
        })();
      `);
    }

    setSelectedField(null);
    setOptionSearch('');
    setPortalFallbackVisible(false);

    if (districtField && field.key === districtField.key) {
      setActiveSelectionStage('tehsil');
    } else if (tehsilField && field.key === tehsilField.key) {
      setActiveSelectionStage('village');
    }
  };

  const applyInputValue = (
    field: PortalInput,
    nextValue: string,
  ) => {
    const selector = buildAttributeSelector(
      'data-rn-input-key',
      field.key,
    );
    const escapedValue = JSON.stringify(nextValue);

    runScript(`
      (function () {
        var element = document.querySelector(
          ${JSON.stringify(selector)}
        );
        if (!element) {
          return;
        }
        element.focus();
        element.value = ${escapedValue};
        element.dispatchEvent(new Event('input', {bubbles: true}));
        element.dispatchEvent(new Event('change', {bubbles: true}));
        if (window.__RN_BHULEKH_ASSISTANT__) {
          [250, 900, 1600].forEach(function (delay) {
            setTimeout(window.__RN_BHULEKH_ASSISTANT__.sync, delay);
          });
        }
      })();
    `);
  };

  const triggerAction = (
    action: PortalAction,
    kind: 'button' | 'link',
  ) => {
    const selector = buildAttributeSelector(
      kind === 'button'
        ? 'data-rn-action-key'
        : 'data-rn-link-key',
      action.key,
    );

    rememberCurrentSearch()
      .catch(() => {
        // Ignore history write failures and continue with the action.
      })
      .finally(() => {
        runScript(`
          (function () {
            var element = document.querySelector(
              ${JSON.stringify(selector)}
            );
            if (!element) {
              return;
            }
            ['pointerdown', 'mousedown', 'touchstart', 'mouseup', 'touchend', 'click'].forEach(
              function (eventName) {
                try {
                  var event = new MouseEvent(eventName, {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                  });
                  element.dispatchEvent(event);
                } catch (error) {}
              }
            );
            if (typeof element.click === 'function') {
              element.click();
            }
            if (window.__RN_BHULEKH_ASSISTANT__) {
              [800, 1600, 2400].forEach(function (delay) {
                setTimeout(window.__RN_BHULEKH_ASSISTANT__.sync, delay);
              });
            }
          })();
        `);
      });
  };

  const saveCurrentPreset = async () => {
    const snapshot = buildSearchSnapshot();

    if (!snapshot) {
      return;
    }

    try {
      await AsyncStorage.setItem(
        PRESET_STORAGE_KEY,
        JSON.stringify(snapshot),
      );
      setSavedPreset(snapshot);
      await rememberCurrentSearch();
    } catch {
      setSavedPreset(snapshot);
    }
  };

  const restoreSavedPreset = () => {
    if (!savedPreset) {
      return;
    }

    applySearchState(
      savedPreset.fieldValues,
      savedPreset.inputValues,
    );
  };

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      console.log(
        '[BhulekhAssistant] message',
        parsed.type,
      );

      if (parsed.type === 'DOM_SNAPSHOT') {
        const payload = parsed.payload as PortalSnapshot;
        console.log('[BhulekhAssistant] snapshot', {
          buttons: payload.buttons.length,
          inputs: payload.inputs.length,
          pageTitle: payload.pageTitle,
          radios: payload.radios.length,
          selects: payload.selects.length,
          url: payload.url,
        });
        console.log(
          '[BhulekhAssistant] radio-fields',
          JSON.stringify(
            payload.radios.map(field => ({
              key: field.key,
              label: field.label,
              optionCount: field.options.length,
              optionPreview: field.options
                .slice(0, 6)
                .map(option => option.label),
              type: field.type,
              value: field.value,
            })),
          ),
        );
        console.log(
          '[BhulekhAssistant] buttons',
          JSON.stringify(payload.buttons),
        );
        console.log(
          '[BhulekhAssistant] links',
          JSON.stringify(payload.links),
        );
        setAssistantData(payload);
        setParsedResult(payload.result);
      } else if (parsed.type === 'DOM_ERROR') {
        console.log(
          '[BhulekhAssistant] dom-error',
          parsed.payload,
        );
      }
    } catch {
      // Ignore malformed payloads from the portal.
    }
  };

  const renderFieldCard = (field: PortalField) => (
    <AppPressable
      key={field.key}
      onPress={() => {
        setSelectedField(field);
        setOptionSearch('');
      }}
      style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{field.label}</Text>
      <Text style={styles.fieldValue}>
        {getFieldDisplayValue(field) ||
          strings.assistantSelectOption}
      </Text>
      </AppPressable>
  );

  const assistantTrayStatus = parsedResult?.looksLikeResult
    ? 'Result detected'
    : assistantControlCount
      ? `${assistantControlCount} controls ready`
      : 'Sync to load controls';
  const assistantPresetStatus = savedPreset
    ? 'Preset ready'
    : 'No preset';
  const assistantHistoryStatus = `${recentSearches.length} recent`;
  const districtField = useMemo(
    () => pickBestLocationField(locationFields, 'district'),
    [locationFields],
  );
  const firstLetterField = useMemo(
    () => pickBestLocationField(locationFields, 'firstLetter'),
    [locationFields],
  );
  const tehsilField = useMemo(
    () =>
      pickBestLocationField(
        locationFields,
        'tehsil',
        [
          districtField?.key,
          firstLetterField?.key,
        ].filter((key): key is string => Boolean(key)),
      ) ||
      (districtField?.value
        ? locationFields.find(
            field =>
              field.key !== districtField.key &&
              field.key !== firstLetterField?.key &&
              !hasAlphabetOptions(field) &&
              field.options.length >= 4,
          )
        : undefined),
    [
      districtField?.key,
      districtField?.value,
      firstLetterField?.key,
      locationFields,
    ],
  );
  const villageField = useMemo(
    () =>
      pickBestLocationField(
        locationFields,
        'village',
        [
          districtField?.key,
          tehsilField?.key,
          firstLetterField?.key,
        ].filter((key): key is string => Boolean(key)),
      ) ||
      (tehsilField?.value
        ? locationFields.find(
            field =>
              field.key !== districtField?.key &&
              field.key !== tehsilField.key &&
              field.key !== firstLetterField?.key &&
              !hasAlphabetOptions(field),
          )
        : undefined),
    [
      districtField?.key,
      firstLetterField?.key,
      locationFields,
      tehsilField?.key,
      tehsilField?.value,
    ],
  );
  const primarySearchModeField = searchModeFields[0];
  const activeSearchInput = useMemo(
    () =>
      assistantData?.inputs.find(field =>
        matchesKeywords(
          `${field.label} ${field.placeholder}`,
          SEARCH_INPUT_KEYWORDS,
        ),
      ) ||
      assistantData?.inputs[0] ||
      null,
    [assistantData],
  );
  const primarySearchAction = useMemo(
    () =>
      assistantData?.buttons.find(button =>
        matchesKeywords(button.label, SEARCH_ACTION_KEYWORDS),
      ),
    [assistantData],
  );
  const portalBackAction = useMemo(
    () =>
      assistantData?.buttons.find(button =>
        normalize(button.label).includes('back'),
      ),
    [assistantData],
  );
  const guidedLocationFields = [
    districtField,
    tehsilField,
    villageField,
    firstLetterField,
  ].reduce<PortalField[]>((accumulator, field) => {
    if (
      field &&
      !accumulator.some(
        currentField => currentField.key === field.key,
      )
    ) {
      accumulator.push(field);
    }

    return accumulator;
  }, []);
  const activeSearchDraft = activeSearchInput
    ? inputDrafts[activeSearchInput.key] ??
      activeSearchInput.value ??
      ''
    : '';
  const showNumericKeypad =
    Boolean(activeSearchInput) &&
    matchesKeywords(
      `${activeSearchInput?.label ?? ''} ${
        activeSearchInput?.placeholder ?? ''
      }`,
      NUMERIC_INPUT_KEYWORDS,
    );
  const isSearchFlowReady =
    Boolean(primarySearchModeField) &&
    Boolean(districtField?.value) &&
    Boolean(tehsilField?.value) &&
    Boolean(villageField?.value);
  const hasGuidedFlowControls =
    guidedLocationFields.length > 0 ||
    Boolean(primarySearchModeField) ||
    Boolean(activeSearchInput);
  const selectedSearchModeOption = primarySearchModeField?.options.find(
    option => option.value === primarySearchModeField.value,
  );
  const selectedSearchWorkflow = useMemo(
    () =>
      SEARCH_WORKFLOW_OPTIONS.find(
        workflow => workflow.id === selectedSearchWorkflowId,
      ) || null,
    [selectedSearchWorkflowId],
  );
  const searchInputPlaceholder =
    activeSearchInput?.placeholder ||
    selectedSearchWorkflow?.title ||
    selectedSearchModeOption?.label ||
    strings.assistantCurrentValue;
  const searchResultText = parsedResult?.looksLikeResult
    ? parsedResult.summaryLines[0] || PORTAL_EMPTY_RESULT_TEXT
    : PORTAL_EMPTY_RESULT_TEXT;
  const isPortalRouteReady =
    hasGuidedFlowControls ||
    Boolean(parsedResult?.looksLikeResult);
  const assistantTrayTitle = strings.upBhulekhAssistantTitle;
  const orderedStageKeys = [
    'district',
    'tehsil',
    'village',
  ] as const;
  const stageFieldMap = {
    district: districtField,
    tehsil: tehsilField,
    village: villageField,
  };
  const selectionStages = [
    {
      key: 'district' as const,
      field: districtField,
    },
    {
      key: 'tehsil' as const,
      field: tehsilField,
    },
    {
      key: 'village' as const,
      field: villageField,
    },
  ].filter(
    (
      stage,
    ): stage is {
      key: 'district' | 'tehsil' | 'village';
      field: PortalField;
    } => Boolean(stage.field),
  );
  const activeSelectionField =
    activeSelectionStage === 'district'
      ? districtField
      : activeSelectionStage === 'tehsil'
        ? tehsilField
        : villageField;
  const activeSelectionOptions = useMemo(
    () => getCleanPortalOptions(activeSelectionField),
    [activeSelectionField],
  );
  const letterOptions = firstLetterField
    ? firstLetterField.options.filter(option =>
        option.label.trim().length <= 3,
      )
    : [];
  const allVillageOption = firstLetterField?.options.find(
    option => option.label.trim().length > 3,
  );
  const selectionLoadingCopy =
    activeSelectionStage === 'district'
      ? 'Loading district list from the official UP Bhulekh portal...'
      : activeSelectionStage === 'tehsil'
        ? 'Loading tehsil list for the selected district from the official portal...'
        : 'Loading village list for the selected tehsil from the official portal...';
  const isSearchWorkspaceActive =
    portalLandingMode === 'search';
  const isLivePortalWorkspaceActive =
    portalLandingMode === 'live';
  const mainScrollEnabled =
    portalLandingMode !== 'search' || isSearchFlowReady;
  const useStaticGuidedPanel =
    isSearchWorkspaceActive && !isSearchFlowReady;
  const launchedFromDirectHomeShortcut = Boolean(
    launchAction,
  );
  const shouldReturnToKhasraMenuOnBack =
    launchedFromDirectHomeShortcut &&
    directLaunchAction?.mode === 'open-khasra-menu' &&
    portalLandingMode === 'live' &&
    portalSourceUrl.startsWith(EKHASRA_BASE_URL);

  const updateActiveSearchInput = (nextValue: string) => {
    if (!activeSearchInput) {
      return;
    }

    setInputDrafts(previous => ({
      ...previous,
      [activeSearchInput.key]: nextValue,
    }));
    applyInputValue(activeSearchInput, nextValue);
  };

  const appendActiveSearchDigit = (digit: string) => {
    updateActiveSearchInput(`${activeSearchDraft}${digit}`);
  };

  const deleteActiveSearchDigit = () => {
    updateActiveSearchInput(activeSearchDraft.slice(0, -1));
  };

  const clearActiveSearchInput = () => {
    updateActiveSearchInput('');
  };

  useEffect(() => {
    if (
      !isSearchWorkspaceActive ||
      !selectedSearchWorkflowId ||
      !primarySearchModeField
    ) {
      return;
    }

    const matchedPortalOption =
      primarySearchModeField.options.find(
        option =>
          getSearchWorkflowId(option.label) ===
          selectedSearchWorkflowId,
      );

    if (
      !matchedPortalOption ||
      primarySearchModeField.value === matchedPortalOption.value
    ) {
      return;
    }

    const escapedValue = JSON.stringify(matchedPortalOption.value);

    if (primarySearchModeField.type === 'select') {
      const selector = buildAttributeSelector(
        'data-rn-select-key',
        primarySearchModeField.key,
      );

      runScript(`
        (function () {
          var element = document.querySelector(
            ${JSON.stringify(selector)}
          );
          if (!element) {
            return;
          }
          element.value = ${escapedValue};
          element.dispatchEvent(new Event('input', {bubbles: true}));
          element.dispatchEvent(new Event('change', {bubbles: true}));
          if (window.__RN_BHULEKH_ASSISTANT__) {
            [250, 900, 1600].forEach(function (delay) {
              setTimeout(window.__RN_BHULEKH_ASSISTANT__.sync, delay);
            });
          }
        })();
      `);
    } else if (primarySearchModeField.type === 'click') {
      const groupSelector = `[data-rn-click-group=${JSON.stringify(
        primarySearchModeField.key,
      )}][data-rn-click-value=${JSON.stringify(
        matchedPortalOption.value,
      )}]`;

      runScript(`
        (function () {
          var groupElements = document.querySelectorAll(
            ${JSON.stringify(
              buildAttributeSelector(
                'data-rn-click-group',
                primarySearchModeField.key,
              ),
            )}
          );
          var element = document.querySelector(
            ${JSON.stringify(groupSelector)}
          );
          if (!element) {
            return;
          }
          Array.prototype.forEach.call(
            groupElements,
            function (groupElement) {
              groupElement.removeAttribute('data-rn-click-selected');
            }
          );
          element.setAttribute('data-rn-click-selected', 'true');
          ['pointerdown', 'mousedown', 'touchstart', 'mouseup', 'touchend', 'click'].forEach(
            function (eventName) {
              try {
                var event = new MouseEvent(eventName, {
                  bubbles: true,
                  cancelable: true,
                  view: window,
                });
                element.dispatchEvent(event);
              } catch (error) {}
            }
          );
          if (typeof element.click === 'function') {
            element.click();
          }
          if (window.__RN_BHULEKH_ASSISTANT__) {
            [450, 1100, 2000].forEach(function (delay) {
              setTimeout(window.__RN_BHULEKH_ASSISTANT__.sync, delay);
            });
          }
        })();
      `);
    } else {
      const selector = buildAttributeSelector(
        'data-rn-radio-group',
        primarySearchModeField.key,
      );

      runScript(`
        (function () {
          var elements = document.querySelectorAll(
            ${JSON.stringify(selector)}
          );
          Array.prototype.forEach.call(elements, function (element) {
            element.checked = element.value === ${escapedValue};
            if (element.checked) {
              element.dispatchEvent(new Event('input', {bubbles: true}));
              element.dispatchEvent(new Event('change', {bubbles: true}));
            }
          });
          if (window.__RN_BHULEKH_ASSISTANT__) {
            [250, 900, 1600].forEach(function (delay) {
              setTimeout(window.__RN_BHULEKH_ASSISTANT__.sync, delay);
            });
          }
        })();
      `);
    }

    setPortalFallbackVisible(false);
  }, [
    isSearchWorkspaceActive,
    primarySearchModeField,
    runScript,
    selectedSearchWorkflowId,
  ]);

  useEffect(() => {
    autoRouteTriggeredRef.current = false;
    setPortalFallbackVisible(false);
  }, [webKey]);

  useEffect(() => {
    if (!isSearchWorkspaceActive) {
      return;
    }

    const firstPendingStage =
      selectionStages.find(stage => !stage.field?.value)?.key ??
      selectionStages[0]?.key;

    if (!firstPendingStage) {
      return;
    }

    if (
      !isSearchFlowReady &&
      activeSelectionStage !== firstPendingStage
    ) {
      setActiveSelectionStage(firstPendingStage);
    }
  }, [
    activeSelectionStage,
    isSearchFlowReady,
    isSearchWorkspaceActive,
    selectionStages,
  ]);

  useEffect(() => {
    if (!isSearchWorkspaceActive || isPortalRouteReady) {
      return;
    }

    const timeout = setTimeout(() => {
      setPortalFallbackVisible(true);
    }, 2200);

    return () => clearTimeout(timeout);
  }, [isPortalRouteReady, isSearchWorkspaceActive, webKey]);

  useEffect(() => {
    if (
      !isSearchWorkspaceActive ||
      !portalFallbackVisible ||
      isPortalRouteReady
    ) {
      return;
    }

    const retryTimer = setTimeout(() => {
      if (!hasGuidedFlowControls && !parsedResult?.looksLikeResult) {
        retryOpenAssistedRoute();
        return;
      }

      syncAssistant();
    }, 400);

    return () => clearTimeout(retryTimer);
  }, [
    hasGuidedFlowControls,
    isPortalRouteReady,
    isSearchWorkspaceActive,
    parsedResult?.looksLikeResult,
    portalFallbackVisible,
    retryOpenAssistedRoute,
    syncAssistant,
  ]);

  useEffect(() => {
    if (
      autoRouteTriggeredRef.current ||
      !isSearchWorkspaceActive ||
      !assistantData ||
      hasGuidedFlowControls ||
      parsedResult?.looksLikeResult
    ) {
      return;
    }

    autoRouteTriggeredRef.current = true;

    retryOpenAssistedRoute();

    const retryTimer = setTimeout(() => {
      autoRouteTriggeredRef.current = false;
      syncAssistant();
    }, 1600);

    return () => clearTimeout(retryTimer);
  }, [
    assistantData,
    hasGuidedFlowControls,
    isSearchWorkspaceActive,
    parsedResult?.looksLikeResult,
    retryOpenAssistedRoute,
    syncAssistant,
  ]);

  const renderGuidedFlowContent = (_showHeading = true) => {
    const renderPortalHomeActionRow = (
      action: PortalHomeAction,
    ) => (
      <AppPressable
        key={action.title}
        onPress={() => handlePortalHomeActionPress(action)}

        style={styles.portalActionRow}>
        <View
          style={[
            styles.portalActionIconWrap,
            {backgroundColor: `${action.accentColor}16`},
          ]}>
          <Icon
            color={action.accentColor}
            name={action.icon}
            size={22}
          />
        </View>

        <View style={styles.portalActionCopy}>
          <Text style={styles.portalActionTitle}>
            {action.title}
          </Text>
        </View>
        <Icon
          color={action.accentColor}
          name="chevron-right"
          size={20}
        />
      </AppPressable>
    );

    const renderPortalServiceCard = (
      action: PortalHomeAction,
    ) => (
      <AppPressable
        key={action.title}
        onPress={() => handlePortalHomeActionPress(action)}

        style={styles.portalServiceCard}>
        <View
          style={[
            styles.portalServiceIconWrap,
            {backgroundColor: `${action.accentColor}16`},
          ]}>
          <Icon
            color={action.accentColor}
            name={action.icon}
            size={24}
          />
        </View>

        <Text style={styles.portalServiceTitle}>
          {action.title}
        </Text>
      </AppPressable>
    );

    const renderPortalQuickRouteCard = (
      quickRoute: PortalQuickRoute,
      index: number,
    ) => {
      const tone =
        PORTAL_QUICK_ROUTE_TONES[
          index % extraPortalQuickRoutes.length %
            PORTAL_QUICK_ROUTE_TONES.length
        ];

        return (
        <AppPressable
          key={`${quickRoute.source}-${quickRoute.key}-${index}`}
          onPress={() => {
            setPortalLandingMode('live');
            setActivePortalHeaderTitle(
              getCompactPortalTitle(quickRoute.label),
            );
            setSelectedSearchWorkflowId(null);
            setPortalFallbackVisible(false);
            triggerAction(
              quickRoute,
              quickRoute.source,
            );
          }}

          style={[
            styles.morePortalCard,
            {
              backgroundColor: tone.backgroundColor,
              borderColor: tone.borderColor,
            },
          ]}>
          <View style={styles.morePortalBadge}>
            <Icon
              color={tone.textColor}
              name="chevron-right"
              size={14}
            />
          </View>
          <Text
            numberOfLines={2}
            style={[
              styles.morePortalTitle,
              {color: tone.textColor},
            ]}>
            {quickRoute.label}
          </Text>
        </AppPressable>
      );
    };

    const renderPortalHome = () => (
      <View style={styles.portalLandingStack}>
        <View style={styles.portalServiceGrid}>
          {visiblePrimaryServiceActions.map(
            renderPortalServiceCard,
          )}
        </View>

        <View style={styles.portalHomeSection}>
          <View style={styles.portalActionList}>
            {PORTAL_DIRECTORY_ACTIONS.map(
              renderPortalHomeActionRow,
            )}
          </View>
        </View>

        {extraPortalQuickRoutes.length ? (
          <View style={styles.portalHomeSection}>
            <View style={styles.morePortalRail}>
              <Animated.View
                style={[
                  styles.morePortalRailContent,
                  {
                    transform: [
                      {translateX: portalQuickTicker},
                    ],
                  },
                ]}>
              {movingPortalQuickRoutes.map(
                renderPortalQuickRouteCard,
              )}
              </Animated.View>
            </View>
          </View>
        ) : null}
      </View>
    );

    const renderKhasraMenu = () => (
      <View style={styles.portalLandingStack}>
        <View style={styles.portalHomeSection}>
          <View style={styles.portalServiceGrid}>
            {KHASRA_MENU_ACTIONS.map(action => (
              <AppPressable
                key={action.id}
                onPress={() =>
                  queuePortalRouteOpen(
                    action.directUrl,
                    action.exactLabels,
                    action.keywords,
                    action.title,
                    [],
                    action.directUrl,
                  )
                }

                style={[
                  styles.portalServiceCard,
                  styles.khasraMenuCard,
                  {
                    borderColor: `${action.accentColor}42`,
                  },
                ]}>
                <View style={styles.khasraMenuRow}>
                  <View
                    style={[
                      styles.portalServiceIconWrap,
                      styles.khasraMenuIconWrap,
                      {
                        backgroundColor: `${action.accentColor}16`,
                      },
                    ]}>
                    <Icon
                      color={action.accentColor}
                      name={action.icon}
                      size={22}
                    />
                  </View>

                  <Text
                    numberOfLines={2}
                    style={[
                      styles.portalServiceTitle,
                      styles.khasraMenuTitle,
                    ]}>
                    {action.title}
                  </Text>

                  <Icon
                    color={action.accentColor}
                    name="chevron-right"
                    size={20}
                  />
                </View>
              </AppPressable>
            ))}
          </View>
        </View>
      </View>
    );

    const renderPortalStageTabs = () => (
      <View style={styles.portalStageTabs}>
        {orderedStageKeys.map(stageKey => {
          const stageField = stageFieldMap[stageKey];
          const selected = activeSelectionStage === stageKey;

          return (
            <AppPressable
              key={stageKey}
              onPress={() =>
                stageField && setActiveSelectionStage(stageKey)
              }

              style={[
                styles.portalStageTab,
                selected && styles.portalStageTabActive,
                !stageField && styles.portalStageTabDisabled,
              ]}>
              <Text
                numberOfLines={1}
                style={[
                  styles.portalStageTabText,
                  selected && styles.portalStageTabTextActive,
                  !stageField && styles.portalStageTabTextDisabled,
                ]}>
                {PORTAL_STAGE_LABELS[stageKey]}
              </Text>
            </AppPressable>
          );
        })}
      </View>
    );

    const renderPortalSelectionWorkspace = () => (
      <View style={styles.selectionWorkspace}>
        <View style={styles.selectionListPanel}>
          {activeSelectionField && activeSelectionOptions.length ? (
            <FlatList
              data={activeSelectionOptions}
              nestedScrollEnabled
              removeClippedSubviews={false}
              keyExtractor={item =>
                `${activeSelectionField.key}-${item.value}-${item.label}`
              }
              renderItem={({item}) => {
                const selected =
                  activeSelectionField.value === item.value;

                return (
                  <AppPressable
                    onPress={() =>
                      applyFieldValue(
                        activeSelectionField,
                        item.value,
                      )
                    }
                    style={[
                      styles.selectionListItem,
                      selected &&
                        styles.selectionListItemActive,
                    ]}>
                    <Text
                      style={[
                        styles.selectionListText,
                        selected &&
                          styles.selectionListTextActive,
                      ]}>
                      {item.label}
                    </Text>
                  </AppPressable>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.selectionEmptyState}>
              <Text style={styles.selectionEmptyTitle}>
                {portalFallbackVisible
                  ? 'Portal controls are taking longer than expected.'
                  : 'Opening district, tehsil, and village flow...'}
              </Text>
              <Text style={styles.selectionEmptyBody}>
                {portalFallbackVisible
                  ? 'Use sync or reload to refresh the official page inside the app.'
                  : selectionLoadingCopy}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.selectionLetterPanel}>
          <View style={styles.selectionLetterHeader}>
            <Text style={styles.selectionLetterHeaderText}>
              {PORTAL_FIRST_LETTER_LABEL}
            </Text>
          </View>

          {letterOptions.length ? (
            <>
              <View style={styles.selectionLetterGrid}>
                {letterOptions.map(option => {
                  const selected =
                    firstLetterField?.value === option.value;

                  return (
                    <AppPressable
                      key={`${option.value}-${option.label}`}
                      onPress={() =>
                        firstLetterField &&
                        applyFieldValue(
                          firstLetterField,
                          option.value,
                        )
                      }

                      style={[
                        styles.selectionLetterChip,
                        selected &&
                          styles.selectionLetterChipActive,
                      ]}>
                      <Text
                        style={[
                          styles.selectionLetterChipText,
                          selected &&
                            styles.selectionLetterChipTextActive,
                        ]}>
                        {option.label}
                      </Text>
                    </AppPressable>
                  );
                })}
              </View>

              {allVillageOption && firstLetterField ? (
                <AppPressable
                  onPress={() =>
                    applyFieldValue(
                      firstLetterField,
                      allVillageOption.value,
                    )
                  }

                  style={styles.selectionAllVillageButton}>
                  <Text
                    style={styles.selectionAllVillageText}>
                    {allVillageOption.label}
                  </Text>
                </AppPressable>
              ) : null}
            </>
          ) : (
            <View style={styles.selectionEmptyCompact}>
              <Text style={styles.selectionEmptyBody}>
                Choose district and tehsil first to load village letters.
              </Text>
            </View>
          )}
        </View>
      </View>
    );

    if (
      directLaunchPending &&
      directLaunchAction &&
      portalLandingMode === 'home'
    ) {
      return (
        <View style={styles.directLaunchLoader}>
          <ActivityIndicator
            color={COLORS.primary}
            size="large"
          />
        </View>
      );
    }

    if (
      directLaunchPending &&
      directLaunchAction &&
      portalLandingMode === 'home' &&
      !directLaunchAction.directUrl
    ) {
      return (
        <View style={styles.directLaunchLoader}>
          <ActivityIndicator
            color={COLORS.primary}
            size="large"
          />
          <Text style={styles.directLaunchLoaderTitle}>
            {language === 'hi'
              ? `${getCompactPortalTitle(
                  directLaunchAction.title,
                )} खोला जा रहा है...`
              : `Opening ${getCompactPortalTitle(
                  directLaunchAction.title,
                )}...`}
          </Text>
          <Text style={styles.directLaunchLoaderBody}>
            {language === 'hi'
              ? 'आधिकारिक पेज सीधे ऐप के अंदर लोड हो रहा है।'
              : 'The official page is loading directly inside the app.'}
          </Text>
        </View>
      );
    }

    if (portalLandingMode === 'home') {
      return renderPortalHome();
    }

    if (portalLandingMode === 'khasra-menu') {
      return renderKhasraMenu();
    }

    if (!hasGuidedFlowControls && !parsedResult?.looksLikeResult) {
      return (
        <View style={styles.loadingFlowCard}>
          <View style={styles.loadingStepRow}>
            <View style={styles.loadingStepBlock} />
            <View style={styles.loadingStepBlock} />
            <View style={styles.loadingStepBlockWide} />
          </View>

          <View style={styles.loadingPanel} />
          <View style={styles.loadingPanelTall} />
          <View style={styles.loadingKeypadPanel} />

          {portalFallbackVisible ? (
            <View style={styles.topActionRow}>
              <AppPressable
                onPress={syncAssistant}
                style={styles.topActionButton}>
                <Text style={styles.topActionText}>
                  {strings.assistantSync}
                </Text>
              </AppPressable>

              <AppPressable
                onPress={() => setWebKey(current => current + 1)}
                style={styles.topActionButton}>
                <Text style={styles.topActionText}>
                  {strings.assistantReload}
                </Text>
              </AppPressable>
            </View>
          ) : null}
        </View>
      );
    }

    return (
      <>
        <View style={styles.portalGovtBanner}>
          <Text style={styles.portalGovtBannerText}>
            {PORTAL_GOVT_BANNER_TEXT}
          </Text>
        </View>

        {isSearchFlowReady ? (
          <>
            <View style={styles.portalSearchSummaryBar}>
              {selectionStages.map(stage => (
                <View
                  key={`summary-${stage.key}`}
                  style={styles.portalSearchSummaryCell}>
                  <Text
                    numberOfLines={1}
                    style={styles.portalSearchSummaryText}>
                    {`${stage.field.label}: ${getFieldDisplayValue(
                      stage.field,
                    )}`}
                  </Text>
                </View>
              ))}
              <View style={styles.portalSeasonBadge}>
                <Text style={styles.portalSeasonBadgeText}>
                  {'\u0935\u0930\u094d\u0924\u092e\u093e\u0928 \u092b\u0938\u0932\u0940'}
                </Text>
              </View>
            </View>

            {portalBackAction ? (
              <AppPressable
                onPress={() =>
                  triggerAction(portalBackAction, 'button')
                }

                style={styles.portalBackButton}>
                <Text style={styles.portalBackButtonText}>
                  Back
                </Text>
              </AppPressable>
            ) : null}

            {primarySearchModeField ? (
              <View style={styles.searchModeTabRow}>
                {primarySearchModeField.options.map(option => {
                  const selected =
                    primarySearchModeField.value === option.value;

                  return (
                    <AppPressable
                      key={`${primarySearchModeField.key}-${option.value}`}
                      onPress={() => {
                        setSelectedSearchWorkflowId(
                          getSearchWorkflowId(option.label),
                        );
                        applyFieldValue(
                          primarySearchModeField,
                          option.value,
                        );
                      }}

                      style={[
                        styles.searchModeTab,
                        selected && styles.searchModeTabActive,
                      ]}>
                      <Text
                        style={[
                          styles.searchModeTabText,
                          selected &&
                            styles.searchModeTabTextActive,
                        ]}>
                        {option.label}
                      </Text>
                    </AppPressable>
                  );
                })}
              </View>
            ) : null}

            {activeSearchInput ? (
              <View style={styles.searchWorkspaceCard}>
                <View style={styles.searchInputRow}>
                  <TextInput
                    onChangeText={value =>
                      updateActiveSearchInput(value)
                    }
                    placeholder={searchInputPlaceholder}
                    placeholderTextColor={COLORS.textSoft}
                    style={styles.portalSearchInput}
                    value={activeSearchDraft}
                  />

                  {primarySearchAction ? (
                    <AppPressable
                      onPress={() =>
                        triggerAction(
                          primarySearchAction,
                          'button',
                        )
                      }
                      style={styles.portalSearchButton}>
                      <Text
                        style={styles.portalSearchButtonText}>
                        {primarySearchAction.label}
                      </Text>
                    </AppPressable>
                  ) : null}
                </View>

                <View style={styles.portalResultPlaceholder}>
                  <Text style={styles.portalResultPlaceholderText}>
                    {searchResultText}
                  </Text>
                </View>

                {showNumericKeypad ? (
                  <View style={styles.keypadGrid}>
                    {[
                      '0',
                      '1',
                      '2',
                      '3',
                      '4',
                      '5',
                      '6',
                      '7',
                      '8',
                      '9',
                    ].map(digit => (
                      <AppPressable
                        key={digit}
                        onPress={() =>
                          appendActiveSearchDigit(digit)
                        }

                        style={styles.portalKeypadButton}>
                        <Text style={styles.keypadButtonText}>
                          {digit}
                        </Text>
                      </AppPressable>
                    ))}

                    <AppPressable
                      onPress={deleteActiveSearchDigit}

                      style={styles.portalKeypadButton}>
                      <Text style={styles.keypadButtonText}>
                        {'\u232b'}
                      </Text>
                    </AppPressable>

                    <AppPressable
                      onPress={clearActiveSearchInput}

                      style={styles.portalKeypadButton}>
                      <Text style={styles.keypadButtonText}>
                        clear
                      </Text>
                    </AppPressable>
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <>
            {renderPortalStageTabs()}
            {renderPortalSelectionWorkspace()}
          </>
        )}
      </>
    );

    /* Legacy renderer kept below while the new portal layout settles.
    if (!hasGuidedFlowControls) {
      return (
        <View style={styles.loadingFlowCard}>
          <View style={styles.loadingStepRow}>
            <View style={styles.loadingStepBlock} />
            <View style={styles.loadingStepBlock} />
            <View style={styles.loadingStepBlockWide} />
          </View>

          <View style={styles.loadingPanel} />
          <View style={styles.loadingPanelTall} />
          <View style={styles.loadingKeypadPanel} />

          {portalFallbackVisible ? (
            <View style={styles.topActionRow}>
              <AppPressable
                onPress={syncAssistant}
                style={styles.topActionButton}>
                <Text style={styles.topActionText}>
                  {strings.assistantSync}
                </Text>
              </AppPressable>

              <AppPressable
                onPress={() => setWebKey(current => current + 1)}
                style={styles.topActionButton}>
                <Text style={styles.topActionText}>
                  {strings.assistantReload}
                </Text>
              </AppPressable>
            </View>
          ) : null}
        </View>
      );
    }

    return (
      <>
        <View style={styles.portalGovtBanner}>
          <Text style={styles.portalGovtBannerText}>
            राजस्व परिषद | उत्तर प्रदेश सरकार
          </Text>
        </View>

        <View style={styles.portalStageTabs}>
          {selectionStages.map(stage => (
            <AppPressable
              key={stage.key}
              onPress={() => setActiveSelectionStage(stage.key)}

              style={[
                styles.portalStageTab,
                activeSelectionField?.key === stage.field.key &&
                  styles.portalStageTabActive,
              ]}>
              <Text
                numberOfLines={1}
                style={[
                  styles.portalStageTabText,
                  activeSelectionField?.key === stage.field.key &&
                    styles.portalStageTabTextActive,
                ]}>
                {getFieldDisplayValue(stage.field) ||
                  stage.field.label}
              </Text>
            </AppPressable>
          ))}
        </View>

        {primarySearchModeField || activeSearchInput ? (
          <>
            <View style={styles.portalSelectionSummary}>
              {selectionStages.map(stage => (
                <View
                  key={`summary-${stage.key}`}
                  style={styles.portalSummaryChip}>
                  <Text style={styles.portalSummaryLabel}>
                    {stage.field.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={styles.portalSummaryValue}>
                    {getFieldDisplayValue(stage.field) ||
                      strings.assistantSelectOption}
                  </Text>
                </View>
              ))}
            </View>

            {primarySearchModeField ? (
              <View style={styles.searchModeTabRow}>
                {primarySearchModeField.options.map(option => {
                  const selected =
                    primarySearchModeField.value === option.value;

                  return (
                    <AppPressable
                      key={`${primarySearchModeField.key}-${option.value}`}
                      onPress={() =>
                        applyFieldValue(
                          primarySearchModeField,
                          option.value,
                        )
                      }

                      style={[
                        styles.searchModeTab,
                        selected &&
                          styles.searchModeTabActive,
                      ]}>
                      <Text
                        style={[
                          styles.searchModeTabText,
                          selected &&
                            styles.searchModeTabTextActive,
                        ]}>
                        {option.label}
                      </Text>
                    </AppPressable>
                  );
                })}
              </View>
            ) : null}

            {activeSearchInput ? (
              <View style={styles.searchWorkspaceCard}>
                <View style={styles.searchInputRow}>
                  <TextInput
                    onChangeText={value =>
                      updateActiveSearchInput(value)
                    }
                    placeholder={
                      activeSearchInput.placeholder ||
                      strings.assistantCurrentValue
                    }
                    placeholderTextColor={COLORS.textSoft}
                    style={styles.portalSearchInput}
                    value={activeSearchDraft}
                  />

                  {primarySearchAction ? (
                    <AppPressable
                      onPress={() =>
                        triggerAction(
                          primarySearchAction,
                          'button',
                        )
                      }
                      style={styles.portalSearchButton}>
                      <Text
                        style={styles.portalSearchButtonText}>
                        {primarySearchAction.label}
                      </Text>
                    </AppPressable>
                  ) : null}
                </View>

                <View style={styles.portalResultPlaceholder}>
                  <Text style={styles.portalResultPlaceholderText}>
                    {parsedResult?.summaryLines[0] ||
                      'No data available.'}
                  </Text>
                </View>

                {showNumericKeypad ? (
                  <View style={styles.keypadGrid}>
                    {[
                      '0',
                      '1',
                      '2',
                      '3',
                      '4',
                      '5',
                      '6',
                      '7',
                      '8',
                      '9',
                    ].map(digit => (
                      <AppPressable
                        key={digit}
                        onPress={() =>
                          appendActiveSearchDigit(digit)
                        }

                        style={styles.portalKeypadButton}>
                        <Text style={styles.keypadButtonText}>
                          {digit}
                        </Text>
                      </AppPressable>
                    ))}

                    <AppPressable
                      onPress={deleteActiveSearchDigit}

                      style={styles.portalKeypadButton}>
                      <Text style={styles.keypadButtonText}>
                        Back
                      </Text>
                    </AppPressable>

                    <AppPressable
                      onPress={clearActiveSearchInput}

                      style={styles.portalKeypadWideButton}>
                      <Text
                        style={[
                          styles.keypadButtonText,
                          styles.keypadButtonWideText,
                        ]}>
                        Clear
                      </Text>
                    </AppPressable>
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.selectionWorkspace}>
            <View style={styles.selectionListPanel}>
              {activeSelectionField ? (
                <FlatList
                  data={activeSelectionField.options}
                  keyExtractor={item =>
                    `${activeSelectionField.key}-${item.value}-${item.label}`
                  }
                  renderItem={({item}) => (
                    <AppPressable
                      onPress={() =>
                        applyFieldValue(
                          activeSelectionField,
                          item.value,
                        )
                      }
                      style={styles.selectionListItem}>
                      <Text style={styles.selectionListText}>
                        {item.label}
                      </Text>
                    </AppPressable>
                  )}
                  showsVerticalScrollIndicator={false}
                />
              ) : null}
            </View>

            {letterOptions.length ? (
              <View style={styles.selectionLetterPanel}>
                <View style={styles.selectionLetterGrid}>
                  {letterOptions.map(option => {
                    const selected =
                      firstLetterField?.value === option.value;

                    return (
                      <AppPressable
                        key={`${option.value}-${option.label}`}
                        onPress={() =>
                          firstLetterField &&
                          applyFieldValue(
                            firstLetterField,
                            option.value,
                          )
                        }

                        style={[
                          styles.selectionLetterChip,
                          selected &&
                            styles.selectionLetterChipActive,
                        ]}>
                        <Text
                          style={[
                            styles.selectionLetterChipText,
                            selected &&
                              styles.selectionLetterChipTextActive,
                          ]}>
                          {option.label}
                        </Text>
                      </AppPressable>
                    );
                  })}
                </View>

                {allVillageOption && firstLetterField ? (
                  <AppPressable
                    onPress={() =>
                      applyFieldValue(
                        firstLetterField,
                        allVillageOption.value,
                      )
                    }

                    style={styles.selectionAllVillageButton}>
                    <Text
                      style={styles.selectionAllVillageText}>
                      {allVillageOption.label}
                    </Text>
                  </AppPressable>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </>
    );
    */
  };

  return (
    <AppScreen
      contentContainerStyle={styles.fill}
      scroll={false}>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => {
          if (portalLandingMode === 'home') {
            navigation.goBack();
            return;
          }

          if (shouldReturnToKhasraMenuOnBack) {
            openKhasraMenuSurface();
            return;
          }

          if (launchedFromDirectHomeShortcut) {
            navigation.goBack();
            return;
          }

          if (
            portalLandingMode === 'live' &&
            portalSourceUrl.startsWith(EKHASRA_BASE_URL)
          ) {
            openKhasraMenuSurface();
            return;
          }

          openPortalHomeSurface();
        }}
        rightIcons={[]}
        title={
          directLaunchPending && directLaunchAction
            ? getCompactPortalTitle(
                directLaunchAction.title,
              )
            : portalLandingMode === 'home'
            ? 'LEKHPAL [Fast Work]'
            : portalLandingMode === 'khasra-menu'
            ? 'Khasra'
            : activePortalHeaderTitle ||
              assistantData?.pageTitle ||
              'UP Bhulekh'
        }
      />

      <View style={styles.content}>
        <View
          pointerEvents={
            isLivePortalWorkspaceActive ? 'auto' : 'none'
          }
          style={
            isLivePortalWorkspaceActive
              ? styles.liveWebViewCard
              : styles.hiddenWebViewCard
          }>
          <WebView
            domStorageEnabled
            injectedJavaScript={webViewInjectedScript}
            javaScriptCanOpenWindowsAutomatically
            javaScriptEnabled
            key={`${webKey}-${UP_BHULEKH_ASSISTANT_SCRIPT_VERSION}`}
            onError={syntheticEvent => {
              console.log(
                '[BhulekhAssistant] webview-error',
                syntheticEvent.nativeEvent,
              );
            }}
            onHttpError={syntheticEvent => {
              console.log(
                '[BhulekhAssistant] webview-http-error',
                syntheticEvent.nativeEvent,
              );
            }}
            onLoadEnd={syntheticEvent => {
              console.log(
                '[BhulekhAssistant] load-end',
                syntheticEvent.nativeEvent.url,
              );
            }}
            onLoadStart={syntheticEvent => {
              console.log(
                '[BhulekhAssistant] load-start',
                syntheticEvent.nativeEvent.url,
              );
            }}
            onMessage={onMessage}
            onNavigationStateChange={navigationState => {
              console.log(
                '[BhulekhAssistant] nav-state',
                navigationState.url,
                navigationState.loading,
              );
            }}
            ref={webViewRef}
            setSupportMultipleWindows={false}
            sharedCookiesEnabled
            source={{uri: portalSourceUrl}}
            style={styles.webView}
            thirdPartyCookiesEnabled
            userAgent={STANDARD_MOBILE_BROWSER_USER_AGENT}
          />
        </View>

        {isLivePortalWorkspaceActive ? null : useStaticGuidedPanel ? (
          <View style={styles.guidedMainPanel}>
            <View style={styles.guidedMainContent}>
              {renderGuidedFlowContent(false)}
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.guidedMainContent}
            nestedScrollEnabled
            scrollEnabled={mainScrollEnabled}
            style={styles.guidedMainPanel}>
            {renderGuidedFlowContent(false)}
          </ScrollView>
        )}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setAssistantSheetVisible(false)}
        transparent
        visible={assistantSheetVisible}>
        <View style={styles.assistantSheetOverlay}>
          <AppPressable
            onPress={() => setAssistantSheetVisible(false)}
            style={styles.assistantSheetBackdrop}>
            <View style={styles.assistantSheetBackdropFill} />
          </AppPressable>

          <View style={styles.assistantSheetCard}>
            <View style={styles.assistantSheetHandle} />

            <View style={styles.assistantSheetHeader}>
              <View style={styles.assistantSheetHeaderCopy}>
                <Text style={styles.assistantTrayTitle}>
                  {assistantTrayTitle}
                </Text>
                <Text
                  numberOfLines={1}
                  style={styles.assistantTrayStatus}>
                  {assistantTrayStatus}
                </Text>
              </View>

              <AppPressable
                onPress={() => setAssistantSheetVisible(false)}
                style={styles.assistantSheetCloseButton}>
                <Icon
                  color={COLORS.text}
                  name="close"
                  size={20}
                />
              </AppPressable>
            </View>

            <View style={styles.assistantSummaryRow}>
              <View style={styles.assistantSummaryChip}>
                <Text style={styles.assistantSummaryLabel}>
                  {strings.assistantDetectedPage}
                </Text>
                <Text
                  numberOfLines={1}
                  style={styles.assistantSummaryValue}>
                  {assistantData?.pageTitle || 'UP Bhulekh'}
                </Text>
              </View>

              <View style={styles.assistantSummaryChip}>
                <Text style={styles.assistantSummaryLabel}>
                  {strings.assistantSavedPreset}
                </Text>
                <Text
                  numberOfLines={1}
                  style={styles.assistantSummaryValue}>
                  {assistantPresetStatus}
                </Text>
              </View>

              <View style={styles.assistantSummaryChip}>
                <Text style={styles.assistantSummaryLabel}>
                  {strings.assistantRecentSearches}
                </Text>
                <Text
                  numberOfLines={1}
                  style={styles.assistantSummaryValue}>
                  {assistantHistoryStatus}
                </Text>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.assistantScroll}
              nestedScrollEnabled
              style={styles.assistantPanel}>
              {renderGuidedFlowContent()}

              <View style={styles.helpCard}>
                <Text style={styles.helpText}>
                  {strings.assistantHelp}
                </Text>
              </View>

              <View style={styles.topActionRow}>
                <AppPressable
                  onPress={() => setWebKey(current => current + 1)}
                  style={styles.topActionButton}>
                  <Text style={styles.topActionText}>
                    {strings.assistantReload}
                  </Text>
                </AppPressable>

                <AppPressable
                  onPress={syncAssistant}
                  style={styles.topActionButton}>
                  <Text style={styles.topActionText}>
                    {strings.assistantSync}
                  </Text>
                </AppPressable>

                <AppPressable
                  onPress={() => {
                    setAssistantSheetVisible(false);
                  }}
                  style={styles.topActionButton}>
                  <Text style={styles.topActionText}>
                    {strings.assistantOpenPortal}
                  </Text>
                </AppPressable>
              </View>

              <View style={styles.topActionRow}>
                <AppPressable
                  onPress={saveCurrentPreset}
                  style={styles.topActionButton}>
                  <Text style={styles.topActionText}>
                    {strings.assistantSavePreset}
                  </Text>
                </AppPressable>

                <AppPressable
                  onPress={restoreSavedPreset}
                  style={styles.topActionButton}>
                  <Text style={styles.topActionText}>
                    {strings.assistantRestorePreset}
                  </Text>
                </AppPressable>
              </View>

              <View style={styles.pageCard}>
                <Text style={styles.pageLabel}>
                  {strings.assistantDetectedPage}
                </Text>
                <Text style={styles.pageTitle}>
                  {assistantData?.pageTitle || 'UP Bhulekh'}
                </Text>
                <Text numberOfLines={1} style={styles.pageUrl}>
                  {assistantData?.url || UP_BHULEKH_URL}
                </Text>
              </View>

              <View style={styles.pageCard}>
                <Text style={styles.pageLabel}>
                  {strings.assistantSavedPreset}
                </Text>
                <Text style={styles.pageTitle}>
                  {savedPreset
                    ? strings.assistantSavedReady
                    : strings.assistantNoSavedPreset}
                </Text>
                {savedPreset?.labels.map(label => (
                  <Text key={label} style={styles.savedPresetText}>
                    {label}
                  </Text>
                ))}
              </View>

              <AppSectionTitle
                title={strings.assistantRecentSearches}
              />
              {recentSearches.length ? (
                recentSearches.map(search => (
                  <AppPressable
                    key={search.id}
                    onPress={() =>
                      applySearchState(
                        search.fieldValues,
                        search.inputValues,
                      )
                    }
                    style={styles.historyCard}>
                    {search.labels.map(label => (
                      <Text key={label} style={styles.historyText}>
                        {label}
                      </Text>
                    ))}
                    <Text style={styles.historyAction}>
                      {strings.assistantUseRecent}
                    </Text>
                  </AppPressable>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    {strings.assistantNoHistory}
                  </Text>
                </View>
              )}

              {parsedResult?.looksLikeResult ? (
                <>
                  <AppSectionTitle title={strings.assistantResults} />
                  <View style={styles.resultCard}>
                    <Text style={styles.resultTitle}>
                      {parsedResult.title || assistantData?.pageTitle}
                    </Text>
                    {parsedResult.summaryLines.map(line => (
                      <Text key={line} style={styles.resultLine}>
                        {line}
                      </Text>
                    ))}
                  </View>

                  {parsedResult.tables.map((table, tableIndex) => (
                    <View
                      key={`table-${tableIndex}`}
                      style={styles.tableCard}>
                      {table.map((row, rowIndex) => (
                        <View
                          key={`row-${tableIndex}-${rowIndex}`}
                          style={styles.tableRow}>
                          {row.map((cell, cellIndex) => (
                            <Text
                              key={`cell-${tableIndex}-${rowIndex}-${cellIndex}`}
                              style={[
                                styles.tableCell,
                                rowIndex === 0 &&
                                  styles.tableHeaderCell,
                              ]}>
                              {cell}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    {strings.assistantNoResults}
                  </Text>
                </View>
              )}

              {primaryLink ? (
                <>
                  <AppSectionTitle
                    title={strings.assistantPrimaryLink}
                  />
                  <AppPressable
                    onPress={() => triggerAction(primaryLink, 'link')}
                    style={styles.primaryRouteCard}>
                    <Text style={styles.primaryRouteText}>
                      {primaryLink.label}
                    </Text>
                  </AppPressable>
                </>
              ) : null}

              {assistantData?.links.length ? (
                <>
                  <AppSectionTitle title={strings.assistantLinks} />
                  <View style={styles.chipRow}>
                    {assistantData.links.map(link => (
                      <AppPressable
                        key={link.key}
                        onPress={() => triggerAction(link, 'link')}
                        style={styles.chipButton}>
                        <Text style={styles.chipText}>
                          {link.label}
                        </Text>
                      </AppPressable>
                    ))}
                  </View>
                </>
              ) : null}

              {assistantData?.buttons.length ? (
                <>
                  <AppSectionTitle title={strings.assistantActions} />
                  <View style={styles.chipRow}>
                    {assistantData.buttons.map(button => (
                      <AppPressable
                        key={button.key}
                        onPress={() =>
                          triggerAction(button, 'button')
                        }
                        style={styles.chipButton}>
                        <Text style={styles.chipText}>
                          {button.label}
                        </Text>
                      </AppPressable>
                    ))}
                  </View>
                </>
              ) : null}

              {locationFields.length ? (
                <>
                  <AppSectionTitle
                    title={strings.assistantLocationStep}
                  />
                  {locationFields.map(renderFieldCard)}
                </>
              ) : null}

              {searchModeFields.length ? (
                <>
                  <AppSectionTitle
                    title={strings.assistantSearchModeStep}
                  />
                  {searchModeFields.map(renderFieldCard)}
                </>
              ) : null}

              {assistantData?.inputs.length ? (
                <>
                  <AppSectionTitle
                    title={strings.assistantSearchValueStep}
                  />
                  {assistantData.inputs.map(field => (
                    <View
                      key={field.key}
                      style={styles.inputCard}>
                      <Text style={styles.fieldLabel}>
                        {field.label}
                      </Text>
                      <TextInput
                        onChangeText={value =>
                          setInputDrafts(previous => ({
                            ...previous,
                            [field.key]: value,
                          }))
                        }
                        onEndEditing={event =>
                          applyInputValue(
                            field,
                            event.nativeEvent.text,
                          )
                        }
                        placeholder={
                          field.placeholder ||
                          strings.assistantCurrentValue
                        }
                        placeholderTextColor={COLORS.textSoft}
                        style={styles.input}
                        value={inputDrafts[field.key] ?? ''}
                      />
                      <Text style={styles.inputHint}>
                        {strings.assistantApply}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}

              {otherFields.length ? (
                <>
                  <AppSectionTitle
                    title={strings.assistantOtherFields}
                  />
                  {otherFields.map(renderFieldCard)}
                </>
              ) : null}

              {!assistantData ||
              (!assistantData.links.length &&
                !assistantData.buttons.length &&
                !locationFields.length &&
                !searchModeFields.length &&
                !otherFields.length &&
                !assistantData.inputs.length) ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    {strings.assistantNoControls}
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => {
          setSelectedField(null);
          setOptionSearch('');
        }}
        transparent
        visible={Boolean(selectedField)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {selectedField?.label ||
                strings.assistantSelectOption}
            </Text>
            <TextInput
              onChangeText={setOptionSearch}
              placeholder={strings.assistantOptionSearch}
              placeholderTextColor={COLORS.textSoft}
              style={styles.modalSearchInput}
              value={optionSearch}
            />

            <FlatList
              data={filteredOptions}
              keyExtractor={item =>
                `${selectedField?.key}-${item.value}-${item.label}`
              }
              renderItem={({item}) => (
                <AppPressable
                  onPress={() =>
                    selectedField &&
                    applyFieldValue(selectedField, item.value)
                  }
                  style={styles.optionRow}>
                  <Text style={styles.optionText}>
                    {item.label}
                  </Text>
                </AppPressable>
              )}
              style={styles.optionList}
            />

            <AppPressable
              onPress={() => {
                setSelectedField(null);
                setOptionSearch('');
              }}
              style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>
                {strings.back}
              </Text>
            </AppPressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 0,
  },
  viewModeCard: {
    backgroundColor: COLORS.surface,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 12,
  },
  viewModeCopy: {
    marginBottom: 12,
  },
  viewModeTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  viewModeBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  viewModeTabs: {
    flexDirection: 'row',
  },
  viewModeTab: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 16,
    flex: 1,
    marginRight: 10,
    paddingVertical: 11,
  },
  viewModeTabActive: {
    backgroundColor: COLORS.primary,
  },
  viewModeTabText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  viewModeTabTextActive: {
    color: COLORS.white,
  },
  guidedMainPanel: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  guidedMainContent: {
    padding: 16,
    paddingBottom: 34,
  },
  assistantPanel: {
    flex: 1,
  },
  assistantScroll: {
    paddingBottom: 36,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  assistantLauncherWrap: {
    bottom: 18,
    left: 12,
    position: 'absolute',
    right: 12,
  },
  assistantLauncherButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    elevation: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#0f172a',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  assistantLauncherIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    marginRight: 12,
    width: 30,
  },
  assistantLauncherCopy: {
    flex: 1,
    paddingRight: 12,
  },
  assistantLauncherTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  assistantLauncherStatus: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 12,
    marginTop: 4,
  },
  assistantTrayTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  assistantTrayStatus: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  assistantSheetOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.26)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  assistantSheetBackdrop: {
    flex: 1,
  },
  assistantSheetBackdropFill: {
    flex: 1,
  },
  assistantSheetCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '82%',
    overflow: 'hidden',
    paddingTop: 10,
  },
  assistantSheetHandle: {
    alignSelf: 'center',
    backgroundColor: COLORS.border,
    borderRadius: 999,
    height: 5,
    marginBottom: 14,
    width: 58,
  },
  assistantSheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 6,
    paddingHorizontal: 16,
  },
  assistantSheetHeaderCopy: {
    flex: 1,
    paddingRight: 12,
  },
  assistantSheetCloseButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 16,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  assistantSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  assistantSummaryChip: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 18,
    marginBottom: 8,
    marginHorizontal: '1%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: '48%',
  },
  assistantSummaryLabel: {
    color: COLORS.textSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  assistantSummaryValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  loadingFlowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 12,
  },
  loadingStepRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  loadingStepBlock: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    flex: 1,
    height: 42,
    marginRight: 8,
  },
  loadingStepBlockWide: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    flex: 1.35,
    height: 42,
  },
  loadingPanel: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 16,
    height: 58,
    marginBottom: 10,
  },
  loadingPanelTall: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 16,
    height: 112,
    marginBottom: 10,
  },
  loadingKeypadPanel: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 16,
    height: 170,
  },
  directLaunchLoader: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 260,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  directLaunchLoaderTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 18,
    textAlign: 'center',
  },
  directLaunchLoaderBody: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
  portalGovtBanner: {
    backgroundColor: '#0f9baa',
    borderRadius: 10,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  portalGovtBannerText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  portalStageTabs: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  portalStageTab: {
    backgroundColor: '#f3f4f6',
    borderBottomColor: '#9a3412',
    borderBottomWidth: 2,
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  portalStageTabActive: {
    backgroundColor: '#9a3412',
  },
  portalStageTabDisabled: {
    opacity: 0.55,
  },
  portalStageTabText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  portalStageTabTextActive: {
    color: COLORS.white,
  },
  portalStageTabTextDisabled: {
    color: COLORS.textSoft,
  },
  selectionWorkspace: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionListPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    flex: 0.95,
    height: 620,
    overflow: 'hidden',
  },
  selectionListItem: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  selectionListItemActive: {
    backgroundColor: '#eef6ff',
  },
  selectionListText: {
    color: COLORS.text,
    fontSize: 13,
  },
  selectionListTextActive: {
    color: '#0f9baa',
    fontWeight: '800',
  },
  selectionEmptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  selectionEmptyCompact: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  selectionEmptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectionEmptyBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  selectionLetterPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    flex: 1.05,
    padding: 14,
  },
  selectionLetterHeader: {
    alignItems: 'center',
    backgroundColor: '#2d8b8a',
    borderRadius: 6,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  selectionLetterHeaderText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectionLetterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  selectionLetterChip: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: COLORS.border,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 34,
    width: '18%',
  },
  selectionLetterChipActive: {
    backgroundColor: '#0f9baa',
    borderColor: '#0f9baa',
  },
  selectionLetterChipText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  selectionLetterChipTextActive: {
    color: COLORS.white,
  },
  selectionAllVillageButton: {
    alignItems: 'center',
    backgroundColor: '#b91c1c',
    borderRadius: 8,
    marginTop: 8,
    paddingVertical: 12,
  },
  selectionAllVillageText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  portalSelectionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  portalSearchSummaryBar: {
    alignItems: 'center',
    backgroundColor: '#0f8a94',
    borderRadius: 10,
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  portalSearchSummaryCell: {
    flex: 1,
    marginRight: 8,
  },
  portalSearchSummaryText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  portalSeasonBadge: {
    backgroundColor: '#f7e2bf',
    borderRadius: 8,
    minWidth: 108,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  portalSeasonBadgeText: {
    color: '#7c2d12',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  portalBackButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#facc15',
    borderRadius: 999,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  portalBackButtonText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  workflowFocusCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 14,
  },
  workflowFocusCopy: {
    flex: 1,
    paddingRight: 12,
  },
  workflowFocusLabel: {
    color: COLORS.textSoft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  workflowFocusTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  workflowFocusBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  workflowChangeButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  workflowChangeButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  portalLandingStack: {
    paddingBottom: 28,
  },
  portalHomeSection: {
    marginBottom: 14,
  },
  portalSectionHeader: {
    marginBottom: 10,
  },
  portalSectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  portalSectionBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  portalActionList: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  portalActionRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  portalActionIconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  portalActionCopy: {
    flex: 1,
    paddingRight: 10,
  },
  portalActionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  portalActionBody: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  portalActionPill: {
    fontSize: 12,
    fontWeight: '800',
  },
  portalServiceGrid: {
    flexDirection: 'column',
  },
  portalServiceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 10,
    minHeight: 0,
    padding: 16,
    width: '100%',
  },
  khasraMenuCard: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  khasraMenuRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  portalServiceIconWrap: {
    alignItems: 'center',
    borderRadius: 16,
    height: 46,
    justifyContent: 'center',
    marginBottom: 12,
    width: 46,
  },
  khasraMenuIconWrap: {
    flexShrink: 0,
    height: 42,
    marginBottom: 0,
    marginRight: 12,
    width: 42,
  },
  portalServiceTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  khasraMenuTitle: {
    flex: 1,
    marginRight: 10,
  },
  portalServiceBody: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  portalHomeBackButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  portalHomeBackButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  morePortalRail: {
    overflow: 'hidden',
    marginTop: 2,
  },
  morePortalRailContent: {
    alignItems: 'stretch',
    flexDirection: 'row',
    paddingRight: 4,
  },
  morePortalCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginRight: PORTAL_QUICK_ROUTE_CARD_GAP,
    minHeight: 74,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: PORTAL_QUICK_ROUTE_CARD_WIDTH,
  },
  morePortalBadge: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  morePortalTitle: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  morePortalBody: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  searchWorkflowHeroCard: {
    backgroundColor: '#0f9baa',
    borderRadius: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  searchWorkflowHeroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  searchWorkflowHeroTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  searchWorkflowHeroBody: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  searchWorkflowList: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  searchWorkflowRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    borderLeftWidth: 4,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  searchWorkflowRowCopy: {
    flex: 1,
    paddingRight: 12,
  },
  searchWorkflowTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  searchWorkflowBody: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  searchWorkflowAction: {
    fontSize: 12,
    fontWeight: '800',
  },
  portalSummaryChip: {
    backgroundColor: '#0f9baa',
    borderRadius: 10,
    flex: 1,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  portalSummaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
  portalSummaryValue: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  searchModeTabRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginBottom: 10,
  },
  searchModeTab: {
    backgroundColor: '#f3f4f6',
    borderBottomColor: '#9a3412',
    borderBottomWidth: 2,
    flex: 1,
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  searchModeTabActive: {
    backgroundColor: '#9a3412',
  },
  searchModeTabText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    textAlign: 'center',
  },
  searchModeTabTextActive: {
    color: COLORS.white,
  },
  searchWorkspaceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
  },
  searchInputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  portalSearchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    color: COLORS.text,
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  portalSearchButton: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    justifyContent: 'center',
    marginLeft: 8,
    minWidth: 110,
    paddingHorizontal: 12,
  },
  portalSearchButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  portalResultPlaceholder: {
    borderColor: COLORS.border,
    borderWidth: 1,
    height: 120,
    marginBottom: 12,
    padding: 10,
  },
  portalResultPlaceholderText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  portalKeypadButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 0,
    justifyContent: 'center',
    marginBottom: -1,
    minHeight: 52,
    width: '25%',
  },
  portalKeypadWideButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 0,
    justifyContent: 'center',
    marginBottom: 0,
    minHeight: 52,
    width: '50%',
  },
  guidedRouteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 12,
    padding: 12,
  },
  guidedRouteSteps: {
    marginTop: 0,
  },
  guidedRouteStep: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    marginBottom: 8,
    padding: 14,
  },
  guidedRouteStepLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  guidedRouteStepValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  guidedSectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 12,
    padding: 12,
  },
  modeOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  modeOptionChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modeOptionChipActive: {
    backgroundColor: COLORS.primary,
  },
  modeOptionText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  modeOptionTextActive: {
    color: COLORS.white,
  },
  guidedInputLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  guidedInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchActionButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchActionButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  keypadButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 52,
    width: '31%',
  },
  keypadButtonWide: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 52,
    width: '64.5%',
  },
  keypadButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  keypadButtonWideText: {
    color: COLORS.white,
  },
  helpCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 18,
    padding: 16,
  },
  helpText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  topActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 12,
  },
  topActionButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
  },
  topActionText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  pageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginBottom: 14,
    padding: 16,
  },
  pageLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
  },
  pageUrl: {
    color: COLORS.textSoft,
    fontSize: 12,
    marginTop: 6,
  },
  savedPresetText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginBottom: 10,
    padding: 16,
  },
  historyText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
  },
  historyAction: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  resultCard: {
    backgroundColor: COLORS.successSoft,
    borderRadius: 18,
    marginBottom: 12,
    padding: 16,
  },
  resultTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  resultLine: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  resultHeaderSpacer: {
    height: 6,
  },
  tableCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
  },
  tableRow: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tableCell: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontWeight: '800',
  },
  primaryRouteCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryRouteText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chipButton: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  fieldCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginBottom: 10,
    padding: 16,
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  fieldValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginBottom: 10,
    padding: 16,
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 15,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputHint: {
    color: COLORS.textSoft,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: COLORS.warningSoft,
    borderRadius: 18,
    marginBottom: 12,
    padding: 16,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },
  webViewCard: {
    backgroundColor: COLORS.surface,
    flex: 1,
    overflow: 'hidden',
  },
  portalPrepOverlay: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: 24,
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
  },
  portalPrepCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
  },
  portalPrepTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  portalPrepBody: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
  hiddenWebViewCard: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
    position: 'absolute',
    zIndex: 0,
  },
  liveWorkspaceBar: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  liveWorkspaceButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  liveWorkspaceButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  liveWorkspaceCopy: {
    flex: 1,
    marginHorizontal: 10,
  },
  liveWorkspaceTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  liveWorkspaceSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  liveWebViewCard: {
    flex: 1,
    zIndex: 0,
  },
  webView: {
    flex: 1,
  },
  modalOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '78%',
    padding: 18,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSearchInput: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 15,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionList: {
    marginTop: 12,
  },
  optionRow: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  optionText: {
    color: COLORS.text,
    fontSize: 15,
  },
  modalCloseButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    marginTop: 14,
    paddingVertical: 14,
  },
  modalCloseText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
});

export default UpBhulekhAssistantScreen;

