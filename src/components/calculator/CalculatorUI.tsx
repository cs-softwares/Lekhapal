import { typography } from '../../theme/typography';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../context/ThemeContext';
export function useCalculatorTheme() {
  const { colors, isDarkTheme } = useAppTheme();
  return {
    bg: colors.background,
    paper: colors.surface,
    ink: colors.text,
    muted: colors.textMuted,
    line: colors.border,
    accent: colors.primary,
    tint: colors.primarySoft,
    warm: colors.primary,
    error: colors.danger,
    white: isDarkTheme ? colors.background : colors.white,
  };
}
export function useCalculatorMotion() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(v => {
        if (active) setEnabled(!v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v =>
      setEnabled(!v),
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return enabled;
}
export function CalculatorReveal({
  children,
  token,
}: {
  children: React.ReactNode;
  token: string;
}) {
  const enabled = useCalculatorMotion();
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!enabled) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0);
    const anim = Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [token, enabled, fade]);
  return (
    <Animated.View
      style={{
        opacity: fade,
        transform: [
          {
            translateY: fade.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
export function CalculatorButton({
  title,
  icon,
  onPress,
  disabled = false,
  primary = false,
  compact = false,
}: {
  title: string;
  icon?: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  compact?: boolean;
}) {
  const c = useCalculatorTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: primary
            ? c.accent
            : compact
            ? 'transparent'
            : c.tint,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        compact && s.compact,
      ]}
    >
      {icon && (
        <Icon name={icon} size={19} color={primary ? c.white : c.accent} />
      )}
      <Text style={[s.buttonText, { color: primary ? c.white : c.accent }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function CalculatorField({
  label,
  value,
  onChange,
  placeholder = '0',
  text = false,
  optional = false,
  suffix,
  wide = false,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  text?: boolean;
  optional?: boolean;
  suffix?: string;
  wide?: boolean;
  compact?: boolean;
}) {
  const c = useCalculatorTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[s.field, wide && s.wide, compact && s.compactField]}>
      <Text style={[s.label, { color: c.muted }]}>
        {label}
        {optional ? ' ·' : ''}
      </Text>
      <View
        style={[
          s.inputWrap,
          { backgroundColor: c.paper, borderColor: focus ? c.accent : c.line },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          keyboardType={text ? 'default' : 'decimal-pad'}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          maxLength={text ? 160 : 24}
          style={[s.input, { color: c.ink }]}
          selectTextOnFocus={!text}
        />
        {suffix && <Text style={[s.suffix, { color: c.muted }]}>{suffix}</Text>}
      </View>
    </View>
  );
}
export function CalculatorChoices({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: Array<{ id: string; title: string }>;
  onChange: (s: string) => void;
}) {
  const c = useCalculatorTheme();
  return (
    <View style={s.choices}>
      <Text style={[s.label, { color: c.muted }]}>{label}</Text>
      <View style={s.choiceRow}>
        {items.map(item => (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityLabel={item.title}
            accessibilityState={{ selected: value === item.id }}
            onPress={() => onChange(item.id)}
            style={[
              s.choice,
              {
                backgroundColor: value === item.id ? c.tint : c.paper,
                borderColor: value === item.id ? c.accent : c.line,
              },
            ]}
          >
            <Text
              style={[
                s.choiceText,
                { color: value === item.id ? c.accent : c.muted },
              ]}
            >
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function CalculatorProgress({ value }: { value: number }) {
  const c = useCalculatorTheme();
  const enabled = useCalculatorMotion();
  const animation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(animation, {
      toValue: Math.max(0, Math.min(1, value)),
      duration: enabled ? 420 : 0,
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [value, enabled, animation]);
  return (
    <View style={[s.track, { backgroundColor: c.line }]}>
      <Animated.View
        style={[
          s.progress,
          {
            backgroundColor: c.accent,
            width: animation.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}
const s = StyleSheet.create({
  button: {
    minHeight: 46,
    paddingHorizontal: 17,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  compact: { paddingHorizontal: 8 },
  buttonText: typography.label,
  field: { flexGrow: 1, flexBasis: 140, minWidth: 0 },
  compactField: { flexBasis: 'auto', flexGrow: 0 },
  wide: { flexBasis: '100%' },
  label: { ...typography.label, marginBottom: 8 },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontVariant: ['tabular-nums'],
  },
  suffix: { fontSize: 12, paddingRight: 12 },
  choices: { gap: 0, marginBottom: 14 },
  choiceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  choice: {
    borderWidth: 1,
    borderRadius: 9,
    minHeight: 42,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: typography.label,
  track: { height: 5, borderRadius: 5, overflow: 'hidden', marginTop: 15 },
  progress: { height: 5, borderRadius: 5 },
});
