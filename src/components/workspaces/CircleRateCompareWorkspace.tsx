import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ViewShot, {
  ViewShotRef,
} from 'react-native-view-shot';

import AppSectionTitle from '../AppSectionTitle';
import {useLanguage} from '../../context/LanguageContext';
import {useSavedWorkspaceRecords} from '../../hooks/useSavedWorkspaceRecords';
import {COLORS} from '../../theme/colors';
import {WorkspaceRecord} from '../../types/workspace';
import {
  exportRefAsImage,
  exportSummaryAsPdf,
  shareTextSummary,
} from '../../utils/workspaceExport';
import {
  formatCurrency,
  formatFixed,
  sanitizeFileName,
} from '../../utils/workspaceFormatters';
import SavedRecordsPanel from './SavedRecordsPanel';
import WorkspaceActionRow from './WorkspaceActionRow';
import WorkspaceField from './WorkspaceField';
import WorkspaceMetricTile from './WorkspaceMetricTile';
import {workspaceStyles} from './workspaceStyles';

const toPositiveNumber = (value: string) =>
  Math.max(0, Number(value) || 0);

type CircleRateCompareWorkspaceProps = {
  externalRecord?: WorkspaceRecord | null;
  onExternalRecordApplied?: () => void;
  showSavedRecords?: boolean;
};

