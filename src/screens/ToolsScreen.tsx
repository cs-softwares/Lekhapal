import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {useNavigation} from '@react-navigation/native';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import AppSectionTitle from '../components/AppSectionTitle';
import ServiceListRow from '../components/ServiceListRow';
import {useAppTheme} from '../context/ThemeContext';
import {useLanguage} from '../context/LanguageContext';
import {useResponsiveMetrics} from '../hooks/useResponsiveMetrics';
import {
  UP_SERVICE_DIRECTORY_SECTIONS,
} from '../data/upServiceCatalog';
import {
  UpHomeEntry,
  UpHomeSection,
} from '../data/upHomeCatalog';
import {openDrawerFromNavigation} from '../navigation/drawerHelpers';
import {openUpHomeEntry} from '../navigation/upEntryNavigation';
import {getLocalizedText} from '../types/tool';

const ToolsScreen = () => {
  const navigation = useNavigation<any>();
  const {language, strings} = useLanguage();
  const {colors} = useAppTheme();
  const metrics = useResponsiveMetrics();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {},
        emptyBody: {
          color: colors.textMuted,
        },
        emptyCard: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
        },
        emptyTitle: {
          color: colors.text,
          fontWeight: '800',
        },
        filterContainer: {
          alignItems: 'center',
        },
        filterRail: {
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
        filterTab: {
          alignItems: 'center',
          backgroundColor: 'transparent',
          justifyContent: 'center',
        },
        filterTabContent: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        filterIndicator: {
          backgroundColor: colors.border,
          borderRadius: 999,
          height: 3,
        },
        filterIndicatorActive: {
          backgroundColor: colors.primary,
        },
        filterTabText: {
          color: colors.textMuted,
          fontWeight: '700',
        },
        filterTabTextActive: {
          color: colors.primary,
        },
        groupSection: {},
        screen: {
          backgroundColor: colors.background,
          flex: 1,
        },
        scrollContent: {},
      }),
    [colors],
  );
  const [searchText, setSearchText] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const defaultCategory =
    UP_SERVICE_DIRECTORY_SECTIONS[0]?.id ?? '';
  const [activeCategory, setActiveCategory] = useState<string>(
    defaultCategory,
  );

  const query = searchText.trim().toLowerCase();

  const matchesQuery = useCallback(
    (entry: UpHomeEntry) => {
      if (!query) {
        return true;
      }

      const haystack = [
        entry.title.en,
        entry.title.hi,
        entry.subtitle.en,
        entry.subtitle.hi,
        ...entry.searchTerms,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    },
    [query],
  );

  const filteredSections = useMemo(
    () =>
      UP_SERVICE_DIRECTORY_SECTIONS.map(section => ({
        ...section,
        entries: section.entries.filter(matchesQuery),
      })).filter(section => section.entries.length > 0),
    [matchesQuery],
  );

  const categories = UP_SERVICE_DIRECTORY_SECTIONS.map(section => ({
    key: section.id,
    label: getLocalizedText(section.title, language),
  }));

  const visibleSections = query
    ? filteredSections
    : filteredSections.filter(
        section => section.id === activeCategory,
      );

  const showSectionHeading = Boolean(query);

  const openDrawer = () => {
    openDrawerFromNavigation(navigation);
  };

  const closeHeaderSearch = () => {
    setSearchActive(false);
    setSearchText('');
  };

  return (
    <AppScreen scroll={false}>
      <View style={styles.screen}>
        <AppHeader
          onMenuPress={openDrawer}
          onSearchChangeText={setSearchText}
          onSearchClose={closeHeaderSearch}
          onSearchPress={() => setSearchActive(true)}
          searchActive={searchActive}
          searchPlaceholder={
            language === 'hi'
              ? 'Khatauni, bhukhand, district, pargana search karein'
              : 'Search khatauni, bhukhand, district, pargana'
          }
          searchValue={searchText}
          title={strings.services}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: metrics.verticalScale(28, {
                maxFactor: 1.08,
                minFactor: 0.92,
              }),
            },
          ]}
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.filterRail,
              {
                marginHorizontal: metrics.contentPadding,
                marginTop: metrics.verticalScale(14, {
                  maxFactor: 1.08,
                  minFactor: 0.9,
                }),
                paddingBottom: metrics.verticalScale(6, {
                  maxFactor: 1.08,
                  minFactor: 0.9,
                }),
              },
            ]}>
            <ScrollView
              contentContainerStyle={styles.filterContainer}
              horizontal
              showsHorizontalScrollIndicator={false}>
              {categories.map(category => {
                const selected = activeCategory === category.key;

                return (
                  <AppPressable
                    key={category.key}
                    onPress={() => setActiveCategory(category.key)}

                    pressedOpacity={0.88}
                    style={[
                      styles.filterTab,
                      {
                        marginRight: metrics.scale(10, {
                          maxFactor: 1.08,
                          minFactor: 0.9,
                        }),
                        minHeight: metrics.verticalScale(42, {
                          maxFactor: 1.08,
                          minFactor: 0.9,
                        }),
                        paddingHorizontal: metrics.scale(4, {
                          maxFactor: 1.08,
                          minFactor: 0.9,
                        }),
                        paddingVertical: metrics.verticalScale(6, {
                          maxFactor: 1.08,
                          minFactor: 0.9,
                        }),
                      },
                    ]}>
                    <View style={styles.filterTabContent}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.filterTabText,
                          {
                            fontSize: metrics.responsiveFont(13, {
                              maxFactor: 1.06,
                              minFactor: 0.92,
                            }),
                          },
                          selected && styles.filterTabTextActive,
                        ]}>
                        {category.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.filterIndicator,
                        selected && styles.filterIndicatorActive,
                        {
                          marginTop: metrics.verticalScale(6, {
                            maxFactor: 1.08,
                            minFactor: 0.9,
                          }),
                          width: selected
                            ? metrics.scale(34, {
                                maxFactor: 1.08,
                                minFactor: 0.9,
                              })
                            : metrics.scale(12, {
                                maxFactor: 1.08,
                                minFactor: 0.9,
                              }),
                        },
                      ]}
                    />
                  </AppPressable>
                );
              })}
            </ScrollView>
          </View>

          <View
            style={[
              styles.content,
              {
                paddingHorizontal: metrics.contentPadding,
                paddingTop: metrics.verticalScale(6, {
                  maxFactor: 1.08,
                  minFactor: 0.9,
                }),
              },
            ]}>
            {visibleSections.length ? (
              visibleSections.map((section: UpHomeSection) => (
                <View
                  key={section.id}
                  style={[
                    styles.groupSection,
                    {
                      marginBottom: metrics.verticalScale(18, {
                        maxFactor: 1.08,
                        minFactor: 0.9,
                      }),
                    },
                  ]}>
                  {showSectionHeading ? (
                    <AppSectionTitle
                      subtitle={undefined}
                      title={getLocalizedText(
                        section.title,
                        language,
                      )}
                    />
                  ) : null}

                  {section.entries.map((entry, index) => (
                    <ServiceListRow
                      accentColor={entry.accentColor}
                      iconName={entry.icon}
                      isLast={
                        index === section.entries.length - 1
                      }
                      key={entry.id}
                      onPress={() =>
                        openUpHomeEntry(
                          navigation,
                          entry,
                          language,
                        )
                      }
                      subtitle={getLocalizedText(
                        entry.subtitle,
                        language,
                      )}
                      title={getLocalizedText(
                        entry.title,
                        language,
                      )}
                    />
                  ))}
                </View>
              ))
            ) : (
              <View
                style={[
                  styles.emptyCard,
                  {
                    borderRadius: metrics.scale(22, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                    padding: metrics.scale(20, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                  },
                ]}>
                <Text
                  style={[
                    styles.emptyTitle,
                    {
                      fontSize: metrics.responsiveFont(16, {
                        maxFactor: 1.06,
                        minFactor: 0.92,
                      }),
                    },
                  ]}>
                  {language === 'hi'
                    ? 'Koi service nahi mili'
                    : 'No service found'}
                </Text>
                <Text
                  style={[
                    styles.emptyBody,
                    {
                      fontSize: metrics.responsiveFont(13, {
                        maxFactor: 1.06,
                        minFactor: 0.92,
                      }),
                      lineHeight: metrics.verticalScale(20, {
                        maxFactor: 1.06,
                        minFactor: 0.94,
                      }),
                      marginTop: metrics.verticalScale(8, {
                        maxFactor: 1.06,
                        minFactor: 0.9,
                      }),
                    },
                  ]}>
                  {language === 'hi'
                    ? 'Search ya category change karke dobara dekhein.'
                    : 'Try another search or switch the section.'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </AppScreen>
  );
};

export default ToolsScreen;
