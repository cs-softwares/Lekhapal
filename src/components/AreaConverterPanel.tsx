import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {useLanguage} from '../context/LanguageContext';
import {COLORS} from '../theme/colors';
import AppPressable from './AppPressable';
import AppSectionTitle from './AppSectionTitle';

type AreaUnit = 'sqm' | 'sqft' | 'acre' | 'hectare' | 'sqyard';

const UNIT_OPTIONS: AreaUnit[] = [
  'sqm',
  'sqft',
  'acre',
  'hectare',
  'sqyard',
];

const UNIT_TO_SQM: Record<AreaUnit, number> = {
  sqm: 1,
  sqft: 0.09290304,
  acre: 4046.8564224,
  hectare: 10000,
  sqyard: 0.83612736,
};

const formatResult = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0.0000';
  }

  return value.toFixed(4);
};

const AreaConverterPanel = () => {
  const {strings} = useLanguage();
  const [value, setValue] = useState('1');
  const [fromUnit, setFromUnit] = useState<AreaUnit>('sqm');
  const [toUnit, setToUnit] = useState<AreaUnit>('sqft');

  const numericValue = Number(value) || 0;
  const valueInSqm = numericValue * UNIT_TO_SQM[fromUnit];
  const convertedValue = valueInSqm / UNIT_TO_SQM[toUnit];

  return (
    <View style={styles.card}>
      <AppSectionTitle
        subtitle={strings.areaConverterSubtitle}
        title={strings.areaConverterTitle}
      />

      <Text style={styles.label}>{strings.inputValue}</Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={setValue}
        style={styles.input}
        value={value}
      />

      <Text style={styles.label}>{strings.fromUnit}</Text>
      <View style={styles.optionRow}>
        {UNIT_OPTIONS.map(unit => (
          <AppPressable
            key={unit}
            onPress={() => setFromUnit(unit)}
            style={[
              styles.unitChip,
              fromUnit === unit && styles.unitChipActive,
            ]}>
            <Text
              style={[
                styles.unitChipText,
                fromUnit === unit && styles.unitChipTextActive,
              ]}>
              {unit.toUpperCase()}
            </Text>
          </AppPressable>
        ))}
      </View>

      <Text style={styles.label}>{strings.toUnit}</Text>
      <View style={styles.optionRow}>
        {UNIT_OPTIONS.map(unit => (
          <AppPressable
            key={unit}
            onPress={() => setToUnit(unit)}
            style={[
              styles.unitChip,
              toUnit === unit && styles.unitChipActive,
            ]}>
            <Text
              style={[
                styles.unitChipText,
                toUnit === unit && styles.unitChipTextActive,
              ]}>
              {unit.toUpperCase()}
            </Text>
          </AppPressable>
        ))}
      </View>

      <View style={styles.resultBox}>
        <Text style={styles.resultLabel}>
          {strings.convertedValue}
        </Text>
        <Text style={styles.resultValue}>
          {formatResult(convertedValue)} {toUnit.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 16,
    marginHorizontal: 16,
    padding: 18,
  },
  label: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 14,
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  unitChip: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  unitChipActive: {
    backgroundColor: COLORS.primary,
  },
  unitChipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  unitChipTextActive: {
    color: COLORS.white,
  },
  resultBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 18,
    marginTop: 18,
    padding: 16,
  },
  resultLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  resultValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
});

export default AreaConverterPanel;
