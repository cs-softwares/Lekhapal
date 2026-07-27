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

import {useLanguage} from '../../context/LanguageContext';
import {COLORS} from '../../theme/colors';
import {useSavedWorkspaceRecords} from '../../hooks/useSavedWorkspaceRecords';
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
import AppSectionTitle from '../AppSectionTitle';
import SavedRecordsPanel from './SavedRecordsPanel';
import WorkspaceActionRow from './WorkspaceActionRow';
import WorkspaceDropdownSelector from './WorkspaceDropdownSelector';
import WorkspaceField from './WorkspaceField';
import WorkspaceMetricTile from './WorkspaceMetricTile';
import {workspaceStyles} from './workspaceStyles';

type AreaUnit =
  | 'upbigha'
  | 'upbiswa'
  | 'upbiswansi'
  | 'sqm'
  | 'sqft'
  | 'acre'
  | 'hectare'
  | 'sqyard';

const UNIT_TO_SQM: Record<AreaUnit, number> = {
  acre: 4046.8564224,
  hectare: 10000,
  sqft: 0.09290304,
  sqm: 1,
  sqyard: 0.83612736,
  upbigha: 2500,
  upbiswa: 125,
  upbiswansi: 6.25,
};

const UNIT_OPTIONS: AreaUnit[] = [
  'upbigha',
  'upbiswa',
  'upbiswansi',
  'sqm',
  'hectare',
  'acre',
  'sqyard',
  'sqft',
];

const UNIT_LABELS: Record<AreaUnit, string> = {
  acre: 'Acre',
  hectare: 'Hectare',
  sqft: 'Sq Ft',
  sqm: 'Sq M',
  sqyard: 'Sq Yard',
  upbigha: 'UP Bigha',
  upbiswa: 'UP Biswa',
  upbiswansi: 'UP Biswansi',
};

type AreaConverterWorkspaceProps = {
  externalRecord?: WorkspaceRecord | null;
  onExternalRecordApplied?: () => void;
  showSavedRecords?: boolean;
};

