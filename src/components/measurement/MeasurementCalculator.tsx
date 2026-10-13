import { typography } from '../../theme/typography';
import { usePremiumFeatures } from '../../hooks/usePremiumFeatures';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useIsFocused } from '@react-navigation/native';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useSelectedState } from '../../context/SelectedStateContext';
import { useSavedWorkspaceRecords } from '../../hooks/useSavedWorkspaceRecords';
import type { WorkspaceRecord, WorkspaceValues } from '../../types/workspace';
import {
  areaFactor,
  calculateField,
  compareArea,
  mapScaleResult,
  positiveNumber,
} from '../../domain/measurement';
import type {
  AreaUnit,
  FieldShape,
  LengthUnit,
} from '../../domain/measurement';
import {
  exportSummaryAsPdf,
  shareTextSummary,
} from '../../utils/workspaceExport';
import { sanitizeFileName } from '../../utils/workspaceFormatters';
import AppPressable from '../AppPressable';
import AreaConversionResults, {
  areaConversionRows,
} from './AreaConversionResults';
import { MEASUREMENT_TOOLS, OfflineModuleId } from './measurementCatalog';
import ConversionUnitPicker from './ConversionUnitPicker';
import {
  MeasurementButton,
  MeasurementChoices,
  MeasurementField,
  ParcelSketch,
  useMeasurementMotion,
} from './MeasurementUI';

const initialValues = (): WorkspaceValues => ({
  shape: 'rectangle',
  unit: 'meter',
  length: '',
  width: '',
  a: '',
  b: '',
  c: '',
  d: '',
  diagonal: '',
  height: '',
  value: '',
  fromUnit: 'sqm',
  toUnit: 'hectare',
  resultAreaUnit: 'sqm',
  bighaSqm: '',
  biswaPerBigha: '',
  biswansiPerBiswa: '',
  marlaSqm: '',
  marlaPerKanal: '',
  mapDistance: '',
  scaleRatio: '',
  mapUnit: 'cm',
  mapKind: 'length',
  plotLabel: '',
  villageName: '',
  notes: '',
  recordedArea: '',
});
const format = (n: number, digits = 4) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: digits });
const UNIT_LABELS: Record<AreaUnit, [string, string]> = {
  sqm: ['m²', 'वर्ग मीटर'],
  hectare: ['Hectare', 'हेक्टेयर'],
  acre: ['Acre', 'एकड़'],
  sqft: ['Sq ft', 'वर्ग फुट'],
  sqyard: ['Sq yard', 'वर्ग गज'],
  bigha: ['Bigha', 'बीघा'],
  biswa: ['Biswa', 'बिस्वा'],
  biswansi: ['Biswansi', 'बिस्वांसी'],
  decimal: ['Decimal', 'डिसमिल'],
  cent: ['Cent', 'सेंट'],
  guntha: ['Guntha', 'गुंठा'],
  marla: ['Marla', 'मरला'],
  kanal: ['Kanal', 'कनाल'],
  sqkm: ['km²', 'वर्ग किमी'],
};

// Retain access to notes saved by the earlier measurement tools.
export function restoreMeasurementValues(
  record: WorkspaceRecord,
  moduleId: OfflineModuleId,
): WorkspaceValues {
  const values = { ...initialValues(), ...record.values };
  if (moduleId === 'plot-boundary-guide' && !record.values.a) {
    values.a = record.values.north ?? '';
    values.b = record.values.east ?? '';
    values.c = record.values.south ?? '';
    values.d = record.values.west ?? '';
  }
  if (moduleId === 'map-scale-helper') {
    values.mapUnit =
      record.values.mapUnit ?? (record.values.unit === 'mm' ? 'mm' : 'cm');
    values.plotLabel =
      record.values.plotLabel ?? record.values.referenceLabel ?? '';
  }
  for (const key of ['fromUnit', 'toUnit']) {
    if (values[key] === 'upbigha' || values[key] === 'upbiswa') {
      values[key] = values[key] === 'upbigha' ? 'bigha' : 'biswa';
      values.bighaSqm = '2500';
      values.biswaPerBigha = '20';
    }
  }
  if (!['rectangle', 'triangle', 'trapezoid'].includes(values.shape))
    values.shape = 'rectangle';
  if (!['meter', 'feet', 'yard'].includes(values.unit)) values.unit = 'meter';
  return values;
}

