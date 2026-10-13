import React, {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import AppSectionTitle from '../components/AppSectionTitle';
import {useLanguage} from '../context/LanguageContext';
import {selectDrawerSection} from '../navigation/drawerHelpers';
import {COLORS} from '../theme/colors';
import {
  getLocalizedText,
  LocalizedText,
} from '../types/tool';

type TopicId =
  | 'all'
  | 'portal'
  | 'measure'
  | 'records'
  | 'account';

type Topic = {
  id: TopicId;
  label: LocalizedText;
};

type Guide = {
  id: string;
  summary: LocalizedText;
  steps: LocalizedText[];
  title: LocalizedText;
  topics: TopicId[];
};

type Faq = {
  answer: LocalizedText;
  id: string;
  question: LocalizedText;
  topics: TopicId[];
};

const text = (en: string, hi: string): LocalizedText => ({
  en,
  hi,
});

const TOPICS: Topic[] = [
  {id: 'all', label: text('All', 'सभी')},
  {id: 'portal', label: text('Portals', 'पोर्टल')},
  {id: 'measure', label: text('Measurement', 'माप')},
  {id: 'records', label: text('Saved work', 'सेव काम')},
  {id: 'account', label: text('Login', 'लॉगिन')},
];

const GUIDES: Guide[] = [
  {
    id: 'guide-khatauni',
    summary: text(
      'Use the guided UP portal flow for khatauni, khasra, and village search.',
      'खतौनी, खसरा और गांव खोज के लिए गाइडेड UP पोर्टल फ्लो का उपयोग करें।',
    ),
    steps: [
      text(
        'Open the UP service block from Home.',
        'होम से UP सर्विस ब्लॉक खोलें।',
      ),
      text(
        'Select district, tehsil, village, or the right search type.',
        'जिला, तहसील, गांव या सही सर्च टाइप चुनें।',
      ),
      text(
        'Verify the final result from the official portal output.',
        'अंतिम परिणाम को आधिकारिक पोर्टल आउटपुट से जांचें।',
      ),
    ],
    title: text('Find khatauni or khasra', 'खतौनी या खसरा खोजें'),
    topics: ['portal'],
  },
  {
    id: 'guide-bhunaksha',
    summary: text(
      'Open village map services and inspect the correct plot visually.',
      'विलेज मैप सेवाएं खोलें और सही प्लॉट को दृश्य रूप से देखें।',
    ),
    steps: [
      text(
        'Open Bhu Naksha from the state workspace.',
        'स्टेट वर्कस्पेस से भू नक्शा खोलें।',
      ),
      text(
        'Let the map load fully before zooming or selecting plots.',
        'जूम या प्लॉट चुनने से पहले मैप को पूरी तरह लोड होने दें।',
      ),
      text(
        'Reload once if the official map stays blank.',
        'यदि आधिकारिक मैप खाली रहे तो एक बार रीलोड करें।',
      ),
    ],
    title: text('Use Bhu Naksha properly', 'भू नक्शा सही से उपयोग करें'),
    topics: ['portal'],
  },
  {
    id: 'guide-measurement',
    summary: text(
      'Choose the right measurement mode and save only after checking the sketch.',
      'सही मेजरमेंट मोड चुनें और स्केच जांचने के बाद ही सेव करें।',
    ),
    steps: [
      text(
        'Use live GPS for walking the boundary.',
        'सीमा पर चलने के लिए लाइव GPS उपयोग करें।',
      ),
      text(
        'Use manual plot when side values are already known.',
        'जब साइड वैल्यू पहले से पता हों तो मैनुअल प्लॉट उपयोग करें।',
      ),
      text(
        'Review the shape before saving the report.',
        'रिपोर्ट सेव करने से पहले शेप जरूर देखें।',
      ),
    ],
    title: text('Measure land with less confusion', 'कम भ्रम के साथ भूमि मापें'),
    topics: ['measure'],
  },
  {
    id: 'guide-records',
    summary: text(
      'Village Diary and Mutation Tracker are for quick reopen and follow-up.',
      'विलेज डायरी और म्यूटेशन ट्रैकर क्विक रीओपन और फॉलो-अप के लिए हैं।',
    ),
    steps: [
      text(
        'Fill details clearly before saving.',
        'सेव करने से पहले विवरण साफ भरें।',
      ),
      text(
        'Use the saved-record icon to reopen old work.',
        'पुराना काम खोलने के लिए सेव्ड-रिकॉर्ड आइकन उपयोग करें।',
      ),
      text(
        'Clear records only when you really want to remove them from this phone.',
        'रिकॉर्ड तभी क्लियर करें जब आप उन्हें सच में इस फोन से हटाना चाहते हों।',
      ),
    ],
    title: text('Save and reopen work', 'काम सेव और रीओपन करें'),
    topics: ['records'],
  },
];

const FAQS: Faq[] = [
  {
    answer: text(
      'Many flows still depend on the original government portal. If that official site is slow or overloaded, the app can also feel slow on that step.',
      'कई फ्लो अभी भी मूल सरकारी पोर्टल पर निर्भर हैं। यदि आधिकारिक साइट धीमी या ओवरलोड हो, तो उस स्टेप पर ऐप भी धीमा लग सकता है।',
    ),
    id: 'faq-portal-slow',
    question: text(
      'Why is a portal sometimes slow?',
      'पोर्टल कभी-कभी धीमा क्यों होता है?',
    ),
    topics: ['portal'],
  },
  {
    answer: text(
      'GPS can drift, especially in weak-signal areas. Walk slowly, add points in order, and compare the sketch with the actual field boundary.',
      'GPS खिसक सकता है, खासकर कमजोर सिग्नल वाले क्षेत्रों में। धीरे चलें, पॉइंट्स क्रम में जोड़ें और स्केच को वास्तविक सीमा से मिलाएं।',
    ),
    id: 'faq-gps',
    question: text(
      'Why does GPS measurement not look fully exact?',
      'GPS मेजरमेंट पूरी तरह सटीक क्यों नहीं दिखता?',
    ),
    topics: ['measure'],
  },
  {
    answer: text(
      'Clear saved records removes saved reports from this phone. Clear portal history removes saved Bhulekh memory, recent portal history, and remembered state selection.',
      'Clear saved records इस फोन से सेव्ड रिपोर्ट हटाता है। Clear portal history सेव्ड भूलेख मेमरी, हाल की पोर्टल हिस्ट्री और याद रखा गया स्टेट सिलेक्शन हटाता है।',
    ),
    id: 'faq-clear',
    question: text(
      'What is the difference between the clear actions?',
      'Clear actions में क्या अंतर है?',
    ),
    topics: ['records', 'portal'],
  },
  {
    answer: text(
      'Not in the current local-storage version. Reinstall removes phone-only saved data. Cloud sync would be needed for restore later.',
      'मौजूदा लोकल-स्टोरेज वर्जन में नहीं। रीइंस्टॉल के बाद फोन वाला सेव्ड डेटा हट जाता है। बाद में वापसी के लिए क्लाउड सिंक चाहिए होगा।',
    ),
    id: 'faq-uninstall',
    question: text(
      'Will data come back after uninstall?',
      'क्या अनइंस्टॉल के बाद डेटा वापस आएगा?',
    ),
    topics: ['records', 'account'],
  },
];

const HelpScreen = () => {
  const {language} = useLanguage();
  const [query, setQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<TopicId>('all');
  const [openGuideId, setOpenGuideId] = useState<string | null>(
    GUIDES[0]?.id ?? null,
  );
  const [openFaqId, setOpenFaqId] = useState<string | null>(
    FAQS[0]?.id ?? null,
  );
  const deferredQuery = useDeferredValue(
    query.trim().toLowerCase(),
  );

  const copy = useMemo(
    () => ({
      faqs:
        language === 'hi' ? 'आम दिक्कतें' : 'Common issues',
      guides: language === 'hi' ? 'गाइड्स' : 'Guides',
      intro:
        language === 'hi'
          ? 'यहां सही जवाब ढूंढें या सबसे जरूरी टूल सीधे खोलें।'
          : 'Find the right answer here without extra clutter.',
      noResults:
        language === 'hi'
          ? 'कोई मैच नहीं मिला। दूसरा शब्द या दूसरा टॉपिक चुनें।'
          : 'No matching help found. Try another word or another topic.',
      searchPlaceholder:
        language === 'hi'
          ? 'Search: khatauni, gps, save, login...'
          : 'Search: khatauni, gps, save, login...',
      title: language === 'hi' ? 'Help' : 'Help',
    }),
    [language],
  );

  const matchesTopic = useCallback(
    (topics: TopicId[]) =>
      activeTopic === 'all' || topics.includes(activeTopic),
    [activeTopic],
  );

  const matchesQuery = useCallback(
    (texts: string[]) =>
      deferredQuery.length === 0 ||
      texts.some(value =>
        value.toLowerCase().includes(deferredQuery),
      ),
    [deferredQuery],
  );

  const filteredGuides = useMemo(
    () =>
      GUIDES.filter(guide =>
        matchesTopic(guide.topics) &&
        matchesQuery([
          getLocalizedText(guide.title, language),
          getLocalizedText(guide.summary, language),
          ...guide.steps.map(step =>
            getLocalizedText(step, language),
          ),
        ]),
      ),
    [language, matchesQuery, matchesTopic],
  );

  const filteredFaqs = useMemo(
    () =>
      FAQS.filter(faq =>
        matchesTopic(faq.topics) &&
        matchesQuery([
          getLocalizedText(faq.question, language),
          getLocalizedText(faq.answer, language),
        ]),
      ),
    [language, matchesQuery, matchesTopic],
  );

  const hasResults =
    filteredGuides.length > 0 || filteredFaqs.length > 0;

  return (
    <AppScreen scroll={false}>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => selectDrawerSection('Workspace')}
        title={copy.title}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <Icon
            color={COLORS.textSoft}
            name="magnify"
            size={18}
          />
          <TextInput
            onChangeText={setQuery}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor={COLORS.textSoft}
            style={styles.searchInput}
            value={query}
          />
          {query ? (
            <AppPressable
              onPress={() => setQuery('')}
              style={styles.searchClear}>
              <Icon
                color={COLORS.textSoft}
                name="close"
                size={18}
              />
            </AppPressable>
          ) : null}
        </View>

        <Text style={styles.introText}>{copy.intro}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.topicScroller}>
          {TOPICS.map(topic => {
            const active = topic.id === activeTopic;

            return (
              <AppPressable
                key={topic.id}
                onPress={() => setActiveTopic(topic.id)}

                style={[
                  styles.topicPill,
                  active && styles.topicPillActive,
                ]}>
                <Text
                  style={[
                    styles.topicPillText,
                    active && styles.topicPillTextActive,
                  ]}>
                  {getLocalizedText(topic.label, language)}
                </Text>
              </AppPressable>
            );
          })}
        </ScrollView>

        {hasResults ? (
          <>
            {filteredGuides.length ? (
              <>
                <AppSectionTitle title={copy.guides} />
                <View style={styles.group}>
                  {filteredGuides.map((guide, index) => {
                    const open = openGuideId === guide.id;

                    return (
                      <View
                        key={guide.id}
                        style={[
                          styles.rowCard,
                          open && styles.rowCardOpen,
                          index > 0 && styles.rowCardBorder,
                        ]}>
                        <AppPressable
                          onPress={() =>
                            setOpenGuideId(previous =>
                              previous === guide.id
                                ? null
                                : guide.id,
                            )
                          }
                          style={styles.rowCardPress}>
                          <View style={styles.rowHeader}>
                            <View style={styles.rowTextBlock}>
                              <Text style={styles.rowTitle}>
                                {getLocalizedText(
                                  guide.title,
                                  language,
                                )}
                              </Text>
                              <Text style={styles.rowSummary}>
                                {getLocalizedText(
                                  guide.summary,
                                  language,
                                )}
                              </Text>
                            </View>
                            <Icon
                              color={COLORS.primary}
                              name={
                                open
                                  ? 'chevron-up'
                                  : 'chevron-down'
                              }
                              size={20}
                            />
                          </View>
                        </AppPressable>

                        {open ? (
                          <View style={styles.expandBlock}>
                            {guide.steps.map((step, stepIndex) => (
                              <View
                                key={`${guide.id}-${stepIndex + 1}`}
                                style={styles.stepRow}>
                                <Text style={styles.stepIndex}>
                                  {stepIndex + 1}
                                </Text>
                                <Text style={styles.stepText}>
                                  {getLocalizedText(
                                    step,
                                    language,
                                  )}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}

            {filteredFaqs.length ? (
              <>
                <AppSectionTitle title={copy.faqs} />
                <View style={styles.group}>
                  {filteredFaqs.map((faq, index) => {
                    const open = openFaqId === faq.id;

                    return (
                      <View
                        key={faq.id}
                        style={[
                          styles.rowCard,
                          open && styles.rowCardOpen,
                          index > 0 && styles.rowCardBorder,
                        ]}>
                        <AppPressable
                          onPress={() =>
                            setOpenFaqId(previous =>
                              previous === faq.id
                                ? null
                                : faq.id,
                            )
                          }
                          style={styles.rowCardPress}>
                          <View style={styles.rowHeader}>
                            <View style={styles.rowTextBlock}>
                              <Text style={styles.rowTitle}>
                                {getLocalizedText(
                                  faq.question,
                                  language,
                                )}
                              </Text>
                            </View>
                            <Icon
                              color={COLORS.primary}
                              name={
                                open
                                  ? 'chevron-up'
                                  : 'chevron-down'
                              }
                              size={20}
                            />
                          </View>
                        </AppPressable>

                        {open ? (
                          <View style={styles.expandBlock}>
                            <Text style={styles.answerText}>
                              {getLocalizedText(
                                faq.answer,
                                language,
                              )}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}
          </>
        ) : (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>{copy.noResults}</Text>
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  answerText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  emptyBlock: {
    paddingVertical: 12,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  expandBlock: {
    backgroundColor: '#FCFDFF',
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  group: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 18,
    overflow: 'hidden',
  },
  introText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
    marginTop: 12,
  },
  rowCard: {
    backgroundColor: COLORS.surface,
  },
  rowCardBorder: {
    borderTopColor: COLORS.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowCardOpen: {
    backgroundColor: '#FCFDFF',
  },
  rowCardPress: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  rowSummary: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  rowTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  scrollContent: {
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  searchClear: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  searchInput: {
    color: COLORS.text,
    flex: 1,
    fontSize: 14,
    marginLeft: 10,
    paddingVertical: 0,
  },
  searchRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stepIndex: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
    marginRight: 12,
    width: 12,
  },
  stepRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  stepText: {
    color: COLORS.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  topicPill: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  topicPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  topicPillText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  topicPillTextActive: {
    color: COLORS.white,
  },
  topicScroller: {
    marginBottom: 10,
  },
});

export default HelpScreen;
