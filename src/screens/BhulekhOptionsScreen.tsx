import { typography } from '../theme/typography';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import BhulekhRelatedLinks from '../components/BhulekhRelatedLinks';
import { useAppTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';
import AppScreen from '../components/AppScreen';
import UpPortalListItem from '../components/UpPortalListItem';
import { useLanguage } from '../context/LanguageContext';
import {
  BHULEKH_OPTIONS,
  BHULEKH_DIRECTORY_OPTIONS,
} from '../data/bhulekhOptions';
import type { UpHomeEntry } from '../data/upHomeCatalog';
import { openUpHomeEntry } from '../navigation/upEntryNavigation';
import { RootStackParamList } from '../types/navigation';
import WebViewPortalScreen from './WebViewPortalScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'BhulekhOptions'>;
type BrowserNavigation = NativeStackScreenProps<
  RootStackParamList,
  'WebViewPortal'
>['navigation'];

export default function BhulekhOptionsScreen({ navigation }: Props) {
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const stripTop = useRef(Infinity);
  const scrollTop = useRef(0);
  const viewportHeight = useRef(0);
  const [stripVisible, setStripVisible] = useState(false);
  const updateStripVisibility = () =>
    setStripVisible(
      scrollTop.current + viewportHeight.current > stripTop.current &&
        scrollTop.current < stripTop.current + 180,
    );
  const [selected, setSelected] = useState<UpHomeEntry | null>(null);
  const [requestId, setRequestId] = useState(0);
  const closeService = useCallback(() => {
    setSelected(null);
  }, []);
  const service =
    selected?.action.type === 'portal'
      ? selected.action.bhulekhService
      : undefined;
  const title =
    language === 'hi' ? 'खतौनी और भूलेख सेवाएं' : 'Khatauni & Bhulekh Services';
  return (
    <View style={styles.fill}>
      {/* Keep the actual browser mounted so its loaded page is reused on selection. */}
      <View
        collapsable={false}
        style={styles.fill}
        pointerEvents={selected ? 'auto' : 'none'}
        importantForAccessibility={selected ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!selected}
      >
        <WebViewPortalScreen
          navigation={navigation as unknown as BrowserNavigation}
          route={{
            key: 'bhulekh-browser',
            name: 'WebViewPortal',
            params: {
              title: selected?.title[language] ?? title,
              url:
                selected?.action.type === 'portal'
                  ? selected.action.url
                  : 'https://upbhulekh.gov.in/#/home',
              bhulekhService: service,
            },
          }}
          isPreloading={!selected}
          bhulekhSessionRequest={requestId}
          onClose={closeService}
        />
      </View>
      <View
        style={[styles.optionsLayer, selected ? styles.hidden : null]}
        pointerEvents={selected ? 'none' : 'auto'}
        importantForAccessibility={selected ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={Boolean(selected)}
      >
        <AppScreen scroll={false}>
          <AppHeader
            title={title}
            leftIconName="arrow-left"
            onLeftPress={() => navigation.goBack()}
          />
          <ScrollView
            contentContainerStyle={styles.options}
            onLayout={event => {
              viewportHeight.current = event.nativeEvent.layout.height;
              updateStripVisibility();
            }}
            onScroll={event => {
              scrollTop.current = event.nativeEvent.contentOffset.y;
              updateStripVisibility();
            }}
            scrollEventThrottle={100}
          >
            {[
              {
                title:
                  language === 'hi' ? 'सेवाएं और लॉगिन' : 'Services & logins',
                entries: BHULEKH_OPTIONS,
              },
              {
                title: language === 'hi' ? 'आधिकारिक सूचियां' : 'Directories',
                entries: BHULEKH_DIRECTORY_OPTIONS,
              },
            ].map(group => (
              <View key={group.title} style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.text }]}>
                  {group.title}
                </Text>
                {group.entries.map((option, index) => (
                  <UpPortalListItem
                    key={option.id}
                    title={option.title[language]}
                    subtitle={option.subtitle[language]}
                    icon={option.icon}
                    accentColor={option.accentColor}
                    isLast={index === group.entries.length - 1}
                    onPress={() => {
                      if (
                        option.action.type === 'portal' &&
                        option.action.url.startsWith(
                          'https://upbhulekh.gov.in/#/',
                        )
                      ) {
                        setRequestId(value => value + 1);
                        setSelected(option);
                      } else {
                        openUpHomeEntry(navigation, option, language);
                      }
                    }}
                  />
                ))}
              </View>
            ))}
            <View
              onLayout={event => {
                stripTop.current = event.nativeEvent.layout.y;
                updateStripVisibility();
              }}
            >
              <BhulekhRelatedLinks
                visible={stripVisible}
                onOpen={entry => openUpHomeEntry(navigation, entry, language)}
              />
            </View>
          </ScrollView>
        </AppScreen>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  fill: { flex: 1 },
  group: { marginBottom: 20 },
  groupTitle: { ...typography.heading, marginBottom: 12 },
  options: { padding: 20 },
  optionsLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