export default function MeasurementCalculator({
  moduleId,
  externalRecord,
  onRecordApplied,
}: {
  moduleId: OfflineModuleId;
  externalRecord: WorkspaceRecord | null;
  onRecordApplied: () => void;
  onOpenSaved?: () => void;
}) {
  const { language } = useLanguage();
  const premium = usePremiumFeatures();
  const hi = language === 'hi';
  const t = (en: string, hindi: string) => (hi ? hindi : en);
  const { colors } = useAppTheme();
  const { stateCode } = useSelectedState();
  const tool = MEASUREMENT_TOOLS.find(item => item.id === moduleId)!;
  const accent = colors.primary;
  const focused = useIsFocused();
  const motion = useMeasurementMotion();
  const [values, setValues] = useState<WorkspaceValues>(initialValues);
  const [ready, setReady] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const revision = useRef(0);
  const draftKey = `measurement-draft-v2-${
    stateCode || 'unassigned'
  }-${moduleId}`;
  const { saveRecord } = useSavedWorkspaceRecords(tool.storageToolId);
  const resultAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    const currentRevision = revision.current;
    AsyncStorage.getItem(draftKey)
      .then(raw => {
        if (!mounted || currentRevision !== revision.current) return;
        if (raw) {
          try {
            setValues({ ...initialValues(), ...JSON.parse(raw) });
          } catch {
            /* Start with a blank form. */
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, [draftKey]);
  useEffect(() => {
    if (!externalRecord) return;
    revision.current += 1;
    setValues(restoreMeasurementValues(externalRecord, moduleId));
    setDetailsOpen(true);
    setReady(true);
    setNotice(
      t(
        'Saved note loaded. You can edit and save a new copy.',
        'सेव किया नोट खुल गया है। बदलाव करके नई प्रति सेव कर सकते हैं।',
      ),
    );
    onRecordApplied();
    // The parent callback only acknowledges consumption of this record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalRecord, moduleId]);
  useEffect(() => {
    if (ready)
      AsyncStorage.setItem(draftKey, JSON.stringify(values)).catch(() => {
        setNotice(
          t(
            'Draft could not be stored on this device.',
            'ड्राफ्ट इस डिवाइस पर सेव नहीं हो पाया।',
          ),
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, values, ready]);

  const update = (key: string, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
    setNotice('');
  };
  const isField =
    moduleId === 'field-area' || moduleId === 'plot-boundary-guide';
  const isConverter = moduleId === 'area-converter';
  const shape: FieldShape =
    moduleId === 'plot-boundary-guide'
      ? 'boundary'
      : (values.shape as FieldShape);
  const unit = values.unit as LengthUnit;
  const field = isField ? calculateField(shape, values, unit) : null;
  const unitLabel = unit === 'meter' ? 'm' : unit === 'feet' ? 'ft' : 'yd';
  const fromFactor = areaFactor(
    values.fromUnit as AreaUnit,
    values.bighaSqm,
    values.biswaPerBigha,
    values,
  );
  const inputArea = positiveNumber(values.value);
  const convertedArea = inputArea && fromFactor ? inputArea * fromFactor : null;
  const mapResult = mapScaleResult(
    values.mapDistance,
    values.scaleRatio,
    values.mapUnit as 'cm' | 'mm',
    values.mapKind as 'length' | 'area',
  );
  const areaSqm = field?.ok
    ? field.result.areaSqm
    : isConverter
    ? convertedArea
    : values.mapKind === 'area'
    ? mapResult
    : null;
  const selectedAreaUnit = isConverter
    ? values.toUnit
    : values.resultAreaUnit || 'sqm';
  const displayFactor = areaFactor(
    selectedAreaUnit as AreaUnit,
    values.bighaSqm,
    values.biswaPerBigha,
    values,
  );
  const isAreaResult = isField || isConverter || values.mapKind === 'area';
  const result = isAreaResult
    ? areaSqm !== null && displayFactor
      ? areaSqm / displayFactor
      : null
    : mapResult;
  const valid = result !== null && Number.isFinite(result) && result > 0;
  const resultUnit = isAreaResult
    ? UNIT_LABELS[selectedAreaUnit as AreaUnit]?.[hi ? 1 : 0] ?? 'm²'
    : 'm';
  const comparison = areaSqm ? compareArea(areaSqm, values.recordedArea) : null;
  const localUnits =
    ['bigha', 'biswa', 'biswansi', 'marla', 'kanal'].includes(
      isConverter ? values.fromUnit : selectedAreaUnit,
    ) ||
    (isConverter &&
      ['bigha', 'biswa', 'biswansi', 'marla', 'kanal'].includes(values.toUnit));
  const invalidFields = field && !field.ok && field.error !== 'incomplete';
  const fieldError =
    field && !field.ok && field.error === 'triangle'
      ? t(
          'These lengths cannot form the plot. For each triangle, any two sides must add up to more than the third side.',
          'इन मापों से भूखंड नहीं बनता। हर त्रिभुज में दो भुजाओं का योग तीसरी भुजा से अधिक होना चाहिए।',
        )
      : t(
          'Enter a valid number greater than zero for every measurement.',
          'हर माप के लिए शून्य से बड़ी सही संख्या भरें।',
        );

  useEffect(() => {
    if (!motion || !valid) return;
    resultAnimation.setValue(0.65);
    Animated.timing(resultAnimation, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [result, valid, motion, resultAnimation]);

  const shapeLabel =
    shape === 'rectangle'
      ? t('Rectangle', 'आयत')
      : shape === 'triangle'
      ? t('Triangle', 'त्रिभुज')
      : shape === 'trapezoid'
      ? t('Trapezoid', 'समलंब')
      : t('Four sides + diagonal', 'चार भुजाएं + विकर्ण');
  const dimensionFields: Array<[string, string]> =
    shape === 'rectangle'
      ? [
          ['length', t('Length · AB', 'लंबाई · AB')],
          ['width', t('Width · BC', 'चौड़ाई · BC')],
        ]
      : shape === 'triangle'
      ? [
          ['a', t('Side AB', 'भुजा AB')],
          ['b', t('Side BC', 'भुजा BC')],
          ['c', t('Side CA', 'भुजा CA')],
        ]
      : shape === 'trapezoid'
      ? [
          ['a', t('Parallel side · a', 'समानांतर भुजा · a')],
          ['b', t('Parallel side · b', 'समानांतर भुजा · b')],
          ['height', t('Perpendicular height', 'लंबवत ऊंचाई')],
        ]
      : [
          ['a', t('Side AB', 'भुजा AB')],
          ['b', t('Side BC', 'भुजा BC')],
          ['c', t('Side CD', 'भुजा CD')],
          ['d', t('Side DA', 'भुजा DA')],
          ['diagonal', t('Inside diagonal · AC', 'अंदर का विकर्ण · AC')],
        ];
  const previewPoints = field?.ok
    ? field.result.points
    : shape === 'triangle'
    ? [
        { x: 0, y: 70 },
        { x: 55, y: 0 },
        { x: 120, y: 70 },
      ]
    : shape === 'boundary'
    ? [
        { x: 0, y: 60 },
        { x: 25, y: 0 },
        { x: 125, y: 20 },
        { x: 110, y: 80 },
      ]
    : shape === 'trapezoid'
    ? [
        { x: 25, y: 0 },
        { x: 95, y: 0 },
        { x: 120, y: 60 },
        { x: 0, y: 60 },
      ]
    : undefined;
  const areaRows = areaConversionRows(
    areaSqm,
    values.bighaSqm,
    values.biswaPerBigha,
    hi,
    values,
  )
    .filter(row => row.value !== '—')
    .map(row => [row.label, row.value]);
  const summaryLines = [
    `${t('Tool', 'उपकरण')}: ${tool.title[hi ? 1 : 0]}`,
    ...(isField
      ? [
          `${t('Shape', 'आकार')}: ${shapeLabel}`,
          ...dimensionFields.map(
            ([key, label]) => `${label}: ${values[key]} ${unitLabel}`,
          ),
          ...(field?.ok
            ? [
                `${t('Formula', 'सूत्र')}: ${field.result.formula}`,
                ...(field.result.perimeterM !== null
                  ? [
                      `${t('Perimeter', 'परिमाप')}: ${format(
                        field.result.perimeterM,
                      )} m`,
                    ]
                  : []),
              ]
            : []),
        ]
      : []),
    ...(isConverter
      ? [
          `${t('Input', 'दर्ज क्षेत्रफल')}: ${values.value} ${
            UNIT_LABELS[values.fromUnit as AreaUnit]?.[hi ? 1 : 0]
          }`,
          ...(positiveNumber(values.bighaSqm)
            ? [
                `1 Bigha = ${values.bighaSqm} m²`,
                ...(values.biswaPerBigha
                  ? [`1 Bigha = ${values.biswaPerBigha} Biswa`]
                  : []),
              ]
            : []),
        ]
      : []),
    ...(moduleId === 'map-scale-helper'
      ? [
          `${t('Map measurement', 'नक्शे की माप')}: ${values.mapDistance} ${
            values.mapUnit
          }${values.mapKind === 'area' ? '²' : ''}`,
          `${t('Scale', 'पैमाना')}: 1:${values.scaleRatio}`,
        ]
      : []),
    ...[
      ['biswansiPerBiswa', '1 Biswa =', 'Biswansi'],
      ['marlaSqm', '1 Marla =', 'm²'],
      ['marlaPerKanal', '1 Kanal =', 'Marla'],
    ]
      .filter(([key]) => positiveNumber(values[key]))
      .map(([key, label, suffix]) => `${label} ${values[key]} ${suffix}`),
    `${t('Result', 'परिणाम')}: ${valid ? format(result!) : '—'} ${resultUnit}`,
    ...areaRows.map(([label, value]) => `${label}: ${value}`),
    ...(!isConverter && areaSqm && positiveNumber(values.bighaSqm)
      ? [
          `1 Bigha = ${values.bighaSqm} m²`,
          ...(positiveNumber(values.biswaPerBigha)
            ? [`1 Bigha = ${values.biswaPerBigha} Biswa`]
            : []),
        ]
      : []),
    ...(comparison
      ? [
          `${t('Recorded area', 'अभिलेख का क्षेत्रफल')}: ${
            values.recordedArea
          } m²`,
          `${t('Difference', 'अंतर')}: ${format(
            comparison.difference,
          )} m² (${format(comparison.percent, 2)}%)`,
        ]
      : []),
    `${t('Village', 'गांव')}: ${values.villageName || '—'}`,
    `${t('Gata / Khasra', 'गाटा / खसरा')}: ${values.plotLabel || '—'}`,
    ...(values.notes.trim()
      ? [`${t('Field notes', 'मैदानी टिप्पणी')}: ${values.notes}`]
      : []),
    t(
      'Calculated from the entered measurements.',
      'दर्ज किए गए मापों से गणना की गई है।',
    ),
  ];
  const title = values.plotLabel.trim()
    ? `${tool.title[hi ? 1 : 0]} · ${values.plotLabel.trim()}`
    : tool.title[hi ? 1 : 0];
  const perform = async (action: 'save' | 'share' | 'pdf') => {
    if (!valid || busy) return;
    Keyboard.dismiss();
    setBusy(true);
    try {
      if (action === 'save') {
        await saveRecord({
          title,
          subtitle: `${format(result!)} ${resultUnit}${
            values.villageName ? ` · ${values.villageName}` : ''
          }`,
          summaryLines,
          values: { ...values, version: '2' },
        });
        setNotice(
          t(
            'Measurement saved. Open Saved notes to view or reuse it.',
            'माप सेव हो गया। देखने या दोबारा उपयोग करने के लिए सेव किए नोट खोलें।',
          ),
        );
      } else if (action === 'share') {
        await shareTextSummary({ title, summaryLines });
      } else {
        await exportSummaryAsPdf({
          details: { village: values.villageName, plot: values.plotLabel },
          title,
          summaryLines,
          fileName: sanitizeFileName(`measurement-${Date.now()}`),
        });
      }
    } catch {
      Alert.alert(
        t('Could not finish', 'कार्य पूरा नहीं हुआ'),
        t(
          'Your inputs are still here. Please try again.',
          'आपके माप सुरक्षित हैं। कृपया दोबारा कोशिश करें।',
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const card = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ];
  const labelStyle = [styles.heading, { color: colors.text }];
  const bodyStyle = [styles.body, { color: colors.textMuted }];
  const areaOptions = Object.entries(UNIT_LABELS).map(([value, labels]) => ({
    value,
    label: labels[hi ? 1 : 0],
  }));
  return (
    <View>
      {!ready ? (
        <Text style={bodyStyle}>
          {t('Opening your field notebook…', 'आपकी माप पुस्तिका खुल रही है…')}
        </Text>
      ) : (
        <>
          <View style={card}>
            {isField ? (
              <>
                {moduleId === 'field-area' && (
                  <MeasurementChoices
                    label={t('Choose field shape', 'खेत का आकार चुनें')}
                    value={values.shape}
                    color={tool.color}
                    onChange={v => update('shape', v)}
                    options={[
                      {
                        value: 'rectangle',
                        label: t('Rectangle', 'आयत'),
                        icon: 'rectangle-outline',
                      },
                      {
                        value: 'triangle',
                        label: t('Triangle', 'त्रिभुज'),
                        icon: 'triangle-outline',
                      },
                      {
                        value: 'trapezoid',
                        label: t('Trapezoid', 'समलंब'),
                        icon: 'vector-polygon',
                      },
                    ]}
                  />
                )}
                <ParcelSketch
                  points={previewPoints}
                  diagonal={shape === 'boundary'}
                  color={tool.color}
                  animated={motion && focused}
                  caption={
                    shape === 'trapezoid'
                      ? t(
                          'Schematic · a = AB, b = CD. Measure height at 90° to the parallel sides.',
                          'संकेत चित्र · a = AB, b = CD। समानांतर भुजाओं से 90° पर ऊंचाई मापें।',
                        )
                      : field?.ok
                      ? t(
                          'Plot preview · scaled to your measurements',
                          'भूखंड का चित्र · आपके मापों के अनुपात में',
                        )
                      : t(
                          'Schematic · match the corner labels before entering lengths',
                          'संकेत चित्र · माप भरने से पहले कोनों के नाम मिलाएं',
                        )
                  }
                />
                {shape === 'boundary' && (
                  <Text style={[bodyStyle, styles.help]}>
                    {t(
                      'Walk around the plot in order A → B → C → D. Measure diagonal AC inside the plot; the area is calculated as two triangles.',
                      'भूखंड के कोने क्रम से A → B → C → D लें। अंदर का विकर्ण AC मापें; दो त्रिभुजों से क्षेत्रफल निकलेगा।',
                    )}
                  </Text>
                )}
                <MeasurementChoices
                  label={t('Length unit', 'लंबाई की इकाई')}
                  value={values.unit}
                  color={tool.color}
                  onChange={v => update('unit', v)}
                  options={[
                    { value: 'meter', label: t('Metre', 'मीटर') },
                    { value: 'feet', label: t('Feet', 'फुट') },
                    { value: 'yard', label: t('Yard', 'गज') },
                  ]}
                />
                <View style={styles.fieldGrid}>
                  {dimensionFields.map(([key, label]) => (
                    <View key={key} style={styles.fieldCell}>
                      <MeasurementField
                        label={label}
                        value={values[key]}
                        suffix={unitLabel}
                        onChange={v => update(key, v)}
                      />
                    </View>
                  ))}
                </View>
                {invalidFields && (
                  <Text
                    accessibilityRole="alert"
                    style={[styles.error, { color: colors.danger }]}
                  >
                    {fieldError}
                  </Text>
                )}
              </>
            ) : isConverter ? (
              <>
                <Text style={[bodyStyle, styles.help]}>
                  {t(
                    'Convert the area in your land record or field measurement. Results update as you type.',
                    'अभिलेख या मैदानी माप का क्षेत्रफल बदलें। संख्या भरते ही परिणाम मिलेगा।',
                  )}
                </Text>
                <MeasurementField
                  label={t('Area to convert', 'बदलने वाला क्षेत्रफल')}
                  value={values.value}
                  onChange={v => update('value', v)}
                />
                <ConversionUnitPicker
                  from={values.fromUnit}
                  to={values.toUnit}
                  options={areaOptions}
                  onChange={(side, value) =>
                    update(side === 'from' ? 'fromUnit' : 'toUnit', value)
                  }
                  onSwap={() =>
                    setValues(v => ({
                      ...v,
                      fromUnit: v.toUnit,
                      toUnit: v.fromUnit,
                    }))
                  }
                />
              </>
            ) : (
              <>
                <Text style={[bodyStyle, styles.help]}>
                  {t(
                    'Read the printed scale on the map sheet. Use a ruler for distance, or measured paper area for an area conversion.',
                    'नक्शे पर छपा पैमाना देखें। दूरी के लिए रूलर और क्षेत्रफल के लिए कागज पर मापा क्षेत्रफल लें।',
                  )}
                </Text>
                <MeasurementChoices
                  label={t('Measurement type', 'माप का प्रकार')}
                  value={values.mapKind}
                  onChange={v => update('mapKind', v)}
                  color={tool.color}
                  options={[
                    {
                      value: 'length',
                      label: t('Distance', 'दूरी'),
                      icon: 'ruler',
                    },
                    {
                      value: 'area',
                      label: t('Area', 'क्षेत्रफल'),
                      icon: 'vector-square',
                    },
                  ]}
                />
                <MeasurementField
                  label={t('Scale denominator · 1 :', 'पैमाने का हर · 1 :')}
                  value={values.scaleRatio}
                  placeholder={t('Enter printed scale', 'छपा पैमाना भरें')}
                  onChange={v => update('scaleRatio', v)}
                />
                <MeasurementChoices
                  label={t(
                    'Common scales · check your sheet',
                    'प्रचलित पैमाने · अपना नक्शा जांचें',
                  )}
                  value={values.scaleRatio}
                  onChange={v => update('scaleRatio', v)}
                  color={tool.color}
                  options={['1000', '2000', '4000', '8000'].map(value => ({
                    value,
                    label: `1:${value}`,
                  }))}
                />
                <MeasurementChoices
                  label={t('Paper unit', 'कागज की इकाई')}
                  value={values.mapUnit}
                  color={tool.color}
                  onChange={v => update('mapUnit', v)}
                  options={[
                    {
                      value: 'cm',
                      label: values.mapKind === 'area' ? 'cm²' : 'cm',
                    },
                    {
                      value: 'mm',
                      label: values.mapKind === 'area' ? 'mm²' : 'mm',
                    },
                  ]}
                />
                <MeasurementField
                  label={
                    values.mapKind === 'area'
                      ? t('Measured paper area', 'कागज पर मापा क्षेत्रफल')
                      : t('Distance on map', 'नक्शे पर दूरी')
                  }
                  value={values.mapDistance}
                  suffix={`${values.mapUnit}${
                    values.mapKind === 'area' ? '²' : ''
                  }`}
                  onChange={v => update('mapDistance', v)}
                />
              </>
            )}
          </View>
          <Animated.View style={{ opacity: resultAnimation }}>
            <View style={[styles.resultCard, { borderColor: accent }]}>
              <View style={styles.resultHeading}>
                <Text style={[styles.resultKicker, { color: accent }]}>
                  {t('CALCULATED RESULT', 'गणना का परिणाम')}
                </Text>
                <Icon
                  name={valid ? 'check-circle-outline' : 'ruler-square'}
                  size={17}
                  color={accent}
                />
              </View>
              {isAreaResult && (
                <ConversionUnitPicker
                  singleLabel={t('Result unit', 'परिणाम की इकाई')}
                  from={selectedAreaUnit}
                  to={selectedAreaUnit}
                  options={areaOptions}
                  onChange={(_, value) =>
                    update(isConverter ? 'toUnit' : 'resultAreaUnit', value)
                  }
                  onSwap={() => {}}
                />
              )}
              <Text
                style={[styles.resultNumber, { color: accent }]}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {valid ? format(result!, 6) : '—'}{' '}
                <Text style={[styles.resultUnit, { color: colors.textMuted }]}>
                  {resultUnit}
                </Text>
              </Text>
              <Text style={[styles.resultFormula, { color: colors.textMuted }]}>
                {valid
                  ? isField && field?.ok
                    ? `${t('Formula', 'सूत्र')}: ${field.result.formula}`
                    : isConverter
                    ? `${values.value} ${
                        UNIT_LABELS[values.fromUnit as AreaUnit]?.[hi ? 1 : 0]
                      } → ${resultUnit}`
                    : `1:${values.scaleRatio} · ${
                        values.mapKind === 'area'
                          ? t(
                              'Area uses scale × scale',
                              'क्षेत्रफल के लिए पैमाना × पैमाना',
                            )
                          : t(
                              'Paper × scale = ground',
                              'कागज की दूरी × पैमाना = जमीन की दूरी',
                            )
                      }`
                  : isAreaResult && areaSqm !== null && !displayFactor
                  ? t(
                      'Enter the local unit standard below to calculate this result.',
                      'इस परिणाम के लिए नीचे स्थानीय इकाई का मान भरें।',
                    )
                  : t(
                      'Enter valid measurements to see your result.',
                      'परिणाम देखने के लिए सही माप भरें।',
                    )}
              </Text>
              {valid && field?.ok && field.result.perimeterM !== null && (
                <Text
                  style={[
                    styles.perimeter,
                    { color: colors.textMuted, borderTopColor: colors.border },
                  ]}
                >
                  {t('Boundary length', 'सीमा की लंबाई')} ·{' '}
                  {format(field.result.perimeterM, 2)} m
                </Text>
              )}
            </View>
          </Animated.View>
          {(isField || isConverter || values.mapKind === 'area') && (
            <AreaConversionResults
              areaSqm={areaSqm}
              bighaSqm={values.bighaSqm}
              biswaPerBigha={values.biswaPerBigha}
              local={values}
              onChange={update}
              showLocalInputs={localUnits}
            />
          )}
          {valid && (
            <>
              {areaSqm === null && !isConverter && (
                <View style={styles.metricGrid}>
                  {(areaRows.length
                    ? areaRows
                    : [
                        [t('Feet', 'फुट'), format(result! / 0.3048, 2)],
                        [
                          t('Kilometres', 'किलोमीटर'),
                          format(result! / 1000, 6),
                        ],
                      ]
                  ).map(([label, value]) => (
                    <View
                      key={label}
                      style={[
                        styles.metric,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.metricValue, { color: colors.text }]}
                      >
                        {value}
                      </Text>
                      <Text style={[styles.small, { color: colors.textMuted }]}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {areaSqm !== null && (
                <View style={card}>
                  <Text style={labelStyle}>
                    {t(
                      'Compare with the land record',
                      'भूमि अभिलेख से तुलना करें',
                    )}
                  </Text>
                  <Text style={[bodyStyle, styles.help]}>
                    {t(
                      'Optional · enter the recorded area in square metres.',
                      'वैकल्पिक · अभिलेख का क्षेत्रफल वर्ग मीटर में भरें।',
                    )}
                  </Text>
                  <MeasurementField
                    label={t('Recorded area', 'अभिलेख का क्षेत्रफल')}
                    suffix="m²"
                    value={values.recordedArea}
                    onChange={v => update('recordedArea', v)}
                  />
                  {comparison && (
                    <View
                      style={[
                        styles.comparison,
                        { backgroundColor: colors.background },
                      ]}
                    >
                      <Icon
                        name="compare-horizontal"
                        size={22}
                        color={accent}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.metricValue, { color: colors.text }]}
                        >
                          {comparison.difference > 0 ? '+' : ''}
                          {format(comparison.difference, 4)} m²
                        </Text>
                        <Text style={bodyStyle}>
                          {format(Math.abs(comparison.percent), 2)}%{' '}
                          {comparison.difference === 0
                            ? t('difference', 'अंतर')
                            : comparison.difference > 0
                            ? t('above the record', 'अभिलेख से अधिक')
                            : t('below the record', 'अभिलेख से कम')}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
          <View style={card}>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={t(
                'Plot details and field notes',
                'भूखंड विवरण और मैदानी टिप्पणी',
              )}
              accessibilityState={{ expanded: detailsOpen }}
              onPress={() => setDetailsOpen(v => !v)}
              style={styles.detailsToggle}
            >
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>
                  {t(
                    'Plot details & field notes',
                    'भूखंड विवरण और मैदानी टिप्पणी',
                  )}
                </Text>
                <Text style={bodyStyle}>
                  {t(
                    'Add village, Gata/Khasra and observations',
                    'गांव, गाटा/खसरा और निरीक्षण जोड़ें',
                  )}
                </Text>
              </View>
              <Icon
                name={detailsOpen ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={accent}
              />
            </AppPressable>
            {detailsOpen && (
              <View style={{ marginTop: 18 }}>
                <MeasurementField
                  label={t('Village', 'गांव')}
                  numeric={false}
                  value={values.villageName}
                  onChange={v => update('villageName', v)}
                />
                <MeasurementField
                  label={t('Gata / Khasra number', 'गाटा / खसरा संख्या')}
                  numeric={false}
                  value={values.plotLabel}
                  onChange={v => update('plotLabel', v)}
                />
                <MeasurementField
                  label={t('Field notes', 'मैदानी टिप्पणी')}
                  numeric={false}
                  multiline
                  value={values.notes}
                  onChange={v => update('notes', v)}
                />
              </View>
            )}
          </View>
          {notice ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.notice,
                { color: accent, backgroundColor: colors.surface },
              ]}
            >
              {notice}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <MeasurementButton
              title={
                busy
                  ? t('Working…', 'कार्य जारी…')
                  : t('Save measurement', 'माप सेव करें')
              }
              icon="content-save-outline"
              primary
              disabled={!valid || busy}
              onPress={() => {
                perform('save');
              }}
              color={tool.color}
            />
            <MeasurementButton
              title={t('Share summary', 'सारांश साझा करें')}
              icon="share-variant-outline"
              disabled={!valid || busy}
              onPress={() => {
                perform('share');
              }}
              color={accent}
            />
            <MeasurementButton
              title={
                premium
                  ? t('Export PDF', 'PDF बनाएं')
                  : t('Unlock PDF · Premium', 'PDF अनलॉक करें · प्रीमियम')
              }
              icon={premium ? 'file-pdf-box' : 'lock-outline'}
              disabled={!valid || busy}
              onPress={() => {
                perform('pdf');
              }}
              color={accent}
            />
            <MeasurementButton
              title={t('Clear inputs', 'माप साफ करें')}
              icon="restart"
              color={accent}
              onPress={() =>
                Alert.alert(
                  t('Start a new measurement?', 'नई माप शुरू करें?'),
                  t(
                    'This clears the current inputs. Saved notes stay available.',
                    'मौजूदा माप साफ होंगे। सेव किए नोट उपलब्ध रहेंगे।',
                  ),
                  [
                    { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
                    {
                      text: t('Clear', 'साफ करें'),
                      onPress: () => {
                        setValues(current => ({
                          ...initialValues(),
                          resultAreaUnit: current.resultAreaUnit || 'sqm',
                          toUnit: current.toUnit,
                          bighaSqm: current.bighaSqm,
                          biswaPerBigha: current.biswaPerBigha,
                          biswansiPerBiswa: current.biswansiPerBiswa,
                          marlaSqm: current.marlaSqm,
                          marlaPerKanal: current.marlaPerKanal,
                        }));
                        setNotice('');
                      },
                      style: 'destructive',
                    },
                  ],
                )
              }
            />
          </View>
          <Text style={[styles.footer, { color: colors.textMuted }]}>
            {t(
              'Your draft stays on this device. Saved notes include the measurements, method and result.',
              'आपका ड्राफ्ट इस डिवाइस पर रहता है। सेव किए नोट में माप, विधि और परिणाम शामिल हैं।',
            )}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 16 },
  heading: { ...typography.title, marginBottom: 5 },
  body: typography.body,
  help: { marginBottom: 16 },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12 },
  fieldCell: { flexBasis: '45%', flexGrow: 1 },
  error: { fontSize: 13, lineHeight: 20, marginBottom: 6 },
  localCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  swap: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'flex-start',
    alignItems: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  small: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  resultCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  resultHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultKicker: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  resultNumber: {
    fontSize: 28,
    lineHeight: 37,
    fontWeight: '700',
    marginTop: 5,
    fontVariant: ['tabular-nums'],
  },
  resultUnit: { fontSize: 14, fontWeight: '500' },
  resultFormula: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  perimeter: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
    paddingTop: 7,
    borderTopWidth: 1,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metric: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  metricValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    marginBottom: 3,
    fontVariant: ['tabular-nums'],
  },
  comparison: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  detailsToggle: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    minHeight: 48,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  notice: {
    padding: 14,
    fontSize: 13,
    lineHeight: 20,
    borderRadius: 12,
    marginBottom: 14,
  },
  footer: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 12,
  },
});
