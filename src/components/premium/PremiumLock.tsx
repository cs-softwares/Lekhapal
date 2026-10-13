import React from 'react';
import { RELEASE_FEATURES } from '../../config/releaseFeatures';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import { requestPremiumAccess } from '../../services/premiumAccess';
import type { PremiumFeature } from '../../domain/premium';
import AppPressable from '../AppPressable';

export function PremiumLockBadge() {
  const { language } = useLanguage();
  const { isDarkTheme } = useAppTheme();
  if (!RELEASE_FEATURES.premium) return null;
  const color = isDarkTheme ? '#FFDB8A' : '#704500';
  return (
    <View
      style={[
        s.badge,
        { backgroundColor: isDarkTheme ? '#382A12' : '#FFF1CF' },
      ]}
    >
      <Icon name="lock" size={16} color={color} />
      <Text style={[s.badgeText, { color }]}>
        {language === 'hi' ? 'लॉक · प्रीमियम' : 'Locked · Premium'}
      </Text>
    </View>
  );
}

export function PremiumLockNotice({
  title,
  description,
  feature = 'gps_capture',
}: {
  title: string;
  description: string;
  feature?: PremiumFeature;
}) {
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  if (!RELEASE_FEATURES.premium) return null;
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}. ${
        language === 'hi' ? 'प्रीमियम से अनलॉक करें' : 'Unlock with Premium'
      }`}
      onPress={() => requestPremiumAccess(feature)}
      style={[s.notice, { borderColor: colors.border }]}
    >
      <PremiumLockBadge />
      <Text style={[s.title, { color: colors.text }]}>{title}</Text>
      <Text style={[s.description, { color: colors.textMuted }]}>
        {description}
      </Text>
      <View style={s.link}>
        <Text style={[s.title, { color: colors.primary }]}>
          {language === 'hi' ? 'प्रीमियम से अनलॉक करें' : 'Unlock with Premium'}
        </Text>
        <Icon name="arrow-right" size={20} color={colors.primary} />
      </View>
    </AppPressable>
  );
}

const s = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  notice: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 9,
    marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  description: { fontSize: 14, lineHeight: 22 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
});
