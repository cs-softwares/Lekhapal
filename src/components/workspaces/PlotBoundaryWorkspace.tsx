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
import PlotShapePreview from './PlotShapePreview';
import SavedRecordsPanel from './SavedRecordsPanel';
import WorkspaceActionRow from './WorkspaceActionRow';
import WorkspaceField from './WorkspaceField';
import WorkspaceMetricTile from './WorkspaceMetricTile';
import {workspaceStyles} from './workspaceStyles';

const SQM_PER_UP_BIGHA = 2500;
const SQM_PER_UP_BISWA = 125;
const SQM_PER_ACRE = 4046.8564224;

const toNumber = (value: string) => Number(value) || 0;

type PlotBoundaryWorkspaceProps = {
  externalRecord?: WorkspaceRecord | null;
  onExternalRecordApplied?: () => void;
  showSavedRecords?: boolean;
};

const PlotBoundaryWorkspace = ({
  externalRecord,
  onExternalRecordApplied,
  showSavedRecords = true,
}: PlotBoundaryWorkspaceProps) => {
  const {language} = useLanguage();
  const reportRef = useRef<ViewShotRef>(null);
  const [plotLabel, setPlotLabel] = useState('');
  const [villageName, setVillageName] = useState('');
  const [north, setNorth] = useState('');
  const [south, setSouth] = useState('');
  const [east, setEast] = useState('');
  const [west, setWest] = useState('');
  const [notes, setNotes] = useState('');
  const {deleteRecord, records, saveRecord} =
    useSavedWorkspaceRecords('plot-boundary-guide');

  const copy = useMemo(
    () => ({
      intro:
        language === 'hi'
          ? 'Uneven plot ya khet ke liye chaaron side ki length bharein. App rough area, perimeter aur side mismatch turant nikalega.'
          : 'For an uneven plot or field, enter all four side lengths. The app will calculate rough area, perimeter, and side mismatch instantly.',
      save: language === 'hi' ? 'सेव करें' : 'Save',
      share: language === 'hi' ? 'शेयर' : 'Share',
      pdf: 'PDF',
      image: 'Image',
      savedReports:
        language === 'hi'
          ? 'Saved boundary reports'
          : 'Saved side-check notes',
      load: language === 'hi' ? 'लोड करें' : 'Load',
      emptyTitle:
        language === 'hi'
          ? 'No saved boundary report yet'
          : 'No saved side-check note yet',
      emptyBody:
        language === 'hi'
          ? 'Saved boundary reports yaha quick reuse ke liye dikhengi.'
          : 'Saved side-check notes will appear here for quick reuse.',
      plotLabel:
        language === 'hi'
          ? 'Plot / Khasra / Gata'
          : 'Plot / Khasra / Gata',
      villageLabel:
        language === 'hi' ? 'Village' : 'Village',
      north:
        language === 'hi' ? 'North side' : 'North side',
      south:
        language === 'hi' ? 'South side' : 'South side',
      east:
        language === 'hi' ? 'East side' : 'East side',
      west:
        language === 'hi' ? 'West side' : 'West side',
      notes:
        language === 'hi' ? 'Notes' : 'Notes',
      resultTitle:
        language === 'hi'
          ? 'Plot result'
          : 'Plot result',
      saveBlocked:
        language === 'hi'
          ? 'Kam se kam sides bharein'
          : 'Enter the plot sides',
      saveBlockedBody:
        language === 'hi'
          ? 'Save ya export se pehle north, south, east aur west side bharein.'
          : 'Add north, south, east, and west side lengths before saving or exporting.',
      saveDoneTitle:
        language === 'hi'
          ? 'Boundary report saved'
          : 'Boundary note saved',
      saveDoneBody:
        language === 'hi'
          ? 'Yeh report ab saved list mein hai.'
          : 'This boundary note is now in your saved list.',
      exportError:
        language === 'hi'
          ? 'Export complete nahi hua'
          : 'Export could not finish',
    }),
    [language],
  );

  const northValue = toNumber(north);
  const southValue = toNumber(south);
  const eastValue = toNumber(east);
  const westValue = toNumber(west);

  const averageLength = (northValue + southValue) / 2;
  const averageWidth = (eastValue + westValue) / 2;
  const perimeter =
    northValue + southValue + eastValue + westValue;
  const approximateArea = averageLength * averageWidth;
  const northSouthGap = Math.abs(northValue - southValue);
  const eastWestGap = Math.abs(eastValue - westValue);
  const areaUpBigha =
    approximateArea / SQM_PER_UP_BIGHA;
  const areaUpBiswa =
    approximateArea / SQM_PER_UP_BISWA;
  const areaAcre = approximateArea / SQM_PER_ACRE;
  const mismatchLevel =
    northSouthGap + eastWestGap > 5
      ? 'Needs recheck'
      : 'Looks balanced';

  const summaryLines = [
    `Plot: ${plotLabel.trim() || '-'}`,
    `Village: ${villageName.trim() || '-'}`,
    `Perimeter: ${formatFixed(perimeter, 2)} meter`,
    `Approx area: ${formatFixed(approximateArea, 2)} Sq M`,
    `Approx area: ${formatFixed(areaUpBigha, 4)} UP Bigha`,
    `Approx area: ${formatFixed(areaUpBiswa, 4)} UP Biswa`,
    `Approx area: ${formatFixed(areaAcre, 4)} Acre`,
    `Gap check: NS ${formatFixed(northSouthGap, 2)} / EW ${formatFixed(eastWestGap, 2)} - ${mismatchLevel}`,
  ];
  const recordTitle =
    plotLabel.trim() ||
    (language === 'hi'
      ? 'Field measurement'
      : 'Field measurement');
  const recordSubtitle =
    villageName.trim() ||
    `${formatFixed(approximateArea, 2)} Sq M`;
  const detailSections = [
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
          label: 'North side',
          value: `${formatFixed(northValue, 2)} m`,
        },
        {
          label: 'South side',
          value: `${formatFixed(southValue, 2)} m`,
        },
        {
          label: 'East side',
          value: `${formatFixed(eastValue, 2)} m`,
        },
        {
          label: 'West side',
          value: `${formatFixed(westValue, 2)} m`,
        },
      ],
      title: 'Plot details',
    },
    {
      accentColor: '#7C3AED',
      rows: [
        {
          label: 'Balance status',
          value: mismatchLevel,
        },
        {
          label: 'North-South gap',
          value: `${formatFixed(northSouthGap, 2)} m`,
        },
        {
          label: 'East-West gap',
          value: `${formatFixed(eastWestGap, 2)} m`,
        },
      ],
      title: 'Field check',
    },
  ];

  const ensureData = () => {
    if (
      north.trim() &&
      south.trim() &&
      east.trim() &&
      west.trim()
    ) {
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
        east,
        north,
        notes,
        plotLabel,
        south,
        villageName,
        west,
      },
    });

    Alert.alert(copy.saveDoneTitle, copy.saveDoneBody);
  };

  const handleLoad = (record: WorkspaceRecord) => {
    setPlotLabel(record.values.plotLabel ?? '');
    setVillageName(record.values.villageName ?? '');
    setNorth(record.values.north ?? '');
    setSouth(record.values.south ?? '');
    setEast(record.values.east ?? '');
    setWest(record.values.west ?? '');
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
        <WorkspaceField
          keyboardType="numeric"
          label={copy.north}
          onChangeText={setNorth}
          value={north}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.south}
          onChangeText={setSouth}
          value={south}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.east}
          onChangeText={setEast}
          value={east}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.west}
          onChangeText={setWest}
          value={west}
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
          label={copy.notes}
          multiline
          onChangeText={setNotes}
          value={notes}
        />
      </View>

      <PlotShapePreview
        bottomLabel={south || '0'}
        leftLabel={west || '0'}
        rightLabel={east || '0'}
        title="Parcel sketch"
        topLabel={north || '0'}
      />

      <View style={workspaceStyles.resultSection}>
        <AppSectionTitle title={copy.resultTitle} />
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
            </View>

            <View style={workspaceStyles.metricsRow}>
              <WorkspaceMetricTile
                accentColor="#1E40AF"
                label="Perimeter"
                value={`${formatFixed(perimeter, 2)} m`}
              />
              <WorkspaceMetricTile
                accentColor="#2563EB"
                label="Approx area in Sq M"
                value={formatFixed(approximateArea, 2)}
              />
              <WorkspaceMetricTile
                accentColor="#0F766E"
                label="Approx area in UP Bigha"
                value={formatFixed(areaUpBigha, 4)}
              />
              <WorkspaceMetricTile
                accentColor="#10B981"
                label="Approx area in UP Biswa"
                value={formatFixed(areaUpBiswa, 4)}
              />
              <WorkspaceMetricTile
                accentColor="#EA580C"
                label="Approx area in Acre"
                value={formatFixed(areaAcre, 4)}
              />
              <WorkspaceMetricTile
                accentColor="#7C3AED"
                label="Balance status"
                value={mismatchLevel}
              />
              <WorkspaceMetricTile
                accentColor="#9333EA"
                label="North-South gap"
                value={`${formatFixed(northSouthGap, 2)} m`}
              />
              <WorkspaceMetricTile
                accentColor="#0891B2"
                label="East-West gap"
                value={`${formatFixed(eastWestGap, 2)} m`}
              />
            </View>

            {detailSections.map(section => (
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

            {notes.trim() ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  Notes
                </Text>
                <Text style={styles.notesText}>
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
              `boundary-${recordTitle}`,
            ),
            ref: reportRef,
            title: `Boundary Report - ${recordTitle}`,
          }).catch(() => {
            Alert.alert(copy.exportError);
          })
        }
        onExportPdf={() =>
          ensureData() &&
          exportSummaryAsPdf({
            fileName: sanitizeFileName(
              `boundary-${recordTitle}`,
            ),
            summaryLines: notes.trim()
              ? [
                  ...summaryLines,
                  `Notes: ${notes.trim()}`,
                ]
              : summaryLines,
            title: `Boundary Report - ${recordTitle}`,
          }).catch(() => {
            Alert.alert(copy.exportError);
          })
        }
        onSave={handleSave}
        onShare={() =>
          ensureData() &&
          handleShare(
            `Boundary Report - ${recordTitle}`,
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
  notesText: {
    color: '#0F172A',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  summaryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
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
});

export default PlotBoundaryWorkspace;

