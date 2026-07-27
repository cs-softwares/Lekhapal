import {LocalizedText} from '../types/tool';

const text = (en: string, hi: string): LocalizedText => ({
  en,
  hi,
});

export type BiharBhumiOfficerItem = {
  accentColor: string;
  helper: LocalizedText;
  icon: string;
  id: string;
  label: LocalizedText;
  url: string;
};

export const BIHAR_BHUMI_OFFICER_ITEMS: BiharBhumiOfficerItem[] = [
  {
    accentColor: '#0ea5e9',
    helper: text(
      'Official Bihar mutation officer login flow.',
      'आधिकारिक बिहार दाखिल खारिज अधिकारी लॉगिन फ्लो।',
    ),
    icon: 'account-key-outline',
    id: 'bihar-officer-dakhil-kharij',
    label: text('Dakhil Kharij Login', 'दाखिल ख़ारिज लॉगिन'),
    url: 'https://biharbhumi.bihar.gov.in/BiharEmutationNew/',
  },
  {
    accentColor: '#14b8a6',
    helper: text(
      'Official Register-II update login for C.O users.',
      'सी.ओ. उपयोगकर्ताओं के लिए आधिकारिक रजिस्टर-II अद्यतन लॉगिन।',
    ),
    icon: 'file-refresh-outline',
    id: 'bihar-officer-register-two',
    label: text(
      'Register-II Update Login',
      'रजिस्टर-II अद्यतन लॉगिन',
    ),
    url: 'https://biharbhumi.bihar.gov.in/Bashudha/NewLogin.aspx',
  },
  {
    accentColor: '#2563eb',
    helper: text(
      'Official new e-Jamabandi login route.',
      'आधिकारिक नया ई-जमाबंदी लॉगिन रूट।',
    ),
    icon: 'clipboard-text-clock-outline',
    id: 'bihar-officer-register-two-new',
    label: text(
      'Register-II Update Login (New)',
      'रजिस्टर-II अद्यतन लॉगिन (New)',
    ),
    url: 'https://parimarjanplus.bihar.gov.in/ejamabandi/NewLogin.aspx',
  },
  {
    accentColor: '#f97316',
    helper: text(
      'Official government land dakhil kharij login.',
      'आधिकारिक सरकारी भूमि दाखिल खारिज लॉगिन।',
    ),
    icon: 'shield-account-outline',
    id: 'bihar-officer-government-land',
    label: text(
      'Government Land Dakhil Kharij Login',
      'सरकारी भूमि का दाखिल ख़ारिज लॉगिन',
    ),
    url: 'https://parimarjanplus.bihar.gov.in/ejamabandi/Authority/GovLandLogin.aspx',
  },
  {
    accentColor: '#ef4444',
    helper: text(
      'Official complaint management system.',
      'आधिकारिक शिकायत प्रबंधन प्रणाली।',
    ),
    icon: 'message-alert-outline',
    id: 'bihar-officer-complaint',
    label: text('Raise Complaint', 'शिकायत दर्ज करे'),
    url: 'https://parimarjanplus.bihar.gov.in/RaiseATicket/',
  },
  {
    accentColor: '#8b5cf6',
    helper: text(
      'Official Kaithi document translation service.',
      'आधिकारिक कैथी दस्तावेज़ अनुवाद सेवा।',
    ),
    icon: 'translate',
    id: 'bihar-officer-kaithi',
    label: text(
      'Kaithi Translation Service',
      'कैथी दस्तावेज़ अनुवाद सेवा',
    ),
    url: 'https://biharbhumiplus.bihar.gov.in/kaithitranslator/AdminLogin.aspx',
  },
];
