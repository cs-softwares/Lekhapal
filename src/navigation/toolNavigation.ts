import { selectDrawerSection } from './drawerHelpers';
import { getToolById } from '../data/toolCatalog';
import { LanguageCode, getLocalizedText } from '../types/tool';
import { DESK_CALCULATOR_IDS } from '../domain/lekhpalCalculator';

type AppNavigation = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

const MEASUREMENT_TOOL_IDS = new Set([
  'area-converter',
  'plot-boundary-guide',
  'map-scale-helper',
]);

const CALCULATOR_TOOL_IDS = new Set([
  ...DESK_CALCULATOR_IDS,
  'registry-estimate',
  'share-calculator',
  'fraction-hissa-calculator',
  'rate-finder',
  'circle-rate-compare',
  'crop-loss',
  'recovery-balance',
]);

const WORKFLOW_TOOL_IDS = new Set([
  'village-diary',
  'field-inspection',
  'mutation-tracker',
  'crop-girdawari',
  'government-land-inspection',
  'encroachment-report',
]);

export const openToolHelp = (navigation: AppNavigation, toolId: string) => {
  navigation.navigate('ToolDetails', { toolId });
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

  if (tool.url) {
    navigation.navigate('WebViewPortal', {
      title: getLocalizedText(tool.title, language),
      toolId,
      url: tool.url,
    });
    return;
  }

  if (MEASUREMENT_TOOL_IDS.has(toolId)) {
    navigation.navigate('Measurement', { focusToolId: toolId });
    return;
  }

  if (CALCULATOR_TOOL_IDS.has(toolId)) {
    navigation.navigate('Calculator', { focusToolId: toolId });
    return;
  }

  if (WORKFLOW_TOOL_IDS.has(toolId)) {
    navigation.navigate('RecordWorkspace', { toolId });
    return;
  }

  if (toolId === 'saved-record-locker') {
    selectDrawerSection('Premium');
    return;
  }

  navigation.navigate('ToolDetails', { toolId });
};
