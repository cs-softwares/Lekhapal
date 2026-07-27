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

type RateFinderWorkspaceProps = {
  externalRecord?: WorkspaceRecord | null;
  onExternalRecordApplied?: () => void;
  showSavedRecords?: boolean;
};

const RateFinderWorkspace = ({
  externalRecord,
  onExternalRecordApplied,
  showSavedRecords = true,
}: RateFinderWorkspaceProps) => {
  const {language} = useLanguage();
  const reportRef = useRef<ViewShotRef>(null);
  const [totalArea, setTotalArea] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [extraCharges, setExtraCharges] = useState('');
  const [referenceLabel, setReferenceLabel] = useState('');
  const {deleteRecord, records, saveRecord} =
    useSavedWorkspaceRecords('rate-finder');

  const copy = useMemo(
    () => ({
      area:
        language === 'hi' ? 'Total area' : 'Total area',
      emptyBody:
        language === 'hi'
          ? 'Saved rate finder reports will appear here for quick reuse.'
          : 'Saved rate finder reports will appear here for quick reuse.',
      emptyTitle:
        language === 'hi'
          ? 'No saved rate finder report yet'
          : 'No saved rate finder report yet',
      exportError:
        language === 'hi'
          ? 'Export could not finish'
          : 'Export could not finish',
      extraCharges:
        language === 'hi'
          ? 'Charge part'
          : 'Charge part',
      helperBody:
        language === 'hi'
          ? 'Enter total area and total value first. Add the charge part only if that amount is already included in the total value.'
          : 'Enter total area and total value first. Add the charge part only if that amount is already included in the total value.',
      helperTitle:
        language === 'hi'
          ? 'How this calculator works'
          : 'How this calculator works',
      image: 'Image',
      intro:
        language === 'hi'
          ? 'Use this to find gross rate and net rate when the total amount is already known.'
          : 'Use this to find gross rate and net rate when the total amount is already known.',
      load: language === 'hi' ? 'Load' : 'Load',
      pdf: 'PDF',
      reference:
        language === 'hi'
          ? 'Reference label'
          : 'Reference label',
      resultTitle:
        language === 'hi'
          ? 'Rate result'
          : 'Rate result',
      save: language === 'hi' ? 'Save' : 'Save',
      saveBlocked:
        language === 'hi'
          ? 'Enter valid area and value'
          : 'Enter valid area and value',
      saveBlockedBody:
        language === 'hi'
          ? 'Add total area and total value greater than zero. If you enter charges, they should not be more than the total value.'
          : 'Add total area and total value greater than zero. If you enter charges, they should not be more than the total value.',
      saveDoneBody:
        language === 'hi'
          ? 'This rate finder report is now in your saved list.'
          : 'This rate finder report is now in your saved list.',
      saveDoneTitle:
        language === 'hi'
          ? 'Rate finder report saved'
          : 'Rate finder report saved',
      savedReports:
        language === 'hi'
          ? 'Saved rate finder reports'
          : 'Saved rate finder reports',
      share: language === 'hi' ? 'Share' : 'Share',
      totalValue:
        language === 'hi'
          ? 'Total value'
          : 'Total value',
    }),
    [language],
  );

  const totalAreaValue = toPositiveNumber(totalArea);
  const totalValueAmount = toPositiveNumber(totalValue);
  const extraChargesValue = toPositiveNumber(extraCharges);
  const extraChargesValid =
    extraChargesValue <= totalValueAmount;
  const hasRequiredData =
    totalAreaValue > 0 &&
    totalValueAmount > 0 &&
    extraChargesValid;

  const baseValue = Math.max(
    0,
    totalValueAmount - extraChargesValue,
  );
  const grossRate = hasRequiredData
    ? totalValueAmount / totalAreaValue
    : 0;
  const netRate = hasRequiredData
    ? baseValue / totalAreaValue
    : 0;
  const chargePerUnit = hasRequiredData
    ? extraChargesValue / totalAreaValue
    : 0;

  const summaryLines = [
    `Total area: ${formatFixed(totalAreaValue, 2)}`,
    `Total value: ${formatCurrency(totalValueAmount)}`,
    `Charge part: ${formatCurrency(extraChargesValue)}`,
    `Base value: ${formatCurrency(baseValue)}`,
    `Gross rate/unit: ${formatCurrency(grossRate)}`,
    `Net rate/unit: ${formatCurrency(netRate)}`,
    `Charge per unit: ${formatCurrency(chargePerUnit)}`,
  ];

  const recordTitle =
    referenceLabel.trim() || 'Rate finder';
  const recordSubtitle =
    `${formatCurrency(grossRate)} / unit`;

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
        extraCharges,
        referenceLabel,
        totalArea,
        totalValue,
      },
    });

    Alert.alert(copy.saveDoneTitle, copy.saveDoneBody);
  };

  const handleLoad = (record: WorkspaceRecord) => {
    setTotalArea(record.values.totalArea ?? '');
    setTotalValue(record.values.totalValue ?? '');
    setExtraCharges(record.values.extraCharges ?? '');
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
          onChangeText={setTotalArea}
          placeholder="Enter total area"
          value={totalArea}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.totalValue}
          onChangeText={setTotalValue}
          placeholder="Enter total value"
          value={totalValue}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.extraCharges}
          onChangeText={setExtraCharges}
          placeholder="Optional"
          value={extraCharges}
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
                  label="Gross rate"
                  value={formatCurrency(grossRate)}
                />
                <WorkspaceMetricTile
                  accentColor="#1E40AF"
                  label="Net rate"
                  value={formatCurrency(netRate)}
                />
                <WorkspaceMetricTile
                  accentColor="#7C3AED"
                  label="Charge / unit"
                  value={formatCurrency(chargePerUnit)}
                />
                <WorkspaceMetricTile
                  accentColor="#F97316"
                  label="Base value"
                  value={formatCurrency(baseValue)}
                />
                <WorkspaceMetricTile
                  accentColor="#0891B2"
                  label="Total value"
                  value={formatCurrency(totalValueAmount)}
                />
                <WorkspaceMetricTile
                  accentColor="#10B981"
                  label="Area"
                  value={formatFixed(totalAreaValue, 2)}
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
                  `rate-finder-${recordTitle}`,
                ),
                ref: reportRef,
                title: `Rate Finder - ${recordTitle}`,
              }).catch(() => {
                Alert.alert(copy.exportError);
              })
            }
            onExportPdf={() =>
              ensureData() &&
              exportSummaryAsPdf({
                fileName: sanitizeFileName(
                  `rate-finder-${recordTitle}`,
                ),
                summaryLines,
                title: `Rate Finder - ${recordTitle}`,
              }).catch(() => {
                Alert.alert(copy.exportError);
              })
            }
            onSave={handleSave}
            onShare={() =>
              ensureData() &&
              handleShare(
                `Rate Finder - ${recordTitle}`,
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

export default RateFinderWorkspace;
