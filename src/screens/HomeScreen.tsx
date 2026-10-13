import React, {
  useMemo,
  useState,
} from 'react';
import {useNavigation} from '@react-navigation/native';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import AppSectionTitle from '../components/AppSectionTitle';
import {useAppTheme} from '../context/ThemeContext';
import UpPortalListItem from '../components/UpPortalListItem';
import {useLanguage} from '../context/LanguageContext';
import {UP_HOME_SECTIONS} from '../data/upHomeCatalog';
import {useResponsiveMetrics} from '../hooks/useResponsiveMetrics';
import {openDrawerFromNavigation} from '../navigation/drawerHelpers';
import {openUpHomeEntry} from '../navigation/upEntryNavigation';
import {getLocalizedText} from '../types/tool';

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const {language, strings} = useLanguage();
  const {colors} = useAppTheme();
  const metrics = useResponsiveMetrics();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {},
        dailyWorkIconWrap: {
          alignItems: 'center',
          borderWidth: 1,
          justifyContent: 'center',
        },
        dailyWorkInlineContent: {
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
        },
        dailyWorkInlineItem: {
          borderWidth: 1.15,
          width: '100%',
        },
        dailyWorkInlineRow: {
          flexDirection: 'row',
        },
        dailyWorkInlineSlot: {
          alignSelf: 'stretch',
          flex: 1,
        },
        dailyWorkInlineTitle: {
          color: colors.text,
          fontWeight: '800',
        },
        dailyWorkTitle: {
          color: colors.text,
          fontWeight: '800',
        },
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
        sectionWrap: {},
      }),
    [colors],
  );
  const [searchText, setSearchText] = useState('');
  const [searchActive, setSearchActive] = useState(false);

  const query = searchText.trim().toLowerCase();

  const filteredSections = useMemo(
    () =>
      UP_HOME_SECTIONS.map(section => ({
        ...section,
        entries: section.entries.filter(entry => {
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
        }),
      })).filter(section => section.entries.length > 0),
    [query],
  );

  const visibleSections = query
    ? filteredSections
    : filteredSections.filter(
        section =>
          section.id === 'top-access' ||
          section.id === 'daily-work' ||
          section.id === 'lekhpal-work',
      );

  const visibleItemCount = useMemo(
    () =>
      filteredSections.reduce(
        (count, section) => count + section.entries.length,
        0,
      ),
    [filteredSections],
  );

  const openDrawer = () => {
    openDrawerFromNavigation(navigation);
  };

  const closeSearch = () => {
    setSearchActive(false);
    setSearchText('');
  };

  const searchResultsTitle =
    language === 'hi' ? 'Search Results' : 'Search Results';
  const searchPlaceholder =
    language === 'hi'
      ? 'UP portal, login, khasra, khatauni search karein'
      : 'Search UP portal, login, khasra, khatauni';
  const noSearchResultTitle =
    language === 'hi'
      ? 'Koi service nahi mili'
      : 'No service found';
  const noSearchResultBody =
    language === 'hi'
      ? 'Dusra naam ya keyword search karke dekhein.'
      : 'Try a different name or keyword.';

  return (
    <AppScreen>
      <AppHeader
        onMenuPress={openDrawer}
        onSearchChangeText={setSearchText}
        onSearchClose={closeSearch}
        onSearchPress={() => setSearchActive(true)}
        searchActive={searchActive}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchText}
        title={strings.appName}
      />

      <View
        style={[
          styles.content,
          {
            paddingHorizontal: metrics.contentPadding,
            paddingTop: metrics.verticalScale(18, {
              maxFactor: 1.08,
              minFactor: 0.9,
            }),
          },
        ]}>
        {query ? (
          <AppSectionTitle
            subtitle={`${visibleItemCount} ${strings.itemsLabel}`}
            title={searchResultsTitle}
          />
        ) : null}

        {visibleSections.length ? (
          visibleSections.map(section => (
            <View
              key={section.id}
              style={[
                styles.sectionWrap,
                {
                  marginBottom: metrics.verticalScale(18, {
                    maxFactor: 1.08,
                    minFactor: 0.9,
                  }),
                },
              ]}>
              {section.id === 'daily-work' ? (
                <>
                  <AppSectionTitle
                    title={getLocalizedText(
                      section.title,
                      language,
                    )}
                  />

                  <View style={styles.dailyWorkInlineRow}>
                    {section.entries.map((entry, index) => {
                      const localizedTitle = getLocalizedText(
                        entry.title,
                        language,
                      );
                      const tone =
                        entry.id === 'up-home-village-diary'
                          ? {
                              cardBackground: '#FFFFFF',
                              cardBorder: '#0EA5E955',
                              iconBackground: 'transparent',
                              iconBorder: 'transparent',
                              titleColor: colors.text,
                              toneColor: '#0EA5E9',
                            }
                          : {
                              cardBackground: '#FFFFFF',
                              cardBorder: '#F9731655',
                              iconBackground: 'transparent',
                              iconBorder: 'transparent',
                              titleColor: colors.text,
                              toneColor: '#F97316',
                            };

                      return (
                        <AppPressable
                          containerStyle={[
                            styles.dailyWorkInlineSlot,
                            {
                              marginRight:
                                index ===
                                section.entries.length - 1
                                  ? 0
                                  : metrics.scale(10, {
                                      maxFactor: 1.08,
                                      minFactor: 0.9,
                                    }),
                            },
                          ]}
                          key={entry.id}
                          onPress={() =>
                            openUpHomeEntry(
                              navigation,
                              entry,
                              language,
                            )
                          }

                          pressedOpacity={0.86}
                          style={[
                            styles.dailyWorkInlineItem,
                            {
                              backgroundColor:
                                tone.cardBackground,
                              borderColor: tone.cardBorder,
                              borderRadius: metrics.scale(12, {
                                maxFactor: 1.08,
                                minFactor: 0.9,
                              }),
                              elevation: 1,
                              minHeight: metrics.verticalScale(64, {
                                maxFactor: 1.08,
                                minFactor: 0.9,
                              }),
                              paddingHorizontal: metrics.scale(8, {
                                maxFactor: 1.08,
                                minFactor: 0.9,
                              }),
                              paddingVertical: metrics.verticalScale(10, {
                                maxFactor: 1.08,
                                minFactor: 0.9,
                              }),
                              shadowColor: '#0F172A',
                              shadowOffset: {
                                width: 0,
                                height: 4,
                              },
                              shadowOpacity: 0.06,
                              shadowRadius: 10,
                            },
                          ]}>
                          <View style={styles.dailyWorkInlineContent}>
                            <View
                              style={[
                                styles.dailyWorkIconWrap,
                                {
                                  backgroundColor:
                                    tone.iconBackground,
                                  borderColor: tone.iconBorder,
                                  borderRadius: metrics.scale(10, {
                                    maxFactor: 1.08,
                                    minFactor: 0.9,
                                  }),
                                  height: metrics.scale(26, {
                                    maxFactor: 1.08,
                                    minFactor: 0.9,
                                  }),
                                  marginRight: metrics.scale(6, {
                                    maxFactor: 1.08,
                                    minFactor: 0.9,
                                  }),
                                  width: metrics.scale(26, {
                                    maxFactor: 1.08,
                                    minFactor: 0.9,
                                  }),
                                },
                              ]}>
                              <Icon
                                color={tone.toneColor}
                                name={entry.icon}
                                size={metrics.scale(15, {
                                  maxFactor: 1.08,
                                  minFactor: 0.9,
                                })}
                              />
                            </View>

                            <Text
                              numberOfLines={1}
                              style={[
                                styles.dailyWorkInlineTitle,
                                {
                                  color: tone.titleColor,
                                  flex: 1,
                                  fontSize: metrics.responsiveFont(13, {
                                    maxFactor: 1.06,
                                    minFactor: 0.92,
                                  }),
                                  marginRight: metrics.scale(4, {
                                    maxFactor: 1.08,
                                    minFactor: 0.9,
                                  }),
                                },
                              ]}>
                              {localizedTitle}
                            </Text>

                            <Icon
                              color={tone.toneColor}
                              name="chevron-right"
                              size={metrics.scale(15, {
                                maxFactor: 1.08,
                                minFactor: 0.9,
                              })}
                            />
                          </View>
                        </AppPressable>
                      );
                    })}
                  </View>
                </>
              ) : (
                <>
                  <AppSectionTitle
                    title={getLocalizedText(
                      section.title,
                      language,
                    )}
                  />

                  {section.entries.map((entry, index) => (
                    <UpPortalListItem
                      accentColor={entry.accentColor}
                      icon={entry.icon}
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
                </>
              )}
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
                  fontSize: metrics.responsiveFont(17, {
                    maxFactor: 1.06,
                    minFactor: 0.9,
                  }),
                },
              ]}>
              {noSearchResultTitle}
            </Text>
            <Text
              style={[
                styles.emptyBody,
                {
                  fontSize: metrics.responsiveFont(14, {
                    maxFactor: 1.06,
                    minFactor: 0.92,
                  }),
                  lineHeight: metrics.verticalScale(21, {
                    maxFactor: 1.06,
                    minFactor: 0.94,
                  }),
                  marginTop: metrics.verticalScale(8, {
                    maxFactor: 1.06,
                    minFactor: 0.9,
                  }),
                },
              ]}>
              {noSearchResultBody}
            </Text>
          </View>
        )}
      </View>
    </AppScreen>
  );
};

export default HomeScreen;
