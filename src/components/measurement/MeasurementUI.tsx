import { LIGHT_COLORS } from '../../theme/palette';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../context/ThemeContext';
import AppPressable from '../AppPressable';
import type { Point } from '../../domain/measurement';

export function useMeasurementMotion() {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduce(value);
    });
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduce,
    );
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);
  return !reduce;
}

export function MeasurementField({
  label,
  value,
  onChange,
  suffix,
  numeric = true,
  placeholder,
  multiline = false,
  focusColor = LIGHT_COLORS.primary,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  numeric?: boolean;
  placeholder?: string;
  multiline?: boolean;
  focusColor?: string;
}) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={ui.field}>
      <Text style={[ui.label, { color: colors.textMuted }]}>{label}</Text>
      <View
        style={[
          ui.inputWrap,
          {
            backgroundColor: colors.background,
            borderColor: focused ? focusColor : colors.border,
          },
          multiline && ui.multiline,
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          placeholder={placeholder ?? (numeric ? '0' : '')}
          placeholderTextColor={colors.textSoft}
          multiline={multiline}
          maxLength={numeric ? 18 : 240}
          style={[
            ui.input,
            { color: colors.text },
            multiline && { textAlignVertical: 'top' },
          ]}
        />
        {suffix && (
          <Text style={[ui.suffix, { color: colors.textMuted }]}>{suffix}</Text>
        )}
      </View>
    </View>
  );
}

export function MeasurementChoices({
  label,
  options,
  value,
  onChange,
  color = LIGHT_COLORS.primary,
}: {
  label: string;
  options: Array<{ value: string; label: string; icon?: string }>;
  value: string;
  onChange: (value: string) => void;
  color?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={ui.field}>
      <Text style={[ui.label, { color: colors.textMuted }]}>{label}</Text>
      <View style={ui.choices}>
        {options.map(option => (
          <AppPressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${option.label}`}
            accessibilityState={{ selected: value === option.value }}
            onPress={() => onChange(option.value)}
            style={[
              ui.choice,
              {
                backgroundColor:
                  value === option.value ? color : colors.background,
                borderColor: value === option.value ? color : colors.border,
              },
            ]}
          >
            {option.icon && (
              <Icon
                name={option.icon}
                size={17}
                color={value === option.value ? '#FFFFFF' : colors.textMuted}
              />
            )}
            <Text
              style={[
                ui.choiceText,
                { color: value === option.value ? '#FFFFFF' : colors.text },
              ]}
            >
              {option.label}
            </Text>
          </AppPressable>
        ))}
      </View>
    </View>
  );
}

export function MeasurementButton({
  title,
  icon,
  onPress,
  disabled = false,
  primary = false,
  color = LIGHT_COLORS.primary,
}: {
  title: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  color?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      containerStyle={ui.buttonContainer}
      style={[
        ui.button,
        {
          backgroundColor: primary ? color : colors.surface,
          borderColor: primary ? color : colors.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Icon name={icon} size={19} color={primary ? '#FFFFFF' : color} />
      <Text
        style={[ui.buttonText, { color: primary ? '#FFFFFF' : colors.text }]}
      >
        {title}
      </Text>
    </AppPressable>
  );
}

const SAMPLE: Point[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 60 },
  { x: 0, y: 60 },
];
export function ParcelSketch({
  points = SAMPLE,
  diagonal = false,
  color = LIGHT_COLORS.primary,
  animated,
  caption,
  labels,
}: {
  points?: Point[];
  diagonal?: boolean;
  color?: string;
  animated: boolean;
  caption: string;
  labels?: string[];
}) {
  const { colors } = useAppTheme();
  const [width, setWidth] = useState(280);
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, sweep]);
  const xs = points.map(p => p.x),
    ys = points.map(p => p.y);
  const minX = Math.min(...xs),
    minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1,
    spanY = Math.max(...ys) - minY || 1;
  const scale = Math.min((width - 76) / spanX, 100 / spanY);
  const mapped = points.map(p => ({
    x: (width - spanX * scale) / 2 + (p.x - minX) * scale,
    y: (156 - spanY * scale) / 2 + (p.y - minY) * scale,
  }));
  const edge = (a: Point, b: Point, key: string, dotted = false) => {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    return (
      <View
        key={key}
        style={{
          position: 'absolute',
          left: (a.x + b.x - length) / 2,
          top: (a.y + b.y) / 2 - 1,
          width: length,
          height: 2,
          backgroundColor: color,
          opacity: dotted ? 0.45 : 1,
          transform: [{ rotate: `${angle}deg` }],
        }}
      />
    );
  };
  return (
    <View
      style={[
        ui.sketch,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
        style={ui.canvas}
      >
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <View
            key={`v${i}`}
            style={[
              ui.gridLine,
              {
                left: `${i * 16.66}%`,
                width: 1,
                height: '100%',
                backgroundColor: colors.border,
              },
            ]}
          />
        ))}
        {[0, 1, 2, 3, 4].map(i => (
          <View
            key={`h${i}`}
            style={[
              ui.gridLine,
              {
                top: i * 39,
                width: '100%',
                height: 1,
                backgroundColor: colors.border,
              },
            ]}
          />
        ))}
        {animated && (
          <Animated.View
            style={[
              ui.scan,
              {
                backgroundColor: color,
                transform: [
                  {
                    translateX: sweep.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, width - 10],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        {mapped.map((p, i) =>
          edge(p, mapped[(i + 1) % mapped.length], `edge${i}`),
        )}
        {diagonal &&
          mapped.length === 4 &&
          edge(mapped[0], mapped[2], 'diagonal', true)}
        {mapped.map((p, i) => (
          <View
            key={i}
            style={{ position: 'absolute', left: p.x - 5, top: p.y - 5 }}
          >
            <View style={[ui.point, { backgroundColor: color }]} />
            <Text style={[ui.pointLabel, { color: colors.text }]}>
              {labels?.[i] ?? String.fromCharCode(65 + i)}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[ui.sketchCaption, { color: colors.textMuted }]}>
        {caption}
      </Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 13, lineHeight: 19, fontWeight: '600', marginBottom: 8 },
  inputWrap: {
    borderWidth: 1.5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontVariant: ['tabular-nums'],
  },
  suffix: { fontSize: 13, marginRight: 12 },
  multiline: { minHeight: 86, alignItems: 'flex-start' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  choiceText: { fontSize: 13, fontWeight: '600' },
  buttonContainer: { flexGrow: 1, flexBasis: '45%' },
  button: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  buttonText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  sketch: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 18,
  },
  canvas: { height: 156, overflow: 'hidden' },
  gridLine: { position: 'absolute', opacity: 0.55 },
  point: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  pointLabel: {
    fontSize: 11,
    fontWeight: '700',
    position: 'absolute',
    top: -16,
    left: -2,
  },
  scan: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    opacity: 0.18,
  },
  sketchCaption: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
