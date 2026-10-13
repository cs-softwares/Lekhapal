import { LIGHT_COLORS } from '../theme/palette';
import type { UpHomeEntry } from './upHomeCatalog';

export const BHULEKH_SERVICE_LABELS = {
  copy: 'खतौनी (अधिकार अभिलेख) की नक़ल देखें',
  certified: 'ऑनलाइन पेमेन्ट द्वारा खतौनी की प्रमाणित प्रति प्राप्त करें',
  sale: 'भूखण्ड/गाटे के विक्रय की स्थिति जानें',
  dispute: 'भूखण्ड/गाटे के वाद ग्रस्त होने की स्थिति जानें',
} as const;
export type BhulekhService = keyof typeof BHULEKH_SERVICE_LABELS;

const option = (
  service: BhulekhService,
  en: string,
  hi: string,
  description: string,
  descriptionHi: string,
  icon: string,
  accentColor: string,
): UpHomeEntry => ({
  id: `up-bhulekh-${service}`,
  title: { en, hi },
  subtitle: { en: description, hi: descriptionHi },
  icon,
  accentColor,
  searchTerms: [en, hi],
  action: {
    type: 'portal',
    title: { en, hi },
    url: 'https://upbhulekh.gov.in/#/home',
    bhulekhService: service,
  },
});

const loginOption = (
  id: string,
  en: string,
  hi: string,
  url: string,
  accentColor: string,
): UpHomeEntry => ({
  id,
  title: { en, hi },
  subtitle: {
    en: 'Open the official department login.',
    hi: 'आधिकारिक विभागीय लॉगिन खोलें।',
  },
  icon: 'account-key-outline',
  accentColor,
  searchTerms: [en, hi],
  action: { type: 'portal', title: { en, hi }, url },
});

export const BHULEKH_OPTIONS = [
  loginOption(
    'up-khatauni-login',
    'Khatauni Login',
    'खतौनी लॉगिन',
    'https://upbhulekh.gov.in/bhulekh_login/',
    LIGHT_COLORS.primary,
  ),
  loginOption(
    'up-realtime-khatauni',
    'Real-time Khatauni Login',
    'रियल टाइम खतौनी लॉगिन',
    'https://upbhulekh.gov.in/bhulekh/',
    LIGHT_COLORS.primary,
  ),
  option(
    'copy',
    'Khatauni Copy',
    'खतौनी की नकल देखें',
    'Search and view the record of rights.',
    'अधिकार अभिलेख खोजें और देखें।',
    'file-search-outline',
    LIGHT_COLORS.primary,
  ),
  option(
    'certified',
    'Certified Khatauni Copy',
    'खतौनी की प्रमाणित प्रति',
    'Continue to the official certified-copy service.',
    'आधिकारिक प्रमाणित प्रति सेवा खोलें।',
    'file-certificate-outline',
    LIGHT_COLORS.primary,
  ),
  option(
    'sale',
    'Plot Sale Status',
    'भूखण्ड / गाटा विक्रय स्थिति',
    'Check the sale status of a plot.',
    'भूखण्ड या गाटे के विक्रय की स्थिति देखें।',
    'home-search-outline',
    LIGHT_COLORS.primary,
  ),
  option(
    'dispute',
    'Plot Dispute Status',
    'भूखण्ड / गाटा वाद स्थिति',
    'Check whether a plot is involved in a dispute.',
    'भूखण्ड या गाटे के वाद ग्रस्त होने की स्थिति देखें।',
    'scale-balance',
    LIGHT_COLORS.primary,
  ),
];

const directory = (
  id: string,
  en: string,
  hi: string,
  path: string,
  icon: string,
  accentColor: string,
): UpHomeEntry => ({
  id: `up-bhulekh-${id}`,
  title: { en, hi },
  subtitle: {
    en: 'View the official directory and codes.',
    hi: 'आधिकारिक सूची और कोड देखें।',
  },
  icon,
  accentColor,
  searchTerms: [en, hi],
  action: {
    type: 'portal',
    title: { en, hi },
    url: `https://upbhulekh.gov.in/#/${path}`,
  },
});

