import { typography } from '../../theme/typography';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../context/ThemeContext';

export function useProfileMotion() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduced => {
        if (active) setEnabled(!reduced);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      reduced => setEnabled(!reduced),
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return enabled;
}
export function ProfileReveal({
  children,
  delay = 0,
  active,
  motion,
}: {
  children: React.ReactNode;
  delay?: number;
  active: boolean;
  motion: boolean;
}) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!motion || !active) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      delay,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, motion, delay, progress]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
export function ProfileRow({
  icon,
  title,
  value,
  onPress,
  accent,
  description,
  danger = false,
}: {
  icon: string;
  title: string;
  value?: string;
  onPress?: () => void;
  accent?: string;
  description?: string;
  danger?: boolean;
}) {
  const { colors } = useAppTheme();
  const color = danger ? colors.danger : accent || colors.primary;
  const content = (
    <>
      <View style={styles.icon}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <View style={styles.copy}>
        <Text
          style={[
            styles.title,
            { color: danger ? colors.danger : colors.text },
          ]}
        >
          {title}
        </Text>
        {description && (
          <Text style={[styles.description, { color: colors.textMuted }]}>
            {description}
          </Text>
        )}
      </View>
      {value && (
        <Text style={[styles.value, { color: colors.textMuted }]}>{value}</Text>
      )}
      {onPress && (
        <Icon name="chevron-right" size={19} color={colors.textSoft} />
      )}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityValue={value ? { text: value } : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
        },
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={[styles.row, { borderColor: colors.border }]}>{content}</View>
  );
}
const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  icon: { width: 28, alignItems: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: typography.title,
  description: { ...typography.caption, marginTop: 3 },
  value: {
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '42%',
  },
});
