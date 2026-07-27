import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppPressable from './AppPressable';
import {COLORS} from '../theme/colors';

type InfoChipProps = {
  accentColor: string;
  helper?: string;
  iconName: string;
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  value: string;
};

const InfoChip = ({
  accentColor,
  helper,
  iconName,
  label,
  onPress,
  style,
  value,
}: InfoChipProps) => {
  const content = (
    <View style={styles.row}>
      <View
        style={[
          styles.iconBadge,
          {backgroundColor: accentColor},
        ]}>
        <MaterialCommunityIcons
          color={COLORS.white}
          name={iconName}
          size={18}
        />
      </View>

      <View style={styles.textBlock}>
        <View style={styles.labelRow}>
          <Text numberOfLines={1} style={styles.label}>
            {label}
          </Text>

          <View
            style={[
              styles.valuePill,
              {backgroundColor: `${accentColor}14`},
            ]}>
            <Text
              numberOfLines={1}
              style={[styles.value, {color: accentColor}]}>
              {value}
            </Text>
          </View>
        </View>

        {helper ? (
          <Text numberOfLines={2} style={styles.helper}>
            {helper}
          </Text>
        ) : null}
      </View>

      <MaterialCommunityIcons
        color={accentColor}
        name="chevron-right"
        size={20}
      />
    </View>
  );

  if (onPress) {
    return (
      <AppPressable
        onPress={onPress}
        pressEffect="slide"
        pressedOpacity={0.78}
        style={[styles.container, style]}>
        {content}
      </AppPressable>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minHeight: 92,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  textBlock: {
    flex: 1,
    marginHorizontal: 12,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  label: {
    color: COLORS.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  valuePill: {
    borderRadius: 999,
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  value: {
    fontSize: 12,
    fontWeight: '800',
  },
  helper: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
});

export default InfoChip;