// Destinations observed by opening each official homepage directory control.
export const BHULEKH_DIRECTORY_OPTIONS: UpHomeEntry[] = [
  directory(
    'districts',
    'Districts (Jila)',
    'जिला सूची',
    'districts_list',
    'office-building-marker-outline',
    LIGHT_COLORS.primary,
  ),
  directory(
    'tehsils',
    'Tehsils',
    'तहसील सूची',
    'tehsils_list',
    'map-marker-radius-outline',
    LIGHT_COLORS.primary,
  ),
  directory(
    'parganas',
    'Parganas',
    'परगना सूची',
    'parganaReport',
    'map-marker-multiple-outline',
    LIGHT_COLORS.primary,
  ),
  directory(
    'land-types',
    'Land Types',
    'भूमि प्रकार की सूची',
    'landTypeReports',
    'format-list-bulleted-type',
    LIGHT_COLORS.primary,
  ),
  {
    ...directory(
      'government-land',
      'Government Land Search',
      'सरकारी भूमि खोजें',
      'login',
      'map-search-outline',
      LIGHT_COLORS.primary,
    ),
    subtitle: {
      en: 'Official government-land user login required.',
      hi: 'सरकारी भूमि की खोज के लिए आधिकारिक यूजर लॉगिन आवश्यक है।',
    },
  },
];

const related = (
  id: string,
  en: string,
  hi: string,
  url: string,
  icon: string,
): UpHomeEntry => ({
  id,
  title: { en, hi },
  subtitle: { en: 'Official website', hi: 'आधिकारिक वेबसाइट' },
  icon,
  accentColor: LIGHT_COLORS.primary,
  searchTerms: [en, hi],
  action: { type: 'portal', title: { en, hi }, url },
});

// Links from the moving image-scroll strip on the official Bhulekh homepage.
// Outdated destinations replaced with current official entries after live checks.
export const BHULEKH_RELATED_LINKS = [
  related(
    'grievance-register',
    'Register Grievance',
    'शिकायत पंजीकरण',
    'https://jansunwai.up.nic.in/',
    'message-plus-outline',
  ),
  related(
    'grievance-track',
    'Track Grievance',
    'शिकायत की स्थिति',
    'https://jansunwai.up.nic.in/ComplaintTracker',
    'text-box-check-outline',
  ),
  related(
    'stamp-registration',
    'Stamp & Registry',
    'स्टाम्प और रजिस्ट्री',
    'https://igrsup.gov.in/igrsup/defaultAction.action',
    'file-sign',
  ),
  related(
    'revenue-cases',
    'Revenue Cases',
    'राजस्व वाद',
    'https://vaad.up.nic.in/',
    'scale-balance',
  ),
  related(
    'dilrmp',
    'DILRMP',
    'डीआईएलआरएमपी',
    'https://dilrmp.gov.in/',
    'map-outline',
  ),
  related(
    'edistrict',
    'eDistrict',
    'ई-डिस्ट्रिक्ट',
    'https://edistrict.up.gov.in/edistrictup/',
    'file-certificate-outline',
  ),
  related('gem', 'GeM', 'जेम', 'https://gem.gov.in/', 'cart-outline'),
  related(
    'voters',
    'Voter Services',
    'मतदाता सेवाएं',
    'https://voters.eci.gov.in/',
    'card-account-details-outline',
  ),
  related(
    'india',
    'Government of India',
    'भारत सरकार',
    'https://india.gov.in/',
    'bank-outline',
  ),
  related(
    'revenue-department',
    'Board of Revenue',
    'राजस्व परिषद',
    'https://bor.up.gov.in/Department_login.aspx',
    'office-building-outline',
  ),
];
