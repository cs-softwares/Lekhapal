import { installedAppDetails } from '../native/appDetails';

// IDs verified in the Lekhpal AdMob app only. Never use live ads in QA/debug.
export const ADS_CONFIG = {
  testMode: true, // Release gate: consent messages/app readiness must be reviewed.
  androidBannerId: 'ca-app-pub-4794037209316760/3318987344',
  androidNativeId: 'ca-app-pub-4794037209316760/6500230592',
  androidInterstitialId: 'ca-app-pub-4794037209316760/9759809596',
};
export function shouldUseTestAds() {
  return (
    __DEV__ ||
    ADS_CONFIG.testMode ||
    installedAppDetails().packageId !== 'com.lekhpal'
  );
}
export function adUnitId(
  sdk: typeof import('react-native-google-mobile-ads'),
  format: 'BANNER' | 'NATIVE' | 'INTERSTITIAL',
) {
  if (shouldUseTestAds()) return sdk.TestIds[format];
  return {
    BANNER: ADS_CONFIG.androidBannerId,
    NATIVE: ADS_CONFIG.androidNativeId,
    INTERSTITIAL: ADS_CONFIG.androidInterstitialId,
  }[format];
}
