import { Alert } from 'react-native';
import type { StatePortalEntry } from '../data/statePortalCatalog';
import type { LanguageCode } from '../types/tool';
import { openPortalBrowser } from '../native/portalBrowser';
import { openUpHomeEntry } from './upEntryNavigation';

export const openStatePortalEntry = (
  navigation: any,
  entry: StatePortalEntry,
  language: LanguageCode,
) => {
  if (entry.browserMode === 'custom-tab' && entry.action.type === 'portal') {
    return openPortalBrowser(entry.action.url).catch(() => {
      Alert.alert(
        language === 'hi' ? 'ब्राउज़र नहीं खुल सका' : 'Could not open browser',
        language === 'hi'
          ? 'फोन का ब्राउज़र अपडेट करके दोबारा प्रयास करें।'
          : 'Update your phone’s browser and try again.',
      );
    });
  }
  // Preserve all existing UP menu, native-search and retained-browser actions.
  return openUpHomeEntry(navigation, entry, language);
};
