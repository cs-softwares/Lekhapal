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

type FractionHissaWorkspaceProps = {
  externalRecord?: WorkspaceRecord | null;
  onExternalRecordApplied?: () => void;
  showSavedRecords?: boolean;
};

const FractionHissaWorkspace = ({
  externalRecord,
  onExternalRecordApplied,
  showSavedRecords = true,
}: FractionHissaWorkspaceProps) => {
  const {language} = useLanguage();
  const reportRef = useRef<ViewShotRef>(null);
  const [totalArea, setTotalArea] = useState('');
  const [numerator, setNumerator] = useState('');
  const [denominator, setDenominator] = useState('');
  const [ownerLabel, setOwnerLabel] = useState('');
  const [partnerLabel, setPartnerLabel] = useState('');
  const [referenceLabel, setReferenceLabel] = useState('');
  const {deleteRecord, records, saveRecord} =
    useSavedWorkspaceRecords('fraction-hissa-calculator');

  const copy = useMemo(
    () => ({
      denominator:
        language === 'hi'
          ? 'Denominator'
          : 'Denominator',
      emptyBody:
        language === 'hi'
          ? 'Saved fraction share reports will appear here for quick reuse.'
          : 'Saved fraction share reports will appear here for quick reuse.',
      emptyTitle:
        language === 'hi'
          ? 'No saved fraction share report yet'
          : 'No saved fraction share report yet',
      exportError:
        language === 'hi'
          ? 'Export could not finish'
          : 'Export could not finish',
      helperBody:
        language === 'hi'
          ? 'Enter total area, then use a valid whole-number fraction like 1/2, 1/3, or 7/12. The numerator should not be greater than the denominator.'
          : 'Enter total area, then use a valid whole-number fraction like 1/2, 1/3, or 7/12. The numerator should not be greater than the denominator.',
      helperTitle:
        language === 'hi'
          ? 'How this calculator works'
          : 'How this calculator works',
      image: 'Image',
      intro:
        language === 'hi'
          ? 'Use this when a land share is written as a fraction instead of a percentage.'
          : 'Use this when a land share is written as a fraction instead of a percentage.',
      load: language === 'hi' ? 'Load' : 'Load',
      numerator:
        language === 'hi'
          ? 'Numerator'
          : 'Numerator',
      ownerLabel:
        language === 'hi'
          ? 'First party name'
          : 'First party name',
      partnerLabel:
        language === 'hi'
          ? 'Second party name'
          : 'Second party name',
      pdf: 'PDF',
      reference:
        language === 'hi'
          ? 'Reference label'
          : 'Reference label',
      resultTitle:
        language === 'hi'
          ? 'Fraction share result'
          : 'Fraction share result',
      save: language === 'hi' ? 'Save' : 'Save',
      saveBlocked:
        language === 'hi'
          ? 'Enter valid area and fraction'
          : 'Enter valid area and fraction',
      saveBlockedBody:
        language === 'hi'
          ? 'Add total area greater than zero, then enter whole-number numerator and denominator values where numerator is not greater than denominator.'
          : 'Add total area greater than zero, then enter whole-number numerator and denominator values where numerator is not greater than denominator.',
      saveDoneBody:
        language === 'hi'
          ? 'This fraction share report is now in your saved list.'
          : 'This fraction share report is now in your saved list.',
      saveDoneTitle:
        language === 'hi'
          ? 'Fraction share report saved'
          : 'Fraction share report saved',
      savedReports:
        language === 'hi'
          ? 'Saved fraction share reports'
          : 'Saved fraction share reports',
      share: language === 'hi' ? 'Share' : 'Share',
      totalArea:
        language === 'hi'
          ? 'Total area'
          : 'Total area',
    }),
    [language],
  );

  const totalAreaValue = toPositiveNumber(totalArea);
  const numeratorInput = numerator.trim();
  const denominatorInput = denominator.trim();
  const numeratorRaw = Number(numerator);
  const denominatorRaw = Number(denominator);
  const numeratorValid =
    numeratorInput.length > 0 &&
    Number.isInteger(numeratorRaw) &&
    numeratorRaw > 0;
  const denominatorValid =
    denominatorInput.length > 0 &&
    Number.isInteger(denominatorRaw) &&
    denominatorRaw > 0;
  const numeratorValue = numeratorValid ? numeratorRaw : 0;
  const denominatorValue = denominatorValid
    ? denominatorRaw
    : 0;
  const hasRequiredData =
    totalAreaValue > 0 &&
    numeratorValid &&
    denominatorValid &&
    numeratorValue <= denominatorValue;

  const ownerName = ownerLabel.trim() || 'First party';
  const partnerName = partnerLabel.trim() || 'Second party';
  const ownerPercent = hasRequiredData
    ? (numeratorValue / denominatorValue) * 100
    : 0;
  const partnerPercent = hasRequiredData
    ? 100 - ownerPercent
    : 0;
  const onePartArea = hasRequiredData
    ? totalAreaValue / denominatorValue
    : 0;
  const ownerShareArea = hasRequiredData
    ? totalAreaValue * (numeratorValue / denominatorValue)
    : 0;
  const partnerShareArea = hasRequiredData
    ? totalAreaValue - ownerShareArea
    : 0;
  const remainingRatio = hasRequiredData
    ? `${denominatorValue - numeratorValue}/${denominatorValue}`
    : '0/0';

  const summaryLines = [
    `Total area: ${formatFixed(totalAreaValue, 2)}`,
    `Share ratio: ${numeratorValue}/${denominatorValue}`,
    `Per part area: ${formatFixed(onePartArea, 2)}`,
    `${ownerName}: ${formatFixed(ownerShareArea, 2)} (${formatFixed(ownerPercent, 2)}%)`,
    `${partnerName}: ${formatFixed(partnerShareArea, 2)} (${formatFixed(partnerPercent, 2)}%)`,
  ];

  const recordTitle =
    referenceLabel.trim() ||
    `${ownerName} fraction share`;
  const recordSubtitle =
    `${numeratorValue}/${denominatorValue} share`;

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
        denominator,
        numerator,
        ownerLabel,
        partnerLabel,
        referenceLabel,
        totalArea,
      },
    });

    Alert.alert(copy.saveDoneTitle, copy.saveDoneBody);
  };

  const handleLoad = (record: WorkspaceRecord) => {
    setTotalArea(record.values.totalArea ?? '');
    setNumerator(record.values.numerator ?? '');
    setDenominator(record.values.denominator ?? '');
    setOwnerLabel(record.values.ownerLabel ?? '');
    setPartnerLabel(record.values.partnerLabel ?? '');
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
          label={copy.totalArea}
          onChangeText={setTotalArea}
          placeholder="Enter total area"
          value={totalArea}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.numerator}
          onChangeText={setNumerator}
          placeholder="Enter numerator"
          value={numerator}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.denominator}
          onChangeText={setDenominator}
          placeholder="Enter denominator"
          value={denominator}
        />
        <WorkspaceField
          label={copy.ownerLabel}
          onChangeText={setOwnerLabel}
          placeholder="Optional"
          value={ownerLabel}
        />
        <WorkspaceField
          label={copy.partnerLabel}
          onChangeText={setPartnerLabel}
          placeholder="Optional"
          value={partnerLabel}
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
                  label="Total area"
                  value={formatFixed(totalAreaValue, 2)}
                />
                <WorkspaceMetricTile
                  accentColor="#C026D3"
                  label="Share ratio"
                  value={`${numeratorValue}/${denominatorValue}`}
                />
                <WorkspaceMetricTile
                  accentColor="#7C3AED"
                  label="Per part area"
                  value={formatFixed(onePartArea, 2)}
                />
                <WorkspaceMetricTile
                  accentColor="#1E40AF"
                  label={`${ownerName} area`}
                  value={formatFixed(ownerShareArea, 2)}
                />
                <WorkspaceMetricTile
                  accentColor="#F97316"
                  label={`${partnerName} area`}
                  value={formatFixed(partnerShareArea, 2)}
                />
                <WorkspaceMetricTile
                  accentColor="#2563EB"
                  label={`${ownerName} %`}
                  value={`${formatFixed(ownerPercent, 2)}%`}
                />
                <WorkspaceMetricTile
                  accentColor="#10B981"
                  label={`${partnerName} %`}
                  value={`${formatFixed(partnerPercent, 2)}%`}
                />
                <WorkspaceMetricTile
                  accentColor="#DC2626"
                  label="Remaining ratio"
                  value={remainingRatio}
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
                  `fraction-hissa-${recordTitle}`,
                ),
                ref: reportRef,
                title: `Fraction Hissa - ${recordTitle}`,
              }).catch(() => {
                Alert.alert(copy.exportError);
              })
            }
            onExportPdf={() =>
              ensureData() &&
              exportSummaryAsPdf({
                fileName: sanitizeFileName(
                  `fraction-hissa-${recordTitle}`,
                ),
                summaryLines,
                title: `Fraction Hissa - ${recordTitle}`,
              }).catch(() => {
                Alert.alert(copy.exportError);
              })
            }
            onSave={handleSave}
            onShare={() =>
              ensureData() &&
              handleShare(
                `Fraction Hissa - ${recordTitle}`,
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

export default FractionHissaWorkspace;
