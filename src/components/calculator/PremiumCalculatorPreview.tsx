import { PremiumLockBadge } from '../premium/PremiumLock';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { calculatorSamples } from '../../domain/premiumCalculators';
import type { DeskCalculatorId } from '../../domain/lekhpalCalculator';
import type { WorkspaceRecord } from '../../types/workspace';
import { requestPremiumAccess } from '../../services/premiumAccess';
import { calculatorTools } from './calculatorContent';
import { CalculatorButton, useCalculatorTheme } from './CalculatorUI';
export default function PremiumCalculatorPreview({
  toolId,
  record,
  onOpenOfficial,
}: {
  toolId: DeskCalculatorId;
  record?: WorkspaceRecord | null;
  onOpenOfficial: () => void;
}) {
  const { language } = useLanguage();
  const c = useCalculatorTheme();
  const hi = language === 'hi';
  const t = (en: string, hindi: string) => (hi ? hindi : en);
  const tool = calculatorTools.find(item => item.id === toolId)!;
  return (
    <ScrollView contentContainerStyle={s.page}>
      <PremiumLockBadge />
      <Text style={[s.title, { color: c.ink }]}>{tool.title[hi ? 1 : 0]}</Text>
      <Text style={[s.body, { color: c.muted }]}>
        {tool.description[hi ? 1 : 0]}
      </Text>
      <Text style={[s.example, { color: c.ink, borderColor: c.line }]}>
        {calculatorSamples[toolId]?.[hi ? 1 : 0]}
      </Text>
      <Text style={[s.body, { color: c.muted }]}>
        {t(
          'Enter your own figures, save the complete worksheet and prepare editable PDF reports with Premium.',
          'प्रीमियम में अपने आंकड़े भरें, पूरी गणना सेव करें और संपादन योग्य PDF रिपोर्ट बनाएं।',
        )}
      </Text>
      <CalculatorButton
        title={t('Unlock with Premium', 'प्रीमियम से अनलॉक करें')}
        icon="crown"
        primary
        onPress={() => {
          requestPremiumAccess('gps_capture');
        }}
      />
      <Text style={[s.body, { color: c.muted }]}>
        {t(
          'Basic fractions, single-share calculations, land-rate checks and measurement tools stay free. Saved results remain readable.',
          'सामान्य भिन्न, एक अंश की गणना, भूमि दर जांच और माप के टूल मुफ्त हैं। सेव परिणाम पढ़ सकते हैं।',
        )}
      </Text>
      {toolId === 'registry-estimate' && (
        <CalculatorButton
          title={t('Open official portal', 'आधिकारिक पोर्टल खोलें')}
          icon="open-in-new"
          onPress={onOpenOfficial}
        />
      )}
      {record && (
        <View style={[s.saved, { borderColor: c.line }]}>
          <Text style={[s.label, { color: c.ink }]}>
            {t('Saved result · read only', 'सेव परिणाम · केवल पढ़ें')}
          </Text>
          <Text style={[s.title, { color: c.ink }]}>{record.title}</Text>
          {record.summaryLines.map((line, i) => (
            <Text key={i} style={[s.body, { color: c.muted }]}>
              {line}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 22, gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  label: { fontSize: 14, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800' },
  body: { fontSize: 15, lineHeight: 24 },
  example: {
    fontSize: 16,
    lineHeight: 26,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 20,
  },
  saved: { borderTopWidth: 1, paddingTop: 22, gap: 12 },
});
