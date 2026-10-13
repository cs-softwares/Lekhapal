import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../context/ThemeContext';
import { typography } from '../theme/typography';
import AppPressable from './AppPressable';

type Props = {
  accentColor: string;
  icon: string;
  isLast?: boolean;
  onPress: () => void;
  subtitle: string;
  title: string;
};

export default function UpPortalListItem({
  icon,
  isLast = false,
  onPress,
  subtitle,
  title,
}: Props) {
  const { colors } = useAppTheme();
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      pressedOpacity={0.8}
      style={[
        styles.card,
        !isLast && styles.spacing,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Icon name={icon} size={25} color={colors.primary} />
      <View style={styles.copy}>
        <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      </View>
      <Icon name="chevron-right" size={22} color={colors.textMuted} />
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
  },
  spacing: { marginBottom: 10 },
  copy: { flex: 1, minWidth: 0 },
  subtitle: { ...typography.caption, marginTop: 4 },
});
