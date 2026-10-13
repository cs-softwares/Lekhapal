import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {COLORS} from '../theme/colors';
import AppPressable from './AppPressable';

type Props = {
  helper: string;
  isLive: boolean;
  label: string;
  onPress: () => void;
  statusLabel: string;
};

const StateListItem = ({
  helper,
  isLive,
  label,
  onPress,
  statusLabel,
}: Props) => (
  <AppPressable
    onPress={onPress}

    pressedOpacity={0.92}
    style={({pressed}) => [
      styles.row,
      pressed && styles.rowPressed,
    ]}>
    <View style={styles.left}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.helper}>{helper}</Text>
    </View>

    <View
      style={[
        styles.badge,
        isLive ? styles.liveBadge : styles.readyBadge,
      ]}>
      <Icon
        color={isLive ? '#166534' : '#1E40AF'}
        name={isLive ? 'flash' : 'check-circle-outline'}
        size={14}
      />
      <Text
        style={[
          styles.badgeText,
          isLive ? styles.liveBadgeText : styles.readyBadgeText,
        ]}>
        {statusLabel}
      </Text>
    </View>
  </AppPressable>
);

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  helper: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 5,
  },
  label: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  left: {
    flex: 1,
    marginRight: 10,
  },
  liveBadge: {
    backgroundColor: '#DCFCE7',
  },
  liveBadgeText: {
    color: '#166534',
  },
  readyBadge: {
    backgroundColor: '#DBEAFE',
  },
  readyBadgeText: {
    color: '#1E40AF',
  },
  row: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  rowPressed: {
    shadowOpacity: 0.12,
    transform: [{scale: 0.99}],
  },
});

export default StateListItem;
