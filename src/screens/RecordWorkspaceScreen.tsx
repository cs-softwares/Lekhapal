import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';

import { useSelectedState } from '../context/SelectedStateContext';
import { LAND_PORTALS } from '../data/nationalPortalLinks';
import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import AppSectionTitle from '../components/AppSectionTitle';
import SavedRecordsPanel from '../components/workspaces/SavedRecordsPanel';
import WorkspaceActionRow from '../components/workspaces/WorkspaceActionRow';
import WorkspaceField from '../components/workspaces/WorkspaceField';
import { useLanguage } from '../context/LanguageContext';
import {
  buildInitialWorkflowValues,
  getWorkflowConfig,
} from '../data/workflowConfigs';
import { getToolById } from '../data/toolCatalog';
import { useSavedWorkspaceRecords } from '../hooks/useSavedWorkspaceRecords';
import { COLORS } from '../theme/colors';
import { RootStackParamList } from '../types/navigation';
import { getLocalizedText } from '../types/tool';
import { WorkspaceRecord } from '../types/workspace';
import {
  exportRefAsImage,
  exportSummaryAsPdf,
  shareTextSummary,
} from '../utils/workspaceExport';
import { hasAnyValue, sanitizeFileName } from '../utils/workspaceFormatters';

type Props = NativeStackScreenProps<RootStackParamList, 'RecordWorkspace'>;

type StyledFieldSection = {
  accentColor: string;
  fieldKeys: string[];
  title: {
    en: string;
    hi: string;
  };
};

const VILLAGE_DIARY_FIELD_SECTIONS: StyledFieldSection[] = [
  {
    accentColor: '#38BDF8',
    fieldKeys: ['villageName', 'tehsil', 'district'],
    title: {
      en: 'Village details',
      hi: 'गांव विवरण',
    },
  },
  {
    accentColor: '#F59E0B',
    fieldKeys: ['visitDate', 'purpose'],
    title: {
      en: 'Visit details',
      hi: 'विजिट विवरण',
    },
  },
  {
    accentColor: '#14B8A6',
    fieldKeys: ['notes', 'pendingWork', 'nextStep'],
    title: {
      en: 'Notes & follow-up',
      hi: 'नोट्स और फॉलो-अप',
    },
  },
];

const MUTATION_TRACKER_FIELD_SECTIONS: StyledFieldSection[] = [
  {
    accentColor: '#F97316',
    fieldKeys: ['applicantName', 'villageName'],
    title: {
      en: 'Applicant details',
      hi: 'आवेदक विवरण',
    },
  },
  {
    accentColor: '#0EA5E9',
    fieldKeys: ['khataNumber', 'caseNumber', 'status'],
    title: {
      en: 'Case reference',
      hi: 'केस संदर्भ',
    },
  },
  {
    accentColor: '#14B8A6',
    fieldKeys: ['documentsPending', 'nextAction', 'remarks'],
    title: {
      en: 'Follow-up notes',
      hi: 'फॉलो-अप नोट्स',
    },
  },
];

const OFFICIAL_WORKFLOW_PORTALS: Record<
  string,
  { title: string; url: string }
> = {
  'crop-girdawari': {
    title: 'Lekhpal Department Dashboard',
    url: 'https://bor.up.gov.in/revenuesoft/login.aspx',
  },
  'mutation-tracker': {
    title: 'RCMS Mutation / Varasat',
    url: 'https://rccms.up.gov.in/dashboard/login/',
  },
  'government-land-inspection': {
    title: 'Lekhpal Department Dashboard',
    url: 'https://bor.up.gov.in/revenuesoft/login.aspx',
  },
  'encroachment-report': {
    title: 'Lekhpal Department Dashboard',
    url: 'https://bor.up.gov.in/revenuesoft/login.aspx',
  },
};

