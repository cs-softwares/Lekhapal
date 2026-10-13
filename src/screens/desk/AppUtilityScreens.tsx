import { DEVELOPER_INFO } from '../../config/developerInfo';
import SavedWorkAd from '../../components/ads/SavedWorkAd';
import AdPrivacyChoices from '../../components/ads/AdPrivacyChoices';
import { PremiumLockNotice } from '../../components/premium/PremiumLock';
import { usePremiumFeatures } from '../../hooks/usePremiumFeatures';
import { requestPremiumAccess } from '../../services/premiumAccess';
import { openPasswordRecovery } from '../../services/passwordRecovery';
import { useAuthSession } from '../../context/AuthSessionContext';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../../components/AppHeader';
import AppScreen from '../../components/AppScreen';
import { ProfileRow } from '../../components/profile/ProfileUI';
import { useSelectedState } from '../../context/SelectedStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import { RELEASE_FEATURES } from '../../config/releaseFeatures';
import AboutScreen from '../AboutScreen';
import { MEASUREMENT_TOOLS } from '../../components/measurement/measurementCatalog';
import { calculatorTools } from '../../components/calculator/calculatorContent';
import { loadWorkspaceRecords } from '../../utils/workspaceStorage';
import { setPendingMeasurementRecordSelection } from '../../utils/measurementRecordBridge';
import type { WorkspaceRecord } from '../../types/workspace';

