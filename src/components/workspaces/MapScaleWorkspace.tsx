import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Alert, Text, View} from 'react-native';
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
import SavedRecordsPanel from './SavedRecordsPanel';
import WorkspaceActionRow from './WorkspaceActionRow';
import WorkspaceChipSelector from './WorkspaceChipSelector';
import WorkspaceField from './WorkspaceField';
import WorkspaceMetricTile from './WorkspaceMetricTile';
import {workspaceStyles} from './workspaceStyles';

type DistanceUnit = 'cm' | 'mm';

type MapScaleWorkspaceProps = {
  externalRecord?: WorkspaceRecord | null;
  onExternalRecordApplied?: () => void;
  showSavedRecords?: boolean;
};

const MapScaleWorkspace = ({
  externalRecord,
  onExternalRecordApplied,
  showSavedRecords = true,
}: MapScaleWorkspaceProps) => {
  const {language} = useLanguage();
  const reportRef = useRef<ViewShotRef>(null);
  const [mapDistance, setMapDistance] = useState('2.5');
  const [scaleRatio, setScaleRatio] = useState('4000');
  const [unit, setUnit] = useState<DistanceUnit>('cm');
  const [referenceLabel, setReferenceLabel] = useState('');
  const {deleteRecord, records, saveRecord} =
    useSavedWorkspaceRecords('map-scale-helper');

  const copy = useMemo(
    () => ({
      intro:
        language === 'hi'
          ? 'Agar naksha ya map sheet par distance mila hai, to use yahan daal kar actual zameeni doori turant nikali ja sakti hai.'
          : 'If you have a distance from a map or map sheet, enter it here to convert it instantly into actual ground distance.',
      currentReport:
        language === 'hi'
          ? 'Ready map scale summary'
          : 'Scale note',
      save: language === 'hi' ? 'सेव करें' : 'Save',
      share: language === 'hi' ? 'शेयर' : 'Share',
      pdf: 'PDF',
      image: 'Image',
      savedReports:
        language === 'hi'
          ? 'Saved map scale reports'
          : 'Saved scale notes',
      load: language === 'hi' ? 'लोड करें' : 'Load',
      emptyTitle:
        language === 'hi'
          ? 'No saved map scale report yet'
          : 'No saved scale note yet',
      emptyBody:
        language === 'hi'
          ? 'Saved map scale reports yaha quick reuse ke liye dikhengi.'
          : 'Saved scale notes will appear here for quick reuse.',
      distanceLabel:
        language === 'hi'
          ? 'Measured map distance'
          : 'Measured map distance',
      scaleLabel:
        language === 'hi' ? 'Scale ratio' : 'Scale ratio',
      unitLabel:
        language === 'hi'
          ? 'Distance unit'
          : 'Distance unit',
      referenceLabel:
        language === 'hi'
          ? 'Reference note'
          : 'Reference note',
      resultTitle:
        language === 'hi'
          ? 'Ground distance result'
          : 'Distance summary',
      saveBlocked:
        language === 'hi'
          ? 'Distance aur scale bharein'
          : 'Enter distance and scale',
      saveBlockedBody:
        language === 'hi'
          ? 'Save ya export se pehle map distance aur scale ratio bharein.'
          : 'Add map distance and scale ratio before saving or exporting.',
      saveDoneTitle:
        language === 'hi'
          ? 'Map scale report saved'
          : 'Scale note saved',
      saveDoneBody:
        language === 'hi'
          ? 'Yeh report ab saved list mein hai.'
          : 'This scale note is now in your saved list.',
      exportError:
        language === 'hi'
          ? 'Export complete nahi hua'
          : 'Export could not finish',
    }),
    [language],
  );

  const distanceValue = Number(mapDistance) || 0;
  const ratioValue = Number(scaleRatio) || 0;
  const mapDistanceMeters =
    unit === 'cm' ? distanceValue / 100 : distanceValue / 1000;
  const groundMeters = mapDistanceMeters * ratioValue;
  const groundKilometers = groundMeters / 1000;
  const groundFeet = groundMeters * 3.28084;

  const summaryLines = [
    `Map distance: ${formatFixed(distanceValue, 2)} ${unit}`,
    `Scale: 1 : ${formatFixed(ratioValue, 0)}`,
    `Ground distance: ${formatFixed(groundMeters, 2)} meter`,
    `Ground distance: ${formatFixed(groundKilometers, 4)} km`,
    `Ground distance: ${formatFixed(groundFeet, 2)} ft`,
    `Reference: ${referenceLabel.trim() || '-'}`,
  ];
  const recordTitle =
    referenceLabel.trim() ||
    (language === 'hi'
      ? 'Map scale report'
      : 'Scale check note');
  const recordSubtitle = `1:${formatFixed(ratioValue, 0)}`;

  const ensureData = () => {
    if (mapDistance.trim() && scaleRatio.trim()) {
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
        mapDistance,
        referenceLabel,
        scaleRatio,
        unit,
      },
    });

    Alert.alert(copy.saveDoneTitle, copy.saveDoneBody);
  };

  const handleLoad = (record: WorkspaceRecord) => {
    setMapDistance(record.values.mapDistance ?? '2.5');
    setScaleRatio(record.values.scaleRatio ?? '4000');
    setUnit((record.values.unit as DistanceUnit) ?? 'cm');
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
      <View style={workspaceStyles.formCard}>
        <WorkspaceField
          keyboardType="numeric"
          label={copy.distanceLabel}
          onChangeText={setMapDistance}
          value={mapDistance}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.scaleLabel}
          onChangeText={setScaleRatio}
          value={scaleRatio}
        />
        <WorkspaceChipSelector
          label={copy.unitLabel}
          onSelect={nextValue =>
            setUnit(nextValue as DistanceUnit)
          }
          options={[
            {label: 'CM', value: 'cm'},
            {label: 'MM', value: 'mm'},
          ]}
          selectedValue={unit}
        />
        <WorkspaceField
          label={copy.referenceLabel}
          onChangeText={setReferenceLabel}
          value={referenceLabel}
        />
      </View>

      <View style={workspaceStyles.resultSection}>
        <AppSectionTitle title={copy.resultTitle} />
        <View style={workspaceStyles.metricsRow}>
          <WorkspaceMetricTile
            label="Ground meter"
            value={`${formatFixed(groundMeters, 2)} m`}
          />
          <WorkspaceMetricTile
            label="Ground kilometer"
            value={`${formatFixed(groundKilometers, 4)} km`}
          />
          <WorkspaceMetricTile
            label="Ground feet"
            value={`${formatFixed(groundFeet, 2)} ft`}
          />
          <WorkspaceMetricTile
            label="Map meter"
            value={`${formatFixed(mapDistanceMeters, 4)} m`}
          />
        </View>
      </View>

      <AppSectionTitle title={copy.currentReport} />

      <ViewShot ref={reportRef}>
        <View style={workspaceStyles.reportCard}>
          <Text style={workspaceStyles.reportTitle}>
            {recordTitle}
          </Text>
          <Text style={workspaceStyles.reportSubtitle}>
            {recordSubtitle}
          </Text>
          {summaryLines.map(line => (
            <Text
              key={line}
              style={workspaceStyles.reportLine}>
              {line}
            </Text>
          ))}
        </View>
      </ViewShot>

      <WorkspaceActionRow
        labels={copy}
        onExportImage={() =>
          ensureData() &&
          exportRefAsImage({
            fileName: sanitizeFileName(
              `scale-${recordTitle}`,
            ),
            ref: reportRef,
            title: `Map Scale - ${recordTitle}`,
          }).catch(() => {
            Alert.alert(copy.exportError);
          })
        }
        onExportPdf={() =>
          ensureData() &&
          exportSummaryAsPdf({
            fileName: sanitizeFileName(
              `scale-${recordTitle}`,
            ),
            summaryLines,
            title: `Map Scale - ${recordTitle}`,
          }).catch(() => {
            Alert.alert(copy.exportError);
          })
        }
        onSave={handleSave}
        onShare={() =>
          ensureData() &&
          handleShare(
            `Map Scale - ${recordTitle}`,
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

export default MapScaleWorkspace;

