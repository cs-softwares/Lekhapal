import {selectDrawerSection} from './drawerHelpers';
import {getToolById} from '../data/toolCatalog';
import {LanguageCode, getLocalizedText} from '../types/tool';

type AppNavigation = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

const MEASUREMENT_TOOL_IDS = new Set([
  'area-converter',
  'plot-boundary-guide',
  'map-scale-helper',
]);

const CALCULATOR_TOOL_IDS = new Set([
  'registry-estimate',
  'share-calculator',
  'fraction-hissa-calculator',
  'rate-finder',
  'circle-rate-compare',
]);

const WORKFLOW_TOOL_IDS = new Set([
  'village-diary',
  'field-inspection',
  'mutation-tracker',
]);

export const openToolHelp = (
  navigation: AppNavigation,
  toolId: string,
) => {
  navigation.navigate('ToolDetails', {toolId});
};

export const openToolWorkspace = (
  navigation: AppNavigation,
  toolId: string,
  language: LanguageCode,
) => {
  const tool = getToolById(toolId);

  if (!tool) {
    return;
  }

  if (toolId === 'up-bhulekh') {
    navigation.navigate('UpBhulekhAssistant');
    return;
  }

  if (tool.url) {
    navigation.navigate('WebViewPortal', {
      title: getLocalizedText(tool.title, language),
      toolId,
      url: tool.url,
    });
    return;
  }

  if (MEASUREMENT_TOOL_IDS.has(toolId)) {
    navigation.navigate('Measurement', {focusToolId: toolId});
    return;
  }

  if (CALCULATOR_TOOL_IDS.has(toolId)) {
    navigation.navigate('Calculator', {focusToolId: toolId});
    return;
  }

  if (WORKFLOW_TOOL_IDS.has(toolId)) {
    navigation.navigate('RecordWorkspace', {toolId});
    return;
  }

  if (toolId === 'saved-record-locker') {
    selectDrawerSection('Premium');
    return;
  }

  navigation.navigate('ToolDetails', {toolId});
};
