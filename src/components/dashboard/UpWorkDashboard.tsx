import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import { UP_WORK_TABS, UpWorkTab, upWorkPortals } from '../../data/upWorkTabs';
import { openStatePortalEntry } from '../../navigation/statePortalNavigation';
import { openUpHomeEntry } from '../../navigation/upEntryNavigation';
import { typography } from '../../theme/typography';
import PortalCard from '../PortalCard';
import BhulekhRelatedLinks from '../BhulekhRelatedLinks';
import FreeAccountAd from '../ads/FreeAccountAd';
import OfficialWorkLinks from '../revenue/OfficialWorkLinks';
import RevenueWorkLinks from '../revenue/RevenueWorkLinks';

export default function UpWorkDashboard({
  navigation,
  motion,
}: {
  navigation: { navigate: (screen: string, params?: any) => void };
  motion: boolean;
}) {
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const [selected, setSelected] = useState<UpWorkTab>('records');
  const list = useRef<ScrollView>(null);
  const tab = UP_WORK_TABS.find(item => item.id === selected)!;
  return (
    <View style={styles.fill}>
      <View
        style={[styles.tabs, { backgroundColor: colors.background }]}
        accessibilityRole="tablist"
      >
        {UP_WORK_TABS.map(item => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item[language]}
            accessibilityState={{ selected: selected === item.id }}
            onPress={() => {
              setSelected(item.id);
              list.current?.scrollTo({ y: 0, animated: false });
            }}
            style={[
              styles.tab,
              {
                backgroundColor:
                  selected === item.id ? colors.primary : colors.surface,
                borderColor:
                  selected === item.id ? colors.primary : colors.border,
              },
            ]}
          >
            <Icon
              name={item.icon}
              size={20}
              color={selected === item.id ? '#FFFFFF' : colors.primary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: selected === item.id ? '#FFFFFF' : colors.text },
              ]}
            >
              {item[language]}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        ref={list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.sectionRow}>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: colors.text }]}
          >
            {tab[language]}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              language === 'hi' ? 'सभी सेवाएं देखें' : 'View all services'
            }
            onPress={() => navigation.navigate('Services')}
            style={styles.allServices}
          >
            <Text style={[typography.label, { color: colors.primary }]}>
              {language === 'hi' ? 'सभी सेवाएं' : 'All services'}
            </Text>
            <Icon name="arrow-right" size={17} color={colors.primary} />
          </Pressable>
        </View>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {language === 'hi' ? tab.detailHi : tab.detailEn}
        </Text>
        {selected === 'feeding' && <RevenueWorkLinks navigation={navigation} />}
        {selected === 'fieldwork' && (
          <View style={styles.tools}>
            {(
              [
                {
                  screen: 'Measurement',
                  en: 'Measurement tools',
                  hi: 'पैमाइश उपकरण',
                  icon: 'ruler-square',
                },
                {
                  screen: 'Calculator',
                  en: 'Calculators',
                  hi: 'कैलकुलेटर',
                  icon: 'calculator-variant-outline',
                },
              ] as const
            ).map(tool => (
              <Pressable
                key={tool.screen}
                accessibilityRole="button"
                accessibilityLabel={tool[language]}
                onPress={() => navigation.navigate(tool.screen)}
                style={[
                  styles.tool,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Icon name={tool.icon} size={25} color={colors.primary} />
                <Text style={[styles.toolTitle, { color: colors.text }]}>
                  {tool[language]}
                </Text>
                <Icon name="chevron-right" size={22} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
        {upWorkPortals(selected).map(portal => (
          <PortalCard
            key={portal.id}
            portal={portal}
            motion={motion}
            onPress={() => openStatePortalEntry(navigation, portal, language)}
          />
        ))}
        <OfficialWorkLinks
          stateCode="UP"
          navigation={navigation}
          workTab={selected}
        />
        {selected === 'records' && (
          <BhulekhRelatedLinks
            visible
            onOpen={entry => openUpHomeEntry(navigation, entry, language)}
          />
        )}
        <FreeAccountAd />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  tabs: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tab: {
    width: '48%',
    flexGrow: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabLabel: { ...typography.label, flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { ...typography.heading, flex: 1 },
  allServices: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  description: { ...typography.caption, marginBottom: 16 },
  tools: { gap: 12, marginBottom: 12 },
  tool: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolTitle: { ...typography.title, flex: 1 },
});
