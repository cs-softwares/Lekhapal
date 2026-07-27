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
  accentColor: string;
  helper?: string;
  icon: string;
  label: string;
  onPress: () => void;
};

const DashboardBlockButton = ({
  accentColor,
  helper,
  icon,
  label,
  onPress,
}: Props) => (
  <AppPressable
    onPress={onPress}
    pressEffect="slide"
    pressedOpacity={0.9}
    style={({pressed}) => [
      styles.card,
      pressed && {
        borderColor: `${accentColor}55`,
        shadowColor: accentColor,
      },
    ]}>
    <View
      style={[
        styles.iconWrap,
        {backgroundColor: `${accentColor}16`},
      ]}>
      <Icon
        color={accentColor}
        name={icon}
        size={22}
      />
    </View>

    <Text style={styles.label}>{label}</Text>
    {helper ? (
      <Text
        numberOfLines={2}
        style={styles.helper}>
        {helper}
      </Text>
    ) : null}
  </AppPressable>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 136,
    paddingHorizontal: 14,
    paddingVertical: 16,
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  helper: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 16,
    height: 46,
    justifyContent: 'center',
    marginBottom: 14,
    width: 46,
  },
  label: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
});

export default DashboardBlockButton;
