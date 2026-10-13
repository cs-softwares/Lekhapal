import { URL } from 'react-native-url-polyfill';

const MANUAL_URL =
  'https://upfr.agristack.gov.in/farmer-registry-up/assets/pdf/User_Manual_TRNG_Hindi.pdf';
const STORE_URL =
  'https://play.google.com/store/apps/details?id=com.agristack.up.farmerregistry';

/** Only public help links qualify; authenticated registry documents stay private. */
export function farmerRegistryHelpPage(value: string, language: 'en' | 'hi') {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port)
      return null;
    if (url.href === MANUAL_URL) {
      return {
        title:
          language === 'hi'
            ? 'किसान रजिस्ट्री उपयोगकर्ता पुस्तिका'
            : 'Farmer Registry User Manual',
        // Android WebView does not display PDF files itself. This is the
        // published, unauthenticated manual, never a farmer's record.
        url: `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
          MANUAL_URL,
        )}`,
        returnToApp: true as const,
      };
    }
    if (
      url.hostname === 'play.google.com' &&
      url.pathname === '/store/apps/details' &&
      url.searchParams.get('id') === 'com.agristack.up.farmerregistry'
    ) {
      return {
        title:
          language === 'hi'
            ? 'आधिकारिक किसान रजिस्ट्री ऐप'
            : 'Official Farmer Registry App',
        url: STORE_URL,
        returnToApp: true as const,
      };
    }
  } catch {
    /* Ignore malformed links. */
  }
  return null;
}
