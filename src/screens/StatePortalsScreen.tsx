import { typography } from '../theme/typography';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelectedState } from '../context/SelectedStateContext';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { getStatePortals, PortalCategory } from '../data/statePortalCatalog';
import { openStatePortalEntry } from '../navigation/statePortalNavigation';
import { openDrawerFromNavigation } from '../navigation/drawerHelpers';
import AppHeader from '../components/AppHeader';
import AppScreen from '../components/AppScreen';
import PortalCard from '../components/PortalCard';
import OfficialWorkLinks, {
  matchingOfficialWork,
  matchingEroPdf,
  matchingDocumentAutomation,
} from '../components/revenue/OfficialWorkLinks';
import RevenueWorkLinks, {
  matchingRevenueLinks,
} from '../components/revenue/RevenueWorkLinks';
import { useProfileMotion } from '../components/profile/ProfileUI';
const categories: Array<PortalCategory | 'All'> = [
  'All',
  'Land records',
  'Maps & survey',
  'Registration',
  'Certificates',
  'Revenue services',
  'Relief & disaster',
  'Public land',
];
const categoryLabels: Record<
  PortalCategory | 'All',
  { en: string; hi: string }
> = {
  All: { en: 'All', hi: 'सभी' },
  'Land records': { en: 'Land records', hi: 'भू-अभिलेख' },
  'Maps & survey': { en: 'Maps & survey', hi: 'नक्शे और सर्वेक्षण' },
  Registration: { en: 'Registration', hi: 'पंजीकरण' },
  Certificates: { en: 'Certificates', hi: 'प्रमाणपत्र' },
  'Revenue services': { en: 'Revenue services', hi: 'राजस्व सेवाएं' },
  'Relief & disaster': { en: 'Relief & disaster', hi: 'राहत और आपदा' },
  'Public land': { en: 'Public land', hi: 'सार्वजनिक भूमि' },
};
export default function StatePortalsScreen() {
  const navigation = useNavigation<any>();
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      return () => StatusBar.setBarStyle('dark-content');
    }, []),
  );
  const { stateCode } = useSelectedState();
  const { language, strings } = useLanguage();
  const { colors } = useAppTheme();
  const motion = useProfileMotion();
  const insets = useSafeAreaInsets();
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [category, setCategory] = useState<PortalCategory | 'All'>('All');
  const listRef = useRef<ScrollView>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ y: 0, animated: false });
  }, [query, category]);
  const portals = getStatePortals(stateCode || '');
  const visible = portals.filter(
    p =>
      (category === 'All' || p.category === category) &&
      `${p.title.en} ${p.title.hi} ${p.subtitle.en} ${
        p.subtitle.hi
      } ${p.searchTerms.join(' ')}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const showRevenue =
    stateCode === 'UP' &&
    ['All', 'Land records', 'Revenue services'].includes(category);
  return (
    <AppScreen scroll={false}>
      <AppHeader
        title={strings.services}
        onMenuPress={() => openDrawerFromNavigation(navigation)}
        onSearchPress={() => setSearchActive(true)}
        searchActive={searchActive}
        searchValue={query}
        onSearchChangeText={setQuery}
        onSearchClose={() => {
          setQuery('');
          setSearchActive(false);
        }}
        searchPlaceholder={
          language === 'hi'
            ? 'पोर्टल और सेवाएं खोजें'
            : 'Search portals and services'
        }
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          language === 'hi' ? 'सेवाएं फ़िल्टर करें' : 'Filter services'
        }
        accessibilityValue={{ text: categoryLabels[category][language] }}
        accessibilityState={{ expanded: filterOpen }}
        activeOpacity={0.8}
        onPress={() => {
          Keyboard.dismiss();
          setFilterOpen(true);
        }}
        style={[
          styles.filterButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Icon name="filter-variant" size={23} color={colors.primary} />
        <View style={styles.filterCopy}>
          <Text style={[styles.filterCaption, { color: colors.textMuted }]}>
            {language === 'hi' ? 'सेवाएं फ़िल्टर करें' : 'Filter services'}
          </Text>
          <Text style={[styles.filterValue, { color: colors.text }]}>
            {category === 'All'
              ? language === 'hi'
                ? 'सभी श्रेणियां'
                : 'All categories'
              : categoryLabels[category][language]}
          </Text>
        </View>
        <Icon name="chevron-down" size={22} color={colors.primary} />
      </TouchableOpacity>
      <Modal
        transparent
        visible={filterOpen}
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setFilterOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            accessibilityRole="button"
            accessibilityLabel={
              language === 'hi' ? 'फ़िल्टर बंद करें' : 'Close filters'
            }
            onPress={() => setFilterOpen(false)}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text
                accessibilityRole="header"
                style={[styles.sheetTitle, { color: colors.text }]}
              >
                {language === 'hi' ? 'श्रेणी चुनें' : 'Choose a category'}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={language === 'hi' ? 'हो गया' : 'Done'}
                onPress={() => setFilterOpen(false)}
                style={styles.doneButton}
              >
                <Text style={[styles.doneText, { color: colors.primary }]}>
                  {language === 'hi' ? 'हो गया' : 'Done'}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {categories
                .filter(c => c === 'All' || portals.some(p => p.category === c))
                .map(c => (
                  <TouchableOpacity
                    key={c}
                    accessibilityRole="radio"
                    accessibilityLabel={categoryLabels[c][language]}
                    accessibilityState={{ checked: category === c }}
                    activeOpacity={0.75}
                    onPress={() => {
                      setCategory(c);
                      setFilterOpen(false);
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor:
                          category === c ? colors.surfaceAlt : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: category === c ? colors.primary : colors.text,
                        },
                      ]}
                    >
                      {categoryLabels[c][language]}
                    </Text>
                    <Icon
                      name={
                        category === c ? 'radiobox-marked' : 'radiobox-blank'
                      }
                      size={23}
                      color={category === c ? colors.primary : colors.textSoft}
                    />
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ScrollView
        ref={listRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {['All', 'Revenue services'].includes(category) && (
          <OfficialWorkLinks
            navigation={navigation}
            stateCode={stateCode || ''}
            query={query}
          />
        )}
        {showRevenue && (
          <RevenueWorkLinks navigation={navigation} query={query} />
        )}
        {visible.map(p => (
          <PortalCard
            key={p.id}
            portal={p}
            motion={motion}
            onPress={() => openStatePortalEntry(navigation, p, language)}
          />
        ))}
        {!visible.length &&
          !(showRevenue && matchingRevenueLinks(query).length) &&
          !(
            ['All', 'Revenue services'].includes(category) &&
            (matchingOfficialWork(stateCode || '', query).length ||
              matchingEroPdf(stateCode || '', query) ||
              matchingDocumentAutomation(stateCode || '', query) ||
              (stateCode === 'UP' && /map|kml|kmz|नक्शा/i.test(query)))
          ) && (
            <View style={styles.empty}>
              <Text style={[styles.title, { color: colors.text }]}>
                {language === 'hi'
                  ? 'कोई सेवा नहीं मिली'
                  : 'No matching services'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {language === 'hi'
                  ? 'दूसरा शब्द खोजें या सभी चुनें।'
                  : 'Try another search or choose All.'}
              </Text>
            </View>
          )}
        <Text style={[styles.note, { color: colors.textMuted }]}>
          {language === 'hi'
            ? 'आधिकारिक वेबसाइट पर अपने विभागीय लॉगिन का उपयोग करें। उपलब्ध सेवाएं राज्य और विभागीय अधिकारों पर निर्भर हैं। मौके का निरीक्षण और अलग सरकारी ऐप की जरूरत बनी रह सकती है।'
            : 'Use your department login on the official website. Services depend on your state and assigned role. Field visits and separate government apps may still be needed.'}
        </Text>
      </ScrollView>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  title: typography.heading,
  subtitle: { ...typography.body, marginTop: 6 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 14,
  },
  filterCopy: { flex: 1, minWidth: 0 },
  filterCaption: { fontSize: 11, lineHeight: 16 },
  filterValue: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginTop: 2,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sheetTitle: { ...typography.heading, flex: 1 },
  doneButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  doneText: { fontSize: 14, fontWeight: '600' },
  option: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: { ...typography.title, flex: 1 },
  empty: { paddingVertical: 24 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 24 },
});
