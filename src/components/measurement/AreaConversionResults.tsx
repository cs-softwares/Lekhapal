import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  areaConversions,
  AreaUnit,
  positiveNumber,
  LocalAreaSettings,
} from '../../domain/measurement';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import AppPressable from '../AppPressable';
import { MeasurementField } from './MeasurementUI';

export const AREA_UNIT_LABELS: Record<AreaUnit, [string, string]> = {
  sqm: ['Square metres', 'वर्ग मीटर'],
  hectare: ['Hectare', 'हेक्टेयर'],
  acre: ['Acre', 'एकड़'],
  sqft: ['Square feet', 'वर्ग फुट'],
  sqyard: ['Square yards', 'वर्ग गज'],
  bigha: ['Bigha', 'बीघा'],
  biswa: ['Biswa', 'बिस्वा'],
  biswansi: ['Biswansi', 'बिस्वांसी'],
  decimal: ['Decimal (1/100 acre)', 'डिसमिल (1/100 एकड़)'],
  cent: ['Cent (1/100 acre)', 'सेंट (1/100 एकड़)'],
  guntha: ['Guntha (1/40 acre)', 'गुंठा (1/40 एकड़)'],
  marla: ['Marla', 'मरला'],
  kanal: ['Kanal', 'कनाल'],
  sqkm: ['Square kilometres', 'वर्ग किलोमीटर'],
};
export function areaConversionRows(
  areaSqm: number | null,
  bighaSqm: string,
  biswaPerBigha: string,
  hi: boolean,
  local: LocalAreaSettings = {},
) {
  return areaConversions(areaSqm, bighaSqm, biswaPerBigha, local).map(
    ({ unit, value }) => ({
      unit,
      label: AREA_UNIT_LABELS[unit][hi ? 1 : 0],
      value:
        value === null
          ? '—'
          : value.toLocaleString('en-IN', { maximumFractionDigits: 6 }),
    }),
  );
}

export default function AreaConversionResults({
  bighaSqm,
  biswaPerBigha,
  onChange,
  showLocalInputs = false,
  local = {},
}: {
  areaSqm: number | null;
  bighaSqm: string;
  biswaPerBigha: string;
  onChange: (
    key: 'bighaSqm' | 'biswaPerBigha' | keyof LocalAreaSettings,
    value: string,
  ) => void;
  showLocalInputs?: boolean;
  local?: LocalAreaSettings;
}) {
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const hi = language === 'hi';
  const [editing, setEditing] = useState(false);
  const expanded = editing || showLocalInputs;
  return (
    <View style={styles.section}>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={
          hi ? 'स्थानीय इकाइयों के मान' : 'Local unit standards'
        }
        accessibilityState={{ expanded }}
        onPress={() => setEditing(v => !v)}
        style={styles.settings}
      >
        <Text style={[styles.label, { color: colors.primary }]}>
          {hi ? 'स्थानीय इकाइयों के मान' : 'Local unit standards'}{' '}
          {expanded ? '−' : '+'}
        </Text>
      </AppPressable>
      {expanded && (
        <Text style={[styles.note, { color: colors.textMuted }]}>
          {positiveNumber(bighaSqm) && positiveNumber(biswaPerBigha)
            ? `${
                hi ? '1 बीघा' : '1 Bigha'
              } = ${bighaSqm} m² · ${biswaPerBigha} ${hi ? 'बिस्वा' : 'Biswa'}`
            : hi
            ? 'बीघा और बिस्वा के लिए अपने गांव के अभिलेख वाला मान भरें।'
            : 'Set your village’s recorded Bigha and Biswa values to see local conversions.'}
        </Text>
      )}
      {expanded && (
        <View style={styles.inputs}>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            {hi
              ? 'बीघा, बिस्वांसी, मरला और कनाल के स्थानीय अभिलेख वाले मान भरें।'
              : 'Use your local recorded standards for Bigha, Biswansi, Marla and Kanal.'}
          </Text>
          <MeasurementField
            label={hi ? '1 बीघा बराबर' : '1 Bigha equals'}
            suffix="m²"
            value={bighaSqm}
            onChange={value => onChange('bighaSqm', value)}
          />
          <MeasurementField
            label={hi ? '1 बीघा में बिस्वा' : 'Biswa in 1 Bigha'}
            value={biswaPerBigha}
            onChange={value => onChange('biswaPerBigha', value)}
          />
          <MeasurementField
            label={hi ? '1 बिस्वा में बिस्वांसी' : 'Biswansi in 1 Biswa'}
            value={local.biswansiPerBiswa || ''}
            onChange={value => onChange('biswansiPerBiswa', value)}
          />
          <MeasurementField
            label={hi ? '1 मरला बराबर' : '1 Marla equals'}
            suffix="m²"
            value={local.marlaSqm || ''}
            onChange={value => onChange('marlaSqm', value)}
          />
          <MeasurementField
            label={hi ? '1 कनाल में मरला' : 'Marla in 1 Kanal'}
            value={local.marlaPerKanal || ''}
            onChange={value => onChange('marlaPerKanal', value)}
          />
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { marginVertical: 16 },
  heading: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  value: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  label: { fontSize: 12, lineHeight: 18 },
  settings: { minHeight: 44, justifyContent: 'center', marginTop: 8 },
  note: { fontSize: 12, lineHeight: 18 },
  inputs: { marginTop: 12 },
});
