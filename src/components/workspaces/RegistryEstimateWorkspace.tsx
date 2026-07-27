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

const toPercent = (value: string) =>
  Math.min(100, Math.max(0, Number(value) || 0));

type RegistryEstimateWorkspaceProps = {
  externalRecord?: WorkspaceRecord | null;
  onExternalRecordApplied?: () => void;
  showSavedRecords?: boolean;
};

const RegistryEstimateWorkspace = ({
  externalRecord,
  onExternalRecordApplied,
  showSavedRecords = true,
}: RegistryEstimateWorkspaceProps) => {
  const {language} = useLanguage();
  const reportRef = useRef<ViewShotRef>(null);
  const [area, setArea] = useState('');
  const [circleRate, setCircleRate] = useState('');
  const [stampPercent, setStampPercent] = useState('');
  const [registrationPercent, setRegistrationPercent] =
    useState('');
  const [otherFee, setOtherFee] = useState('');
  const [referenceLabel, setReferenceLabel] = useState('');
  const {deleteRecord, records, saveRecord} =
    useSavedWorkspaceRecords('registry-estimate');

  const copy = useMemo(
    () => ({
      currentReport:
        language === 'hi'
          ? 'Estimate summary'
          : 'Estimate summary',
      exportError:
        language === 'hi'
          ? 'Export could not finish'
          : 'Export could not finish',
      helperBody:
        language === 'hi'
          ? 'Enter area and circle rate first. Then add stamp, registration, or any extra fee if needed. The app will show market value and total estimate.'
          : 'Enter area and circle rate first. Then add stamp, registration, or any extra fee if needed. The app will show market value and total estimate.',
      helperTitle:
        language === 'hi'
          ? 'How this calculator works'
          : 'How this calculator works',
      image: 'Image',
      intro:
        language === 'hi'
          ? 'Use this for a quick registry cost estimate based on area and rate.'
          : 'Use this for a quick registry cost estimate based on area and rate.',
      load: language === 'hi' ? 'Load' : 'Load',
      noDataTitle:
        language === 'hi'
          ? 'Estimate will appear here'
          : 'Estimate will appear here',
      pdf: 'PDF',
      reference:
        language === 'hi'
          ? 'Reference name'
          : 'Reference name',
      resultTitle:
        language === 'hi'
          ? 'Estimate summary'
          : 'Estimate summary',
      save: language === 'hi' ? 'Save' : 'Save',
      saveBlocked:
        language === 'hi'
          ? 'Enter valid area and rate'
          : 'Enter valid area and rate',
      saveBlockedBody:
        language === 'hi'
          ? 'Add area and circle rate greater than zero before saving or exporting.'
          : 'Add area and circle rate greater than zero before saving or exporting.',
      saveDoneBody:
        language === 'hi'
          ? 'This estimate is now available in your saved list.'
          : 'This estimate is now available in your saved list.',
      saveDoneTitle:
        language === 'hi'
          ? 'Registry report saved'
          : 'Registry report saved',
      savedReports:
        language === 'hi'
          ? 'Saved registry reports'
          : 'Saved registry reports',
      share: language === 'hi' ? 'Share' : 'Share',
      emptyBody:
        language === 'hi'
          ? 'Saved estimates will appear here for quick reuse.'
          : 'Saved estimates will appear here for quick reuse.',
      emptyTitle:
        language === 'hi'
          ? 'No saved registry report yet'
          : 'No saved registry report yet',
      area:
        language === 'hi' ? 'Area' : 'Area',
      circleRate:
        language === 'hi'
          ? 'Circle rate per unit'
          : 'Circle rate per unit',
      otherFee:
        language === 'hi'
          ? 'Other fee'
          : 'Other fee',
      registrationPercent:
        language === 'hi'
          ? 'Registration %'
          : 'Registration %',
      stampPercent:
        language === 'hi'
          ? 'Stamp duty %'
          : 'Stamp duty %',
    }),
    [language],
  );

  const areaValue = toPositiveNumber(area);
  const circleRateValue = toPositiveNumber(circleRate);
  const stampPercentValue = toPercent(stampPercent);
  const registrationPercentValue = toPercent(
    registrationPercent,
  );
  const otherFeeValue = toPositiveNumber(otherFee);
  const hasRequiredData =
    areaValue > 0 && circleRateValue > 0;

  const marketValue = areaValue * circleRateValue;
  const stampDuty = (marketValue * stampPercentValue) / 100;
  const registrationCharge =
    (marketValue * registrationPercentValue) / 100;
  const totalCharges =
    stampDuty + registrationCharge + otherFeeValue;
  const totalEstimate = marketValue + totalCharges;

  const summaryLines = [
    `Area: ${formatFixed(areaValue, 2)}`,
    `Circle rate: ${formatCurrency(circleRateValue)}`,
    `Market value: ${formatCurrency(marketValue)}`,
    `Stamp duty: ${formatCurrency(stampDuty)}`,
    `Registration: ${formatCurrency(registrationCharge)}`,
    `Other fee: ${formatCurrency(otherFeeValue)}`,
    `Total charges: ${formatCurrency(totalCharges)}`,
    `Final outlay: ${formatCurrency(totalEstimate)}`,
  ];

  const recordTitle =
    referenceLabel.trim() || 'Registry estimate';
  const recordSubtitle = `${formatCurrency(totalEstimate)} total`;

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
        circleRate,
        otherFee,
        referenceLabel,
        registrationPercent,
        stampPercent,
      },
    });

    Alert.alert(copy.saveDoneTitle, copy.saveDoneBody);
  };

  const handleLoad = (record: WorkspaceRecord) => {
    setArea(record.values.area ?? '');
    setCircleRate(record.values.circleRate ?? '');
    setStampPercent(record.values.stampPercent ?? '');
    setRegistrationPercent(
      record.values.registrationPercent ?? '',
    );
    setOtherFee(record.values.otherFee ?? '');
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
          label={copy.circleRate}
          onChangeText={setCircleRate}
          placeholder="Enter rate per unit"
          value={circleRate}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.stampPercent}
          onChangeText={setStampPercent}
          placeholder="Optional"
          value={stampPercent}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.registrationPercent}
          onChangeText={setRegistrationPercent}
          placeholder="Optional"
          value={registrationPercent}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.otherFee}
          onChangeText={setOtherFee}
          placeholder="Optional"
          value={otherFee}
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
          <View style={workspaceStyles.resultSection}>
            <AppSectionTitle title={copy.resultTitle} />
            <ViewShot ref={reportRef}>
              <View style={workspaceStyles.metricsRow}>
                <WorkspaceMetricTile
                  accentColor="#0F766E"
                  label="Area"
                  value={formatFixed(areaValue, 2)}
                />
                <WorkspaceMetricTile
                  accentColor="#7C3AED"
                  label="Circle rate"
                  value={formatCurrency(circleRateValue)}
                />
                <WorkspaceMetricTile
                  accentColor="#1E40AF"
                  label="Market value"
                  value={formatCurrency(marketValue)}
                />
                <WorkspaceMetricTile
                  accentColor="#2563EB"
                  label="Stamp duty"
                  value={formatCurrency(stampDuty)}
                />
                <WorkspaceMetricTile
                  accentColor="#F97316"
                  label="Registration"
                  value={formatCurrency(registrationCharge)}
                />
                <WorkspaceMetricTile
                  accentColor="#0891B2"
                  label="Other fee"
                  value={formatCurrency(otherFeeValue)}
                />
                <WorkspaceMetricTile
                  accentColor="#DC2626"
                  label="Total charges"
                  value={formatCurrency(totalCharges)}
                />
                <WorkspaceMetricTile
                  accentColor="#10B981"
                  label="Final outlay"
                  value={formatCurrency(totalEstimate)}
                />
              </View>
            </ViewShot>
          </View>

          <WorkspaceActionRow
            labels={copy}
            onExportImage={() =>
              ensureData() &&
              exportRefAsImage({
                fileName: sanitizeFileName(
                  `registry-${recordTitle}`,
                ),
                ref: reportRef,
                title: `Registry Estimate • ${recordTitle}`,
              }).catch(() => {
                Alert.alert(copy.exportError);
              })
            }
            onExportPdf={() =>
              ensureData() &&
              exportSummaryAsPdf({
                fileName: sanitizeFileName(
                  `registry-${recordTitle}`,
                ),
                summaryLines,
                title: `Registry Estimate • ${recordTitle}`,
              }).catch(() => {
                Alert.alert(copy.exportError);
              })
            }
            onSave={handleSave}
            onShare={() =>
              ensureData() &&
              handleShare(
                `Registry Estimate • ${recordTitle}`,
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

export default RegistryEstimateWorkspace;
