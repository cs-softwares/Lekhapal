import { LIGHT_COLORS } from '../theme/palette';
import type { UpHomeEntry } from './upHomeCatalog';

// Official routerLink destinations verified in ekhasra.up.gov.in's published client.
export const KHASRA_OPTIONS: UpHomeEntry[] = [
  {
    id: 'up-khasra-login',
    title: { en: 'Khasra Login', hi: 'खसरा लॉगिन' },
    subtitle: {
      en: 'Sign in with your department account.',
      hi: 'अपने विभागीय खाते से लॉगिन करें।',
    },
    icon: 'account-key-outline',
    accentColor: LIGHT_COLORS.primary,
    searchTerms: ['login', 'लॉगिन'],
    action: {
      type: 'portal',
      title: { en: 'Khasra Login', hi: 'खसरा लॉगिन' },
      url: 'https://ekhasra.up.gov.in/#/SelectLogin',
    },
  },
  {
    id: 'up-khasra-view',
    title: { en: 'Khasra Dekhein', hi: 'खसरा देखें' },
    subtitle: {
      en: 'Open the official Khasra record search.',
      hi: 'आधिकारिक खसरा रिकॉर्ड खोजें।',
    },
    icon: 'file-search-outline',
    accentColor: LIGHT_COLORS.primary,
    searchTerms: ['view', 'dekhein', 'देखें'],
    action: {
      type: 'portal',
      title: { en: 'Khasra Dekhein', hi: 'खसरा देखें' },
      url: 'https://ekhasra.up.gov.in/#/khasrareport',
    },
  },
];
