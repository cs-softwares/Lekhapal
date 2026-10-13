import { typography } from '../../theme/typography';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import { RevenueModule } from '../../domain/revenueFeeding';

export const REVENUE_WORK_LINKS = [
  {
    id: 'khasra',
    en: 'Khasra Feeding',
    hi: 'खसरा फीडिंग',
    detailEn: 'Gata queue, crop presets and advanced rules',
    detailHi: 'गाटा सूची, फसल प्रीसेट और उन्नत नियम',
    icon: 'form-select',
  },
  {
    id: 'ansh',
    en: 'Ansh Nirdharan',
    hi: 'अंश निर्धारण',
    detailEn: 'Choose gata and owner; calculate and feed shares',
    detailHi: 'गाटा और खातेदार चुनें; अंश गणना और प्रविष्टि',
    icon: 'chart-pie',
  },
  {
    id: 'ansh-delete',
    en: 'Remove Ansh Entry',
    hi: 'अंश प्रविष्टि हटाएं',
    detailEn: 'Review and remove an incorrect share entry',
    detailHi: 'गलत अंश प्रविष्टि जांचकर हटाएं',
    icon: 'file-remove-outline',
  },
  {
    id: 'prapatra5',
    en: 'Prapatra-5 Feeding',
    hi: 'प्रपत्र-5 फीडिंग',
    detailEn: 'Property, boundaries, owners and final form',
    detailHi: 'भूखण्ड, चौहद्दी, स्वामी और अंतिम प्रपत्र',
    icon: 'file-document-edit-outline',
  },
] as const;
export function matchingRevenueLinks(query = '') {
  const q = query.trim().toLowerCase();
  return REVENUE_WORK_LINKS.filter(link =>
    `${link.en} ${link.hi} ${link.detailEn} ${link.detailHi}`
      .toLowerCase()
      .includes(q),
  );
}
export default function RevenueWorkLinks({
  navigation,
  query = '',
}: {
  navigation: { navigate: (screen: string, params?: any) => void };
  query?: string;
}) {
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const links = matchingRevenueLinks(query);
  if (!links.length) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: colors.text }]}>
        {language === 'hi' ? 'राजस्व फीडिंग' : 'Revenue feeding'}
      </Text>
      {links.map(link => (
        <Pressable
          key={link.id}
          accessibilityRole="button"
          accessibilityLabel={language === 'hi' ? link.hi : link.en}
          onPress={() =>
            link.id === 'khasra'
              ? navigation.navigate('KhasraFeeding')
              : navigation.navigate('RevenueFeeding', {
                  module: link.id as RevenueModule,
                })
          }
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Icon name={link.icon} size={25} color={colors.primary} />
          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.text }]}>
              {language === 'hi' ? link.hi : link.en}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {language === 'hi' ? link.detailHi : link.detailEn}
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { marginVertical: 14, gap: 10 },
  heading: { ...typography.heading, marginBottom: 4 },
  card: {
    minHeight: 80,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
  },
  copy: { flex: 1 },
  title: typography.title,
  subtitle: { ...typography.caption, marginTop: 4 },
});
