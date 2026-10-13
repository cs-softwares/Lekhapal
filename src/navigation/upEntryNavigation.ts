import { Alert } from 'react-native';
import { openPortalBrowser } from '../native/portalBrowser';
import { UpHomeEntry } from '../data/upHomeCatalog';
import { LanguageCode, getLocalizedText } from '../types/tool';
import { openToolWorkspace } from './toolNavigation';

export const openUpHomeEntry = (
  navigation: any,
  entry: UpHomeEntry,
  language: LanguageCode,
) => {
  if (entry.action.type === 'bhulekh-menu') {
    navigation.navigate('BhulekhOptions');
    return;
  }
  if (entry.action.type === 'khasra-menu') {
    navigation.navigate('KhasraOptions');
    return;
  }
  if (entry.action.type === 'assistant') {
    navigation.navigate('UpBhulekhAssistant', {
      launchAction: entry.action.launchAction,
    });
    return;
  }

  if (entry.action.type === 'tool') {
    openToolWorkspace(navigation, entry.action.toolId, language);
    return;
  }

  if (entry.id === 'up-khasra-view') {
    navigation.navigate('KhasraSearch');
    return;
  }

  // eKhasra rejects embedded WebViews with "Unsupported Browser".
  // Keep login in the supported browser, including during header-only changes.
  if (/^https:\/\/ekhasra\.up\.gov\.in(?:\/|$)/i.test(entry.action.url)) {
    return openPortalBrowser(entry.action.url).catch(() => {
      Alert.alert(
        language === 'hi' ? 'ब्राउज़र नहीं खुल सका' : 'Could not open browser',
        language === 'hi'
          ? 'खसरा पेज नहीं खुल सका। ऐप और फोन का ब्राउज़र अपडेट करके दोबारा प्रयास करें।'
          : 'The Khasra page could not open. Update the app and your phone’s browser, then try again.',
      );
    });
  }

  navigation.navigate('WebViewPortal', {
    title: getLocalizedText(entry.action.title, language),
    url: entry.action.url,
    ...(entry.action.bhulekhService
      ? { bhulekhService: entry.action.bhulekhService }
      : {}),
  });
};
