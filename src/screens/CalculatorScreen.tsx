import { typography } from '../theme/typography';
import { PremiumLockBadge } from '../components/premium/PremiumLock';
import { isPremiumCalculator } from '../domain/premiumCalculators';
import { usePremiumFeatures } from '../hooks/usePremiumFeatures';
import { RELEASE_FEATURES } from '../config/releaseFeatures';
import React, { useCallback, useEffect, useState } from 'react';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppScreen from '../components/AppScreen';
import CalculatorWorkspace from '../components/calculator/CalculatorWorkspace';
import { calculatorTools } from '../components/calculator/calculatorContent';
import {
  useCalculatorTheme,
  useCalculatorMotion,
} from '../components/calculator/CalculatorUI';
import CalculatorHeader from '../components/calculator/CalculatorHeader';
import { useLanguage } from '../context/LanguageContext';
import { useSelectedState } from '../context/SelectedStateContext';
import {
  DESK_CALCULATOR_IDS,
  DeskCalculatorId,
} from '../domain/lekhpalCalculator';
import { WorkspaceRecord } from '../types/workspace';
import { consumePendingMeasurementRecordSelection } from '../utils/measurementRecordBridge';
const isTool = (id: unknown): id is DeskCalculatorId =>
  typeof id === 'string' &&
  (DESK_CALCULATOR_IDS as readonly string[]).includes(id);
