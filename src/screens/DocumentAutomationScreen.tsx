import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Share from 'react-native-share';
import { WebView } from 'react-native-webview';
import AppHeader from '../components/AppHeader';
import { useAppTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { RootStackParamList } from '../types/navigation';
import { INDIA_STATE_OPTIONS } from '../data/stateDashboardCatalog';
import { typography } from '../theme/typography';
import {
  COMMON_FIELDS,
  DOCUMENT_TEMPLATES,
  DocBatch,
  DocDraft,
  DocField,
  DocFile,
  FIELD_LABELS,
  LONG_FIELDS,
  PERSON_FIELDS,
  PROFILE_FIELDS,
  docId,
  duplicateDocumentDraft,
  docStorageKey,
  docTemplate,
  documentErrors,
  documentHtml,
  emptyDocStore,
  makeDocumentBatch,
  newDocDraft,
  saveDocumentDraft,
} from '../domain/documentAutomation';
import { DocumentSession } from '../services/documentAutomation';
import {
  exportDocumentPdf,
  generateDocumentPdf,
  printDocumentPdf,
  validateDocumentPdf,
} from '../native/workFiles';

type Props = NativeStackScreenProps<RootStackParamList, 'DocumentAutomation'>;
export default function DocumentAutomationScreen({ navigation, route }: Props) {
  const { colors } = useAppTheme(),
    { language } = useLanguage(),
    insets = useSafeAreaInsets();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const stateCode = route.params.stateCode;
  const stateName =
    INDIA_STATE_OPTIONS.find(s => s.code === stateCode)?.name[language] ||
    stateCode;
  const [store, setStore] = useState(emptyDocStore),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<DocDraft | null>(null),
    [dirty, setDirty] = useState(false),
    [step, setStep] = useState(0),
    [library, setLibrary] = useState(false);
  const [rows, setRows] = useState(''),
    [review, setReview] = useState<DocBatch | null>(null),
    [preview, setPreview] = useState<DocDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState(''),
    [profileName, setProfileName] = useState('');
  const operation = useRef(false);
  const alive = useRef(true),
    scroll = useRef<ScrollView>(null);
  const session = useMemo(
    () =>
      new DocumentSession(
        () => AsyncStorage.getItem(docStorageKey(stateCode)),
        value => AsyncStorage.setItem(docStorageKey(stateCode), value),
        value => {
          if (alive.current) setStore(value);
        },
      ),
    [stateCode],
  );
  const run = async (work: () => Promise<void>) => {
    if (session.busy || operation.current) return;
    operation.current = true;
    setBusy(true);
    setNotice('');
    try {
      await work();
    } catch (e) {
      if (alive.current) setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      operation.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const load = () =>
    run(async () => {
      await session.load();
      if (alive.current) setReady(true);
    });
  useEffect(() => {
    alive.current = true;
    session
      .load()
      .then(() => {
        if (alive.current) setReady(true);
      })
      .catch(() => {
        if (alive.current)
          setNotice(
            'Saved work could not be read. Retry loading; existing data has been preserved.',
          );
      });
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') session.stop();
    });
    return () => {
      alive.current = false;
      session.stop();
      sub.remove();
    };
  }, [session]);
  usePreventRemove(dirty || busy, ({ data }) => {
    if (busy) {
      session.stop();
      setNotice(
        t(
          'Stopping after the current PDF is saved. Try Back again once it finishes.',
          'वर्तमान पीडीएफ सहेजने के बाद रुक रहा है। फिर वापस दबाएं।',
        ),
      );
      return;
    }
    Alert.alert(
      t('Save this draft?', 'मसौदा सहेजें?'),
      t(
        'Keep your entered details for later.',
        'भरे गए विवरण बाद के लिए सहेजें।',
      ),
      [
        { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
        {
          text: t('Discard changes', 'बदलाव छोड़ें'),
          style: 'destructive',
          onPress: () => navigation.dispatch(data.action),
        },
        {
          text: t('Save draft', 'मसौदा सहेजें'),
          onPress: () => {
            void run(async () => {
              if (draft) await session.change(s => saveDocumentDraft(s, draft));
              setDirty(false);
              navigation.dispatch(data.action);
            });
          },
        },
      ],
    );
  });
  const leaveEditor = (showLibrary = false) => {
    const leave = () => {
      setDraft(null);
      setLibrary(showLibrary);
      setDirty(false);
      setReview(null);
      setRows('');
      setNotice('');
    };
    if (busy) {
      session.stop();
      return;
    }
    if (!dirty) {
      leave();
      return;
    }
    Alert.alert(t('Save this draft?', 'मसौदा सहेजें?'), undefined, [
      { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
      {
        text: t('Discard changes', 'बदलाव छोड़ें'),
        onPress: leave,
        style: 'destructive',
      },
      {
        text: t('Save draft', 'मसौदा सहेजें'),
        onPress: () => {
          void run(async () => {
            if (draft) await session.change(s => saveDocumentDraft(s, draft));
            leave();
          });
        },
      },
    ]);
  };
  const back = () => {
    if (draft) leaveEditor();
    else if (library) setLibrary(false);
    else navigation.goBack();
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (draft || library) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  });
  const button = (
    title: string,
    onPress: () => void,
    disabled = busy || !ready,
    secondary = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: secondary ? colors.surface : colors.primary,
          borderColor: colors.primary,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          { color: secondary ? colors.primary : '#fff' },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
  const paragraph = (text: string) => (
    <Text style={[styles.body, { color: colors.textMuted }]}>{text}</Text>
  );
  const heading = (text: string) => (
    <Text style={[styles.heading, { color: colors.text }]}>{text}</Text>
  );
  const card = {
    ...styles.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };
  const inputStyle = [
    styles.input,
    {
      color: colors.text,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
  ];
  const openDraft = (value: DocDraft) => {
    setDraft(value);
    setStep(0);
    setDirty(false);
    setRows('');
    setReview(null);
    setNotice('');
    scroll.current?.scrollTo({ y: 0 });
  };
  const changeField = (field: string, value: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      values: { ...draft.values, [field]: value },
      updatedAt: new Date().toISOString(),
    });
    setDirty(true);
    setReview(null);
  };
  const validate = (value: DocDraft) => {
    const errors = documentErrors(value);
    if (errors.length) {
      setNotice(errors.join('\n'));
      return false;
    }
    return true;
  };
  const generate = async (value: DocDraft): Promise<DocFile> => {
    const errors = documentErrors(value);
    if (errors.length) throw Error(errors.join('\n'));
    const name = `Lekhpal-${value.template}-${value.id}`;
    const path = await generateDocumentPdf(
      name,
      documentHtml(value, stateName),
    );
    return {
      id: value.id,
      draft: value,
      path,
      name: name + '.pdf',
      at: new Date().toISOString(),
    };
  };
  const startBatch = (batch?: DocBatch) => {
    if (session.busy || operation.current) return;
    setPreview(null);
    setGenerating(true);
    void run(async () => {
      try {
        await session.generate(generate, batch);
        const b = session.store.batch;
        setNotice(
          b && b.next === b.items.length
            ? t(
                'PDFs saved. Open Saved work to print, share or export.',
                'पीडीएफ सहेजे गए। प्रिंट, साझा या निर्यात के लिए सहेजे गए कार्य खोलें।',
              )
            : t(
                'Paused. Resume from saved progress.',
                'रुका हुआ है। सहेजी प्रगति से जारी रखें।',
              ),
        );
        setReview(null);
      } finally {
        if (alive.current) setGenerating(false);
      }
    });
  };
  const matches = (d: DocDraft) =>
    [
      d.values.person,
      d.values.plot,
      d.values.village,
      d.values.date,
      docTemplate(d.template).title.en,
      docTemplate(d.template).title.hi,
    ]
      .join(' ')
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  const pending = store.batch && store.batch.next < store.batch.items.length;
  const fields: DocField[] = !draft
    ? []
    : step === 0
    ? COMMON_FIELDS
    : step === 1
    ? PERSON_FIELDS
    : [
        ...docTemplate(draft.template).fields,
        'attachments',
        'signer',
        'designation',
      ];
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingBottom: insets.bottom },
      ]}
    >
      <AppHeader
        title={t('Document automation', 'दस्तावेज़ ऑटोमेशन')}
        subtitle={stateName}
        leftIconName="arrow-left"
        onLeftPress={back}
        rightIconName="folder-outline"
        rightAccessibilityLabel="Saved work"
        onRightPress={() => {
          if (draft) leaveEditor(true);
          else {
            setLibrary(!library);
            setNotice('');
          }
        }}
      />
      {!ready ? (
        <View style={styles.content}>
          {paragraph(
            notice || t('Opening saved work…', 'सहेजे गए कार्य खुल रहे हैं…'),
          )}
          {button(t('Retry loading', 'फिर खोलें'), load, busy)}
        </View>
      ) : (
        <>
          {(generating || pending) && (
            <View
              style={[styles.progress, { backgroundColor: colors.surface }]}
            >
              {paragraph(
                `${store.batch?.next || 0} / ${
                  store.batch?.items.length || 0
                } ${t('PDFs saved', 'पीडीएफ सहेजे')}`,
              )}
              {generating ? (
                button(
                  t('Stop after this PDF', 'इस पीडीएफ के बाद रोकें'),
                  () => {
                    session.stop();
                    setNotice(
                      t(
                        'Stopping after the current PDF.',
                        'वर्तमान पीडीएफ के बाद रुक रहा है।',
                      ),
                    );
                  },
                  false,
                  true,
                )
              ) : (
                <View style={styles.row}>
                  {button(t('Resume batch', 'बैच जारी रखें'), () =>
                    startBatch(),
                  )}
                  {button(
                    t('Discard pending', 'शेष छोड़ें'),
                    () =>
                      Alert.alert(
                        t('Discard remaining work?', 'शेष कार्य छोड़ें?'),
                        t(
                          'Completed PDFs stay in Saved work.',
                          'बने हुए पीडीएफ सुरक्षित रहेंगे।',
                        ),
                        [
                          { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
                          {
                            text: t('Discard pending', 'शेष छोड़ें'),
                            onPress: () => {
                              void run(() =>
                                session.change(s => ({ ...s, batch: null })),
                              );
                            },
                          },
                        ],
                      ),
                    false,
                    true,
                  )}
                </View>
              )}
            </View>
          )}
          {!!notice && (
            <ScrollView style={styles.notice} accessibilityLiveRegion="polite">
              <Text style={{ color: colors.text }}>{notice}</Text>
            </ScrollView>
          )}
          <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              ref={scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {!draft && !library && (
                <>
                  {heading(
                    t(
                      'Write once. Prepare many.',
                      'एक बार भरें। कई पत्र बनाएं।',
                    ),
                  )}
                  {paragraph(
                    t(
                      'Reuse office details, turn facts into a letter, and prepare up to 50 PDFs from a pasted list. Hindi and English. Works offline.',
                      'कार्यालय विवरण दोबारा उपयोग करें और सूची से 50 तक पीडीएफ बनाएं। हिंदी व अंग्रेज़ी में, ऑफलाइन भी।',
                    ),
                  )}
                  {button(
                    t('Saved work', 'सहेजे गए कार्य'),
                    () => setLibrary(true),
                    busy,
                    true,
                  )}
                  {DOCUMENT_TEMPLATES.map(template => (
                    <Pressable
                      key={template.id}
                      accessibilityRole="button"
                      accessibilityLabel={template.title[language]}
                      disabled={busy}
                      style={card}
                      onPress={() => {
                        openDraft(
                          newDocDraft(
                            template.id,
                            language,
                            store.profiles[0]?.values,
                          ),
                        );
                        setDirty(true);
                      }}
                    >
                      {heading(template.title[language])}
                      {paragraph(template.description[language])}
                    </Pressable>
                  ))}
                </>
              )}
              {!draft && library && (
                <>
                  {heading(t('Drafts and PDFs', 'मसौदे और पीडीएफ'))}
                  <TextInput
                    accessibilityLabel="Search saved documents"
                    placeholder={t(
                      'Search name, plot, village or document',
                      'नाम, भूखंड, ग्राम या दस्तावेज़ खोजें',
                    )}
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    style={inputStyle}
                  />
                  {paragraph(
                    t(
                      'Saved separately for this state. Removing a library entry does not delete exported copies.',
                      'इस राज्य के लिए अलग सहेजे गए। सूची से हटाने पर निर्यात की गई प्रतियां नहीं मिटतीं।',
                    ),
                  )}
                  {!store.drafts.length &&
                    !store.files.length &&
                    paragraph(
                      t(
                        'Your saved work will appear here.',
                        'आपके सहेजे कार्य यहां दिखेंगे।',
                      ),
                    )}
                  {store.drafts.filter(matches).map(d => (
                    <View style={card} key={d.id}>
                      {heading(docTemplate(d.template).title[d.language])}
                      {paragraph(
                        `${d.values.person || '—'} · ${
                          d.values.village || '—'
                        } · ${d.values.date}`,
                      )}
                      <View style={styles.row}>
                        {button(t('Edit draft', 'मसौदा खोलें'), () =>
                          openDraft(d),
                        )}
                        {button(
                          t('Duplicate', 'प्रतिलिपि बनाएं'),
                          () => {
                            openDraft(duplicateDocumentDraft(d));
                            setDirty(true);
                          },
                          busy,
                          true,
                        )}
                        {button(
                          t('Remove draft', 'मसौदा हटाएं'),
                          () =>
                            Alert.alert(
                              t('Remove saved draft?', 'सहेजा मसौदा हटाएं?'),
                              d.values.person,
                              [
                                {
                                  text: t('Cancel', 'रद्द करें'),
                                  style: 'cancel',
                                },
                                {
                                  text: t('Remove', 'हटाएं'),
                                  onPress: () => {
                                    void run(() =>
                                      session.change(s => ({
                                        ...s,
                                        drafts: s.drafts.filter(
                                          x => x.id !== d.id,
                                        ),
                                      })),
                                    );
                                  },
                                },
                              ],
                            ),
                          busy,
                          true,
                        )}
                      </View>
                    </View>
                  ))}
                  {store.files
                    .filter(f => matches(f.draft))
                    .map(f => (
                      <View style={card} key={f.id}>
                        {heading(f.draft.values.person)}
                        {paragraph(
                          `${
                            docTemplate(f.draft.template).title[
                              f.draft.language
                            ]
                          } · ${f.draft.values.plot || '—'} · ${
                            f.draft.values.date
                          }`,
                        )}
                        <View style={styles.row}>
                          {button(t('Print PDF', 'पीडीएफ प्रिंट'), () => {
                            void run(async () => {
                              await printDocumentPdf(
                                await validateDocumentPdf(f.path),
                                f.name,
                              );
                            });
                          })}
                          {button(
                            t('Share PDF', 'पीडीएफ साझा'),
                            () => {
                              void run(async () => {
                                const path = await validateDocumentPdf(f.path);
                                await Share.open({
                                  url: 'file://' + path,
                                  type: 'application/pdf',
                                  failOnCancel: false,
                                });
                              });
                            },
                            busy,
                            true,
                          )}
                          {button(
                            t('Save to Downloads', 'डाउनलोड में सहेजें'),
                            () => {
                              void run(async () => {
                                await exportDocumentPdf(f.path);
                                setNotice(
                                  t(
                                    'Saved to Downloads / Lekhpal.',
                                    'Downloads / Lekhpal में सहेजा गया।',
                                  ),
                                );
                              });
                            },
                            busy,
                            true,
                          )}
                          {button(
                            t('Use as new draft', 'नया मसौदा बनाएं'),
                            () => {
                              openDraft(duplicateDocumentDraft(f.draft));
                              setDirty(true);
                            },
                            busy,
                            true,
                          )}
                          {button(
                            t('Remove entry', 'सूची से हटाएं'),
                            () =>
                              Alert.alert(
                                t('Remove library entry?', 'सूची से हटाएं?'),
                                f.draft.values.person,
                                [
                                  {
                                    text: t('Cancel', 'रद्द करें'),
                                    style: 'cancel',
                                  },
                                  {
                                    text: t('Remove', 'हटाएं'),
                                    onPress: () => {
                                      void run(() =>
                                        session.change(s => ({
                                          ...s,
                                          files: s.files.filter(
                                            x => x.id !== f.id,
                                          ),
                                        })),
                                      );
                                    },
                                  },
                                ],
                              ),
                            busy,
                            true,
                          )}
                        </View>
                      </View>
                    ))}
                </>
              )}
              {draft && (
                <>
                  {heading(docTemplate(draft.template).title[draft.language])}
                  <View style={styles.row}>
                    {(['hi', 'en'] as const).map(l => (
                      <React.Fragment key={l}>
                        {button(
                          l === 'hi' ? 'हिंदी' : 'English',
                          () => {
                            setDraft({ ...draft, language: l });
                            setDirty(true);
                            setReview(null);
                          },
                          busy,
                          draft.language !== l,
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                  <View style={styles.row}>
                    {[
                      t('1. Office', '1. कार्यालय'),
                      t('2. Person / plot', '2. व्यक्ति / भूखंड'),
                      t('3. Content', '3. विवरण'),
                    ].map((title, i) => (
                      <React.Fragment key={title}>
                        {button(
                          title,
                          () => {
                            setStep(i);
                            scroll.current?.scrollTo({ y: 0 });
                          },
                          busy,
                          step !== i,
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                  {step === 0 && (
                    <View style={card}>
                      {heading(
                        t(
                          'Reusable office details',
                          'कार्यालय विवरण दोबारा उपयोग करें',
                        ),
                      )}
                      {paragraph(
                        t(
                          'Only office, location and signatory details are reused. Applicant details stay separate.',
                          'केवल कार्यालय, स्थान और हस्ताक्षरकर्ता दोबारा भरेंगे। आवेदक विवरण अलग रहेंगे।',
                        ),
                      )}
                      {store.profiles.map(p => (
                        <View key={p.id} style={styles.row}>
                          {button(
                            p.name,
                            () => {
                              setDraft({
                                ...draft,
                                values: {
                                  ...draft.values,
                                  ...Object.fromEntries(
                                    PROFILE_FIELDS.map(k => [
                                      k,
                                      p.values[k] || '',
                                    ]),
                                  ),
                                },
                              });
                              setDirty(true);
                              setReview(null);
                            },
                            busy,
                            true,
                          )}
                          {button(
                            t('Remove profile', 'प्रोफाइल हटाएं'),
                            () =>
                              Alert.alert(
                                t('Remove this profile?', 'यह प्रोफाइल हटाएं?'),
                                p.name,
                                [
                                  {
                                    text: t('Cancel', 'रद्द करें'),
                                    style: 'cancel',
                                  },
                                  {
                                    text: t('Remove', 'हटाएं'),
                                    onPress: () => {
                                      void run(() =>
                                        session.change(s => ({
                                          ...s,
                                          profiles: s.profiles.filter(
                                            x => x.id !== p.id,
                                          ),
                                        })),
                                      );
                                    },
                                  },
                                ],
                              ),
                            busy,
                            true,
                          )}
                        </View>
                      ))}
                      <TextInput
                        accessibilityLabel="Office profile name"
                        placeholder={t(
                          'Profile name, e.g. village / office',
                          'प्रोफाइल नाम, जैसे ग्राम / कार्यालय',
                        )}
                        placeholderTextColor={colors.textMuted}
                        style={inputStyle}
                        value={profileName}
                        maxLength={160}
                        editable={!busy}
                        onChangeText={setProfileName}
                      />
                      {button(
                        t('Save office profile', 'कार्यालय प्रोफाइल सहेजें'),
                        () => {
                          void run(async () => {
                            if (
                              !profileName.trim() ||
                              !draft.values.office?.trim()
                            )
                              throw Error(
                                t(
                                  'Enter a profile name and office first.',
                                  'पहले प्रोफाइल नाम और कार्यालय भरें।',
                                ),
                              );
                            await session.change(s => ({
                              ...s,
                              profiles: [
                                {
                                  id: docId(),
                                  name: profileName.trim(),
                                  values: Object.fromEntries(
                                    PROFILE_FIELDS.map(k => [
                                      k,
                                      draft.values[k] || '',
                                    ]),
                                  ),
                                },
                                ...s.profiles.filter(
                                  p => p.name !== profileName.trim(),
                                ),
                              ],
                            }));
                            setNotice(
                              t(
                                'Office profile saved for reuse.',
                                'कार्यालय प्रोफाइल सहेजा गया।',
                              ),
                            );
                          });
                        },
                        busy,
                        true,
                      )}
                    </View>
                  )}
                  {fields.map(field => (
                    <View key={field} style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>
                        {field === 'signer' &&
                        ['application', 'correction', 'demarcation'].includes(
                          draft.template,
                        )
                          ? draft.language === 'hi'
                            ? 'तैयारकर्ता (वैकल्पिक)'
                            : 'Prepared by (optional)'
                          : FIELD_LABELS[field][draft.language]}
                      </Text>
                      <TextInput
                        accessibilityLabel={FIELD_LABELS[field].en}
                        editable={!busy}
                        style={[
                          ...inputStyle,
                          LONG_FIELDS.includes(field) && styles.multiline,
                        ]}
                        value={draft.values[field] || ''}
                        multiline={LONG_FIELDS.includes(field)}
                        maxLength={LONG_FIELDS.includes(field) ? 6000 : 400}
                        onChangeText={value => changeField(field, value)}
                      />
                    </View>
                  ))}
                  {step < 2 ? (
                    button(t('Next', 'अगला'), () => {
                      setStep(step + 1);
                      scroll.current?.scrollTo({ y: 0 });
                    })
                  ) : (
                    <>
                      {button(t('Preview document', 'दस्तावेज़ देखें'), () => {
                        if (validate(draft)) setPreview(draft);
                      })}
                      <View style={card}>
                        {heading(
                          t('Prepare multiple PDFs', 'कई पीडीएफ एक साथ बनाएं'),
                        )}
                        {paragraph(
                          t(
                            'One person / plot per line. Use exactly 5 columns separated by |. Blank columns are allowed except Name. Shared content is reused for every row; check it applies to everyone.',
                            'हर पंक्ति में एक व्यक्ति / भूखंड। | से अलग 5 कॉलम रखें। नाम के अलावा कॉलम खाली रख सकते हैं। साझा विवरण सभी पर लागू होने की जांच करें।',
                          ),
                        )}
                        {paragraph(
                          'Name | Parent/spouse | Address | Plot | Khata\nराम कुमार | श्याम लाल | ग्राम रामपुर | 125 | 42',
                        )}
                        <TextInput
                          accessibilityLabel="Batch rows"
                          style={[...inputStyle, styles.multiline]}
                          multiline
                          maxLength={105000}
                          value={rows}
                          editable={!busy}
                          onChangeText={value => {
                            setRows(value);
                            setReview(null);
                          }}
                        />
                        {button(
                          t('Review batch', 'बैच जांचें'),
                          () => {
                            try {
                              const b = makeDocumentBatch(draft, rows);
                              setReview(b);
                              setNotice('');
                            } catch (e) {
                              setNotice(String((e as Error).message));
                            }
                          },
                          busy || !!pending,
                          true,
                        )}
                        {review && (
                          <>
                            {paragraph(
                              `${review.items.length} ${t(
                                'documents. Tap any row to preview its filled letter.',
                                'दस्तावेज़। भरा पत्र देखने के लिए पंक्ति दबाएं।',
                              )}`,
                            )}
                            {review.items.map((d, i) => (
                              <React.Fragment key={d.id}>
                                {button(
                                  `${i + 1}. ${d.values.person} · ${
                                    d.values.plot || '—'
                                  }`,
                                  () => setPreview(d),
                                  busy,
                                  true,
                                )}
                              </React.Fragment>
                            ))}
                            {button(
                              t(
                                `Generate ${review.items.length} PDFs`,
                                `${review.items.length} पीडीएफ बनाएं`,
                              ),
                              () => startBatch(review),
                              busy || !!pending,
                            )}
                          </>
                        )}
                      </View>
                    </>
                  )}
                  {button(
                    t('Save draft', 'मसौदा सहेजें'),
                    () => {
                      void run(async () => {
                        await session.change(s => saveDocumentDraft(s, draft));
                        setDirty(false);
                        setNotice(t('Draft saved.', 'मसौदा सहेजा गया।'));
                      });
                    },
                    busy,
                    true,
                  )}
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </>
      )}
      <Modal
        visible={!!preview}
        animationType="slide"
        onRequestClose={() => setPreview(null)}
      >
        <View
          style={[
            styles.root,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <AppHeader
            title={t('Document preview', 'दस्तावेज़ पूर्वावलोकन')}
            leftIconName="arrow-left"
            onLeftPress={() => setPreview(null)}
          />
          {preview && (
            <WebView
              style={styles.root}
              source={{ html: documentHtml(preview, stateName) }}
              javaScriptEnabled={false}
              originWhitelist={['about:blank']}
              onShouldStartLoadWithRequest={r => r.url === 'about:blank'}
            />
          )}
          <View style={styles.content}>
            {paragraph(
              t(
                'Review all details before printing or signing.',
                'प्रिंट या हस्ताक्षर से पहले सभी विवरण जांचें।',
              ),
            )}
            {preview &&
              button(
                t('Save this PDF', 'यह पीडीएफ सहेजें'),
                () => {
                  const item = { ...preview, id: docId() };
                  startBatch({ id: docId(), items: [item], next: 0 });
                },
                busy || !!pending,
              )}
            {button(
              t('Back to editing', 'संपादन पर वापस'),
              () => setPreview(null),
              false,
              true,
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  heading: { ...typography.heading },
  body: { ...typography.body, lineHeight: 23 },
  label: { ...typography.label, marginBottom: 6 },
  field: { gap: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { ...typography.label, textAlign: 'center' },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 50,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  progress: { padding: 12, gap: 8 },
  notice: {
    flexGrow: 0,
    maxHeight: 130,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
});
