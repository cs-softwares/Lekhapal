import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../context/LanguageContext';
import { scientificResult } from '../../domain/scientificCalculator';
import { useCalculatorTheme } from './CalculatorUI';

const rows = [
  ['AC', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['±', '0', '.', '='],
];
const functions = [
  ['(', ')', '√', 'x²'],
  ['sin', 'cos', 'tan', '^'],
  ['log', 'ln', 'π', '!'],
];
export default function ScientificCalculator({
  values,
  onChange,
}: {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const c = useCalculatorTheme();
  const { language } = useLanguage();
  const hi = language === 'hi';
  const [expanded, setExpanded] = useState(false);
  const [equals, setEquals] = useState(false);
  const expression = values.expression || '';
  const angle = values.angle === 'radian' ? 'radian' : 'degree';
  let value: number | undefined;
  try {
    value = scientificResult(expression, angle);
  } catch {
    // Incomplete expressions have no result until the next key completes them.
  }
  const formatted =
    value === undefined
      ? ''
      : value.toLocaleString('en-IN', { maximumSignificantDigits: 12 });
  const change = (next: string) => {
    setEquals(false);
    onChange('expression', next.slice(0, 160));
  };
  const press = (key: string) => {
    if (key === 'AC') return change('');
    if (key === '⌫') return change(expression.slice(0, -1));
    if (key === '=') return setEquals(true);
    const base = equals && value !== undefined ? String(value) : expression;
    if (key === '±') return change(base ? `-(${base})` : '-');
    if (key === '√')
      return change(
        equals && value !== undefined ? `sqrt(${base})` : `${expression}sqrt(`,
      );
    if (key === 'x²') return change(base ? `(${base})^2` : '');
    if (['sin', 'cos', 'tan', 'log', 'ln'].includes(key))
      return change(
        equals && value !== undefined
          ? `${key}(${base})`
          : `${expression}${key}(`,
      );
    const startFresh = equals && /^[0-9.(π]$/.test(key);
    change(`${startFresh ? '' : base}${key}`);
  };
  const keyRow = (keys: string[], scientific = false) => (
    <View key={keys.join('')} style={s.row}>
      {keys.map(key => {
        const primary = key === '=';
        const operator = ['÷', '×', '−', '+'].includes(key);
        const utility = ['AC', '⌫', '%', '±'].includes(key) || scientific;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={
              key === '⌫'
                ? hi
                  ? 'आखिरी अक्षर हटाएं'
                  : 'Backspace'
                : key === 'AC'
                ? hi
                  ? 'साफ करें'
                  : 'All clear'
                : key === '='
                ? hi
                  ? 'बराबर'
                  : 'Equals'
                : key
            }
            onPress={() => press(key)}
            style={({ pressed }) => [
              s.key,
              scientific && s.scienceKey,
              {
                backgroundColor: primary
                  ? c.accent
                  : operator || utility
                  ? c.tint
                  : c.paper,
                borderColor:
                  operator || primary || utility ? 'transparent' : c.line,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            {key === '⌫' ? (
              <Icon name="backspace-outline" size={23} color={c.accent} />
            ) : (
              <Text
                style={[
                  s.keyText,
                  scientific && s.scienceText,
                  {
                    color: primary
                      ? '#FFFFFF'
                      : operator || utility
                      ? c.accent
                      : c.ink,
                  },
                ]}
              >
                {key}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <View style={s.calculator}>
      <View
        style={[s.display, { backgroundColor: c.paper, borderColor: c.line }]}
      >
        <TextInput
          accessibilityLabel={hi ? 'व्यंजक' : 'Expression'}
          value={expression}
          onChangeText={change}
          placeholder="0"
          placeholderTextColor={c.muted}
          showSoftInputOnFocus={false}
          autoCorrect={false}
          autoCapitalize="none"
          maxLength={160}
          style={[s.expression, { color: c.muted }]}
        />
        <Text
          testID="scientific-result"
          accessibilityLiveRegion="polite"
          selectable
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.45}
          style={[s.result, { color: c.ink }]}
        >
          {formatted || (expression ? '—' : '0')}
        </Text>
        {equals && value === undefined && (
          <Text style={[s.error, { color: c.error }]}>
            {hi
              ? 'व्यंजक जांचें। यह गणना मान्य नहीं है।'
              : 'Check the expression. This calculation is not valid.'}
          </Text>
        )}
      </View>
      <View style={s.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hi ? 'कोण इकाई बदलें' : 'Change angle unit'}
          onPress={() => {
            setEquals(false);
            onChange('angle', angle === 'degree' ? 'radian' : 'degree');
          }}
          style={s.toggle}
        >
          <Text style={[s.toggleText, { color: c.accent }]}>
            {angle === 'degree' ? 'DEG' : 'RAD'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={hi ? 'वैज्ञानिक बटन' : 'Scientific functions'}
          onPress={() => setExpanded(!expanded)}
          style={s.toggle}
        >
          <Text style={[s.toggleText, { color: c.accent }]}>
            {hi ? 'वैज्ञानिक' : 'Scientific'}
          </Text>
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={c.accent}
          />
        </Pressable>
      </View>
      {expanded && (
        <View style={s.science}>
          {functions.map(keys => keyRow(keys, true))}
          <Text style={[s.help, { color: c.muted }]}>
            {hi
              ? '% = ÷100 · log = आधार 10 · ln = प्राकृतिक लघुगणक'
              : '% = ÷100 · log = base 10 · ln = natural log'}
          </Text>
        </View>
      )}
      {rows.map(keys => keyRow(keys))}
    </View>
  );
}
const s = StyleSheet.create({
  calculator: { paddingTop: 8, paddingBottom: 16 },
  display: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  expression: { fontSize: 20, height: 42, padding: 0, textAlign: 'right' },
  result: {
    fontSize: 40,
    lineHeight: 50,
    fontWeight: '600',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  error: { fontSize: 12, lineHeight: 17, textAlign: 'right', marginTop: 4 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  toggle: {
    minHeight: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  toggleText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 9, marginBottom: 9 },
  key: {
    flex: 1,
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 24, fontWeight: '500' },
  scienceKey: { minHeight: 44, borderRadius: 12 },
  scienceText: { fontSize: 16 },
  science: { marginBottom: 8 },
  help: { fontSize: 11, lineHeight: 16, marginBottom: 7 },
});
