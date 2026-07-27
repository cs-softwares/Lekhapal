import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {useLanguage} from '../context/LanguageContext';
import {COLORS} from '../theme/colors';
import AppSectionTitle from './AppSectionTitle';

const toNumber = (value: string) => Number(value) || 0;

const formatCurrency = (value: number) => {
  return value.toFixed(2);
};

const RegistryEstimatorPanel = () => {
  const {strings} = useLanguage();
  const [area, setArea] = useState('1000');
  const [circleRate, setCircleRate] = useState('1500');
  const [stampPercent, setStampPercent] = useState('7');
  const [registrationPercent, setRegistrationPercent] =
    useState('1');

  const areaValue = toNumber(area);
  const circleRateValue = toNumber(circleRate);
  const stampPercentValue = toNumber(stampPercent);
  const registrationPercentValue = toNumber(registrationPercent);

  const marketValue = areaValue * circleRateValue;
  const stampDuty = (marketValue * stampPercentValue) / 100;
  const registrationCharge =
    (marketValue * registrationPercentValue) / 100;
  const totalEstimate =
    marketValue + stampDuty + registrationCharge;

  return (
    <View style={styles.card}>
      <AppSectionTitle
        subtitle={strings.registrySubtitle}
        title={strings.registryTitle}
      />

      <Text style={styles.label}>{strings.area}</Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={setArea}
        style={styles.input}
        value={area}
      />

      <Text style={styles.label}>{strings.circleRate}</Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={setCircleRate}
        style={styles.input}
        value={circleRate}
      />

      <View style={styles.dualRow}>
        <View style={styles.dualColumn}>
          <Text style={styles.label}>{strings.stampPercent}</Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={setStampPercent}
            style={styles.input}
            value={stampPercent}
          />
        </View>

        <View style={styles.dualColumn}>
          <Text style={styles.label}>
            {strings.registrationPercent}
          </Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={setRegistrationPercent}
            style={styles.input}
            value={registrationPercent}
          />
        </View>
      </View>

      <View style={styles.resultCard}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>
            {strings.marketValue}
          </Text>
          <Text style={styles.resultValue}>
            {formatCurrency(marketValue)}
          </Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>
            {strings.stampDuty}
          </Text>
          <Text style={styles.resultValue}>
            {formatCurrency(stampDuty)}
          </Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>
            {strings.registrationCharge}
          </Text>
          <Text style={styles.resultValue}>
            {formatCurrency(registrationCharge)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.resultRow}>
          <Text style={styles.totalLabel}>
            {strings.totalEstimate}
          </Text>
          <Text style={styles.totalValue}>
            {formatCurrency(totalEstimate)}
          </Text>
        </View>
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
  dualRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dualColumn: {
    width: '48%',
  },
  resultCard: {
    backgroundColor: COLORS.secondarySoft,
    borderRadius: 18,
    marginTop: 18,
    padding: 16,
  },
  resultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  resultValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  divider: {
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    height: 1,
    marginVertical: 8,
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  totalValue: {
    color: COLORS.secondary,
    fontSize: 18,
    fontWeight: '800',
  },
});

export default RegistryEstimatorPanel;