export default function CalculatorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language } = useLanguage();
  const { stateCode } = useSelectedState();
  const c = useCalculatorTheme();
  const premium = usePremiumFeatures();
  const motion = useCalculatorMotion();
  const insets = useSafeAreaInsets();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const [active, setActive] = useState<DeskCalculatorId>(
    isTool(route.params?.focusToolId)
      ? route.params.focusToolId
      : 'scientific-calculator',
  );
  const [sheet, setSheet] = useState(false);
  const [search, setSearch] = useState('');
  const [record, setRecord] = useState<WorkspaceRecord | null>(null);
  useEffect(() => {
    if (isTool(route.params?.focusToolId)) {
      setActive(route.params.focusToolId);
      setRecord(null);
      navigation.setParams({ focusToolId: undefined });
    }
  }, [navigation, route.params?.focusToolId]);
  useFocusEffect(
    useCallback(() => {
      const selected = consumePendingMeasurementRecordSelection();
      if (selected && isTool(selected.moduleId)) {
        setActive(selected.moduleId);
        setRecord(selected.record);
      }
    }, []),
  );
  const tool = calculatorTools.find(item => item.id === active)!;
  const title = tool.title[language === 'hi' ? 1 : 0];
  return (
    <AppScreen scroll={false} style={{ backgroundColor: c.bg }}>
      <CalculatorHeader
        title={t('Calculator', 'कैलकुलेटर')}
        onBack={() => navigation.navigate('Home')}
        onOpenSaved={() =>
          navigation.navigate('MeasurementSavedRecords', {
            moduleId: active,
            storageToolId: active,
            title,
            kind: 'calculator',
          })
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Choose calculator', 'कैलकुलेटर चुनें')}
        accessibilityState={{ expanded: sheet }}
        onPress={() => setSheet(true)}
        style={[s.selector, { backgroundColor: c.paper, borderColor: c.line }]}
      >
        <View style={[s.toolIcon, { backgroundColor: c.tint }]}>
          <Icon
            name={
              isPremiumCalculator(active) && !premium
                ? 'lock-outline'
                : tool.icon
            }
            size={23}
            color={c.accent}
          />
        </View>
        <View style={s.fill}>
          <Text style={[s.small, { color: c.muted }]}>
            {t('FIELD TOOLS', 'फील्ड उपकरण')}{' '}
            <Text style={{ color: c.warm }}> / {calculatorTools.length}</Text>
          </Text>
          <Text style={[s.selectedTitle, { color: c.ink }]}>{title}</Text>
        </View>
        <Icon name="unfold-more-horizontal" size={23} color={c.accent} />
      </Pressable>
      <CalculatorWorkspace
        key={`${stateCode}-${active}-${record?.id || 'draft'}`}
        toolId={active}
        externalRecord={record}
        onOpenOfficial={() =>
          navigation.navigate('WebViewPortal', {
            title: t(
              'IGRSUP · valuation & fees',
              'IGRSUP · मूल्यांकन और शुल्क',
            ),
            url: 'https://www.igrsup.gov.in/',
          })
        }
      />
      <Modal
        visible={sheet}
        transparent
        animationType={motion ? 'slide' : 'none'}
        onRequestClose={() => setSheet(false)}
        statusBarTranslucent
      >
        <View style={s.modal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              'Close calculator list',
              'कैलकुलेटर सूची बंद करें',
            )}
            style={s.backdrop}
            onPress={() => setSheet(false)}
          />
          <View
            accessibilityViewIsModal
            style={[
              s.sheet,
              {
                backgroundColor: c.bg,
                paddingBottom: Math.max(insets.bottom, 18),
              },
            ]}
          >
            <View style={[s.handle, { backgroundColor: c.line }]} />
            <View style={s.sheetHeader}>
              <View style={s.fill}>
                <Text style={[s.sheetTitle, { color: c.ink }]}>
                  {t('Choose your calculation', 'अपनी गणना चुनें')}
                </Text>
                <Text style={[s.sheetCaption, { color: c.muted }]}>
                  {t(
                    `${calculatorTools.length} tools for everyday field and office work`,
                    `दैनिक मैदानी और कार्यालय कार्य के लिए ${calculatorTools.length} उपकरण`,
                  )}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Close', 'बंद करें')}
                style={s.icon}
                onPress={() => setSheet(false)}
              >
                <Icon name="close" size={22} color={c.muted} />
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel={t('Search calculators', 'कैलकुलेटर खोजें')}
              placeholder={t('Search name or task', 'नाम या काम खोजें')}
              placeholderTextColor={c.muted}
              value={search}
              onChangeText={setSearch}
              style={[s.search, { color: c.ink, borderColor: c.line }]}
            />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {calculatorTools
                .filter(item =>
                  [...item.title, ...item.description]
                    .join(' ')
                    .toLowerCase()
                    .includes(search.trim().toLowerCase()),
                )
                .map((item, index) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={
                      item.title[language === 'hi' ? 1 : 0] +
                      (RELEASE_FEATURES.premium && isPremiumCalculator(item.id)
                        ? premium
                          ? ' · Premium'
                          : t(' · Locked · Premium', ' · लॉक · प्रीमियम')
                        : '')
                    }
                    accessibilityState={{ selected: active === item.id }}
                    onPress={() => {
                      if (item.id !== active) {
                        setActive(item.id);
                        setRecord(null);
                      }
                      setSheet(false);
                    }}
                    style={[
                      s.toolRow,
                      {
                        borderColor: c.line,
                        backgroundColor: active === item.id ? c.tint : c.bg,
                      },
                    ]}
                  >
                    <Text style={[s.toolIndex, { color: c.warm }]}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                    <Icon name={item.icon} size={23} color={c.accent} />
                    <View style={s.fill}>
                      <Text style={[s.toolTitle, { color: c.ink }]}>
                        {item.title[language === 'hi' ? 1 : 0]}
                        {RELEASE_FEATURES.premium &&
                        isPremiumCalculator(item.id) &&
                        premium
                          ? ' · Premium'
                          : ''}
                      </Text>
                      {isPremiumCalculator(item.id) && !premium && (
                        <PremiumLockBadge />
                      )}
                      <Text style={[s.toolDescription, { color: c.muted }]}>
                        {item.description[language === 'hi' ? 1 : 0]}
                      </Text>
                    </View>
                    <Icon
                      name={
                        isPremiumCalculator(item.id) && !premium
                          ? 'lock-outline'
                          : active === item.id
                          ? 'check-circle'
                          : 'chevron-right'
                      }
                      size={19}
                      color={active === item.id ? c.accent : c.muted}
                    />
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}
const s = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    minHeight: 48,
  },
  fill: { flex: 1 },
  header: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  icon: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.heading, flex: 1 },
  selector: {
    marginHorizontal: 22,
    marginBottom: 12,
    marginTop: 16,
    padding: 13,
    borderWidth: 1,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  toolIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { ...typography.caption, marginBottom: 5 },
  selectedTitle: typography.title,
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.46)',
  },
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  sheet: {
    maxHeight: '87%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 11,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 13,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingBottom: 19,
  },
  sheetTitle: typography.heading,
  sheetCaption: { ...typography.caption, marginTop: 5 },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 79,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 13,
  },
  toolIndex: { fontSize: 10, fontWeight: '700' },
  toolTitle: typography.title,
  toolDescription: { ...typography.caption, marginTop: 4 },
});
