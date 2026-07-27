import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {StyleSheet, Text, View} from 'react-native';

import {useAppTheme} from '../context/ThemeContext';
import AppPressable from './AppPressable';

type SettingRowProps = {
  actionLabel?: string;
  body: string;
  badge?: string;
  onPress?: () => void;
  title: string;
};

const SettingRow = ({
  actionLabel,
  title,
  body,
  badge,
  onPress,
}: SettingRowProps) => {
  const {colors} = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 18,
          borderWidth: 1,
          marginBottom: 12,
          padding: 16,
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
        textBlock: {
          flex: 1,
          marginRight: 12,
        },
        title: {
          color: colors.text,
          fontSize: 15,
          fontWeight: '800',
        },
        body: {
          color: colors.textMuted,
          fontSize: 13,
          lineHeight: 18,
          marginTop: 4,
        },
        actionText: {
          color: colors.primary,
          fontSize: 12,
          fontWeight: '800',
          marginRight: 2,
        },
        actionWrap: {
          alignItems: 'center',
          flexDirection: 'row',
          marginLeft: 10,
        },
        badge: {
          backgroundColor: colors.primarySoft,
          borderRadius: 14,
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
        badgeText: {
          color: colors.primary,
          fontSize: 12,
          fontWeight: '700',
        },
      }),
    [colors],
  );
  const Content = (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>

      {onPress && actionLabel ? (
        <View style={styles.actionWrap}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Icon
            color={colors.primary}
            name="chevron-right"
            size={18}
          />
        </View>
      ) : null}

      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <AppPressable
        onPress={onPress}
        style={styles.card}>
        {Content}
      </AppPressable>
    );
  }

  return <View style={styles.card}>{Content}</View>;
};

export default SettingRow;
