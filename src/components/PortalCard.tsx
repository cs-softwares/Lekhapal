import { typography } from '../theme/typography';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DashboardPressable from './dashboard/DashboardPressable';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import type { StatePortalEntry } from '../data/statePortalCatalog';

export default function PortalCard({
  portal,
  motion,
  onPress,
}: {
  portal: StatePortalEntry;
  motion: boolean;
  onPress: () => void;
}) {
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  return (
    <DashboardPressable
      label={portal.title[language]}
      onPress={onPress}
      motion={motion}
      containerStyle={styles.cardSpace}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Icon name={portal.icon} size={25} color={colors.primary} />
      <View style={styles.copy}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {portal.title[language]}
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
          {portal.subtitle[language]}
        </Text>
      </View>
      <Icon name="chevron-right" size={22} color={colors.textMuted} />
    </DashboardPressable>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1, minWidth: 0 },
  cardSpace: { marginBottom: 12 },
  card: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardTitle: typography.title,
  cardSubtitle: { ...typography.caption, marginTop: 4 },
});
