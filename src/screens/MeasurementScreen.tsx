import { cancelCompletedWorkAd } from '../services/interstitialAds';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePremiumFeatures } from '../hooks/usePremiumFeatures';
import { RELEASE_FEATURES } from '../config/releaseFeatures';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import AppScreen from '../components/AppScreen';
import AppPressable from '../components/AppPressable';
import GpsLandMeasureWorkspace from '../components/workspaces/GpsLandMeasureWorkspace';
import MeasurementCalculator from '../components/measurement/MeasurementCalculator';
import {
  MEASUREMENT_TOOLS,
  MeasurementModuleId,
  isMeasurementModule,
} from '../components/measurement/measurementCatalog';
import { useMeasurementMotion } from '../components/measurement/MeasurementUI';
import { useSelectedState } from '../context/SelectedStateContext';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { WorkspaceRecord } from '../types/workspace';
import { consumePendingMeasurementRecordSelection } from '../utils/measurementRecordBridge';

export default function MeasurementScreen() {
  const premium = usePremiumFeatures();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { stateCode } = useSelectedState();
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const hi = language === 'hi';
  const t = (en: string, hindi: string) => (hi ? hindi : en);
  const [moduleId, setModuleId] = useState<MeasurementModuleId>('field-area');
  const [pending, setPending] = useState<{
    moduleId: string;
    record: WorkspaceRecord;
  } | null>(null);
  const focused = useIsFocused();
  useEffect(() => {
    if (moduleId === 'gps-land-measure') cancelCompletedWorkAd();
  }, [moduleId, focused]);
  const motion = useMeasurementMotion();
  const scroll = useRef<ScrollView>(null);
  const workspaceY = useRef(0);
  const reveal = useRef(new Animated.Value(1)).current;
  const active = MEASUREMENT_TOOLS.find(tool => tool.id === moduleId)!;
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      const selection = consumePendingMeasurementRecordSelection();
      if (selection && isMeasurementModule(selection.moduleId)) {
        setModuleId(selection.moduleId);
        setPending(selection);
        requestAnimationFrame(() =>
          scroll.current?.scrollTo({ y: workspaceY.current, animated: false }),
        );
      }
      return () => StatusBar.setBarStyle('dark-content');
    }, []),
  );
  useEffect(() => {
    if (isMeasurementModule(route.params?.focusToolId)) {
      setModuleId(route.params.focusToolId);
      // Consume the shortcut so choosing it again also works after switching tools.
      navigation.setParams({ focusToolId: undefined });
    }
  }, [navigation, route.params?.focusToolId]);
  useEffect(() => {
    if (!motion) {
      reveal.setValue(1);
      return;
    }
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [moduleId, motion, reveal]);
  const openSaved = () =>
    navigation.navigate('MeasurementSavedRecords', {
      moduleId,
      storageToolId: active.storageToolId,
      title: `${active.title[hi ? 1 : 0]} · ${t('Saved notes', 'सेव किए नोट')}`,
    });
  const choose = (next: MeasurementModuleId) => {
    Keyboard.dismiss();
    setModuleId(next);
    scroll.current?.scrollTo({ y: 0, animated: motion });
  };
  const applied = useCallback(() => setPending(null), []);
  const externalRecord = pending?.moduleId === moduleId ? pending.record : null;
  return (
    <AppScreen scroll={false}>
      <AppHeader
        title={active.title[hi ? 1 : 0]}
        leftIconName="arrow-left"
        onLeftPress={() => navigation.navigate('Home')}
        rightIconName="notebook-outline"
        rightAccessibilityLabel={t('Saved notes', 'सेव किए नोट')}
        onRightPress={openSaved}
      />
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.toolStrip}>
          {MEASUREMENT_TOOLS.map((tool, index) => {
            const selected = tool.id === moduleId;
            return (
              <AppPressable
                key={tool.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={
                  tool.title[hi ? 1 : 0] +
                  (tool.id === 'gps-land-measure' && !premium
                    ? t(' · Locked · Premium', ' · लॉक · प्रीमियम')
                    : '')
                }
                onPress={() => choose(tool.id)}
                containerStyle={styles.toolTabContainer}
                style={[
                  styles.toolTab,
                  {
                    borderBottomColor: selected
                      ? colors.primary
                      : 'transparent',
                  },
                ]}
              >
                {RELEASE_FEATURES.premium && tool.id === 'gps-land-measure' && (
                  <Icon
                    name={premium ? 'crown' : 'lock'}
                    size={20}
                    color={colors.primary}
                  />
                )}
                <Text
                  style={[
                    styles.toolTabText,
                    { color: selected ? colors.primary : colors.textMuted },
                  ]}
                >
                  {
                    (hi
                      ? ['क्षेत्रफल', 'अनियमित', 'इकाइयाँ', 'पैमाना', 'GPS']
                      : ['Area', 'Irregular', 'Units', 'Scale', 'GPS'])[index]
                  }
                </Text>
              </AppPressable>
            );
          })}
        </View>
        {moduleId === 'area-converter' && (
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t('Convert length', 'लंबाई बदलें')}
            onPress={() =>
              navigation.navigate('Calculator', {
                focusToolId: 'length-converter',
              })
            }
            style={styles.lengthLink}
          >
            <Text style={{ color: colors.primary }}>
              {t(
                'Convert length: metre, feet, yard, inch…',
                'लंबाई बदलें: मीटर, फुट, गज, इंच…',
              )}
            </Text>
          </AppPressable>
        )}
        <View
          onLayout={event => {
            workspaceY.current = event.nativeEvent.layout.y;
          }}
        >
          <Animated.View
            style={{
              opacity: reveal,
              transform: [
                {
                  translateY: reveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            }}
          >
            {moduleId === 'gps-land-measure' ? (
              focused && (
                <GpsLandMeasureWorkspace
                  externalRecord={externalRecord}
                  onExternalRecordApplied={applied}
                  showSavedRecords={false}
                  onOpenSaved={openSaved}
                />
              )
            ) : (
              <MeasurementCalculator
                key={`${stateCode}-${moduleId}`}
                moduleId={moduleId}
                externalRecord={externalRecord}
                onRecordApplied={applied}
                onOpenSaved={openSaved}
              />
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  lengthLink: { minHeight: 44, justifyContent: 'center', marginBottom: 10 },
  content: { paddingHorizontal: 18, paddingBottom: 24 },
  toolStrip: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  toolTabContainer: { flex: 1 },
  toolTab: { minHeight: 44, justifyContent: 'center', borderBottomWidth: 2 },
  toolTabText: { fontSize: 12, fontWeight: '600' },
});