const AreaConverterWorkspace = ({
  externalRecord,
  onExternalRecordApplied,
  showSavedRecords = true,
}: AreaConverterWorkspaceProps) => {
  const {language} = useLanguage();
  const reportRef = useRef<ViewShotRef>(null);
  const [value, setValue] = useState('1');
  const [fromUnit, setFromUnit] =
    useState<AreaUnit>('upbigha');
  const [toUnit, setToUnit] = useState<AreaUnit>('sqm');
  const {deleteRecord, records, saveRecord} =
    useSavedWorkspaceRecords('area-converter');

  const copy = useMemo(
    () => ({
      intro:
        language === 'hi'
          ? 'Real field measurement ke baad area ko UP Bigha, Biswa, Sq M, Acre, Hectare aur doosri units mein turant badal sakte hain.'
          : 'After real field measurement, convert area instantly into UP Bigha, Biswa, Sq M, Acre, Hectare, and other useful units.',
      currentReport:
        language === 'hi'
          ? 'Conversion summary'
          : 'Conversion summary',
      save: language === 'hi' ? 'सेव करें' : 'Save',
      share: language === 'hi' ? 'शेयर' : 'Share',
      pdf: 'PDF',
      image: 'Image',
      savedReports:
        language === 'hi'
          ? 'Saved area conversions'
          : 'Saved area conversions',
      load: language === 'hi' ? 'लोड करें' : 'Load',
      emptyTitle:
        language === 'hi'
          ? 'No saved conversion yet'
          : 'No saved conversion note yet',
      emptyBody:
        language === 'hi'
          ? 'Saved conversions yaha quick reuse ke liye dikhengi.'
          : 'Saved conversions will appear here for quick reuse.',
      valueLabel:
        language === 'hi'
          ? 'Measured area value'
          : 'Measured area value',
      fromLabel:
        language === 'hi' ? 'From unit' : 'From unit',
      toLabel:
        language === 'hi' ? 'To unit' : 'To unit',
      allUnits:
        language === 'hi'
          ? 'All area results'
          : 'All area results',
      saveBlocked:
        language === 'hi'
          ? 'Area value bharein'
          : 'Enter an area value',
      saveBlockedBody:
        language === 'hi'
          ? 'Save ya export se pehle measured value bharein.'
          : 'Add a measured value before saving or exporting.',
      saveDoneTitle:
        language === 'hi'
          ? 'Area conversion saved'
          : 'Conversion note saved',
      saveDoneBody:
        language === 'hi'
          ? 'Yeh conversion ab saved list mein hai.'
          : 'This conversion note is now in your saved list.',
      exportError:
        language === 'hi'
          ? 'Export complete nahi hua'
          : 'Export could not finish',
    }),
    [language],
  );

  const numericValue = Number(value) || 0;
  const baseSqm = numericValue * UNIT_TO_SQM[fromUnit];
  const convertedValue = baseSqm / UNIT_TO_SQM[toUnit];
  const allResults = UNIT_OPTIONS.map(unit => ({
    label: UNIT_LABELS[unit],
    value: `${formatFixed(
      baseSqm / UNIT_TO_SQM[unit],
      4,
    )} ${UNIT_LABELS[unit]}`,
  }));
  const reportSections = [
    {
      accentColor: COLORS.primary,
      rows: [
        {
          label: 'Input value',
          value: `${formatFixed(numericValue, 4)} ${UNIT_LABELS[fromUnit]}`,
        },
        {
          label: 'Converted to',
          value: `${formatFixed(convertedValue, 4)} ${UNIT_LABELS[toUnit]}`,
        },
        {
          label: 'Base area in Sq M',
          value: `${formatFixed(baseSqm, 4)} Sq M`,
        },
      ],
      title: 'Conversion details',
    },
    {
      accentColor: COLORS.secondary,
      rows: [
        {
          label: 'UP Bigha view',
          value: `${formatFixed(
            baseSqm / UNIT_TO_SQM.upbigha,
            4,
          )} UP Bigha`,
        },
        {
          label: 'UP Biswa view',
          value: `${formatFixed(
            baseSqm / UNIT_TO_SQM.upbiswa,
            4,
          )} UP Biswa`,
        },
        {
          label: 'Acre view',
          value: `${formatFixed(
            baseSqm / UNIT_TO_SQM.acre,
            4,
          )} Acre`,
        },
      ],
      title: 'Quick reference',
    },
  ];

  const summaryLines = [
    `Input: ${formatFixed(numericValue, 4)} ${UNIT_LABELS[fromUnit]}`,
    `Primary result: ${formatFixed(convertedValue, 4)} ${UNIT_LABELS[toUnit]}`,
    `Base area in Sq M: ${formatFixed(baseSqm, 4)} Sq M`,
    `UP Bigha view: ${formatFixed(
      baseSqm / UNIT_TO_SQM.upbigha,
      4,
    )} UP Bigha`,
    `UP Biswa view: ${formatFixed(
      baseSqm / UNIT_TO_SQM.upbiswa,
      4,
    )} UP Biswa`,
    `Acre view: ${formatFixed(
      baseSqm / UNIT_TO_SQM.acre,
      4,
    )} Acre`,
  ];
  const recordTitle = `${formatFixed(
    numericValue,
    2,
  )} ${UNIT_LABELS[fromUnit]}`;
  const recordSubtitle = `To ${UNIT_LABELS[toUnit]}`;

  const ensureValue = () => {
    if (value.trim()) {
      return true;
    }

    Alert.alert(copy.saveBlocked, copy.saveBlockedBody);
    return false;
  };

  const handleSave = async () => {
    if (!ensureValue()) {
      return;
    }

    await saveRecord({
      subtitle: recordSubtitle,
      summaryLines,
      title: recordTitle,
      values: {
        fromUnit,
        toUnit,
        value,
      },
    });

    Alert.alert(copy.saveDoneTitle, copy.saveDoneBody);
  };

  const handleLoad = (record: WorkspaceRecord) => {
    setValue(record.values.value ?? '1');
    setFromUnit(
      (record.values.fromUnit as AreaUnit) ?? 'upbigha',
    );
    setToUnit((record.values.toUnit as AreaUnit) ?? 'sqm');
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
      <View style={workspaceStyles.formCard}>
        <WorkspaceField
          keyboardType="numeric"
          label={copy.valueLabel}
          onChangeText={setValue}
          value={value}
        />
        <View style={styles.unitSelectorsWrap}>
          <View style={styles.unitSelectorCell}>
            <WorkspaceDropdownSelector
              accentColor={COLORS.primary}
              borderColor="#C8D9FF"
              compact
              iconSurfaceColor="#EEF4FF"
              label={copy.fromLabel}
              onSelect={nextValue =>
                setFromUnit(nextValue as AreaUnit)
              }
              options={UNIT_OPTIONS.map(unit => ({
                label: UNIT_LABELS[unit],
                value: unit,
              }))}
              selectedValue={fromUnit}
              surfaceColor="#EEF4FF"
              triggerBackgroundColor={COLORS.white}
            />
          </View>
          <View style={styles.unitSelectorCell}>
            <WorkspaceDropdownSelector
              accentColor={COLORS.secondary}
              borderColor="#FFD8BB"
              compact
              iconSurfaceColor="#FFF4EA"
              label={copy.toLabel}
              onSelect={nextValue =>
                setToUnit(nextValue as AreaUnit)
              }
              options={UNIT_OPTIONS.map(unit => ({
                label: UNIT_LABELS[unit],
                value: unit,
              }))}
              selectedValue={toUnit}
              surfaceColor="#FFF4EA"
              triggerBackgroundColor={COLORS.white}
            />
          </View>
        </View>
      </View>

      <View style={workspaceStyles.resultSection}>
        <AppSectionTitle title={copy.allUnits} />
        <View style={workspaceStyles.metricsRow}>
          {allResults.map(result => (
            <WorkspaceMetricTile
              key={result.label}
              label={result.label}
              value={result.value}
            />
          ))}
        </View>
      </View>

      <View style={workspaceStyles.resultSection}>
        <AppSectionTitle title={copy.currentReport} />

        <ViewShot ref={reportRef}>
          <View style={styles.summarySheet}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryHeaderCopy}>
                <Text style={styles.summaryTitle}>
                  {recordTitle}
                </Text>
                <Text style={styles.summarySubtitle}>
                  {recordSubtitle}
                </Text>
              </View>

              <View style={styles.resultPill}>
                <Text style={styles.resultPillLabel}>
                  Result
                </Text>
                <Text style={styles.resultPillValue}>
                  {formatFixed(convertedValue, 4)}
                </Text>
              </View>
            </View>

            {reportSections.map(section => (
              <View
                key={section.title}
                style={styles.detailSection}>
                <Text
                  style={[
                    styles.detailSectionTitle,
                    {color: section.accentColor},
                  ]}>
                  {section.title}
                </Text>

                <View style={styles.detailRows}>
                  {section.rows.map(row => (
                    <View
                      key={`${section.title}-${row.label}`}
                      style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {row.label}
                      </Text>
                      <Text style={styles.detailValue}>
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ViewShot>
      </View>

      <WorkspaceActionRow
        labels={copy}
        onExportImage={() =>
          ensureValue() &&
          exportRefAsImage({
            fileName: sanitizeFileName(
              `area-${recordTitle}`,
            ),
            ref: reportRef,
            title: `Area Converter - ${recordTitle}`,
          }).catch(() => {
            Alert.alert(copy.exportError);
          })
        }
        onExportPdf={() =>
          ensureValue() &&
          exportSummaryAsPdf({
            fileName: sanitizeFileName(
              `area-${recordTitle}`,
            ),
            summaryLines,
            title: `Area Converter - ${recordTitle}`,
          }).catch(() => {
            Alert.alert(copy.exportError);
          })
        }
        onSave={handleSave}
        onShare={() =>
          ensureValue() &&
          handleShare(
            `Area Converter - ${recordTitle}`,
            summaryLines,
          )
        }
      />

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
  detailLabel: {
    color: '#64748B',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 12,
  },
  detailRow: {
    alignItems: 'center',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  detailRows: {
    marginTop: 6,
  },
  detailSection: {
    marginTop: 16,
  },
  detailSectionTitle: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#0F172A',
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  resultPill: {
    alignItems: 'flex-end',
    backgroundColor: '#EEF4FF',
    borderColor: '#C8D9FF',
    borderRadius: 18,
    borderWidth: 1,
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultPillLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  resultPillValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryHeaderCopy: {
    flex: 1,
  },
  summarySheet: {
    backgroundColor: '#F6FAFF',
    borderColor: '#DCE7F8',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 2,
    padding: 16,
  },
  summarySubtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  summaryTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  unitSelectorsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 12,
    marginTop: 4,
  },
  unitSelectorCell: {
    flex: 1,
  },
});

export default AreaConverterWorkspace;

