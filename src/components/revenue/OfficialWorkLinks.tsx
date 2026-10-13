import { typography } from '../../theme/typography';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OFFICIAL_WORK, OfficialWorkModule } from '../../domain/officialWork';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import type { UpWorkTab } from '../../data/upWorkTabs';
const WORK_TABS: Record<OfficialWorkModule, UpWorkTab> = {
  survey9: 'fieldwork',
  inspector: 'feeding',
  'svamitva-pdf': 'documents',
  registry: 'feeding',
  census: 'feeding',
  echawadi: 'feeding',
};
const WORK_ICONS: Record<OfficialWorkModule, string> = {
  survey9: 'clipboard-check-outline',
  inspector: 'account-check-outline',
  'svamitva-pdf': 'file-document-outline',
  registry: 'account-edit-outline',
  census: 'sprout-outline',
  echawadi: 'notebook-outline',
};
export const matchingDocumentAutomation = (stateCode: string, query = '') =>
  !!stateCode &&
  (!query.trim() ||
    /document|automat|draft|letter|application|order|inspection|correction|demarcation|दस्तावेज़|मसौदा|पत्र|आवेदन|आदेश|निरीक्षण|सीमांकन/i.test(
      query.trim(),
    ));
export const matchingEroPdf = (stateCode: string, query = '') =>
  !!stateCode &&
  (!query.trim() ||
    /ero|pdf|eci|elect|format|ईआरओ|पीडीएफ|निर्वाचन/i.test(query.trim()));

export function matchingOfficialWork(stateCode: string, query = '') {
  return (Object.keys(OFFICIAL_WORK) as OfficialWorkModule[]).filter(
    id =>
      (id === 'echawadi'
        ? stateCode === 'MH'
        : id === 'census'
        ? !!stateCode
        : stateCode === 'UP') &&
      `${OFFICIAL_WORK[id].en} ${OFFICIAL_WORK[id].hi}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
}
export default function OfficialWorkLinks({
  stateCode,
  query = '',
  navigation,
  workTab,
}: {
  stateCode: string;
  query?: string;
  navigation: { navigate: (screen: string, params?: any) => void };
  workTab?: UpWorkTab;
}) {
  const { language } = useLanguage(),
    { colors } = useAppTheme();
  const entries = matchingOfficialWork(stateCode, query).filter(
    id => !workTab || WORK_TABS[id] === workTab,
  );
  const showMap =
    stateCode === 'UP' &&
    (!query || /map|kml|kmz|नक्शा/i.test(query)) &&
    (!workTab || workTab === 'fieldwork');
  const showDocuments =
    matchingDocumentAutomation(stateCode, query) &&
    (!workTab || workTab === 'documents');
  const showEro =
    matchingEroPdf(stateCode, query) && (!workTab || workTab === 'documents');
  if (!entries.length && !showEro && !showDocuments && !showMap) return null;
  return (
    <View style={styles.section}>
      {!workTab && (
        <Text style={[styles.heading, { color: colors.text }]}>
          {language === 'hi'
            ? 'अनुमोदन और अन्य कार्य'
            : 'Approvals and other work'}
        </Text>
      )}
      {showMap && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bhunaksha map export"
          onPress={() => navigation.navigate('MapExport')}
          style={[
            styles.card,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Icon name="map-outline" size={25} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            {language === 'hi'
              ? 'भू-नक्शा KML / KMZ निर्यात'
              : 'Bhunaksha KML / KMZ export'}
          </Text>
          <Icon name="chevron-right" size={22} color={colors.textMuted} />
        </Pressable>
      )}
      {entries.map(id => (
        <Pressable
          key={id}
          accessibilityRole="button"
          accessibilityLabel={OFFICIAL_WORK[id][language]}
          onPress={() =>
            id === 'echawadi'
              ? navigation.navigate('Echawadi')
              : navigation.navigate('OfficialWork', {
                  module: id,
                  ...(stateCode !== 'UP' ? { workspaceState: stateCode } : {}),
                })
          }
          style={[
            styles.card,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Icon name={WORK_ICONS[id]} size={25} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            {OFFICIAL_WORK[id][language]}
          </Text>
          <Icon name="chevron-right" size={22} color={colors.textMuted} />
        </Pressable>
      ))}
      {showDocuments && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Document automation"
          onPress={() =>
            navigation.navigate('DocumentAutomation', { stateCode })
          }
          style={[
            styles.card,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Icon
            name="file-document-edit-outline"
            size={25}
            color={colors.primary}
          />
          <Text style={[styles.title, { color: colors.text }]}>
            {language === 'hi' ? 'दस्तावेज़ ऑटोमेशन' : 'Document automation'}
          </Text>
          <Icon name="chevron-right" size={22} color={colors.textMuted} />
        </Pressable>
      )}
      {showEro && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ERO PDFs"
          onPress={() => navigation.navigate('EroPdf')}
          style={[
            styles.card,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Icon name="file-pdf-box" size={25} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            {language === 'hi' ? 'ईआरओ पीडीएफ' : 'ERO PDFs'}
          </Text>
          <Icon name="chevron-right" size={22} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: 10, marginVertical: 14 },
  heading: typography.heading,
  card: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { ...typography.title, flex: 1 },
});
