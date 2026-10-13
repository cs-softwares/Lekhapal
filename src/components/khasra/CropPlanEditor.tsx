import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CropPlanRow } from '../../domain/cropPlan';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
export default function CropPlanEditor({
  rows,
  options,
  onChange,
  disabled,
}: {
  rows: CropPlanRow[];
  options: { value: string; label: string }[];
  onChange: (rows: CropPlanRow[]) => void;
  disabled: boolean;
}) {
  options = options.filter(
    o =>
      !['', '0', '-1'].includes(o.value) &&
      !/^(select|choose|चुनें)/i.test(o.label.trim()),
  );
  const { language } = useLanguage(),
    { colors } = useAppTheme(),
    [pick, setPick] = useState<number | null>(null);
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const button = (label: string, press: () => void, off = disabled) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={press}
      disabled={off}
      style={[styles.button, { borderColor: colors.primary }]}
    >
      <Text style={{ color: colors.primary }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.box}>
      <Text style={{ color: colors.text }}>
        {t(
          'Multi-crop plan · percentages must total 100. Use subsection automation or save a crop form preset.',
          'एक से अधिक फसल · प्रतिशत का योग 100 रखें। उपखंड ऑटो फीडिंग चालू करें या फसल फॉर्म का प्रीसेट सेव करें।',
        )}
      </Text>
      {rows.map((r, i) => (
        <View key={i} style={styles.box}>
          {button(options.find(o => o.value === r.crop)?.label || r.crop, () =>
            setPick(i),
          )}
          <TextInput
            accessibilityLabel={`Crop ${i + 1} percent`}
            value={r.percent}
            keyboardType="decimal-pad"
            editable={!disabled}
            onChangeText={percent =>
              onChange(rows.map((v, n) => (n === i ? { ...v, percent } : v)))
            }
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
          />
          {button(
            r.irrigated
              ? t('Irrigated', 'सिंचित')
              : t('Unirrigated', 'असिंचित'),
            () =>
              onChange(
                rows.map((v, n) =>
                  n === i ? { ...v, irrigated: !v.irrigated } : v,
                ),
              ),
          )}
          {button(t('Remove crop', 'फसल हटाएं'), () =>
            onChange(rows.filter((_, n) => n !== i)),
          )}
        </View>
      ))}
      {button(
        t('Add crop to plan', 'फसल योजना में जोड़ें'),
        () => {
          onChange([
            ...rows,
            {
              crop: options[0].value,
              percent: rows.length ? '' : '100',
              irrigated: false,
            },
          ]);
        },
        disabled || !options.length || rows.length >= 10,
      )}
      <Modal visible={pick !== null} onRequestClose={() => setPick(null)}>
        <ScrollView contentContainerStyle={styles.box}>
          {options.map(o => (
            <React.Fragment key={o.value}>
              {button(o.label, () => {
                onChange(
                  rows.map((r, i) =>
                    i === pick ? { ...r, crop: o.value } : r,
                  ),
                );
                setPick(null);
              })}
            </React.Fragment>
          ))}
          {button(t('Close', 'बंद करें'), () => setPick(null), false)}
        </ScrollView>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  box: { gap: 10, padding: 10 },
  button: { borderWidth: 1, padding: 10, borderRadius: 8 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8 },
});
