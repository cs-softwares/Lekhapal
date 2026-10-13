import CropPlanEditor from './CropPlanEditor';
import SubsectionSettings from './SubsectionSettings';
import { FeedingSnapshot } from '../../domain/khasraFeeding';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdvancedRules } from '../../domain/khasraAdvanced';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';

export default function AdvancedFeedingSettings({
  rules,
  onChange,
  disabled,
  cropOptions = [],
  snapshot,
}: {
  rules: AdvancedRules;
  onChange: (rules: AdvancedRules) => void;
  disabled: boolean;
  cropOptions?: { value: string; label: string }[];
  snapshot?: FeedingSnapshot | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const button = (label: string, onPress: () => void, selected = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        { borderColor: colors.primary },
        disabled && styles.disabled,
      ]}
    >
      <Text style={{ color: colors.primary }}>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
  return (
    <View style={styles.container}>
      {button(t('Advanced feeding rules', 'उन्नत फीडिंग नियम'), () =>
        setExpanded(!expanded),
      )}
      {expanded && (
        <>
          <SubsectionSettings
            rules={rules.sections}
            snapshot={snapshot}
            disabled={disabled}
            onChange={sections => onChange({ ...rules, sections })}
          />
          {button(
            t('Use small-area रिक्त rule', 'छोटे क्षेत्रफल पर रिक्त चुनें'),
            () =>
              onChange({ ...rules, smallAreaEnabled: !rules.smallAreaEnabled }),
            rules.smallAreaEnabled,
          )}
          {rules.smallAreaEnabled && (
            <>
              <Text style={{ color: colors.text }}>
                {t(
                  'At or below this plot area, choose रिक्त and unirrigated. Use the same unit as the official area; enable only for plots you have verified.',
                  'इस क्षेत्रफल या कम पर रिक्त और असिंचित चुनें। आधिकारिक क्षेत्रफल की इकाई ही दें; जांचे हुए गाटों के लिए ही चालू करें।',
                )}
              </Text>
              <TextInput
                accessibilityLabel="Small-area threshold"
                value={rules.smallAreaThreshold}
                editable={!disabled}
                keyboardType="decimal-pad"
                onChangeText={smallAreaThreshold =>
                  onChange({ ...rules, smallAreaThreshold })
                }
                style={[
                  styles.input,
                  { borderColor: colors.border, color: colors.text },
                ]}
              />
            </>
          )}
          <Text style={{ color: colors.text }}>
            {t(
              'Government-land handling (portal option pattern; verify ownership)',
              'सरकारी भूमि नियम (पोर्टल विकल्पों के आधार पर; स्वामित्व जांचें)',
            )}
          </Text>
          {(['review', 'include', 'skip'] as const).map((policy, i) => (
            <React.Fragment key={policy}>
              {button(
                t(
                  [
                    'Pause for review',
                    'Use verified government-land rule',
                    'Skip government-land gata',
                  ][i],
                  [
                    'जांच के लिए रोकें',
                    'जांचा हुआ सरकारी भूमि नियम लगाएं',
                    'सरकारी भूमि का गाटा छोड़ें',
                  ][i],
                ),
                () => onChange({ ...rules, governmentLand: policy }),
                rules.governmentLand === policy,
              )}
            </React.Fragment>
          ))}
          {button(
            t(
              'Automatically continue after confirmed save',
              'सेव की पुष्टि के बाद अपने आप आगे बढ़ें',
            ),
            () => onChange({ ...rules, autoNext: !rules.autoNext }),
            rules.autoNext,
          )}
          {button(
            t(
              'Automatically submit configured entries',
              'चुनी हुई प्रविष्टियां अपने आप सबमिट करें',
            ),
            () => onChange({ ...rules, autoSubmit: !rules.autoSubmit }),
            rules.autoSubmit,
          )}
          {button(
            t(
              'Automatically lock and continue to next gata',
              'अपने आप लॉक करके अगले गाटे पर जाएं',
            ),
            () => onChange({ ...rules, autoLock: !rules.autoLock }),
            rules.autoLock,
          )}
          <CropPlanEditor
            rows={rules.cropPlan}
            options={cropOptions}
            disabled={disabled}
            onChange={cropPlan => onChange({ ...rules, cropPlan })}
          />
          <Text style={{ color: colors.textMuted }}>
            {t(
              'Rules are saved for this village, year and season. Start presets enables them for this session. Automatic locking requires its own enabled option and matching official village/year/season.',
              'नियम इस गांव, वर्ष और सीजन के लिए सेव होंगे। प्रीसेट शुरू करने पर इस सत्र में लागू होंगे। अपने आप लॉक करने के लिए अलग विकल्प और आधिकारिक ग्राम/वर्ष/सीजन का मिलान आवश्यक है।',
            )}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  button: { padding: 12, borderWidth: 1, borderRadius: 8 },
  disabled: { opacity: 0.5 },
  input: { padding: 12, borderWidth: 1 },
});
