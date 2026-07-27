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

type ShareCalculatorWorkspaceProps = {
  externalRecord?: WorkspaceRecord | null;
  onExternalRecordApplied?: () => void;
  showSavedRecords?: boolean;
};

const ShareCalculatorWorkspace = ({
  externalRecord,
  onExternalRecordApplied,
  showSavedRecords = true,
}: ShareCalculatorWorkspaceProps) => {
  const {language} = useLanguage();
  const reportRef = useRef<ViewShotRef>(null);
  const [totalAmount, setTotalAmount] = useState('');
  const [ownerPercent, setOwnerPercent] = useState('');
  const [ownerLabel, setOwnerLabel] = useState('');
  const [partnerLabel, setPartnerLabel] = useState('');
  const {deleteRecord, records, saveRecord} =
    useSavedWorkspaceRecords('share-calculator');

  const copy = useMemo(
    () => ({
      emptyBody:
        language === 'hi'
          ? 'Saved share reports will appear here for quick reuse.'
          : 'Saved share reports will appear here for quick reuse.',
      emptyTitle:
        language === 'hi'
          ? 'No saved share report yet'
          : 'No saved share report yet',
      exportError:
        language === 'hi'
          ? 'Export could not finish'
          : 'Export could not finish',
      helperBody:
        language === 'hi'
          ? 'Enter the total amount first. Then enter the first party percentage between 0 and 100. The second party percentage is calculated automatically.'
          : 'Enter the total amount first. Then enter the first party percentage between 0 and 100. The second party percentage is calculated automatically.',
      helperTitle:
        language === 'hi'
          ? 'How this calculator works'
          : 'How this calculator works',
      image: 'Image',
      intro:
        language === 'hi'
          ? 'Use this when one total amount needs to be divided between two people.'
          : 'Use this when one total amount needs to be divided between two people.',
      load: language === 'hi' ? 'Load' : 'Load',
      ownerLabel:
        language === 'hi'
          ? 'First party name'
          : 'First party name',
      ownerPercent:
        language === 'hi'
          ? 'First party %'
          : 'First party %',
      partnerLabel:
        language === 'hi'
          ? 'Second party name'
          : 'Second party name',
      pdf: 'PDF',
      resultTitle:
        language === 'hi'
          ? 'Share breakdown'
          : 'Share breakdown',
      save: language === 'hi' ? 'Save' : 'Save',
      saveBlocked:
        language === 'hi'
          ? 'Enter amount and percent'
          : 'Enter amount and percent',
      saveBlockedBody:
        language === 'hi'
          ? 'Add a total amount greater than zero and a first party percent between 0 and 100 before saving or exporting.'
          : 'Add a total amount greater than zero and a first party percent between 0 and 100 before saving or exporting.',
      saveDoneBody:
        language === 'hi'
          ? 'This report is now in your saved list.'
          : 'This report is now in your saved list.',
      saveDoneTitle:
        language === 'hi'
          ? 'Share report saved'
          : 'Share report saved',
      savedReports:
        language === 'hi'
          ? 'Saved share reports'
          : 'Saved share reports',
      share: language === 'hi' ? 'Share' : 'Share',
      totalAmount:
        language === 'hi'
          ? 'Total amount'
          : 'Total amount',
    }),
    [language],
  );

  const totalValue = toPositiveNumber(totalAmount);
  const ownerPercentInput = ownerPercent.trim();
  const ownerPercentRaw = Number(ownerPercent);
  const ownerPercentValid =
    ownerPercentInput.length > 0 &&
    Number.isFinite(ownerPercentRaw) &&
    ownerPercentRaw >= 0 &&
    ownerPercentRaw <= 100;
  const ownerPercentValue = ownerPercentValid
    ? ownerPercentRaw
    : 0;
  const partnerPercentValue = ownerPercentValid
    ? 100 - ownerPercentValue
    : 0;
  const ownerName = ownerLabel.trim() || 'First party';
  const partnerName = partnerLabel.trim() || 'Second party';
  const ownerShare = (totalValue * ownerPercentValue) / 100;
  const partnerShare = totalValue - ownerShare;
  const hasRequiredData =
    totalValue > 0 && ownerPercentValid;

  const summaryLines = [
    `Total amount: ${formatCurrency(totalValue)}`,
    `${ownerName}: ${formatFixed(ownerPercentValue, 2)}% | ${formatCurrency(ownerShare)}`,
    `${partnerName}: ${formatFixed(partnerPercentValue, 2)}% | ${formatCurrency(partnerShare)}`,
  ];

  const recordTitle =
    ownerLabel.trim() && partnerLabel.trim()
      ? `${ownerLabel.trim()} / ${partnerLabel.trim()}`
      : 'Share report';
  const recordSubtitle = `${formatCurrency(totalValue)} total`;

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
        ownerLabel,
        ownerPercent,
        partnerLabel,
        totalAmount,
      },
    });

    Alert.alert(copy.saveDoneTitle, copy.saveDoneBody);
  };

  const handleLoad = (record: WorkspaceRecord) => {
    setTotalAmount(record.values.totalAmount ?? '');
    setOwnerPercent(record.values.ownerPercent ?? '');
    setOwnerLabel(record.values.ownerLabel ?? '');
    setPartnerLabel(record.values.partnerLabel ?? '');
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
          label={copy.totalAmount}
          onChangeText={setTotalAmount}
          placeholder="Enter total amount"
          value={totalAmount}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.ownerPercent}
          onChangeText={setOwnerPercent}
          placeholder="Enter first party percentage"
          value={ownerPercent}
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
      </View>

      {hasRequiredData ? (
        <>
          <ViewShot ref={reportRef}>
            <View style={workspaceStyles.resultSection}>
              <AppSectionTitle title={copy.resultTitle} />
              <View style={workspaceStyles.metricsRow}>
                <WorkspaceMetricTile
                  accentColor="#0F766E"
                  label="Total amount"
                  value={formatCurrency(totalValue)}
                />
                <WorkspaceMetricTile
                  accentColor="#1E40AF"
                  label={`${ownerName} amount`}
                  value={formatCurrency(ownerShare)}
                />
                <WorkspaceMetricTile
                  accentColor="#F97316"
                  label={`${partnerName} amount`}
                  value={formatCurrency(partnerShare)}
                />
                <WorkspaceMetricTile
                  accentColor="#2563EB"
                  label={`${ownerName} %`}
                  value={`${formatFixed(ownerPercentValue, 2)}%`}
                />
                <WorkspaceMetricTile
                  accentColor="#10B981"
                  label={`${partnerName} %`}
                  value={`${formatFixed(partnerPercentValue, 2)}%`}
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
                  `share-${recordTitle}`,
                ),
                ref: reportRef,
                title: `Share Report - ${recordTitle}`,
              }).catch(() => {
                Alert.alert(copy.exportError);
              })
            }
            onExportPdf={() =>
              ensureData() &&
              exportSummaryAsPdf({
                fileName: sanitizeFileName(
                  `share-${recordTitle}`,
                ),
                summaryLines,
                title: `Share Report - ${recordTitle}`,
              }).catch(() => {
                Alert.alert(copy.exportError);
              })
            }
            onSave={handleSave}
            onShare={() =>
              ensureData() &&
              handleShare(
                `Share Report - ${recordTitle}`,
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

export default ShareCalculatorWorkspace;
