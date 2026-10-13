import React from 'react';
import { RELEASE_FEATURES } from '../../config/releaseFeatures';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePremiumActive } from '../../hooks/usePremiumActive';
import { useLanguage } from '../../context/LanguageContext';
export default function PremiumStatus() {
  const active = usePremiumActive();
  const { language } = useLanguage();
  if (!RELEASE_FEATURES.premium) return null;
  const label = active
    ? language === 'hi'
      ? 'प्रीमियम सदस्य'
      : 'Premium member'
    : language === 'hi'
    ? 'बेसिक खाता'
    : 'Basic account';
  return (
    <View accessibilityLabel={label} style={styles.row}>
      <Icon
        name={active ? 'crown' : 'account-outline'}
        color={active ? '#A36708' : '#64748B'}
        size={18}
      />
      <Text style={[styles.text, { color: active ? '#A36708' : '#64748B' }]}>
        {label}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
  },
  text: { fontSize: 13, fontWeight: '800' },
});