function Page({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const navigation = useNavigation<any>();
  const focused = useIsFocused();
  return (
    <AppScreen scroll={false}>
      {focused && <StatusBar barStyle="light-content" />}
      <AppHeader
        title={title}
        leftIconName="arrow-left"
        onLeftPress={() =>
          navigation.navigate('GovernmentPortals', { screen: 'Home' })
        }
      />
      {children}
    </AppScreen>
  );
}
function useCopy() {
  const { language } = useLanguage();
  return (en: string, hi: string) => (language === 'hi' ? hi : en);
}
function Heading({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <Text style={[s.heading, { color: colors.textMuted }]}>{children}</Text>
  );
}
export function SimpleSettingsScreen() {
  const { session } = useAuthSession();
  const { colors, isDarkTheme, setThemeMode } = useAppTheme();
  const { language, setLanguage } = useLanguage();
  const t = useCopy();
  const navigation = useNavigation<any>();
  const choices = (
    label: string,
    options: Array<{
      title: string;
      icon: string;
      active: boolean;
      onPress: () => void;
    }>,
  ) => (
    <View style={s.preference}>
      <Text style={[s.preferenceLabel, { color: colors.text }]}>{label}</Text>
      <View style={s.choices}>
        {options.map(o => (
          <Pressable
            key={o.title}
            accessibilityRole="radio"
            accessibilityLabel={o.title}
            accessibilityState={{ selected: o.active }}
            onPress={o.onPress}
            style={({ pressed }) => [
              s.choice,
              {
                borderColor: o.active ? colors.primary : colors.border,
                backgroundColor: o.active
                  ? colors.primarySoft
                  : pressed
                  ? colors.surfaceAlt
                  : colors.surface,
              },
            ]}
          >
            <Icon
              name={o.icon}
              size={20}
              color={o.active ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                s.choiceText,
                { color: o.active ? colors.primary : colors.text },
              ]}
            >
              {o.title}
            </Text>
            {o.active && <Icon name="check" size={17} color={colors.primary} />}
          </Pressable>
        ))}
      </View>
    </View>
  );
  return (
    <Page title={t('Settings', 'सेटिंग्स')}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.intro, { color: colors.textMuted }]}>
          {t(
            'A few preferences. A workspace that feels yours.',
            'कुछ आसान विकल्प। आपकी पसंद का कार्यक्षेत्र।',
          )}
        </Text>
        <Heading>{t('DISPLAY & LANGUAGE', 'रंग रूप और भाषा')}</Heading>
        {choices(t('Appearance', 'रंग रूप'), [
          {
            title: t('Light', 'लाइट'),
            icon: 'white-balance-sunny',
            active: !isDarkTheme,
            onPress: () => setThemeMode('light'),
          },
          {
            title: t('Dark', 'डार्क'),
            icon: 'weather-night',
            active: isDarkTheme,
            onPress: () => setThemeMode('dark'),
          },
        ])}
        {choices(t('App language', 'ऐप की भाषा'), [
          {
            title: 'English',
            icon: 'alphabetical',
            active: language === 'en',
            onPress: () => setLanguage('en'),
          },
          {
            title: 'हिन्दी',
            icon: 'translate',
            active: language === 'hi',
            onPress: () => setLanguage('hi'),
          },
        ])}
        <ProfileRow
          icon="shield-check-outline"
          title={t('Privacy policy', 'गोपनीयता नीति')}
          onPress={() =>
            Linking.openURL(DEVELOPER_INFO.privacyPolicy).catch(() =>
              Alert.alert(
                t('Could not open link', 'लिंक नहीं खुल सका'),
                DEVELOPER_INFO.privacyPolicy,
              ),
            )
          }
        />
        <AdPrivacyChoices />
        <Heading>{t('ACCOUNT SECURITY', 'खाते की सुरक्षा')}</Heading>
        <ProfileRow
          icon="lock-reset"
          title={t('Reset password', 'पासवर्ड रीसेट करें')}
          description={t(
            'Verify your email and choose a new password',
            'ईमेल सत्यापित करके नया पासवर्ड चुनें',
          )}
          onPress={() => openPasswordRecovery(session?.email || '')}
        />
        <Heading>{t('YOUR WORKSPACE', 'आपका कार्यक्षेत्र')}</Heading>
        <ProfileRow
          icon="account-edit-outline"
          title={t('Profile & work area', 'प्रोफाइल और कार्य क्षेत्र')}
          description={t(
            'Your name, district and tehsil',
            'आपका नाम, जिला और तहसील',
          )}
          onPress={() => navigation.navigate('Officer')}
        />
        <ProfileRow
          icon="notebook-outline"
          title={t('Saved work', 'सेव किया कार्य')}
          description={t(
            'Reopen measurements and calculations',
            'माप और गणनाएं दोबारा खोलें',
          )}
          onPress={() => navigation.navigate('SavedWork')}
        />
        {RELEASE_FEATURES.multiState && (
          <ProfileRow
            icon="map-marker-outline"
            title={t('Change state', 'राज्य बदलें')}
            onPress={() =>
              navigation
                .getParent()
                ?.navigate('StateSelection', { change: true })
            }
          />
        )}
        <Heading>{t('NEED A HAND?', 'सहायता चाहिए?')}</Heading>
        <ProfileRow
          icon="help-circle-outline"
          title={t('Help', 'सहायता')}
          onPress={() => navigation.navigate('DeskHelp')}
        />
        <Text style={[s.footnote, { color: colors.textMuted }]}>
          {t(
            'Preferences save automatically on this device.',
            'पसंद इस डिवाइस पर अपने आप सेव होती है।',
          )}
        </Text>
      </ScrollView>
    </Page>
  );
}
const guides = [
  {
    icon: 'file-document-outline',
    title: ['Find Khatauni or Khasra', 'खतौनी या खसरा खोजें'],
    body: [
      'Open Official services and choose the required Bhulekh or Khasra service. Select district, tehsil and village on the official website. Department sign-in is separate from this app.',
      'आधिकारिक सेवाओं में भूलेख या खसरा सेवा चुनें। आधिकारिक वेबसाइट पर जिला, तहसील और गांव चुनें। विभागीय लॉगिन इस ऐप से अलग है।',
    ],
  },
  {
    icon: 'crosshairs-gps',
    title: ['Measure a field boundary', 'खेत की सीमा मापें'],
    body: [
      'Open GPS boundary. Mark the plot corners on the map or use your location outdoors with location permission enabled. Close the boundary and review the area. GPS readings are estimates; check important measurements against field records.',
      'GPS सीमा माप खोलें। नक्शे पर कोने चुनें या बाहर स्थान अनुमति के साथ अपनी लोकेशन का उपयोग करें। सीमा पूरी करके क्षेत्रफल देखें। GPS माप अनुमान है; जरूरी माप अभिलेखों से जांचें।',
    ],
  },
  {
    icon: 'account-group-outline',
    title: ['Calculate recorded shares', 'दर्ज अंश की गणना'],
    body: [
      'Open Calculator → Khatauni shares. Enter the area and unit, then each co-owner’s recorded fraction or percentage. Equal shares apply only when you select that option. The result shows each allocation and any remaining area.',
      'कैलकुलेटर → खतौनी अंश खोलें। रकबा और इकाई, फिर हर सहखातेदार का दर्ज अंश या प्रतिशत भरें। बराबर हिस्से केवल वह विकल्प चुनने पर लागू होते हैं। परिणाम में हर हिस्सा और शेष रकबा दिखता है।',
    ],
  },
  {
    icon: 'notebook-outline',
    title: [
      'Save, reopen and export work',
      'कार्य सेव, दोबारा खोलें और निर्यात करें',
    ],
    body: [
      'Calculate a valid result, then tap Save. Saved work in the menu brings all measurement and calculator notes together. Tap a note to reopen its original inputs. Share and PDF are available in the tool. Each tool keeps the latest 12 notes on this device.',
      'सही गणना के बाद सेव करें दबाएं। मेनू के सेव किया कार्य में सभी माप और गणना नोट मिलते हैं। मूल विवरण खोलने के लिए नोट दबाएं। उपकरण में साझा और PDF विकल्प हैं। हर उपकरण के नवीनतम 12 नोट इस डिवाइस पर रहते हैं।',
    ],
  },
  {
    icon: 'wifi-off',
    title: ['Work without an internet connection', 'बिना इंटरनेट के काम करें'],
    body: [
      'Area and calculator arithmetic work offline. Official websites and map tiles need internet access. A saved note stays on this device; it is not automatically sent to a government server.',
      'क्षेत्रफल और कैलकुलेटर की गणनाएं ऑफलाइन चलती हैं। आधिकारिक वेबसाइट और नक्शे की टाइलों के लिए इंटरनेट चाहिए। सेव नोट इसी डिवाइस पर रहता है; वह अपने आप सरकारी सर्वर पर नहीं जाता।',
    ],
  },
  {
    icon: 'download-circle-outline',
    title: ['Rate or update the app', 'ऐप रेट या अपडेट करें'],
    body: [
      'Rate app and Update app open the app’s Google Play listing. The store shows whether an update is available for your device. If the listing is not published or unavailable in your region, it may not open.',
      'ऐप रेट और अपडेट विकल्प Google Play की ऐप सूची खोलते हैं। उपलब्ध अपडेट स्टोर पर दिखता है। सूची प्रकाशित न होने या आपके क्षेत्र में उपलब्ध न होने पर वह नहीं खुल सकती।',
    ],
  },
];
export function DeskHelpScreen() {
  const { colors } = useAppTheme();
  const { language } = useLanguage();
  const t = useCopy();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const filtered = guides
    .map((g, id) => ({ ...g, id }))
    .filter(g =>
      [...g.title, ...g.body]
        .join(' ')
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    );
  return (
    <Page title={t('Help', 'सहायता')}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.largeTitle, { color: colors.text }]}>
          {t('How can we help?', 'हम कैसे मदद करें?')}
        </Text>
        <View
          style={[
            s.search,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Icon name="magnify" color={colors.textMuted} size={21} />
          <TextInput
            accessibilityLabel={t('Search help', 'सहायता खोजें')}
            value={query}
            onChangeText={setQuery}
            placeholder={t(
              'Search GPS, shares, saved work…',
              'GPS, अंश, सेव कार्य खोजें…',
            )}
            placeholderTextColor={colors.textSoft}
            style={[s.searchInput, { color: colors.text }]}
          />
        </View>
        <Heading>{t('PRACTICAL GUIDES', 'उपयोगी जानकारी')}</Heading>
        {filtered.map(g => (
          <View key={g.id} style={[s.guide, { borderColor: colors.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={g.title[language === 'hi' ? 1 : 0]}
              accessibilityState={{ expanded: expanded === g.id }}
              onPress={() => setExpanded(expanded === g.id ? null : g.id)}
              style={s.guideButton}
            >
              <Icon name={g.icon} size={22} color={colors.primary} />
              <Text style={[s.guideTitle, { color: colors.text }]}>
                {g.title[language === 'hi' ? 1 : 0]}
              </Text>
              <Icon
                name={expanded === g.id ? 'minus' : 'plus'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
            {expanded === g.id && (
              <Text style={[s.guideBody, { color: colors.textMuted }]}>
                {g.body[language === 'hi' ? 1 : 0]}
              </Text>
            )}
          </View>
        ))}
        {!filtered.length && (
          <Text style={[s.intro, { color: colors.textMuted }]}>
            {t(
              'No matching guide. Try another word.',
              'कोई जानकारी नहीं मिली। दूसरा शब्द खोजें।',
            )}
          </Text>
        )}
      </ScrollView>
    </Page>
  );
}
export function DeskAboutScreen() {
  return <AboutScreen />;
}

const sources = [
  ...MEASUREMENT_TOOLS.map(tool => ({
    id: tool.id,
    storageId: tool.storageToolId,
    title: tool.title,
    icon: tool.icon,
    screen: 'Measurement',
  })),
  ...calculatorTools.map(tool => ({
    id: tool.id,
    storageId: tool.id,
    title: tool.title,
    icon: tool.icon,
    screen: 'Calculator',
  })),
];
type SavedNote = { record: WorkspaceRecord; source: (typeof sources)[number] };
export function SavedWorkScreen() {
  const { stateCode } = useSelectedState();
  const premium = usePremiumFeatures();
  const [groupBy, setGroupBy] = useState<'village' | 'plot' | 'client' | null>(
    null,
  );
  const { colors } = useAppTheme();
  const { language } = useLanguage();
  const t = useCopy();
  const navigation = useNavigation<any>();
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    Promise.all(
      sources.map(async source =>
        (await loadWorkspaceRecords(source.storageId, stateCode || 'UP')).map(record => ({
          record,
          source,
        })),
      ),
    )
      .then(groups => {
        if (active)
          setNotes(
            groups
              .flat()
              .sort((a, b) =>
                b.record.updatedAt.localeCompare(a.record.updatedAt),
              ),
          );
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [focused, retry, stateCode]);
  const shown = notes.filter(({ record, source }) =>
    [
      record.title,
      record.subtitle,
      ...record.summaryLines,
      ...source.title,
      ...Object.values(record.organization || {}),
    ]
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const group = ({ record }: SavedNote) =>
    groupBy
      ? record.organization?.[groupBy] ||
        (groupBy === 'village'
          ? record.values.villageName || record.values.village
          : groupBy === 'plot'
          ? record.values.plotLabel || record.values.gata
          : '') ||
        t('Unassigned', 'बिना वर्ग')
      : '';
  if (premium && groupBy)
    shown.sort((a, b) => group(a).localeCompare(group(b)));
  return (
    <Page title={t('Saved work', 'सेव किया कार्य')}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            s.search,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Icon name="magnify" color={colors.textMuted} size={21} />
          <TextInput
            accessibilityLabel={t('Search saved work', 'सेव कार्य खोजें')}
            placeholder={t(
              'Village, plot, client or calculation',
              'गांव, गाटा या गणना',
            )}
            placeholderTextColor={colors.textSoft}
            value={query}
            onChangeText={setQuery}
            style={[s.searchInput, { color: colors.text }]}
          />
        </View>
        <Text style={[s.intro, { color: colors.textMuted }]}>
          {t(
            'Measurements and calculations · stored on this device',
            'माप और गणनाएं · इस डिवाइस पर सेव',
          )}
        </Text>
        {!premium && (
          <PremiumLockNotice
            title={t('Organise your fieldwork', 'फील्डवर्क व्यवस्थित करें')}
            description={t(
              'Unlock grouping by village, plot or client with Premium. Viewing and searching your saved work stays free.',
              'प्रीमियम से गांव, भूखंड या ग्राहक के अनुसार समूह अनलॉक करें। सेव काम देखना और खोजना मुफ्त है।',
            )}
          />
        )}
        <View style={s.choices}>
          {(['village', 'plot', 'client'] as const).map((key, i) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={
                ['Group by village', 'Group by plot', 'Group by client'][i]
              }
              accessibilityState={{ selected: premium && groupBy === key }}
              onPress={() => {
                if (requestPremiumAccess('gps_capture'))
                  setGroupBy(groupBy === key ? null : key);
              }}
              style={[s.choice, { borderColor: colors.border }]}
            >
              <Icon
                name={
                  !premium
                    ? 'lock-outline'
                    : groupBy === key
                    ? 'check'
                    : 'folder-outline'
                }
                size={18}
                color={colors.primary}
              />
              <Text style={{ color: colors.text }}>
                {t(
                  ['Village', 'Plot', 'Client'][i],
                  ['गांव', 'भूखंड', 'ग्राहक'][i],
                )}
              </Text>
            </Pressable>
          ))}
        </View>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : failed ? (
          <ProfileRow
            icon="refresh"
            title={t(
              'Could not load notes · retry',
              'नोट लोड नहीं हुए · फिर कोशिश करें',
            )}
            onPress={() => setRetry(v => v + 1)}
          />
        ) : (
          <>
            <Text style={[s.heading, { color: colors.textMuted }]}>
              {shown.length} {t('SAVED NOTES', 'सेव नोट')}
            </Text>
            {shown.map(({ record, source }, index) => (
              <Pressable
                key={`${source.id}-${record.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${t('Open', 'खोलें')} ${record.title}`}
                onPress={() => {
                  setPendingMeasurementRecordSelection({
                    moduleId: source.id,
                    record,
                  });
                  navigation.navigate('GovernmentPortals', {
                    screen: source.screen,
                    params: { focusToolId: source.id },
                  });
                }}
                style={({ pressed }) => [
                  s.note,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed
                      ? colors.surfaceAlt
                      : colors.background,
                  },
                ]}
              >
                <Icon name={source.icon} size={23} color={colors.primary} />
                <View style={s.flex}>
                  {premium &&
                    groupBy &&
                    (index === 0 ||
                      group(shown[index - 1]) !==
                        group({ record, source })) && (
                      <Text
                        style={[s.preferenceLabel, { color: colors.primary }]}
                      >
                        {group({ record, source })}
                      </Text>
                    )}
                  <Text style={[s.noteType, { color: colors.textMuted }]}>
                    {source.title[language === 'hi' ? 1 : 0]} ·{' '}
                    {new Date(record.updatedAt).toLocaleDateString(
                      language === 'hi' ? 'hi-IN' : 'en-IN',
                      { day: 'numeric', month: 'short' },
                    )}
                  </Text>
                  <Text style={[s.noteTitle, { color: colors.text }]}>
                    {record.title}
                  </Text>
                  <Text style={[s.noteSummary, { color: colors.textMuted }]}>
                    {record.subtitle}
                  </Text>
                </View>
                <Icon name="chevron-right" size={19} color={colors.textSoft} />
              </Pressable>
            ))}
            {!shown.length && (
              <View style={s.empty}>
                <Icon
                  name="notebook-outline"
                  size={38}
                  color={colors.primary}
                />
                <Text style={[s.emptyTitle, { color: colors.text }]}>
                  {query
                    ? t('No matching notes', 'कोई नोट नहीं मिला')
                    : t(
                        'Your next calculation belongs here',
                        'आपकी अगली गणना यहां सेव होगी',
                      )}
                </Text>
                <Text style={[s.aboutCopy, { color: colors.textMuted }]}>
                  {t(
                    'Save a result in Measurement or Calculator. Its original inputs will be ready to reopen here.',
                    'माप या कैलकुलेटर में परिणाम सेव करें। उसका मूल विवरण यहां से दोबारा खोल सकेंगे।',
                  )}
                </Text>
              </View>
            )}
          </>
        )}
        {!loading && !failed && shown.length > 0 && !query.trim() && (
          <SavedWorkAd />
        )}
      </ScrollView>
    </Page>
  );
}
const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  content: {
    padding: 23,
    paddingBottom: 38,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  intro: { fontSize: 13, lineHeight: 22, marginBottom: 14, marginTop: 5 },
  heading: {
    fontSize: 10,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginTop: 23,
    marginBottom: 10,
  },
  preference: { marginTop: 12, marginBottom: 19 },
  preferenceLabel: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  choices: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  choice: {
    flex: 1,
    minWidth: 130,
    minHeight: 50,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  choiceText: { fontSize: 14, fontWeight: '600' },
  footnote: { fontSize: 12, lineHeight: 21, marginTop: 23, marginBottom: 14 },
  largeTitle: {
    fontSize: 24,
    lineHeight: 33,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 20,
  },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    fontSize: 14,
    color: '#0F172A',
  },
  guide: { borderBottomWidth: StyleSheet.hairlineWidth },
  guideButton: {
    minHeight: 73,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  guideTitle: { flex: 1, fontSize: 15, lineHeight: 23, fontWeight: '500' },
  guideBody: {
    fontSize: 13,
    lineHeight: 23,
    paddingLeft: 36,
    paddingBottom: 21,
  },
  aboutIdentity: { alignItems: 'center', paddingTop: 10 },
  appIcon: { width: 76, height: 76, borderRadius: 18, marginBottom: 18 },
  aboutVersion: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -12,
    marginBottom: 23,
  },
  aboutCopy: { fontSize: 13, lineHeight: 23 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
  },
  noteType: { fontSize: 10, lineHeight: 17, marginBottom: 5 },
  noteTitle: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  noteSummary: { fontSize: 12, lineHeight: 20, marginTop: 4 },
  empty: { alignItems: 'center', gap: 13, paddingVertical: 35 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    textAlign: 'center',
  },
});