const CircleRateCompareWorkspace = ({
  externalRecord,
  onExternalRecordApplied,
  showSavedRecords = true,
}: CircleRateCompareWorkspaceProps) => {
  const {language} = useLanguage();
  const reportRef = useRef<ViewShotRef>(null);
  const [area, setArea] = useState('');
  const [currentRate, setCurrentRate] = useState('');
  const [revisedRate, setRevisedRate] = useState('');
  const [referenceLabel, setReferenceLabel] = useState('');
  const {deleteRecord, records, saveRecord} =
    useSavedWorkspaceRecords('circle-rate-compare');

  const copy = useMemo(
    () => ({
      area:
        language === 'hi' ? 'Area' : 'Area',
      currentRate:
        language === 'hi'
          ? 'Current rate'
          : 'Current rate',
      emptyBody:
        language === 'hi'
          ? 'Saved comparison reports will appear here for quick reuse.'
          : 'Saved comparison reports will appear here for quick reuse.',
      emptyTitle:
        language === 'hi'
          ? 'No saved comparison report yet'
          : 'No saved comparison report yet',
      exportError:
        language === 'hi'
          ? 'Export could not finish'
          : 'Export could not finish',
      helperBody:
        language === 'hi'
          ? 'Use the same area with two different rates. The calculator shows old value, new value, difference, and percentage change.'
          : 'Use the same area with two different rates. The calculator shows old value, new value, difference, and percentage change.',
      helperTitle:
        language === 'hi'
          ? 'How this calculator works'
          : 'How this calculator works',
      image: 'Image',
      intro:
        language === 'hi'
          ? 'Use this to compare current and revised rate impact for the same area.'
          : 'Use this to compare current and revised rate impact for the same area.',
      load: language === 'hi' ? 'Load' : 'Load',
      pdf: 'PDF',
      reference:
        language === 'hi'
          ? 'Reference label'
          : 'Reference label',
      resultTitle:
        language === 'hi'
          ? 'Comparison result'
          : 'Comparison result',
      revisedRate:
        language === 'hi'
          ? 'Revised rate'
          : 'Revised rate',
      save: language === 'hi' ? 'Save' : 'Save',
      saveBlocked:
        language === 'hi'
          ? 'Enter valid area and both rates'
          : 'Enter valid area and both rates',
      saveBlockedBody:
        language === 'hi'
          ? 'Add area, current rate, and revised rate greater than zero before saving or exporting.'
          : 'Add area, current rate, and revised rate greater than zero before saving or exporting.',
      saveDoneBody:
        language === 'hi'
          ? 'This report is now in your saved list.'
          : 'This report is now in your saved list.',
      saveDoneTitle:
        language === 'hi'
          ? 'Comparison report saved'
          : 'Comparison report saved',
      savedReports:
        language === 'hi'
          ? 'Saved comparison reports'
          : 'Saved comparison reports',
      share: language === 'hi' ? 'Share' : 'Share',
    }),
    [language],
  );

  const areaValue = toPositiveNumber(area);
  const currentRateValue = toPositiveNumber(currentRate);
  const revisedRateValue = toPositiveNumber(revisedRate);
  const hasRequiredData =
    areaValue > 0 &&
    currentRateValue > 0 &&
    revisedRateValue > 0;

  const currentValue = areaValue * currentRateValue;
  const revisedValue = areaValue * revisedRateValue;
  const rateDifference =
    revisedRateValue - currentRateValue;
  const difference = revisedValue - currentValue;
  const changePercent =
    currentValue > 0
      ? (difference / currentValue) * 100
      : 0;

  const summaryLines = [
    `Area: ${formatFixed(areaValue, 2)}`,
    `Current rate: ${formatCurrency(currentRateValue)}`,
    `Revised rate: ${formatCurrency(revisedRateValue)}`,
    `Rate difference: ${formatCurrency(rateDifference)}`,
    `Current total: ${formatCurrency(currentValue)}`,
    `Revised total: ${formatCurrency(revisedValue)}`,
    `Difference: ${formatCurrency(difference)}`,
    `Change: ${formatFixed(changePercent, 2)}%`,
  ];

  const recordTitle =
    referenceLabel.trim() || 'Circle rate comparison';
  const recordSubtitle =
    difference >= 0
      ? `+ ${formatCurrency(difference)}`
      : `- ${formatCurrency(Math.abs(difference))}`;

  const ensureData = () => {
    if (hasRequiredData) {
      return true;
    }

    Alert.alert(copy.saveBlocked, copy.saveBlockedBody);
    return false;
  };

  const handleSave = async () => {
    if (!ensureData()) {
      return;
    }

    await saveRecord({
      subtitle: recordSubtitle,
      summaryLines,
      title: recordTitle,
      values: {
        area,
        currentRate,
        referenceLabel,
        revisedRate,
      },
    });

    Alert.alert(copy.saveDoneTitle, copy.saveDoneBody);
  };

  const handleLoad = (record: WorkspaceRecord) => {
    setArea(record.values.area ?? '');
    setCurrentRate(record.values.currentRate ?? '');
    setRevisedRate(record.values.revisedRate ?? '');
    setReferenceLabel(record.values.referenceLabel ?? '');
  };

  useEffect(() => {
    if (!externalRecord) {
      return;
    }

    handleLoad(externalRecord);
    onExternalRecordApplied?.();
  }, [externalRecord, onExternalRecordApplied]);

  const handleShare = async (title: string, lines: string[]) => {
    try {
      await shareTextSummary({
        summaryLines: lines,
        title,
      });
    } catch {
      Alert.alert(copy.exportError);
    }
  };

  return (
    <View>
      <View style={workspaceStyles.introCard}>
        <Text style={workspaceStyles.introText}>
          {copy.intro}
        </Text>
      </View>

      <View style={workspaceStyles.formCard}>
        <WorkspaceField
          keyboardType="numeric"
          label={copy.area}
          onChangeText={setArea}
          placeholder="Enter area"
          value={area}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.currentRate}
          onChangeText={setCurrentRate}
          placeholder="Enter current rate"
          value={currentRate}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.revisedRate}
          onChangeText={setRevisedRate}
          placeholder="Enter revised rate"
          value={revisedRate}
        />
        <WorkspaceField
          label={copy.reference}
          onChangeText={setReferenceLabel}
          placeholder="Optional label"
          value={referenceLabel}
        />
      </View>

      {hasRequiredData ? (
        <>
          <ViewShot ref={reportRef}>
            <View style={workspaceStyles.resultSection}>
              <AppSectionTitle title={copy.resultTitle} />
              <View style={workspaceStyles.metricsRow}>
                <WorkspaceMetricTile
                  accentColor="#0F766E"
                  label="Area"
                  value={formatFixed(areaValue, 2)}
                />
                <WorkspaceMetricTile
                  accentColor="#7C3AED"
                  label="Current rate"
                  value={formatCurrency(currentRateValue)}
                />
                <WorkspaceMetricTile
                  accentColor="#DB2777"
                  label="Revised rate"
                  value={formatCurrency(revisedRateValue)}
                />
                <WorkspaceMetricTile
                  accentColor="#9333EA"
                  label="Rate difference"
                  value={formatCurrency(rateDifference)}
                />
                <WorkspaceMetricTile
                  accentColor="#1E40AF"
                  label="Current value"
                  value={formatCurrency(currentValue)}
                />
                <WorkspaceMetricTile
                  accentColor="#F97316"
                  label="Revised value"
                  value={formatCurrency(revisedValue)}
                />
                <WorkspaceMetricTile
                  accentColor="#2563EB"
                  label="Difference"
                  value={formatCurrency(difference)}
                />
                <WorkspaceMetricTile
                  accentColor="#10B981"
                  label="Change %"
                  value={`${formatFixed(changePercent, 2)}%`}
                />
              </View>
            </View>
          </ViewShot>

          <WorkspaceActionRow
            labels={copy}
            onExportImage={() =>
              ensureData() &&
              exportRefAsImage({
                fileName: sanitizeFileName(
                  `circle-rate-${recordTitle}`,
                ),
                ref: reportRef,
                title: `Circle Rate Compare • ${recordTitle}`,
              }).catch(() => {
                Alert.alert(copy.exportError);
              })
            }
            onExportPdf={() =>
              ensureData() &&
              exportSummaryAsPdf({
                fileName: sanitizeFileName(
                  `circle-rate-${recordTitle}`,
                ),
                summaryLines,
                title: `Circle Rate Compare • ${recordTitle}`,
              }).catch(() => {
                Alert.alert(copy.exportError);
              })
            }
            onSave={handleSave}
            onShare={() =>
              ensureData() &&
              handleShare(
                `Circle Rate Compare • ${recordTitle}`,
                summaryLines,
              )
            }
          />
        </>
      ) : (
        <View style={styles.helperCard}>
          <Text style={styles.helperTitle}>
            {copy.helperTitle}
          </Text>
          <Text style={styles.helperBody}>
            {copy.helperBody}
          </Text>
        </View>
      )}

      {showSavedRecords ? (
        <SavedRecordsPanel
          emptyBody={copy.emptyBody}
          emptyTitle={copy.emptyTitle}
          loadLabel={copy.load}
          onDelete={deleteRecord}
          onLoad={handleLoad}
          onShare={record =>
            handleShare(record.title, record.summaryLines)
          }
          records={records}
          shareLabel={copy.share}
          title={copy.savedReports}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  helperBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  helperCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  helperTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
});

export default CircleRateCompareWorkspace;
