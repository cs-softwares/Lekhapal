import {UpHomeEntry} from '../data/upHomeCatalog';
import {LanguageCode, getLocalizedText} from '../types/tool';
import {openToolWorkspace} from './toolNavigation';

export const openUpHomeEntry = (
  navigation: any,
  entry: UpHomeEntry,
  language: LanguageCode,
) => {
  if (entry.action.type === 'assistant') {
    navigation.navigate('UpBhulekhAssistant', {
      launchAction: entry.action.launchAction,
    });
    return;
  }

  if (entry.action.type === 'tool') {
    openToolWorkspace(
      navigation,
      entry.action.toolId,
      language,
    );
    return;
  }

  navigation.navigate('WebViewPortal', {
    title: getLocalizedText(entry.action.title, language),
    url: entry.action.url,
  });
};
