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
import { FeedingSnapshot } from '../../domain/khasraFeeding';
import { sectionField, SubsectionRules } from '../../domain/khasraSections';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type Option = { value: string; label: string };
export default function SubsectionSettings({
  rules,
  snapshot,
  disabled,
  onChange,
}: {
  rules: SubsectionRules;
  snapshot?: FeedingSnapshot | null;
  disabled: boolean;
  onChange: (rules: SubsectionRules) => void;
}) {
  const { colors } = useAppTheme();
  const { language } = useLanguage();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const [picker, setPicker] = useState<{
    title: string;
    options: Option[];
    select: (value: string) => void;
  } | null>(null);
  const options = (name: string) =>
    snapshot ? sectionField(snapshot, name)?.options || [] : [];
  const button = (
    title: string,
    press: () => void,
    selected = false,
    off = disabled,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected, disabled: off }}
      disabled={off}
      onPress={press}
      style={[
        styles.control,
        {
          borderColor: colors.primary,
          backgroundColor: selected ? colors.primary : colors.surface,
        },
      ]}
    >
      <Text
        style={[{ color: colors.primary }, selected && styles.selectedText]}
      >
        {title}
      </Text>
    </Pressable>
  );
  const choose = (
    title: string,
    value: string,
    choices: Option[],
    select: (v: string) => void,
  ) => (
    <View style={styles.box}>
      <Text style={{ color: colors.text }}>{title}</Text>
      {button(
        `${title}: ${
          choices.find(o => o.value === value)?.label ||
          value ||
          t('Choose', 'चुनें')
        }`,
        () =>
          setPicker({
            title,
            options: choices.filter(
              o => o.value && !/^(?:select|choose|चुनें)/i.test(o.label.trim()),
            ),
            select,
          }),
        false,
        disabled || !choices.length,
      )}
    </View>
  );
  const input = (
    title: string,
    value: string,
    change: (v: string) => void,
    number = false,
  ) => (
    <View style={styles.box}>
      <Text style={{ color: colors.text }}>{title}</Text>
      <TextInput
        accessibilityLabel={title}
        value={value}
        editable={!disabled}
        onChangeText={change}
        keyboardType={number ? 'number-pad' : 'default'}
        multiline={!number}
        style={[
          styles.control,
          { color: colors.text, borderColor: colors.border },
        ]}
      />
    </View>
  );
  return (
    <View style={styles.box}>
      {button(
        t('Use subsection automation', 'उपखंडों की ऑटो फीडिंग'),
        () => onChange({ ...rules, enabled: !rules.enabled }),
        rules.enabled,
      )}
      {rules.enabled && (
        <>
          <Text style={{ color: colors.textMuted }}>
            {t(
              'Choose the rules for the verified plots in this batch. Open each official section to load its current choices. Rules are separate for each village, year and season.',
              'इस बैच के जांचे हुए गाटों के नियम चुनें। मौजूदा विकल्प लेने के लिए संबंधित आधिकारिक खंड खोलें। नियम गांव, वर्ष और सीजन के अनुसार अलग सेव होते हैं।',
            )}
          </Text>
          {(['cultivated', 'fallow', 'nonAgricultural'] as const).map(
            (land, i) => (
              <React.Fragment key={land}>
                {button(
                  t(
                    [
                      'Cultivated land',
                      'Fully fallow land',
                      'Non-agricultural land',
                    ][i],
                    ['कृषित भूमि', 'पूरी परती भूमि', 'अकृषक भूमि'][i],
                  ),
                  () => onChange({ ...rules, land }),
                  rules.land === land,
                )}
              </React.Fragment>
            ),
          )}
          {rules.land === 'nonAgricultural' &&
            choose(
              t('Land type', 'भूमि का प्रकार'),
              rules.landType,
              options('agriculturalType'),
              landType => onChange({ ...rules, landType }),
            )}
          {rules.land === 'cultivated' && (
            <>
              <Text style={{ color: colors.text }}>
                {t(
                  'Tree entries · use 0 only for verified absence',
                  'वृक्ष प्रविष्टियां · वृक्ष न होने की पुष्टि पर ही 0 दें',
                )}
              </Text>
              {rules.trees.map((row, i) => (
                <View key={i} style={styles.box}>
                  {choose(
                    t(`Tree category ${i + 1}`, `वृक्ष श्रेणी ${i + 1}`),
                    row.type,
                    options('vrikshType1'),
                    type =>
                      onChange({
                        ...rules,
                        trees: rules.trees.map((r, n) =>
                          n === i ? { ...r, type } : r,
                        ),
                      }),
                  )}
                  {input(
                    t(`Tree count ${i + 1}`, `वृक्ष संख्या ${i + 1}`),
                    row.count,
                    count =>
                      onChange({
                        ...rules,
                        trees: rules.trees.map((r, n) =>
                          n === i
                            ? { ...r, count: count.replace(/\D/g, '') }
                            : r,
                        ),
                      }),
                    true,
                  )}
                </View>
              ))}
              {choose(
                t('Season crop', 'सीजन की फसल'),
                rules.crop,
                snapshot?.stage === 'crop'
                  ? snapshot.fields.find(
                      f =>
                        f.kind === 'select' &&
                        /crop|fasal|फसल/i.test(f.key + ' ' + f.label),
                    )?.options || []
                  : [],
                crop => onChange({ ...rules, crop }),
              )}
              {button(
                t(
                  rules.irrigated ? 'Crop: irrigated' : 'Crop: unirrigated',
                  rules.irrigated ? 'फसल: सिंचित' : 'फसल: असिंचित',
                ),
                () => onChange({ ...rules, irrigated: !rules.irrigated }),
                rules.irrigated,
              )}
              {choose(
                t('Irrigation method', 'सिंचाई विधि'),
                rules.irrigationMethod,
                options('agriTech'),
                irrigationMethod => onChange({ ...rules, irrigationMethod }),
              )}
              {input(
                t('Automatic remarks', 'स्वतः भरने की टिप्पणी'),
                rules.remarks,
                remarks => onChange({ ...rules, remarks }),
              )}
            </>
          )}
        </>
      )}
      <Modal visible={!!picker} onRequestClose={() => setPicker(null)}>
        <ScrollView
          contentContainerStyle={styles.modal}
          style={{ backgroundColor: colors.surface }}
        >
          <Text style={{ color: colors.text }}>{picker?.title}</Text>
          {picker?.options.map(option => (
            <React.Fragment key={option.value}>
              {button(option.label, () => {
                picker.select(option.value);
                setPicker(null);
              })}
            </React.Fragment>
          ))}
          {button(
            t('Close choices', 'विकल्प बंद करें'),
            () => setPicker(null),
            false,
            false,
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  selectedText: { color: '#FFFFFF' },
  box: { gap: 10 },
  control: { padding: 12, borderWidth: 1, borderRadius: 8, minHeight: 48 },
  modal: { padding: 20, gap: 12 },
});
