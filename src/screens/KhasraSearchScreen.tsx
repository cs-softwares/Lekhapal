import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import AppScreen from '../components/AppScreen';
import AppPressable from '../components/AppPressable';
import { useAppTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getKhasraPlaces,
  KHASRA_YEARS,
  KhasraPlace,
  KhasraResult,
  KhasraSearchMode,
  normalizeKhasraQuery,
  searchKhasra,
} from '../services/khasraPublic';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'KhasraSearch'>;
type Picker = 'district' | 'tehsil' | 'village' | 'year';
const MODES: { id: KhasraSearchMode; en: string; hi: string; icon: string }[] =
  [
    {
      id: 'K',
      en: 'Khasra number',
      hi: 'खसरा संख्या',
      icon: 'map-search-outline',
    },
    { id: 'UC', en: 'Unique code', hi: 'यूनिक कोड', icon: 'barcode' },
    {
      id: 'KH',
      en: 'Khata number',
      hi: 'खाता संख्या',
      icon: 'file-document-outline',
    },
    {
      id: 'N',
      en: 'Holder name',
      hi: 'खातेदार का नाम',
      icon: 'account-outline',
    },
  ];

export default function KhasraSearchScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const [district, setDistrict] = useState<KhasraPlace>();
  const [tehsil, setTehsil] = useState<KhasraPlace>();
  const [village, setVillage] = useState<KhasraPlace>();
  const [year, setYear] = useState(KHASRA_YEARS[0]);
  const [mode, setMode] = useState<KhasraSearchMode>('K');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KhasraResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState<Picker | null>(null);
  const [choices, setChoices] = useState<KhasraPlace[]>([]);
  const [filter, setFilter] = useState('');
  const [loadingChoices, setLoadingChoices] = useState(false);
  const [choiceError, setChoiceError] = useState(false);
  const [retry, setRetry] = useState(0);
  const searchRequest = useRef<AbortController | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const scroll = useRef<ScrollView>(null);
  useEffect(
    () => () => {
      searchRequest.current?.abort();
      clearTimeout(searchTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!picker) return;
    setFilter('');
    setChoiceError(false);
    setChoices([]);
    if (picker === 'year') {
      setLoadingChoices(false);
      setChoices(KHASRA_YEARS.map(value => ({ code: value, name: value })));
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      setLoadingChoices(false);
      setChoiceError(true);
    }, 20000);
    setLoadingChoices(true);
    getKhasraPlaces(
      picker === 'district' ? undefined : district?.code,
      picker === 'village' ? tehsil?.code : undefined,
      controller.signal,
    )
      .then(rows => {
        if (!controller.signal.aborted) setChoices(rows);
      })
      .catch(() => {
        if (!controller.signal.aborted) setChoiceError(true);
      })
      .finally(() => {
        clearTimeout(timer);
        if (!controller.signal.aborted) setLoadingChoices(false);
      });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [picker, district?.code, tehsil?.code, retry]);

  function clearSearch() {
    searchRequest.current?.abort();
    clearTimeout(searchTimer.current);
    setBusy(false);
    setResults(null);
    setError('');
  }
  function select(place: KhasraPlace) {
    clearSearch();
    if (picker === 'district') {
      setDistrict(place);
      setTehsil(undefined);
      setVillage(undefined);
    }
    if (picker === 'tehsil') {
      setTehsil(place);
      setVillage(undefined);
    }
    if (picker === 'village') setVillage(place);
    if (picker === 'year') setYear(place.code);
    setPicker(null);
  }
  async function search() {
    if (!village || busy) return;
    Keyboard.dismiss();
    clearSearch();
    try {
      normalizeKhasraQuery(mode, query);
    } catch {
      setError(
        mode === 'UC'
          ? t(
              'Enter a 16-digit unique code.',
              '16 अंकों का यूनिक कोड दर्ज करें।',
            )
          : mode === 'KH'
          ? t(
              'Enter a Khata number of up to 5 digits.',
              'अधिकतम 5 अंकों की खाता संख्या दर्ज करें।',
            )
          : t('Enter a search value.', 'खोजने के लिए जानकारी दर्ज करें।'),
      );
      return;
    }
    const controller = new AbortController();
    searchRequest.current = controller;
    setBusy(true);
    searchTimer.current = setTimeout(() => {
      controller.abort();
      setBusy(false);
      setError(
        t(
          'The service took too long. Please try again.',
          'सेवा में अधिक समय लगा। दोबारा प्रयास करें।',
        ),
      );
    }, 20000);
    try {
      const rows = await searchKhasra(
        village.code,
        year,
        mode,
        query,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setResults(rows);
        requestAnimationFrame(() =>
          scroll.current?.scrollToEnd({ animated: false }),
        );
      }
    } catch {
      if (!controller.signal.aborted)
        setError(
          t(
            'Khasra search is unavailable. Please try again.',
            'खसरा खोज उपलब्ध नहीं है। दोबारा प्रयास करें।',
          ),
        );
    } finally {
      if (searchRequest.current === controller)
        clearTimeout(searchTimer.current);
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const card = { backgroundColor: colors.surface, borderColor: colors.border };
  const input = {
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };
  const pickerTitles = {
    district: t('Choose district', 'जनपद चुनें'),
    tehsil: t('Choose tehsil', 'तहसील चुनें'),
    village: t('Choose village', 'ग्राम चुनें'),
    year: t('Choose Fasli year', 'फसली वर्ष चुनें'),
  };
  const placeFields: {
    key: Picker;
    label: string;
    value?: KhasraPlace;
    disabled: boolean;
  }[] = [
    {
      key: 'district',
      label: t('District', 'जनपद'),
      value: district,
      disabled: false,
    },
    {
      key: 'tehsil',
      label: t('Tehsil', 'तहसील'),
      value: tehsil,
      disabled: !district,
    },
    {
      key: 'village',
      label: t('Village', 'ग्राम'),
      value: village,
      disabled: !tehsil,
    },
  ];
  const filtered = choices.filter(item =>
    `${item.name} ${item.english || ''} ${item.code}`
      .toLocaleLowerCase()
      .includes(filter.trim().toLocaleLowerCase()),
  );
  return (
    <AppScreen scroll={false}>
      <AppHeader
        title={t('Khasra Dekhein', 'खसरा देखें')}
        leftIconName="arrow-left"
        onLeftPress={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          <Text style={[styles.heading, { color: colors.text }]}>
            {t('Choose location', 'स्थान चुनें')}
          </Text>
          <View style={[styles.card, card]}>
            {placeFields.map(field => (
              <View key={field.key} style={styles.field}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  {field.label}
                </Text>
                <AppPressable
                  accessibilityLabel={pickerTitles[field.key]}
                  accessibilityState={{ disabled: field.disabled }}
                  disabled={field.disabled}
                  onPress={() => {
                    Keyboard.dismiss();
                    setPicker(field.key);
                  }}
                  style={[
                    styles.select,
                    { borderColor: colors.border },
                    field.disabled && styles.disabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.grow,
                      styles.value,
                      { color: field.value ? colors.text : colors.textMuted },
                    ]}
                  >
                    {field.value?.name || pickerTitles[field.key]}
                  </Text>
                  <Icon name="chevron-down" size={20} color={colors.primary} />
                </AppPressable>
              </View>
            ))}
          </View>
          <Text style={[styles.heading, { color: colors.text }]}>
            {t('Search Khasra', 'खसरा खोजें')}
          </Text>
          <View style={[styles.card, card]}>
            <AppPressable
              accessibilityLabel={pickerTitles.year}
              onPress={() => {
                Keyboard.dismiss();
                setPicker('year');
              }}
              style={[styles.year, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.grow, styles.label, { color: colors.textMuted }]}
              >
                {t('Fasli year', 'फसली वर्ष')}
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>{year}</Text>
              <Icon name="chevron-down" size={20} color={colors.primary} />
            </AppPressable>
            <View style={styles.modes}>
              {MODES.map(item => (
                <AppPressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityLabel={t(item.en, item.hi)}
                accessibilityState={{ checked: item.id === mode }}
                containerStyle={styles.modeContainer}
                  onPress={() => {
                    clearSearch();
                    setMode(item.id);
                    setQuery('');
                  }}
                  style={[
                    styles.mode,
                    {
                      backgroundColor:
                        item.id === mode ? colors.primary : colors.surfaceAlt,
                      borderColor:
                        item.id === mode ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={19}
                    color={item.id === mode ? '#FFFFFF' : colors.primary}
                  />
                  <Text
                    style={[
                      styles.modeLabel,
                      { color: colors.text },
                      item.id === mode && styles.selectedText,
                    ]}
                  >
                    {t(item.en, item.hi)}
                  </Text>
                </AppPressable>
              ))}
            </View>
            <TextInput
              accessibilityLabel={t(
                'Khasra search value',
                'खसरा खोज की जानकारी',
              )}
              value={query}
              onChangeText={value => {
                clearSearch();
                setQuery(value);
              }}
              placeholder={
                mode === 'N'
                  ? t('Enter name in Hindi', 'हिन्दी में नाम दर्ज करें')
                  : t('Enter number', 'संख्या दर्ज करें')
              }
              placeholderTextColor={colors.textMuted}
              keyboardType={
                mode === 'N' || mode === 'K' ? 'default' : 'number-pad'
              }
              maxLength={mode === 'UC' ? 16 : mode === 'KH' ? 5 : 100}
              autoCorrect={false}
              onSubmitEditing={search}
              returnKeyType="search"
              style={[styles.input, input]}
            />
            {!village && (
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                {t(
                  'Choose your district, tehsil and village first.',
                  'पहले जनपद, तहसील और ग्राम चुनें।',
                )}
              </Text>
            )}
            {error ? (
              <Text
                accessibilityRole="alert"
                style={[styles.hint, { color: colors.text }]}
              >
                {error}
              </Text>
            ) : null}
            <AppPressable
              accessibilityLabel={t('Search Khasra', 'खसरा खोजें')}
              disabled={!village || busy}
              accessibilityState={{ disabled: !village || busy, busy }}
              onPress={search}
              style={[
                styles.search,
                { backgroundColor: colors.primary },
                (!village || busy) && styles.disabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Icon name="magnify" size={22} color="#FFFFFF" />
              )}
              <Text style={styles.searchText}>
                {busy ? t('Searching…', 'खोज जारी है…') : t('Search', 'खोजें')}
              </Text>
            </AppPressable>
          </View>
          {results !== null && (
            <View>
              <Text style={[styles.heading, { color: colors.text }]}>
                {t('Search results', 'खोज परिणाम')} · {results.length}
              </Text>
              {results.length === 0 && (
                <Text style={[styles.empty, card, { color: colors.textMuted }]}>
                  {t(
                    'No matching records found. Check the year and search value.',
                    'कोई रिकॉर्ड नहीं मिला। वर्ष और खोज की जानकारी जाँचें।',
                  )}
                </Text>
              )}
              {results.map((row, index) => (
                <View
                  key={`${row.gata_unique_code}-${index}`}
                  style={[styles.card, card]}
                >
                  <Text
                    selectable
                    style={[styles.resultTitle, { color: colors.text }]}
                  >
                    {t('Khasra', 'खसरा')} {row.khasra_no}
                  </Text>
                  {[
                    [t('Unique code', 'यूनिक कोड'), row.gata_unique_code],
                    [t('Fasli year', 'फसली वर्ष'), row.fasal_year],
                    [t('Area', 'क्षेत्रफल'), row.area],
                    [t('Khata number', 'खाता संख्या'), row.khataNumber],
                    [t('Holder name', 'खातेदार का नाम'), row.name],
                  ]
                    .filter(([, value]) => value != null && value !== '')
                    .map(([label, value]) => (
                      <View key={String(label)} style={styles.resultRow}>
                        <Text
                          style={[
                            styles.resultLabel,
                            { color: colors.textMuted },
                          ]}
                        >
                          {label}
                        </Text>
                        <Text
                          selectable
                          style={[styles.resultValue, { color: colors.text }]}
                        >
                          {String(value)}
                        </Text>
                      </View>
                    ))}
                </View>
              ))}
            </View>
          )}
          <Text style={[styles.source, { color: colors.textMuted }]}>
            {t(
              'Source: UP eKhasra · Public search',
              'स्रोत: उत्तर प्रदेश ई-खसरा · सार्वजनिक खोज',
            )}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={picker !== null}
        transparent
        animationType="none"
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.modal}>
          <Pressable
            accessibilityLabel={t('Close choices', 'विकल्प बंद करें')}
            style={styles.backdrop}
            onPress={() => setPicker(null)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + 12,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {picker ? pickerTitles[picker] : ''}
              </Text>
              <AppPressable
                accessibilityLabel={t('Done', 'हो गया')}
                onPress={() => setPicker(null)}
                style={styles.done}
              >
                <Text style={{ color: colors.primary }}>
                  {t('Done', 'हो गया')}
                </Text>
              </AppPressable>
            </View>
            {picker !== 'year' && (
              <TextInput
                accessibilityLabel={t('Find location', 'स्थान खोजें')}
                value={filter}
                onChangeText={setFilter}
                placeholder={t('Search by name or code', 'नाम या कोड से खोजें')}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, input]}
              />
            )}
            {loadingChoices ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : choiceError ? (
              <View style={styles.loader}>
                <Text style={{ color: colors.text }}>
                  {t('Could not load places.', 'स्थान लोड नहीं हो सके।')}
                </Text>
                <AppPressable
                  accessibilityLabel={t('Retry', 'दोबारा प्रयास करें')}
                  onPress={() => setRetry(value => value + 1)}
                  style={styles.done}
                >
                  <Text style={{ color: colors.primary }}>
                    {t('Retry', 'दोबारा प्रयास करें')}
                  </Text>
                </AppPressable>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={item => item.code}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={[styles.hint, { color: colors.textMuted }]}>
                    {t('No places found.', 'कोई स्थान नहीं मिला।')}
                  </Text>
                }
                renderItem={({ item }) => (
                  <AppPressable
                    accessibilityLabel={item.name}
                    onPress={() => select(item)}
                    style={[
                      styles.choice,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.grow,
                        styles.value,
                        { color: colors.text },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {picker === 'village' && (
                      <Text style={{ color: colors.textMuted }}>
                        {item.code}
                      </Text>
                    )}
                  </AppPressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  selectedText: { color: '#FFFFFF' },
  fill: { flex: 1 },
  grow: { flex: 1, minWidth: 0 },
  content: { padding: 20 },
  heading: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 22 },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    minHeight: 48,
  },
  value: { fontSize: 14, lineHeight: 21 },
  disabled: { opacity: 0.45 },
  year: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  modeContainer: {
    width: '48%',
    flexGrow: 1,
  },
  mode: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeLabel: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  input: {
    minHeight: 50,
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hint: { fontSize: 13, lineHeight: 20, marginTop: 10 },
  search: {
    minHeight: 50,
    marginTop: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  resultTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
  },
  resultLabel: { flex: 1, fontSize: 12, lineHeight: 20 },
  resultValue: { flex: 1.6, fontSize: 14, lineHeight: 21 },
  empty: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    fontSize: 14,
    lineHeight: 21,
  },
  source: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 2 },
  modal: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F172A66',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  done: { padding: 12, minHeight: 44 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  loader: { padding: 24, alignItems: 'center' },
});
