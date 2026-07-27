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
import AreaConverterWorkspace from '../components/workspaces/AreaConverterWorkspace';
import FieldAreaWorkspace from '../components/workspaces/FieldAreaWorkspace';
import GpsLandMeasureWorkspace from '../components/workspaces/GpsLandMeasureWorkspace';
import MapScaleWorkspace from '../components/workspaces/MapScaleWorkspace';
import PlotBoundaryWorkspace from '../components/workspaces/PlotBoundaryWorkspace';
import {useAppTheme} from '../context/ThemeContext';
import {useLanguage} from '../context/LanguageContext';
import {useResponsiveMetrics} from '../hooks/useResponsiveMetrics';
import {WorkspaceRecord} from '../types/workspace';
import {consumePendingMeasurementRecordSelection} from '../utils/measurementRecordBridge';

type MeasurementModuleId =
  | 'gps-land-measure'
  | 'field-area'
  | 'plot-boundary-guide'
  | 'area-converter'
  | 'map-scale-helper';

type MeasurementModule = {
  id: MeasurementModuleId;
  storageToolId: string;
  title: string;
};

const DEFAULT_MODULE_ID: MeasurementModuleId =
  'gps-land-measure';

const MeasurementScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {language, strings} = useLanguage();
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
  const [activeModuleId, setActiveModuleId] =
    useState<MeasurementModuleId>(DEFAULT_MODULE_ID);
  const [pendingRecordSelection, setPendingRecordSelection] =
    useState<{
      moduleId: MeasurementModuleId;
      record: WorkspaceRecord;
    } | null>(null);

  const modules = useMemo<MeasurementModule[]>(
    () => [
      {
        id: 'gps-land-measure',
        storageToolId: 'gps-land-measure',
        title:
          language === 'hi'
            ? 'Live GPS'
            : 'Live GPS',
      },
      {
        id: 'field-area',
        storageToolId: 'field-area-workspace',
        title:
          language === 'hi'
            ? 'Manual field'
            : 'Manual field',
      },
      {
        id: 'plot-boundary-guide',
        storageToolId: 'plot-boundary-guide',
        title:
          language === 'hi'
            ? '4-side plot'
            : '4-side plot',
      },
      {
        id: 'area-converter',
        storageToolId: 'area-converter',
        title:
          language === 'hi'
            ? 'Area convert'
            : 'Area convert',
      },
      {
        id: 'map-scale-helper',
        storageToolId: 'map-scale-helper',
        title:
          language === 'hi'
            ? 'Map scale'
            : 'Map scale',
      },
    ],
    [language],
  );

  useEffect(() => {
    const nextModuleId = route.params?.focusToolId;

    if (
      nextModuleId === 'gps-land-measure' ||
      nextModuleId === 'field-area' ||
      nextModuleId === 'plot-boundary-guide' ||
      nextModuleId === 'area-converter' ||
      nextModuleId === 'map-scale-helper'
    ) {
      setActiveModuleId(nextModuleId);
      return;
    }

    setActiveModuleId(DEFAULT_MODULE_ID);
  }, [route.params?.focusToolId]);

  useFocusEffect(
    useCallback(() => {
      const nextSelection =
        consumePendingMeasurementRecordSelection();

      if (
        nextSelection &&
        (nextSelection.moduleId === 'gps-land-measure' ||
          nextSelection.moduleId === 'field-area' ||
          nextSelection.moduleId === 'plot-boundary-guide' ||
          nextSelection.moduleId === 'area-converter' ||
          nextSelection.moduleId === 'map-scale-helper')
      ) {
        setActiveModuleId(nextSelection.moduleId);
        setPendingRecordSelection({
          moduleId: nextSelection.moduleId,
          record: nextSelection.record,
        });
      }
    }, []),
  );

  const activeModule = useMemo(
    () =>
      modules.find(module => module.id === activeModuleId) ??
      modules[0],
    [activeModuleId, modules],
  );

  const handleExternalRecordApplied = () => {
    setPendingRecordSelection(currentSelection =>
      currentSelection?.moduleId === activeModuleId
        ? null
        : currentSelection,
    );
  };

  const activeExternalRecord =
    pendingRecordSelection?.moduleId === activeModuleId
      ? pendingRecordSelection.record
      : null;

  const renderWorkspace = () => {
    if (activeModuleId === 'gps-land-measure') {
      return (
        <GpsLandMeasureWorkspace
          externalRecord={activeExternalRecord}
          onExternalRecordApplied={
            handleExternalRecordApplied
          }
          showSavedRecords={false}
        />
      );
    }

    if (activeModuleId === 'field-area') {
      return (
        <FieldAreaWorkspace
          externalRecord={activeExternalRecord}
          onExternalRecordApplied={
            handleExternalRecordApplied
          }
          showSavedRecords={false}
        />
      );
    }

    if (activeModuleId === 'plot-boundary-guide') {
      return (
        <PlotBoundaryWorkspace
          externalRecord={activeExternalRecord}
          onExternalRecordApplied={
            handleExternalRecordApplied
          }
          showSavedRecords={false}
        />
      );
    }

    if (activeModuleId === 'map-scale-helper') {
      return (
        <MapScaleWorkspace
          externalRecord={activeExternalRecord}
          onExternalRecordApplied={
            handleExternalRecordApplied
          }
          showSavedRecords={false}
        />
      );
    }

    return (
      <AreaConverterWorkspace
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
                  moduleId: activeModule.id,
                  storageToolId:
                    activeModule.storageToolId,
                  title: activeModule.title,
                },
              ),
          },
        ]}
        title={strings.measurement}
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
          {modules.map(module => {
            const selected = module.id === activeModuleId;

            return (
              <AppPressable
                key={module.id}
                onPress={() => setActiveModuleId(module.id)}
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
                  {module.title}
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

export default MeasurementScreen;
