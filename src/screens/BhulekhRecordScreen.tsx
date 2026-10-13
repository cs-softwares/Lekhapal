import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppScreen from '../components/AppScreen';
import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import {
  KHATAUNI_COPY_SCRIPT,
  PLOT_SALE_SCRIPT,
  PLOT_DISPUTE_SCRIPT,
  backToKhatauniPlace,
  selectKhatauniPlace,
} from '../utils/khatauniCopyPresentation';

type Props = {
  navigation: { goBack: () => void };
  service: 'copy' | 'sale' | 'dispute';
};
type Level = 'district' | 'tehsil' | 'village';
const LEVELS: Level[] = ['district', 'tehsil', 'village'];
const HOME = 'https://upbhulekh.gov.in/#/home';

export default function BhulekhRecordScreen({ navigation, service }: Props) {
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const isSale = service === 'sale';
  const isDispute = service === 'dispute';
  const script = isDispute
    ? PLOT_DISPUTE_SCRIPT
    : isSale
    ? PLOT_SALE_SCRIPT
    : KHATAUNI_COPY_SCRIPT;
  const title = isDispute
    ? t('Plot Dispute Status', 'भूखण्ड / गाटा वाद स्थिति')
    : isSale
    ? t('Plot Sale Status', 'भूखण्ड / गाटा विक्रय स्थिति')
    : t('Khatauni Copy', 'खतौनी की नकल');
  const web = useRef<WebView>(null);
  const [key, setKey] = useState(0);
  const [stage, setStage] = useState<'loading' | 'location' | 'official'>(
    'loading',
  );
  const [level, setLevel] = useState<Level>('district');
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<Partial<Record<Level, string>>>({});
  const restoreLocation = useRef<Partial<Record<Level, string>> | null>(null);
  const [picker, setPicker] = useState<Level | null>(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const labels = {
    district: t('District / जिला', 'जिला / District'),
    tehsil: t('Tehsil / तहसील', 'तहसील / Tehsil'),
    village: t('Village / ग्राम', 'ग्राम / Village'),
  };
  const beginWait = useCallback(() => {
    setWaiting(true);
    setError(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setWaiting(false);
      setError(true);
    }, 25000);
  }, []);
  const back = useCallback(() => {
    if (picker) setPicker(null);
    else if (stage === 'location' && level !== 'district' && !waiting) {
      const previous = level === 'village' ? 'tehsil' : 'district';
      restoreLocation.current = null;
      setChoices([]);
      setSelected(value =>
        previous === 'tehsil' ? { district: value.district } : {},
      );
      beginWait();
      web.current?.injectJavaScript(backToKhatauniPlace(previous));
    } else if (stage === 'official' && canGoBack) web.current?.goBack();
    else navigation.goBack();
  }, [picker, stage, level, waiting, beginWait, canGoBack, navigation]);
  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        back();
        return true;
      });
      return () => listener.remove();
    }, [back]),
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  // If the official service presents a verification step, leave it visible.
  useEffect(() => {
    const fallback = setTimeout(
      () => setStage(value => (value === 'loading' ? 'official' : value)),
      12000,
    );
    return () => clearTimeout(fallback);
  }, [key]);
  function retry() {
    clearTimeout(timer.current);
    restoreLocation.current = null;
    setError(false);
    setWaiting(false);
    setPicker(null);
    setSelected({});
    setChoices([]);
    setLevel('district');
    setStage('loading');
    setKey(value => value + 1);
  }
  function openPicker(next: Level) {
    setFilter('');
    setPicker(next);
    if (next !== level && next !== 'village') {
      setChoices([]);
      beginWait();
      web.current?.injectJavaScript(backToKhatauniPlace(next));
    }
  }
  function choose(name: string) {
    setSelected(previous => ({
      ...(level !== 'district' ? { district: previous.district } : {}),
      ...(level === 'village' ? { tehsil: previous.tehsil } : {}),
      [level]: name,
    }));
    setPicker(null);
    beginWait();
    web.current?.injectJavaScript(selectKhatauniPlace(name));
  }
  const card = { backgroundColor: colors.surface, borderColor: colors.border };
  return (
    <AppScreen scroll={false}>
      <AppHeader
        title={title}
        leftIconName="arrow-left"
        onLeftPress={back}
        rightIconName="refresh"
        rightAccessibilityLabel={
          isDispute
            ? t('Reload Plot Dispute Status', 'वाद स्थिति दोबारा लोड करें')
            : isSale
            ? t('Reload Plot Sale Status', 'विक्रय स्थिति दोबारा लोड करें')
            : t('Reload Khatauni Copy', 'खतौनी दोबारा लोड करें')
        }
        onRightPress={retry}
      />
      <View style={[styles.fill, { marginBottom: insets.bottom }]}>
        <View
          collapsable={false}
          style={styles.fill}
          pointerEvents={stage === 'official' ? 'auto' : 'none'}
          importantForAccessibility={
            stage === 'official' ? 'auto' : 'no-hide-descendants'
          }
          accessibilityElementsHidden={stage !== 'official'}
        >
          <WebView
            ref={web}
            key={key}
            source={{ uri: HOME }}
            style={styles.fill}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            setSupportMultipleWindows={false}
            injectedJavaScriptBeforeContentLoaded={script}
            injectedJavaScript={script}
            onLoadEnd={() => web.current?.injectJavaScript(script)}
            onNavigationStateChange={state =>
              setCanGoBack(
                state.canGoBack &&
                  state.url !== HOME &&
                  !state.url.endsWith('#/selection'),
              )
            }
            onError={() => setError(true)}
            onHttpError={event => {
              if (event.nativeEvent.url === HOME) setError(true);
            }}
            onMessage={event => {
              if (
                !/^https:\/\/upbhulekh\.gov\.in(?:\/|$)/.test(
                  event.nativeEvent.url,
                )
              )
                return;
              try {
                const message = JSON.parse(event.nativeEvent.data);
                if (
                  message.type === 'bhulekh-service' &&
                  message.status === 'unavailable'
                ) {
                  setError(true);
                  return;
                }
                if (message.type !== 'khatauni-copy') return;
                if (service !== 'copy' && message.stage === 'change-location') {
                  restoreLocation.current = { ...selected };
                  setStage('location');
                  setPicker(null);
                  beginWait();
                  return;
                }
                if (
                  message.stage === 'location' &&
                  LEVELS.includes(message.level) &&
                  Array.isArray(message.choices) &&
                  message.choices.every(
                    (item: unknown) => typeof item === 'string',
                  )
                ) {
                  setStage('location');
                  setLevel(message.level);
                  setChoices(message.choices);
                  const restore = restoreLocation.current;
                  if (restore && message.level !== 'village') {
                    const name = restore[message.level as Level];
                    if (message.choices.length === 0) return;
                    if (name && message.choices.includes(name)) {
                      delete restore[message.level as Level];
                      beginWait();
                      web.current?.injectJavaScript(selectKhatauniPlace(name));
                      return;
                    }
                    setSelected({});
                  }
                  restoreLocation.current = null;
                  clearTimeout(timer.current);
                  setWaiting(false);
                  setError(false);
                } else if (message.stage === 'official') {
                  if (restoreLocation.current) return;
                  setStage('official');
                  setPicker(null);
                  clearTimeout(timer.current);
                  setWaiting(false);
                  setError(false);
                }
              } catch {
                /* Ignore messages unrelated to this service. */
              }
            }}
          />
        </View>
        {stage !== 'official' && (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.background },
            ]}
          >
            {stage === 'loading' ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  {isDispute
                    ? t(
                        'Loading Plot Dispute Status…',
                        'वाद स्थिति लोड हो रही है…',
                      )
                    : isSale
                    ? t(
                        'Loading Plot Sale Status…',
                        'विक्रय स्थिति लोड हो रही है…',
                      )
                    : t('Loading Khatauni Copy…', 'खतौनी सेवा लोड हो रही है…')}
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.heading, { color: colors.text }]}>
                  {t('Choose location', 'स्थान चुनें')}
                </Text>
                <View style={[styles.card, card]}>
                  {LEVELS.map((item, index) => {
                    const disabled = waiting || index > LEVELS.indexOf(level);
                    return (
                      <View key={item} style={styles.field}>
                        <Text style={[styles.label, { color: colors.text }]}>
                          {labels[item]}
                        </Text>
                        <AppPressable
                          accessibilityLabel={`Choose ${item}`}
                          disabled={disabled}
                          accessibilityState={{ disabled }}
                          onPress={() => openPicker(item)}
                          style={[
                            styles.select,
                            { borderColor: colors.border },
                            disabled && styles.disabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.value,
                              styles.fill,
                              {
                                color: selected[item]
                                  ? colors.text
                                  : colors.textMuted,
                              },
                            ]}
                          >
                            {selected[item] ||
                              `${t('Choose', 'चुनें')} ${labels[item]}`}
                          </Text>
                          <Icon
                            name="chevron-down"
                            size={20}
                            color={colors.primary}
                          />
                        </AppPressable>
                      </View>
                    );
                  })}
                </View>
                {waiting && <ActivityIndicator color={colors.primary} />}
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  {isDispute
                    ? t(
                        'Choose your village, then search by Gata number to check the official plot dispute status.',
                        'ग्राम चुनें, फिर गाटा संख्या से भूखण्ड की आधिकारिक वाद स्थिति खोजें।',
                      )
                    : isSale
                    ? t(
                        'Choose your village, then search by Gata number to check the official plot sale status.',
                        'ग्राम चुनें, फिर गाटा संख्या से भूखण्ड की आधिकारिक विक्रय स्थिति खोजें।',
                      )
                    : t(
                        'Choose your village to search by Gata number, Khata number or holder name and view the official copy.',
                        'ग्राम चुनने के बाद गाटा संख्या, खाता संख्या या खातेदार के नाम से खोजें और खतौनी देखें।',
                      )}
                </Text>
                <Text style={[styles.source, { color: colors.textMuted }]}>
                  {t('Source: UP Bhulekh', 'स्रोत: उत्तर प्रदेश भूलेख')}
                </Text>
              </ScrollView>
            )}
          </View>
        )}
        {error && (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.center,
              { backgroundColor: colors.background },
            ]}
          >
            <Text style={[styles.heading, { color: colors.text }]}>
              {isDispute
                ? t(
                    'Could not load Plot Dispute Status',
                    'वाद स्थिति लोड नहीं हो सकी',
                  )
                : isSale
                ? t(
                    'Could not load Plot Sale Status',
                    'विक्रय स्थिति लोड नहीं हो सकी',
                  )
                : t('Could not load Khatauni', 'खतौनी लोड नहीं हो सकी')}
            </Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {t(
                'The official service did not respond. Please try again.',
                'आधिकारिक सेवा से जवाब नहीं मिला। दोबारा प्रयास करें।',
              )}
            </Text>
            <AppPressable
              onPress={retry}
              style={[styles.retry, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.white}>
                {t('Retry', 'दोबारा प्रयास करें')}
              </Text>
            </AppPressable>
          </View>
        )}
      </View>
      <Modal
        visible={picker !== null}
        transparent
        animationType="none"
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.modal}>
          <Pressable
            style={styles.backdrop}
            accessibilityLabel="Close choices"
            onPress={() => setPicker(null)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text
                style={[styles.heading, styles.fill, { color: colors.text }]}
              >
                {picker ? labels[picker] : ''}
              </Text>
              <AppPressable onPress={() => setPicker(null)} style={styles.done}>
                <Text style={{ color: colors.primary }}>
                  {t('Done', 'हो गया')}
                </Text>
              </AppPressable>
            </View>
            <TextInput
              accessibilityLabel="Find location"
              value={filter}
              onChangeText={setFilter}
              placeholder={t('Search by name or code', 'नाम या कोड से खोजें')}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
              ]}
            />
            {waiting ? (
              <ActivityIndicator style={styles.done} color={colors.primary} />
            ) : (
              <FlatList
                data={choices.filter(name =>
                  name.toLowerCase().includes(filter.trim().toLowerCase()),
                )}
                keyExtractor={name => name}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={[styles.hint, { color: colors.textMuted }]}>
                    {t('No locations found.', 'कोई स्थान नहीं मिला।')}
                  </Text>
                }
                renderItem={({ item }) => (
                  <AppPressable
                    accessibilityLabel={item}
                    onPress={() => choose(item)}
                    style={[
                      styles.choice,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.value, { color: colors.text }]}>
                      {item}
                    </Text>
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
  fill: { flex: 1 },
  content: { padding: 20 },
  heading: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 22 },
  field: { marginBottom: 12 },
  label: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
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
  hint: { fontSize: 13, lineHeight: 20, marginTop: 10 },
  source: { fontSize: 11, textAlign: 'center', marginTop: 24 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  retry: { marginTop: 20, minHeight: 48, padding: 14, borderRadius: 12 },
  white: { color: '#fff' },
  modal: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A66',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center' },
  done: { padding: 12, minHeight: 44 },
  input: {
    minHeight: 50,
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  choice: {
    paddingVertical: 16,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
