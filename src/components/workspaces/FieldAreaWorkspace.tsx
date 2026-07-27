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
import FieldPlanPreview from './FieldPlanPreview';
import SavedRecordsPanel from './SavedRecordsPanel';
import WorkspaceActionRow from './WorkspaceActionRow';
import WorkspaceChipSelector from './WorkspaceChipSelector';
import WorkspaceField from './WorkspaceField';
import WorkspaceMetricTile from './WorkspaceMetricTile';
import {workspaceStyles} from './workspaceStyles';

type LengthUnit = 'feet' | 'meter';

const toNumber = (value: string) => Number(value) || 0;

const FEET_TO_METER = 0.3048;
const SQM_PER_UP_BIGHA = 2500;
const SQM_PER_UP_BISWA = 125;
const SQM_PER_ACRE = 4046.8564224;
const SQM_PER_HECTARE = 10000;
const SQM_PER_SQFT = 0.09290304;

type FieldAreaWorkspaceProps = {
  externalRecord?: WorkspaceRecord | null;
  onExternalRecordApplied?: () => void;
  showSavedRecords?: boolean;
};

const FieldAreaWorkspace = ({
  externalRecord,
  onExternalRecordApplied,
  showSavedRecords = true,
}: FieldAreaWorkspaceProps) => {
  const {language} = useLanguage();
  const reportRef = useRef<ViewShotRef>(null);
  const [plotLabel, setPlotLabel] = useState('');
  const [villageName, setVillageName] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [unit, setUnit] = useState<LengthUnit>('meter');
  const [notes, setNotes] = useState('');
  const {deleteRecord, records, saveRecord} =
    useSavedWorkspaceRecords('field-area-workspace');

  const copy = useMemo(
    () => ({
      intro:
        language === 'hi'
          ? 'Khet, plot या खाली जगह की simple माप के लिए length और width भरें. रिज़ल्ट तुरंत square meter, UP bigha, biswa और acre में मिलेगा।'
          : 'For a simple field, khet, or plot measurement, enter length and width. The result is shown instantly in square meter, UP bigha, biswa, and acre.',
      currentReport:
        language === 'hi'
          ? 'अभी की field report'
          : 'Plot note',
      save: language === 'hi' ? 'सेव करें' : 'Save',
      share: language === 'hi' ? 'शेयर' : 'Share',
      pdf: 'PDF',
      image: 'Image',
      savedReports:
        language === 'hi'
          ? 'सेव्ड field reports'
          : 'Saved plot notes',
      load: language === 'hi' ? 'लोड करें' : 'Load',
      emptyTitle:
        language === 'hi'
          ? 'अभी कोई field report सेव नहीं है'
          : 'No saved plot note yet',
      emptyBody:
        language === 'hi'
          ? 'जब आप कोई field measurement सेव करेंगे तो वह यहाँ फिर से खुलेगा।'
          : 'Saved field measurements will appear here for quick reuse.',
      plotLabel:
        language === 'hi'
          ? 'Plot / Khasra / Gata'
          : 'Plot / Khasra / Gata',
      villageLabel:
        language === 'hi' ? 'Village' : 'Village',
      lengthLabel:
        language === 'hi'
          ? 'Length'
          : 'Length',
      widthLabel:
        language === 'hi'
          ? 'Width'
          : 'Width',
      unitLabel:
        language === 'hi'
          ? 'Measurement unit'
          : 'Measurement unit',
      notesLabel:
        language === 'hi'
          ? 'Notes'
          : 'Notes',
      resultTitle:
        language === 'hi'
          ? 'Measurement result'
          : 'Area summary',
      saveBlocked:
        language === 'hi'
          ? 'Length और width भरें'
          : 'Enter length and width',
      saveBlockedBody:
        language === 'hi'
          ? 'सेव या एक्सपोर्ट से पहले length और width दर्ज करें।'
          : 'Add both length and width before saving or exporting.',
      saveDoneTitle:
        language === 'hi'
          ? 'Field report सेव हो गई'
          : 'Plot note saved',
      saveDoneBody:
        language === 'hi'
          ? 'यह field report अब सेव्ड लिस्ट में है।'
          : 'This plot note is now in your saved list.',
      exportError:
        language === 'hi'
          ? 'एक्सपोर्ट पूरा नहीं हुआ'
          : 'Export could not finish',
    }),
    [language],
  );

  const lengthValue = toNumber(length);
  const widthValue = toNumber(width);
  const lengthMeters =
    unit === 'meter'
      ? lengthValue
      : lengthValue * FEET_TO_METER;
  const widthMeters =
    unit === 'meter'
      ? widthValue
      : widthValue * FEET_TO_METER;
  const areaSqm = lengthMeters * widthMeters;
  const perimeterMeters =
    lengthMeters * 2 + widthMeters * 2;
  const areaSqft = areaSqm / SQM_PER_SQFT;
  const areaAcre = areaSqm / SQM_PER_ACRE;
  const areaHectare = areaSqm / SQM_PER_HECTARE;
  const areaUpBigha = areaSqm / SQM_PER_UP_BIGHA;
  const areaUpBiswa = areaSqm / SQM_PER_UP_BISWA;
  const unitDisplay = unit === 'meter' ? 'Meter' : 'Feet';

  const recordTitle =
    plotLabel.trim() ||
    (language === 'hi'
      ? 'Field measurement'
      : 'Manual plot note');
  const recordSubtitle =
    villageName.trim() ||
    `${formatFixed(lengthValue, 2)} x ${formatFixed(
      widthValue,
      2,
    )} ${unit}`;
  const reportMetaItems = [
    {
      iconName: 'ruler-square',
      label: 'Unit',
      value: unitDisplay,
    },
    {
      iconName: 'arrow-expand-horizontal',
      label: 'Length',
      value: `${formatFixed(lengthValue, 2)} ${unitDisplay}`,
    },
    {
      iconName: 'arrow-expand-vertical',
      label: 'Width',
      value: `${formatFixed(widthValue, 2)} ${unitDisplay}`,
    },
  ];
  const reportSections = [
    {
      accentColor: '#1E40AF',
      rows: [
        {
          label: 'Plot / Khasra',
          value: plotLabel.trim() || '-',
        },
        {
          label: 'Village',
          value: villageName.trim() || '-',
        },
        {
          label: 'Field size',
          value: `${formatFixed(lengthValue, 2)} x ${formatFixed(widthValue, 2)} ${unitDisplay}`,
        },
        {
          label: 'Unit',
          value: unitDisplay,
        },
      ],
      title: 'Field details',
    },
  ];

  const summaryLines = [
    `Plot: ${plotLabel.trim() || '-'}`,
    `Village: ${villageName.trim() || '-'}`,
    `Size: ${formatFixed(lengthValue, 2)} x ${formatFixed(
      widthValue,
      2,
    )} ${unit}`,
    `Area: ${formatFixed(areaSqm, 2)} Sq M`,
    `Area: ${formatFixed(areaUpBigha, 4)} UP Bigha`,
    `Area: ${formatFixed(areaUpBiswa, 4)} UP Biswa`,
    `Area: ${formatFixed(areaAcre, 4)} Acre`,
  ];

  const ensureData = () => {
    if (length.trim() && width.trim()) {
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
        length,
        notes,
        plotLabel,
        unit,
        villageName,
        width,
      },
    });

    Alert.alert(copy.saveDoneTitle, copy.saveDoneBody);
  };

  const handleLoad = (record: WorkspaceRecord) => {
    setPlotLabel(record.values.plotLabel ?? '');
    setVillageName(record.values.villageName ?? '');
    setLength(record.values.length ?? '');
    setWidth(record.values.width ?? '');
    setUnit((record.values.unit as LengthUnit) ?? 'meter');
    setNotes(record.values.notes ?? '');
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
        <WorkspaceChipSelector
          label={copy.unitLabel}
          onSelect={nextValue =>
            setUnit(nextValue as LengthUnit)
          }
          options={[
            {label: 'Meter', value: 'meter'},
            {label: 'Feet', value: 'feet'},
          ]}
          selectedValue={unit}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.lengthLabel}
          onChangeText={setLength}
          value={length}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.widthLabel}
          onChangeText={setWidth}
          value={width}
        />
        <WorkspaceField
          label={copy.plotLabel}
          onChangeText={setPlotLabel}
          value={plotLabel}
        />
        <WorkspaceField
          label={copy.villageLabel}
          onChangeText={setVillageName}
          value={villageName}
        />
        <WorkspaceField
          label={copy.notesLabel}
          multiline
          onChangeText={setNotes}
          value={notes}
        />
      </View>

      <FieldPlanPreview
        bottomLabel={length || '0'}
        leftLabel={width || '0'}
        rightLabel={width || '0'}
        title="Field sketch"
        topLabel={length || '0'}
      />

      <View style={workspaceStyles.resultSection}>
        <AppSectionTitle title={copy.resultTitle} />
        <ViewShot ref={reportRef}>
          <View style={styles.summarySheet}>
          <View style={styles.noteHeader}>
            <View style={styles.noteHeaderAccent} />
            <View style={styles.noteHeaderCopy}>
              <Text style={styles.noteTitle}>
                {recordTitle}
              </Text>
              <Text style={styles.noteSubtitle}>
                {recordSubtitle}
              </Text>
            </View>
          </View>

          <View style={styles.noteMetaRow}>
            {reportMetaItems.map(item => (
              <View
                key={item.label}
                style={styles.noteMetaItem}>
                <Text style={styles.noteMetaLabel}>
                  {item.label}
                </Text>
                <Text style={styles.noteMetaValue}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {reportSections.map(section => (
            <View
              key={section.title}
              style={styles.noteSection}>
              <Text
                style={[
                  styles.noteSectionTitle,
                  {color: section.accentColor},
                ]}>
                {section.title}
              </Text>

                <View style={styles.noteRows}>
                  {section.rows.map(row => (
                    <View
                      key={`${section.title}-${row.label}`}
                      style={styles.noteRow}>
                      <View style={styles.noteRowLeft}>
                        <Text style={styles.noteRowLabel}>
                          {row.label}
                        </Text>
                      </View>

                      <Text style={styles.noteRowValue}>
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.noteSection}>
              <Text style={styles.noteSectionTitle}>
                Measured output
              </Text>
              <View style={workspaceStyles.metricsRow}>
                <WorkspaceMetricTile
                  accentColor="#1E40AF"
                  label="Perimeter"
                  value={`${formatFixed(perimeterMeters, 2)} m`}
                />
                <WorkspaceMetricTile
                  accentColor="#2563EB"
                  label="Area in Sq M"
                  value={`${formatFixed(areaSqm, 2)} Sq M`}
                />
                <WorkspaceMetricTile
                  accentColor="#0F766E"
                  label="Area in UP Bigha"
                  value={formatFixed(areaUpBigha, 4)}
                />
                <WorkspaceMetricTile
                  accentColor="#10B981"
                  label="Area in UP Biswa"
                  value={formatFixed(areaUpBiswa, 4)}
                />
                <WorkspaceMetricTile
                  accentColor="#EA580C"
                  label="Area in Acre"
                  value={formatFixed(areaAcre, 4)}
                />
                <WorkspaceMetricTile
                  accentColor="#7C3AED"
                  label="Area in Hectare"
                  value={formatFixed(areaHectare, 4)}
                />
                <WorkspaceMetricTile
                  accentColor="#0891B2"
                  label="Area in Sq Ft"
                  value={formatFixed(areaSqft, 2)}
                />
              </View>
            </View>

            {notes.trim() ? (
              <View style={styles.noteSection}>
                <Text style={styles.noteSectionTitle}>
                  Notes
                </Text>
              <Text style={styles.notePlainText}>
                {notes.trim()}
              </Text>
            </View>
          ) : null}
          </View>
        </ViewShot>
      </View>

      <WorkspaceActionRow
        labels={copy}
        onExportImage={() =>
          ensureData() &&
          exportRefAsImage({
            fileName: sanitizeFileName(
              `field-${recordTitle}`,
            ),
            ref: reportRef,
            title: `Field Measurement - ${recordTitle}`,
          }).catch(() => {
            Alert.alert(copy.exportError);
          })
        }
        onExportPdf={() =>
          ensureData() &&
          exportSummaryAsPdf({
            fileName: sanitizeFileName(
              `field-${recordTitle}`,
            ),
            summaryLines: notes.trim()
              ? [
                  ...summaryLines,
                  `Notes: ${notes.trim()}`,
                ]
              : summaryLines,
            title: `Field Measurement - ${recordTitle}`,
          }).catch(() => {
            Alert.alert(copy.exportError);
          })
        }
        onSave={handleSave}
        onShare={() =>
          ensureData() &&
          handleShare(
            `Field Measurement - ${recordTitle}`,
            notes.trim()
              ? [
                  ...summaryLines,
                  `Notes: ${notes.trim()}`,
                ]
              : summaryLines,
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
  noteHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  noteHeaderAccent: {
    backgroundColor: '#F97316',
    borderRadius: 999,
    height: 56,
    marginRight: 12,
    marginTop: 2,
    width: 4,
  },
  noteHeaderCopy: {
    flex: 1,
  },
  noteMetaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 20,
    marginTop: 10,
  },
  noteMetaLabel: {
    color: '#1E40AF',
    fontSize: 11,
    fontWeight: '800',
  },
  noteMetaRow: {
    borderBottomColor: '#DCE7F8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    paddingBottom: 10,
  },
  noteMetaValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  notePlainText: {
    color: '#0F172A',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  noteRow: {
    alignItems: 'center',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  noteRowLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  noteRowLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    marginRight: 10,
  },
  noteRows: {
    marginTop: 6,
  },
  noteRowValue: {
    color: '#0F172A',
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  noteSection: {
    marginTop: 16,
  },
  noteSectionTitle: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summarySheet: {
    backgroundColor: '#F6FAFF',
    borderColor: '#DCE7F8',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 2,
    padding: 16,
  },
  noteSubtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  noteTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
});

export default FieldAreaWorkspace;

