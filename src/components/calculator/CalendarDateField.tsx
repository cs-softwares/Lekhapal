import React, { useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../context/LanguageContext';
import { calendarDay } from '../../domain/quickCalculators';
import { CalculatorField, useCalculatorTheme } from './CalculatorUI';

const stamp = (year: number, month: number, day: number) =>
  `${String(day).padStart(2, '0')}/${String(month + 1).padStart(
    2,
    '0',
  )}/${year}`;
export default function CalendarDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const c = useCalculatorTheme();
  const { language } = useLanguage();
  const hi = language === 'hi';
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(0);
  const [yearInput, setYearInput] = useState('2026');
  const [editYear, setEditYear] = useState(false);
  const [yearError, setYearError] = useState(false);
  const show = () => {
    const today = new Date();
    let selectedYear = Math.min(2199, Math.max(1900, today.getFullYear()));
    let m = today.getMonth();
    try {
      const selected = new Date(calendarDay(value) * 86400000);
      selectedYear = selected.getUTCFullYear();
      m = selected.getUTCMonth();
    } catch {
      // Empty or invalid input opens the current month without changing the field.
    }
    setYear(selectedYear);
    setMonth(m);
    setYearInput(String(selectedYear));
    setEditYear(false);
    setYearError(false);
    Keyboard.dismiss();
    setOpen(true);
  };
  const move = (delta: number) => {
    const date = new Date(Date.UTC(year, month + delta, 1));
    const y = date.getUTCFullYear();
    if (y < 1900 || y > 2199) return;
    setYear(y);
    setYearInput(String(y));
    setMonth(date.getUTCMonth());
  };
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const cells = Array.from(
    { length: Math.ceil((offset + count) / 7) * 7 },
    (_, i) => i - offset + 1,
  );
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString(
    hi ? 'hi-IN' : 'en-IN',
    { month: 'long', year: 'numeric', timeZone: 'UTC' },
  );
  return (
    <>
      <View style={s.fieldRow}>
        <View style={s.field}>
          <CalculatorField
            label={label}
            value={value}
            onChange={onChange}
            text
            placeholder="DD/MM/YYYY"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${
            hi ? 'कैलेंडर खोलें' : 'Open calendar'
          }: ${label}`}
          onPress={show}
          style={[s.calendarButton, { backgroundColor: c.tint }]}
        >
          <Icon name="calendar-month-outline" color={c.accent} size={24} />
        </Pressable>
      </View>
      {open && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <View style={s.modal}>
            <Pressable
              accessibilityLabel={hi ? 'कैलेंडर बंद करें' : 'Close calendar'}
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={s.backdrop}
            />
            <View
              accessibilityViewIsModal
              style={[s.sheet, { backgroundColor: c.paper }]}
            >
              <View style={s.header}>
                <Text style={[s.title, { color: c.ink }]}>{label}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={hi ? 'बंद करें' : 'Close'}
                  onPress={() => setOpen(false)}
                  style={s.icon}
                >
                  <Icon name="close" color={c.accent} size={23} />
                </Pressable>
              </View>
              <View style={s.header}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={hi ? 'पिछला महीना' : 'Previous month'}
                  disabled={year === 1900 && month === 0}
                  onPress={() => move(-1)}
                  style={s.icon}
                >
                  <Icon name="chevron-left" color={c.accent} size={25} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={hi ? 'वर्ष बदलें' : 'Change year'}
                  onPress={() => setEditYear(!editYear)}
                  style={s.month}
                >
                  <Text style={[s.monthText, { color: c.accent }]}>
                    {monthLabel} ▾
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={hi ? 'अगला महीना' : 'Next month'}
                  disabled={year === 2199 && month === 11}
                  onPress={() => move(1)}
                  style={s.icon}
                >
                  <Icon name="chevron-right" color={c.accent} size={25} />
                </Pressable>
              </View>
              {editYear && (
                <View style={s.yearRow}>
                  <TextInput
                    accessibilityLabel={hi ? 'वर्ष' : 'Year'}
                    value={yearInput}
                    onChangeText={setYearInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={[s.yearInput, { color: c.ink, borderColor: c.line }]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={hi ? 'वर्ष लागू करें' : 'Apply year'}
                    onPress={() => {
                      const y = Number(
                        yearInput.replace(/[०-९]/g, d =>
                          String(d.charCodeAt(0) - 0x0966),
                        ),
                      );
                      if (!Number.isInteger(y) || y < 1900 || y > 2199) {
                        setYearError(true);
                        return;
                      }
                      setYear(y);
                      setEditYear(false);
                      setYearError(false);
                      Keyboard.dismiss();
                    }}
                    style={s.icon}
                  >
                    <Text style={{ color: c.accent }}>
                      {hi ? 'लागू' : 'Go'}
                    </Text>
                  </Pressable>
                </View>
              )}
              {yearError && (
                <Text style={{ color: c.error }}>
                  {hi
                    ? '1900–2199 में वर्ष भरें।'
                    : 'Enter a year from 1900 to 2199.'}
                </Text>
              )}
              <View style={s.grid}>
                {(hi
                  ? ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि']
                  : ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                ).map((d, i) => (
                  <Text key={i} style={[s.weekday, { color: c.muted }]}>
                    {d}
                  </Text>
                ))}
                {cells.map((day, i) =>
                  day < 1 || day > count ? (
                    <View key={i} style={s.day} />
                  ) : (
                    <Pressable
                      key={i}
                      accessibilityRole="button"
                      accessibilityLabel={stamp(year, month, day)}
                      accessibilityState={{
                        selected: value === stamp(year, month, day),
                      }}
                      onPress={() => {
                        onChange(stamp(year, month, day));
                        setOpen(false);
                      }}
                      style={[
                        s.day,
                        {
                          backgroundColor:
                            value === stamp(year, month, day)
                              ? c.tint
                              : c.paper,
                        },
                      ]}
                    >
                      <Text style={[s.dayText, { color: c.ink }]}>{day}</Text>
                    </Pressable>
                  ),
                )}
              </View>
              <Text style={[s.hint, { color: c.muted }]}>
                {hi
                  ? 'महीना बदलने के लिए तीर, वर्ष के लिए ऊपर तारीख दबाएं।'
                  : 'Use arrows for months; tap the heading to change the year.'}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
const s = StyleSheet.create({
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  field: { flex: 1 },
  calendarButton: {
    width: 48,
    height: 48,
    marginTop: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: 16,
    borderRadius: 20,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  icon: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  month: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: { fontSize: 16, fontWeight: '600' },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  yearInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: '14.285714%',
    textAlign: 'center',
    fontSize: 12,
    paddingVertical: 12,
  },
  day: {
    width: '14.285714%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  dayText: { fontSize: 16 },
  hint: { fontSize: 11, lineHeight: 17, marginTop: 10 },
});
