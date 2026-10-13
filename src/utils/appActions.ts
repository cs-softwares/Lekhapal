import { Linking, Platform, Share } from 'react-native';
import { APP_INFO } from '../config/appInfo';
import type { LanguageCode } from '../types/tool';
export async function shareApp(language: LanguageCode) {
  await Share.share({
    title: APP_INFO.name,
    message: [
      APP_INFO.name,
      language === 'hi'
        ? 'भूमि माप, गणना और राजस्व कार्य के उपयोगी उपकरण।'
        : 'Land measurement, calculations and tools for revenue field work.',
      APP_INFO.storeUrl,
    ].join('\n'),
  });
}
/** Opens the store; does not claim that an update exists or install anything. */
export async function openAppStore() {
  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(APP_INFO.marketUrl);
      return;
    } catch {
      /* Browser fallback when Play Store cannot handle the link. */
    }
  }
  await Linking.openURL(APP_INFO.storeUrl);
}
