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

const formatValue = (value: number) => value.toFixed(2);

const ShareCalculatorPanel = () => {
  const {strings} = useLanguage();
  const [totalAmount, setTotalAmount] = useState('100');
  const [ownerPercent, setOwnerPercent] = useState('60');

  const total = toNumber(totalAmount);
  const percent = toNumber(ownerPercent);
  const ownerShare = (total * percent) / 100;
  const partnerShare = total - ownerShare;

  return (
    <View style={styles.card}>
      <AppSectionTitle
        subtitle={strings.shareSubtitle}
        title={strings.shareTitle}
      />

      <Text style={styles.label}>{strings.totalAmount}</Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={setTotalAmount}
        style={styles.input}
        value={totalAmount}
      />

      <Text style={styles.label}>{strings.ownerPercent}</Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={setOwnerPercent}
        style={styles.input}
        value={ownerPercent}
      />

      <View style={styles.resultCard}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>
            {strings.ownerShare}
          </Text>
          <Text style={styles.resultValue}>
            {formatValue(ownerShare)}
          </Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>
            {strings.partnerShare}
          </Text>
          <Text style={styles.resultValue}>
            {formatValue(partnerShare)}
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
  resultCard: {
    backgroundColor: COLORS.primarySoft,
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
    fontSize: 17,
    fontWeight: '800',
  },
});

export default ShareCalculatorPanel;