const RecordWorkspaceScreen = ({ navigation, route }: Props) => {
  const { language } = useLanguage();
  const { stateCode } = useSelectedState();
  const tool = getToolById(route.params.toolId);
  const config = getWorkflowConfig(route.params.toolId);
  const reportRef = useRef<ViewShotRef>(null);
  const revealAnimation = useRef(new Animated.Value(0)).current;
  const [values, setValues] = useState<Record<string, string>>(() =>
    buildInitialWorkflowValues(route.params.toolId),
  );
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);
  const { deleteRecord, records, saveRecord } = useSavedWorkspaceRecords(
    route.params.toolId,
  );

  const copy = useMemo(
    () => ({
      currentReport:
        language === 'hi' ? 'अभी की वर्क रिपोर्ट' : 'Current work report',
      save: language === 'hi' ? 'सेव करें' : 'Save',
      share: language === 'hi' ? 'शेयर' : 'Share',
      pdf: 'PDF',
      image: 'Image',
      savedReports: language === 'hi' ? 'सेव्ड रिकॉर्ड्स' : 'Saved records',
      load: language === 'hi' ? 'लोड करें' : 'Load',
      emptyTitle:
        language === 'hi'
          ? 'अभी कोई रिकॉर्ड सेव नहीं है'
          : 'No saved record yet',
      emptyBody:
        language === 'hi'
          ? 'फॉर्म भरकर सेव करेंगे तो वह यहां बाद में दोबारा उपयोग के लिए दिखेगा।'
          : 'Saved records will appear here for quick reuse.',
      saveBlocked:
        language === 'hi' ? 'पहले कुछ विवरण भरें' : 'Add some details first',
      saveBlockedBody:
        language === 'hi'
          ? 'रिकॉर्ड सेव या एक्सपोर्ट करने से पहले कम से कम एक फील्ड भर दें।'
          : 'Fill at least one field before saving or exporting.',
      saveDoneTitle: language === 'hi' ? 'रिकॉर्ड सेव हो गया' : 'Record saved',
      saveDoneBody:
        language === 'hi'
          ? 'यह रिकॉर्ड अब सेव्ड लिस्ट में उपलब्ध है।'
          : 'The record is now available in your saved list.',
      exportError:
        language === 'hi'
          ? 'एक्सपोर्ट पूरा नहीं हुआ'
          : 'Export could not finish',
      officialSite:
        language === 'hi'
          ? 'अब आधिकारिक साइट पर जाएँ'
          : 'Now go to official site',
      officialSiteBody:
        language === 'hi'
          ? 'ऐप में तैयारी पूरी करें, फिर लॉगिन करके सरकारी पोर्टल पर अंतिम काम पूरा करें।'
          : 'Finish preparing here, then log in and complete the final government action on the official portal.',
    }),
    [language],
  );

  const toolTitle = tool ? getLocalizedText(tool.title, language) : 'Workspace';
  const isVillageDiary = route.params.toolId === 'village-diary';
  const isMutationTracker = route.params.toolId === 'mutation-tracker';
  const isStyledWorkflow = isVillageDiary || isMutationTracker;
  const formFieldMap = useMemo(
    () => new Map((config?.fields ?? []).map(field => [field.key, field])),
    [config?.fields],
  );
  const styledFieldSections = isVillageDiary
    ? VILLAGE_DIARY_FIELD_SECTIONS
    : isMutationTracker
    ? MUTATION_TRACKER_FIELD_SECTIONS
    : [];
  const defaultSummaryLines = config
    ? config.buildSummary(values, language)
    : [];
  const defaultRecordTitle = config
    ? config.buildRecordTitle(values, language)
    : 'Workspace';
  const defaultRecordSubtitle = config
    ? config.buildRecordSubtitle(values, language)
    : undefined;
  const emptyLabel = language === 'hi' ? 'नॉट ऐडेड' : 'Not added';
  const pendingLabel = language === 'hi' ? 'पेंडिंग' : 'Pending';
  const routeValue = [values.tehsil?.trim(), values.district?.trim()]
    .filter(Boolean)
    .join(' / ');

  const summaryLines = isVillageDiary
    ? [
        `${language === 'hi' ? 'गांव' : 'Village'}: ${
          values.villageName?.trim() || emptyLabel
        }`,
        `${language === 'hi' ? 'तहसील' : 'Tehsil'}: ${
          values.tehsil?.trim() || emptyLabel
        }`,
        `${language === 'hi' ? 'जिला' : 'District'}: ${
          values.district?.trim() || emptyLabel
        }`,
        `${language === 'hi' ? 'विजिट तिथि' : 'Visit date'}: ${
          values.visitDate?.trim() || pendingLabel
        }`,
        `${language === 'hi' ? 'उद्देश्य' : 'Purpose'}: ${
          values.purpose?.trim() || emptyLabel
        }`,
        `${language === 'hi' ? 'पेंडिंग वर्क' : 'Pending work'}: ${
          values.pendingWork?.trim() || pendingLabel
        }`,
      ]
    : isMutationTracker
    ? [
        `${language === 'hi' ? 'आवेदक' : 'Applicant'}: ${
          values.applicantName?.trim() || emptyLabel
        }`,
        `${language === 'hi' ? 'गांव' : 'Village'}: ${
          values.villageName?.trim() || emptyLabel
        }`,
        `${language === 'hi' ? 'खाता संदर्भ' : 'Khata ref'}: ${
          values.khataNumber?.trim() || pendingLabel
        }`,
        `${language === 'hi' ? 'केस संख्या' : 'Case number'}: ${
          values.caseNumber?.trim() || pendingLabel
        }`,
        `${language === 'hi' ? 'स्थिति' : 'Status'}: ${
          values.status?.trim() || pendingLabel
        }`,
        `${language === 'hi' ? 'पेंडिंग डॉक्यूमेंट्स' : 'Documents pending'}: ${
          values.documentsPending?.trim() || pendingLabel
        }`,
        `${language === 'hi' ? 'अगली कार्यवाही' : 'Next action'}: ${
          values.nextAction?.trim() || pendingLabel
        }`,
        `${language === 'hi' ? 'रिमार्क्स' : 'Remarks'}: ${
          values.remarks?.trim() || emptyLabel
        }`,
      ]
    : defaultSummaryLines;

  const recordTitle =
    isVillageDiary && !values.villageName?.trim()
      ? language === 'hi'
        ? 'भ्रमण सार'
        : 'Visit summary'
      : isMutationTracker && !values.applicantName?.trim()
      ? language === 'hi'
        ? 'म्यूटेशन केस सार'
        : 'Mutation case summary'
      : defaultRecordTitle;

  const recordSubtitle = isVillageDiary
    ? [values.visitDate?.trim(), routeValue || undefined]
        .filter(Boolean)
        .join(' • ')
    : isMutationTracker
    ? [
        values.caseNumber?.trim(),
        values.status?.trim(),
        values.khataNumber?.trim(),
      ]
        .filter(Boolean)
        .join(' • ')
    : defaultRecordSubtitle;

  const visibleReportTitle = isStyledWorkflow ? '' : recordTitle;
  const visibleReportSubtitle = isStyledWorkflow ? '' : recordSubtitle;
  const hasValues = hasAnyValue(values);
  const officialWorkflowPortal =
    stateCode === 'UP'
      ? OFFICIAL_WORKFLOW_PORTALS[route.params.toolId]
      : stateCode
      ? { title: 'State land & revenue services', url: LAND_PORTALS[stateCode] }
      : undefined;
  const styledWorkflowRevealStyle = isStyledWorkflow
    ? {
        opacity: revealAnimation,
        transform: [
          {
            translateY: revealAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
        ],
      }
    : undefined;

  useEffect(() => {
    revealAnimation.setValue(0);
    Animated.timing(revealAnimation, {
      duration: 380,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [revealAnimation, savedPanelOpen, route.params.toolId]);

  if (!tool || !config) {
    return (
      <AppScreen>
        <AppHeader
          leftIconName="arrow-left"
          onLeftPress={() => navigation.goBack()}
          title="Workspace"
        />
      </AppScreen>
    );
  }

  const ensureValuesAvailable = () => {
    if (hasValues) {
      return true;
    }

    Alert.alert(copy.saveBlocked, copy.saveBlockedBody);
    return false;
  };

  const handleSave = async () => {
    if (!ensureValuesAvailable()) {
      return;
    }

    await saveRecord({
      subtitle: recordSubtitle,
      summaryLines,
      title: recordTitle,
      values,
    });

    setSavedPanelOpen(true);
    Alert.alert(copy.saveDoneTitle, copy.saveDoneBody);
  };

  const handleShareCurrent = async () => {
    if (!ensureValuesAvailable()) {
      return;
    }

    try {
      await shareTextSummary({
        summaryLines,
        title: `${toolTitle} • ${recordTitle}`,
      });
    } catch {
      Alert.alert(copy.exportError);
    }
  };

  const handleExportPdf = async () => {
    if (!ensureValuesAvailable()) {
      return;
    }

    try {
      await exportSummaryAsPdf({
        fileName: sanitizeFileName(`${route.params.toolId}-${recordTitle}`),
        summaryLines,
        title: `${toolTitle} • ${recordTitle}`,
      });
    } catch {
      Alert.alert(copy.exportError);
    }
  };

  const handleExportImage = async () => {
    if (!ensureValuesAvailable()) {
      return;
    }

    try {
      await exportRefAsImage({
        fileName: sanitizeFileName(`${route.params.toolId}-${recordTitle}`),
        ref: reportRef,
        title: `${toolTitle} • ${recordTitle}`,
      });
    } catch {
      Alert.alert(copy.exportError);
    }
  };

  const handleLoadRecord = (record: WorkspaceRecord) => {
    setValues({
      ...buildInitialWorkflowValues(route.params.toolId),
      ...record.values,
    });
    setSavedPanelOpen(false);
  };

  const savedRecordsView = (
    <SavedRecordsPanel
      emptyBody={copy.emptyBody}
      emptyTitle={copy.emptyTitle}
      loadLabel={copy.load}
      onDelete={deleteRecord}
      onLoad={handleLoadRecord}
      onShare={record =>
        shareTextSummary({
          summaryLines: record.summaryLines,
          title: record.title,
        }).catch(() => {
          Alert.alert(copy.exportError);
        })
      }
      records={records}
      shareLabel={copy.share}
      title={copy.savedReports}
    />
  );

  return (
    <AppScreen>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => navigation.goBack()}
        rightIcons={[
          {
            iconName: savedPanelOpen
              ? 'bookmark-remove-outline'
              : 'bookmark-multiple-outline',
            onPress: () => setSavedPanelOpen(previous => !previous),
          },
        ]}
        title={toolTitle}
      />

      <View style={styles.content}>
        {savedPanelOpen ? (
          savedRecordsView
        ) : (
          <>
            {!isStyledWorkflow ? (
              <View style={styles.introCard}>
                <Text style={styles.introText}>
                  {getLocalizedText(config.intro, language)}
                </Text>
              </View>
            ) : null}

            <AppSectionTitle title={copy.currentReport} />

            <Animated.View style={styledWorkflowRevealStyle}>
              <ViewShot
                options={{
                  fileName: sanitizeFileName(
                    `${route.params.toolId}-${recordTitle}`,
                  ),
                  format: 'png',
                  quality: 1,
                }}
                ref={reportRef}
              >
                {isStyledWorkflow ? (
                  <View style={styles.villageReportCard}>
                    {summaryLines.map((line, index) => {
                      const separatorIndex = line.indexOf(':');
                      const label =
                        separatorIndex >= 0
                          ? line.slice(0, separatorIndex)
                          : line;
                      const value =
                        separatorIndex >= 0
                          ? line.slice(separatorIndex + 1).trim()
                          : '';

                      return (
                        <Text
                          key={`${label}-${index}`}
                          style={[
                            styles.villageReportLineText,
                            index > 0 && styles.villageReportLineTextSpaced,
                          ]}
                        >
                          <Text style={styles.villageReportLineLabel}>
                            {label}
                            {value ? ': ' : ''}
                          </Text>
                          {value ? (
                            <Text style={styles.villageReportLineValue}>
                              {value}
                            </Text>
                          ) : null}
                        </Text>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.reportCard}>
                    {visibleReportTitle ? (
                      <Text style={styles.reportTitle}>
                        {visibleReportTitle}
                      </Text>
                    ) : null}
                    {visibleReportSubtitle ? (
                      <Text style={styles.reportSubtitle}>
                        {visibleReportSubtitle}
                      </Text>
                    ) : null}
                    {summaryLines.map(line => (
                      <Text key={line} style={styles.reportLine}>
                        {line}
                      </Text>
                    ))}
                  </View>
                )}
              </ViewShot>

              <WorkspaceActionRow
                labels={copy}
                onExportImage={handleExportImage}
                onExportPdf={handleExportPdf}
                onSave={handleSave}
                onShare={handleShareCurrent}
              />

              {officialWorkflowPortal ? (
                <View style={styles.officialNextCard}>
                  <Text style={styles.officialNextTitle}>
                    {copy.officialSite}
                  </Text>
                  <Text style={styles.officialNextBody}>
                    {copy.officialSiteBody}
                  </Text>
                  <AppPressable
                    onPress={() =>
                      navigation.navigate('WebViewPortal', {
                        title: officialWorkflowPortal.title,
                        url: officialWorkflowPortal.url,
                      })
                    }
                    style={styles.officialNextButton}
                  >
                    <Text style={styles.officialNextButtonText}>
                      {officialWorkflowPortal.title}
                    </Text>
                  </AppPressable>
                </View>
              ) : null}

              {isStyledWorkflow ? (
                <View style={styles.villageFormStack}>
                  {styledFieldSections.map(section => (
                    <View
                      key={section.title.en}
                      style={styles.villageSectionCard}
                    >
                      <View style={styles.villageSectionHeader}>
                        <View
                          style={[
                            styles.villageSectionAccent,
                            {
                              backgroundColor: section.accentColor,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.villageSectionTitle,
                            {
                              color: section.accentColor,
                            },
                          ]}
                        >
                          {getLocalizedText(section.title, language)}
                        </Text>
                      </View>

                      {section.fieldKeys.map(fieldKey => {
                        const field = formFieldMap.get(fieldKey);

                        if (!field) {
                          return null;
                        }

                        return (
                          <WorkspaceField
                            compactMultiline={field.compactMultiline}
                            key={field.key}
                            keyboardType={field.keyboardType}
                            label={getLocalizedText(field.label, language)}
                            multiline={field.multiline}
                            onChangeText={nextValue =>
                              setValues(previous => ({
                                ...previous,
                                [field.key]: nextValue,
                              }))
                            }
                            placeholder={
                              field.placeholder
                                ? getLocalizedText(field.placeholder, language)
                                : undefined
                            }
                            value={values[field.key] ?? ''}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.formCard}>
                  {config.fields.map(field => (
                    <WorkspaceField
                      compactMultiline={field.compactMultiline}
                      key={field.key}
                      keyboardType={field.keyboardType}
                      label={getLocalizedText(field.label, language)}
                      multiline={field.multiline}
                      onChangeText={nextValue =>
                        setValues(previous => ({
                          ...previous,
                          [field.key]: nextValue,
                        }))
                      }
                      placeholder={
                        field.placeholder
                          ? getLocalizedText(field.placeholder, language)
                          : undefined
                      }
                      value={values[field.key] ?? ''}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          </>
        )}
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  introCard: {
    backgroundColor: COLORS.secondarySoft,
    borderRadius: 22,
    marginBottom: 16,
    padding: 18,
  },
  introText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
  },
  reportCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
  },
  reportTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  reportSubtitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  reportLine: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  officialNextCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  officialNextTitle: {
    color: COLORS.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
  officialNextBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  officialNextButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginTop: 12,
    paddingVertical: 12,
  },
  officialNextButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  villageFormStack: {
    marginTop: 10,
  },
  villageReportCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
  },
  villageReportLineLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  villageReportLineText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
  },
  villageReportLineTextSpaced: {
    marginTop: 12,
  },
  villageReportLineValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  villageSectionAccent: {
    borderRadius: 999,
    height: 12,
    marginRight: 10,
    width: 12,
  },
  villageSectionCard: {
    marginTop: 12,
  },
  villageSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  villageSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
});

export default RecordWorkspaceScreen;
