import React, { useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';

type Props = {
  from: string;
  to: string;
  options: { value: string; label: string }[];
  onChange: (side: 'from' | 'to', value: string) => void;
  onSwap: () => void;
  singleLabel?: string;
};
export default function ConversionUnitPicker({
  from,
  to,
  options,
  onChange,
  onSwap,
  singleLabel,
}: Props) {
  const { colors } = useAppTheme();
  const { language } = useLanguage();
  const hi = language === 'hi';
  const [open, setOpen] = useState<'from' | 'to' | null>(null);
  const title = (side: 'from' | 'to') =>
    singleLabel ||
    (side === 'from'
      ? hi
        ? 'इस इकाई से'
        : 'From'
      : hi
      ? 'इस इकाई में'
      : 'To');
  const box = (side: 'from' | 'to', value: string) => (
    <View style={s.field}>
      <Text style={[s.label, { color: colors.textMuted }]}>{title(side)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title(side)}
        accessibilityState={{ expanded: open === side }}
        accessibilityValue={{
          text: options.find(o => o.value === value)?.label || '',
        }}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(side);
        }}
        style={[
          s.box,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[s.value, { color: colors.text }]}>
          {options.find(o => o.value === value)?.label || '—'}
        </Text>
        <Icon name="chevron-down" size={21} color={colors.primary} />
      </Pressable>
    </View>
  );
  return (
    <>
      <View style={s.row}>
        {box('from', from)}
        {!singleLabel && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={hi ? 'इकाइयां आपस में बदलें' : 'Swap units'}
              onPress={onSwap}
              style={s.swap}
            >
              <Icon name="swap-horizontal" size={23} color={colors.primary} />
            </Pressable>
            {box('to', to)}
          </>
        )}
      </View>
      {open && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(null)}
        >
          <View style={s.modal}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={hi ? 'इकाई सूची बंद करें' : 'Close unit list'}
              onPress={() => setOpen(null)}
              style={s.backdrop}
            />
            <View
              accessibilityViewIsModal
              style={[s.sheet, { backgroundColor: colors.surface }]}
            >
              <View style={[s.heading, { borderColor: colors.border }]}>
                <Text style={[s.title, { color: colors.text }]}>
                  {title(open)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={hi ? 'बंद करें' : 'Close'}
                  onPress={() => setOpen(null)}
                  style={s.close}
                >
                  <Icon name="close" size={23} color={colors.primary} />
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.list}
              >
                {options.map(option => {
                  const selected =
                    option.value === (open === 'from' ? from : to);
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityLabel={option.label}
                      accessibilityState={{ selected }}
                      onPress={() => {
                        onChange(open, option.value);
                        setOpen(null);
                      }}
                      style={[
                        s.option,
                        {
                          backgroundColor: selected
                            ? colors.primarySoft
                            : colors.surface,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.optionText,
                          { color: selected ? colors.primary : colors.text },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {selected && (
                        <Icon name="check" size={21} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 6,
    marginBottom: 14,
  },
  field: { flex: 1, minWidth: 0 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  box: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  value: { flex: 1, fontSize: 15, fontWeight: '600' },
  swap: {
    width: 44,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    maxHeight: '75%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  title: { flex: 1, fontSize: 19, fontWeight: '700' },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: 8 },
  option: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: { flex: 1, fontSize: 15 },
});
