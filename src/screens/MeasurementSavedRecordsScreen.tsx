import { PremiumLockNotice } from '../components/premium/PremiumLock';
import { editReport } from '../services/reportEditor';
import { usePremiumFeatures } from '../hooks/usePremiumFeatures';
import { requestPremiumAccess } from '../services/premiumAccess';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import CalculatorHeader from '../components/calculator/CalculatorHeader';
import {
  CalculatorButton,
  useCalculatorTheme,
} from '../components/calculator/CalculatorUI';
import AppScreen from '../components/AppScreen';
import AppPressable from '../components/AppPressable';
import { MeasurementButton } from '../components/measurement/MeasurementUI';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { useSavedWorkspaceRecords } from '../hooks/useSavedWorkspaceRecords';
import { RootStackParamList } from '../types/navigation';
import { shareTextSummary, exportSummaryAsPdf } from '../utils/workspaceExport';
import { setPendingMeasurementRecordSelection } from '../utils/measurementRecordBridge';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'MeasurementSavedRecords'
>;
export default function MeasurementSavedRecordsScreen({
  navigation,
  route,
}: Props) {
  const { language } = useLanguage();
  const { colors: appColors } = useAppTheme();
  const calculatorColors = useCalculatorTheme();
  const calculator = route.params.kind === 'calculator';
  const colors = calculator
    ? {
        ...appColors,
        background: calculatorColors.bg,
        surface: calculatorColors.paper,
        border: calculatorColors.line,
        text: calculatorColors.ink,
        textMuted: calculatorColors.muted,
        textSoft: calculatorColors.muted,
        primary: calculatorColors.accent,
      }
    : appColors;
  const Button = calculator ? CalculatorButton : MeasurementButton;
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const premium = usePremiumFeatures();
  const [groupBy, setGroupBy] = useState<'village' | 'plot' | 'client' | null>(
    null,
  );
  const { deleteRecord, records, organizeRecord } = useSavedWorkspaceRecords(
    route.params.storageToolId,
  );
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered = records.filter(record =>
    [
      record.title,
      record.subtitle,
      ...record.summaryLines,
      ...Object.values(record.organization || {}),
    ]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const group = (record: (typeof records)[number]) =>
    groupBy
      ? record.organization?.[groupBy] ||
        (groupBy === 'village'
          ? record.values.villageName || record.values.village
          : groupBy === 'plot'
          ? record.values.plotLabel || record.values.gata
          : '') ||
        t('Unassigned', 'बिना वर्ग')
      : '';
  if (groupBy && premium)
    filtered.sort((a, b) => group(a).localeCompare(group(b)));
  const error = () =>
    Alert.alert(
      t('Could not finish', 'कार्य पूरा नहीं हुआ'),
      t('Please try again.', 'कृपया दोबारा कोशिश करें।'),
    );
  return (
    <AppScreen scroll={false} style={{ backgroundColor: colors.background }}>
      {calculator ? (
        <CalculatorHeader
          title={t('Saved calculations', 'सेव की गई गणनाएं')}
          subtitle={route.params.title}
          onBack={() => navigation.goBack()}
        />
      ) : (
        <AppHeader
          title={
            calculator
              ? t('Saved calculations', 'सेव की गई गणनाएं')
              : t('Saved measurements', 'सेव किए माप')
          }
          subtitle={route.params.title.split(' · ')[0]}
          leftIconName="arrow-left"
          onLeftPress={() => navigation.goBack()}
        />
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.search,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Icon name="magnify" size={21} color={colors.textMuted} />
          <TextInput
            accessibilityLabel={t(
              calculator
                ? 'Search saved calculations'
                : 'Search saved measurements',
              calculator ? 'सेव गणनाएं खोजें' : 'सेव किए माप खोजें',
            )}
            placeholder={t(
              'Search village, plot, client or note',
              'गांव, भूखंड, ग्राहक या नोट खोजें',
            )}
            placeholderTextColor={colors.textSoft}
            value={search}
            onChangeText={setSearch}
            style={[styles.input, { color: colors.text }]}
          />
        </View>
        {!premium && (
          <PremiumLockNotice
            title={t('Organise your fieldwork', 'फील्डवर्क व्यवस्थित करें')}
            description={t(
              'Premium unlocks village, plot and client grouping, editable record details and PDF reports. Viewing and searching saved notes stays free.',
              'प्रीमियम से गांव, भूखंड और ग्राहक के अनुसार समूह, रिकॉर्ड संपादन और PDF रिपोर्ट अनलॉक होते हैं। सेव नोट देखना और खोजना मुफ्त है।',
            )}
          />
        )}
        <View style={styles.actions}>
          {(['village', 'plot', 'client'] as const).map((key, i) => (
            <Button
              key={key}
              title={`${premium ? '' : '🔒 '}${t(
                ['Village', 'Plot', 'Client'][i],
                ['गांव', 'भूखंड', 'ग्राहक'][i],
              )}`}
              icon={
                !premium
                  ? 'lock-outline'
                  : groupBy === key
                  ? 'check'
                  : 'folder-outline'
              }
              onPress={() => {
                if (requestPremiumAccess('gps_capture'))
                  setGroupBy(groupBy === key ? null : key);
              }}
            />
          ))}
        </View>
        <Text style={[styles.count, { color: colors.textMuted }]}>
          {filtered.length}{' '}
          {t(
            'notes · latest 12 stored on this device',
            'नोट · इस डिवाइस पर नवीनतम 12 सेव रहते हैं',
          )}
        </Text>
        {filtered.length === 0 && (
          <View
            style={[
              styles.empty,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Icon name="notebook-outline" size={42} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>
              {search
                ? t('No matching notes', 'कोई नोट नहीं मिला')
                : t(
                    'Your field notebook starts here',
                    'आपकी माप पुस्तिका यहां शुरू होती है',
                  )}
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              {search
                ? t(
                    'Try a different village or Gata number.',
                    'दूसरा गांव या गाटा संख्या खोजें।',
                  )
                : t(
                    calculator
                      ? 'Calculate a result and tap Save calculation. Reopen it here with every input intact.'
                      : 'Calculate a measurement and tap Save measurement. You can reopen it here with every input intact.',
                    calculator
                      ? 'गणना करके गणना सेव करें दबाएं। यहां से पूरे विवरण के साथ दोबारा खोल सकते हैं।'
                      : 'माप की गणना करके माप सेव करें दबाएं। यहां से पूरे विवरण के साथ दोबारा खोल सकते हैं।',
                  )}
            </Text>
          </View>
        )}
        {filtered.map((record, index) => (
          <View
            key={record.id}
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {groupBy &&
              premium &&
              (index === 0 || group(filtered[index - 1]) !== group(record)) && (
                <Text style={[styles.title, { color: colors.primary }]}>
                  {group(record)}
                </Text>
              )}
            <View style={styles.topRow}>
              <View style={styles.copy}>
                <Text style={[styles.date, { color: colors.textMuted }]}>
                  {new Date(record.updatedAt).toLocaleDateString(
                    language === 'hi' ? 'hi-IN' : 'en-IN',
                    { day: 'numeric', month: 'short', year: 'numeric' },
                  )}
                </Text>
                <Text style={[styles.title, { color: colors.text }]}>
                  {record.title}
                </Text>
                {record.organization && (
                  <Text style={[styles.body, { color: colors.textMuted }]}>
                    {[
                      record.organization.village,
                      record.organization.plot,
                      record.organization.client,
                      record.organization.owner,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                )}
                <Text style={[styles.result, { color: colors.primary }]}>
                  {record.subtitle}
                </Text>
              </View>
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel={
                  calculator
                    ? t('Delete calculation', 'गणना हटाएं')
                    : t('Delete measurement', 'माप हटाएं')
                }
                onPress={() =>
                  Alert.alert(
                    t('Delete this saved note?', 'यह सेव किया नोट हटाएं?'),
                    record.title,
                    [
                      { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
                      {
                        text: t('Delete', 'हटाएं'),
                        style: 'destructive',
                        onPress: () => {
                          deleteRecord(record.id).catch(error);
                        },
                      },
                    ],
                  )
                }
                style={styles.delete}
              >
                <Icon
                  name="trash-can-outline"
                  size={20}
                  color={colors.danger}
                />
              </AppPressable>
            </View>
            <AppPressable
              accessibilityRole="button"
              accessibilityState={{ expanded: expanded === record.id }}
              accessibilityLabel={t('Calculation details', 'गणना का विवरण')}
              onPress={() =>
                setExpanded(expanded === record.id ? null : record.id)
              }
              style={styles.details}
            >
              <Text style={[styles.detailsText, { color: colors.textMuted }]}>
                {t('Inputs & calculation', 'विवरण और गणना')}
              </Text>
              <Icon
                name={expanded === record.id ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
              />
            </AppPressable>
            {expanded === record.id && (
              <View style={[styles.summary, { borderColor: colors.border }]}>
                {record.summaryLines.map((line, lineIndex) => (
                  <Text
                    key={lineIndex}
                    style={[styles.body, { color: colors.text }]}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            )}
            <View style={styles.actions}>
              <Button
                title={
                  premium
                    ? t('Organise', 'व्यवस्थित करें')
                    : t('Unlock organise', 'व्यवस्थित करना अनलॉक करें')
                }
                icon={premium ? 'folder-edit-outline' : 'lock-outline'}
                onPress={async () => {
                  if (!requestPremiumAccess('gps_capture')) return;
                  try {
                    const edited = await editReport({
                      title: record.title,
                      summaryLines: record.summaryLines,
                      details: record.organization || {
                        village:
                          record.values.villageName || record.values.village,
                        plot: record.values.plotLabel || record.values.gata,
                      },
                    });
                    if (edited)
                      await organizeRecord(
                        record.id,
                        edited.details,
                        edited.title,
                      );
                  } catch {
                    error();
                  }
                }}
              />
              <Button
                title={premium ? 'PDF' : t('Unlock PDF', 'PDF अनलॉक करें')}
                icon={premium ? 'file-pdf-box' : 'lock-outline'}
                onPress={() => {
                  let points;
                  try {
                    points = JSON.parse(record.values.points || 'null');
                  } catch {}
                  exportSummaryAsPdf({
                    title: record.title,
                    fileName: `lekhpal-${Date.now()}`,
                    summaryLines: record.summaryLines,
                    details: record.organization,
                    points: Array.isArray(points) ? points : undefined,
                  }).catch(error);
                }}
              />
              <Button
                title={
                  calculator
                    ? t('Open calculation', 'गणना खोलें')
                    : t('Open measurement', 'माप खोलें')
                }
                icon="pencil-outline"
                primary
                onPress={() => {
                  setPendingMeasurementRecordSelection({
                    moduleId: route.params.moduleId,
                    record,
                  });
                  navigation.goBack();
                }}
              />
              <Button
                title={t('Share', 'साझा करें')}
                icon="share-variant-outline"
                onPress={() => {
                  shareTextSummary({
                    title: record.title,
                    summaryLines: record.summaryLines,
                  }).catch(error);
                }}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 36 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: { flex: 1, minHeight: 52, fontSize: 14 },
  count: { fontSize: 12, lineHeight: 18, marginVertical: 16 },
  empty: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 25,
    gap: 14,
  },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  topRow: { flexDirection: 'row', gap: 10 },
  copy: { flex: 1 },
  date: { fontSize: 11, marginBottom: 7 },
  title: { fontSize: 18, lineHeight: 25, fontWeight: '700' },
  result: { fontSize: 16, lineHeight: 23, fontWeight: '600', marginTop: 6 },
  body: { fontSize: 13, lineHeight: 22 },
  delete: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    marginVertical: 7,
  },
  detailsText: { fontSize: 12, fontWeight: '600' },
  summary: { borderTopWidth: 1, paddingVertical: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
