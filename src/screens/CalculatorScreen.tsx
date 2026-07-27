import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import CircleRateCompareWorkspace from '../components/workspaces/CircleRateCompareWorkspace';
import FractionHissaWorkspace from '../components/workspaces/FractionHissaWorkspace';
import RateFinderWorkspace from '../components/workspaces/RateFinderWorkspace';
import RegistryEstimateWorkspace from '../components/workspaces/RegistryEstimateWorkspace';
import ShareCalculatorWorkspace from '../components/workspaces/ShareCalculatorWorkspace';
import {useAppTheme} from '../context/ThemeContext';
import {useLanguage} from '../context/LanguageContext';
import {
  CALCULATOR_TOOL_IDS,
  getToolById,
} from '../data/toolCatalog';
import {useResponsiveMetrics} from '../hooks/useResponsiveMetrics';
import {ToolItem, getLocalizedText} from '../types/tool';
import {WorkspaceRecord} from '../types/workspace';
import {consumePendingMeasurementRecordSelection} from '../utils/measurementRecordBridge';

const DEFAULT_TOOL_ID = 'registry-estimate';

const isCalculatorToolId = (
  toolId: string | undefined,
): toolId is string =>
  typeof toolId === 'string' &&
  CALCULATOR_TOOL_IDS.includes(toolId);

const CalculatorScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {language} = useLanguage();
  const {colors} = useAppTheme();
  const metrics = useResponsiveMetrics();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {},
        tabChip: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
        },
        tabChipActive: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        tabChipText: {
          color: colors.textMuted,
          fontWeight: '800',
        },
        tabChipTextActive: {
          color: colors.white,
        },
        tabScrollContent: {
          alignItems: 'center',
        },
      }),
    [colors],
  );

  const tools = CALCULATOR_TOOL_IDS.map(getToolById).filter(
    Boolean,
  ) as ToolItem[];
  const [activeToolId, setActiveToolId] = useState(
    route.params?.focusToolId ?? DEFAULT_TOOL_ID,
  );
  const [pendingRecordSelection, setPendingRecordSelection] =
    useState<{
      toolId: string;
      record: WorkspaceRecord;
    } | null>(null);

  useEffect(() => {
    const nextToolId = route.params?.focusToolId;

    if (isCalculatorToolId(nextToolId)) {
      setActiveToolId(nextToolId);
      return;
    }

    setActiveToolId(DEFAULT_TOOL_ID);
  }, [route.params?.focusToolId]);

  const activeTool =
    tools.find(tool => tool.id === activeToolId) ?? tools[0];

  useFocusEffect(
    useCallback(() => {
      const nextSelection =
        consumePendingMeasurementRecordSelection();

      if (
        nextSelection &&
        isCalculatorToolId(nextSelection.moduleId)
      ) {
        setActiveToolId(nextSelection.moduleId);
        setPendingRecordSelection({
          record: nextSelection.record,
          toolId: nextSelection.moduleId,
        });
      }
    }, []),
  );

  const activeExternalRecord =
    pendingRecordSelection &&
    pendingRecordSelection.toolId === activeToolId
      ? pendingRecordSelection.record
      : null;

  const handleExternalRecordApplied = () => {
    setPendingRecordSelection(currentSelection =>
      currentSelection?.toolId === activeToolId
        ? null
        : currentSelection,
    );
  };

  const renderWorkspace = () => {
    if (activeTool.id === 'share-calculator') {
      return (
        <ShareCalculatorWorkspace
          externalRecord={activeExternalRecord}
          onExternalRecordApplied={
            handleExternalRecordApplied
          }
          showSavedRecords={false}
        />
      );
    }

    if (activeTool.id === 'fraction-hissa-calculator') {
      return (
        <FractionHissaWorkspace
          externalRecord={activeExternalRecord}
          onExternalRecordApplied={
            handleExternalRecordApplied
          }
          showSavedRecords={false}
        />
      );
    }

    if (activeTool.id === 'rate-finder') {
      return (
        <RateFinderWorkspace
          externalRecord={activeExternalRecord}
          onExternalRecordApplied={
            handleExternalRecordApplied
          }
          showSavedRecords={false}
        />
      );
    }

    if (activeTool.id === 'circle-rate-compare') {
      return (
        <CircleRateCompareWorkspace
          externalRecord={activeExternalRecord}
          onExternalRecordApplied={
            handleExternalRecordApplied
          }
          showSavedRecords={false}
        />
      );
    }

    return (
      <RegistryEstimateWorkspace
        externalRecord={activeExternalRecord}
        onExternalRecordApplied={
          handleExternalRecordApplied
        }
        showSavedRecords={false}
      />
    );
  };

  return (
    <AppScreen>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => navigation.navigate('Home')}
        rightIcons={[
          {
            iconName: 'file-document-multiple-outline',
            onPress: () =>
              navigation.navigate(
                'MeasurementSavedRecords',
                {
                  moduleId: activeTool.id,
                  storageToolId: activeTool.id,
                  title: getLocalizedText(
                    activeTool.title,
                    language,
                  ),
                },
              ),
          },
        ]}
        title="Calculator"
      />

      <View
        style={[
          styles.content,
          {
            paddingHorizontal: metrics.contentPadding,
            paddingTop: metrics.verticalScale(14, {
              maxFactor: 1.08,
              minFactor: 0.9,
            }),
          },
        ]}>
        <ScrollView
          contentContainerStyle={[
            styles.tabScrollContent,
            {
              paddingRight: metrics.scale(4, {
                maxFactor: 1.05,
                minFactor: 0.92,
              }),
            },
          ]}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {tools.map(tool => {
            const selected = tool.id === activeToolId;

            return (
              <AppPressable
                key={tool.id}
                onPress={() => setActiveToolId(tool.id)}
                pressEffect="none"
                pressedOpacity={0.88}
                style={[
                  styles.tabChip,
                  {
                    borderRadius: metrics.scale(999, {
                      maxFactor: 1.06,
                      minFactor: 0.92,
                    }),
                    marginRight: metrics.scale(10, {
                      maxFactor: 1.05,
                      minFactor: 0.92,
                    }),
                    paddingHorizontal: metrics.scale(14, {
                      maxFactor: 1.06,
                      minFactor: 0.92,
                    }),
                    paddingVertical: metrics.verticalScale(10, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                  },
                  selected && styles.tabChipActive,
                ]}>
                <Text
                  style={[
                    styles.tabChipText,
                    {
                      fontSize: metrics.responsiveFont(12.8, {
                        maxFactor: 1.05,
                        minFactor: 0.92,
                      }),
                    },
                    selected && styles.tabChipTextActive,
                  ]}>
                  {getLocalizedText(tool.title, language)}
                </Text>
              </AppPressable>
            );
          })}
        </ScrollView>

        <View
          style={{
            marginTop: metrics.verticalScale(14, {
              maxFactor: 1.08,
              minFactor: 0.9,
            }),
          }}>
          {renderWorkspace()}
        </View>
      </View>
    </AppScreen>
  );
};

export default CalculatorScreen;
