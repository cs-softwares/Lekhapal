import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ConversionUnitPicker from './ConversionUnitPicker';
import { AREA_UNIT_LABELS } from './AreaConversionResults';
import {
  areaFactor,
  AreaUnit,
  LocalAreaSettings,
} from '../../domain/measurement';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useMeasurementMotion } from './MeasurementUI';

const format = (value: number, digits = 2) =>
  value.toLocaleString('en-IN', { maximumFractionDigits: digits });

export default function MeasuredAreaCard({
  areaSqm,
  perimeterM,
  accuracyM,
  corners,
  tracking,
  invalid,
  unit = 'sqm',
  onUnitChange,
  local = {},
}: {
  areaSqm: number;
  perimeterM: number;
  accuracyM: number | null;
  corners: number;
  tracking: boolean;
  invalid: boolean;
  unit?: AreaUnit;
  onUnitChange?: (value: string) => void;
  local?: LocalAreaSettings & { bighaSqm?: string; biswaPerBigha?: string };
}) {
  const { language } = useLanguage();
  const { colors, isDarkTheme } = useAppTheme();
  const ink = isDarkTheme ? '#B6CDFF' : '#17366D';
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const reveal = useRef(new Animated.Value(1)).current;
  const motion = useMeasurementMotion();
  const valid = corners >= 3 && areaSqm > 0 && !invalid;
  const divisor = areaFactor(
    unit,
    local.bighaSqm || '',
    local.biswaPerBigha || '',
    local,
  );
  useEffect(() => {
    if (!motion) {
      reveal.setValue(1);
      return;
    }
    reveal.setValue(0);
    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [areaSqm, unit, motion, reveal]);

  const status = invalid
    ? t('Check boundary', 'सीमा जाँचें')
    : tracking
    ? t('Recording', 'रिकॉर्डिंग')
    : valid
    ? t('Approximate', 'अनुमानित')
    : t('Awaiting corners', 'कोने जोड़ें');

  return (
    <View style={s.outline}>
      <View style={s.header}>
        <View style={s.heading}>
          <Icon name="vector-polygon" size={16} color="#3154AD" />
          <Text style={[s.kicker, { color: ink }]}>
            {t('MEASURED AREA', 'मापा गया क्षेत्रफल')}
          </Text>
        </View>
        <View style={[s.status, invalid && s.statusWarning]}>
          <View style={[s.dot, invalid && s.dotWarning]} />
          <Text style={[s.statusText, { color: ink }]}>{status}</Text>
        </View>
      </View>
      <ConversionUnitPicker
        singleLabel={t('Result unit', 'परिणाम की इकाई')}
        from={unit}
        to={unit}
        options={Object.entries(AREA_UNIT_LABELS).map(([value, labels]) => ({
          value,
          label: labels[language === 'hi' ? 1 : 0],
        }))}
        onChange={(_, value) => onUnitChange?.(value)}
        onSwap={() => {}}
      />
      <View style={s.readingRow}>
        <Animated.View
          style={[
            s.valueWrap,
            {
              opacity: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: [0.55, 1],
              }),
              transform: [
                {
                  translateY: reveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [5, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text
            style={[s.value, { color: ink }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.45}
          >
            {valid && divisor ? format(areaSqm / divisor, 6) : '—'}
            <Text style={[s.suffix, { color: colors.textMuted }]}>
              {' '}
              {AREA_UNIT_LABELS[unit]?.[language === 'hi' ? 1 : 0]}
            </Text>
          </Text>
        </Animated.View>
      </View>
      {(!valid || invalid) && (
        <Text style={[s.support, { color: colors.textMuted }]}>
          {valid
            ? `${format(corners, 0)} ${t(
                'boundary corners',
                'सीमा बिंदु',
              )}  ·  ${t('Approximate area', 'अनुमानित क्षेत्रफल')}`
            : invalid
            ? t(
                'Trace the corners in boundary order',
                'सीमा के क्रम में कोने जोड़ें',
              )
            : t(
                'Mark at least 3 corners to measure',
                'मापने के लिए कम से कम 3 कोने जोड़ें',
              )}
        </Text>
      )}
      <View style={s.metrics}>
        <View style={s.metric}>
          <View style={s.metricHeading}>
            <Icon name="ruler-square" size={15} color="#5273BD" />
            <Text style={[s.metricLabel, { color: colors.textMuted }]}>
              {t('Perimeter', 'परिमाप')}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[s.metricValue, { color: ink }]}
          >
            {corners > 1 ? format(perimeterM) : '—'}
            <Text style={[s.metricSuffix, { color: colors.textMuted }]}>
              {' '}
              m
            </Text>
          </Text>
        </View>
        <View style={s.metric}>
          <View style={s.metricHeading}>
            <Icon name="crosshairs-gps" size={15} color="#5273BD" />
            <Text style={[s.metricLabel, { color: colors.textMuted }]}>
              {t('GPS accuracy', 'GPS सटीकता')}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[s.metricValue, { color: ink }]}
          >
            {accuracyM !== null ? `±${format(accuracyM, 1)}` : '—'}
            <Text style={[s.metricSuffix, { color: colors.textMuted }]}>
              {' '}
              m
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outline: {
    marginVertical: 12,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#466CDC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kicker: {
    color: '#385B99',
    fontSize: 10,
    letterSpacing: 1.15,
    fontWeight: '700',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusWarning: { backgroundColor: '#FFF7E8' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#4169C1' },
  dotWarning: { backgroundColor: '#B77814' },
  statusText: { fontSize: 9, fontWeight: '600', color: '#405D92' },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 10,
    marginTop: 5,
  },
  valueWrap: { flex: 1, minWidth: 140 },
  value: {
    fontSize: 30,
    lineHeight: 40,
    fontWeight: '600',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    color: '#17366D',
    marginTop: 0,
  },
  suffix: {
    fontSize: 16,
    letterSpacing: 0,
    fontWeight: '400',
    color: '#6781AA',
  },
  support: {
    fontSize: 11,
    lineHeight: 16,
    color: '#4D6893',
    marginTop: 1,
    marginBottom: 0,
  },
  rail: {
    flexDirection: 'row',
    borderRadius: 10,
    paddingHorizontal: 4,
    width: 144,
    maxWidth: '100%',
  },
  selection: {
    position: 'absolute',
    left: 4,
    top: 6,
    bottom: 6,
    backgroundColor: '#2C50B3',
    borderRadius: 7,
  },
  unitContainer: { flex: 1 },
  unit: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unitText: { fontSize: 11, fontWeight: '600', color: '#3E5D90' },
  unitSelected: { color: '#FFFFFF' },
  metrics: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#A9BFE480',
  },
  metric: {
    flex: 1,
    minWidth: 0,
  },
  metricHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricLabel: {
    color: '#476491',
    fontSize: 10,
    fontWeight: '500',
    flexShrink: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#263E64',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  metricSuffix: { fontSize: 12, fontWeight: '400', color: '#7285A0' },
});
