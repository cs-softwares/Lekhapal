import { typography } from '../theme/typography';
import PremiumStatus from '../components/premium/PremiumStatus';
import { RELEASE_FEATURES } from '../config/releaseFeatures';
import React, { useRef, useState } from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import AppScreen from '../components/AppScreen';
import {
  ProfileReveal,
  ProfileRow,
  useProfileMotion,
} from '../components/profile/ProfileUI';
import { useAppTheme } from '../context/ThemeContext';
import { useAuthSession } from '../context/AuthSessionContext';
import { useLanguage } from '../context/LanguageContext';
import { useDesk } from '../context/DeskContext';
import { useSelectedState } from '../context/SelectedStateContext';
import { INDIA_STATE_OPTIONS } from '../data/stateDashboardCatalog';

type Sheet = 'edit' | 'language' | 'appearance' | 'help' | null;
export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const focused = useIsFocused();
  const { colors, isDarkTheme, setThemeMode } = useAppTheme();
  const { language, setLanguage } = useLanguage();
  const { session, signOut } = useAuthSession();
  const { state, commit } = useDesk();
  const { stateCode } = useSelectedState();
  const insets = useSafeAreaInsets();
  const motion = useProfileMotion();
  const buttonTextColor = isDarkTheme ? '#0B1120' : '#FFFFFF';
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [name, setName] = useState('');
  const [circle, setCircle] = useState('');
  const [nameError, setNameError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  const nameInput = useRef<TextInput>(null);
  const authenticated = !!session && !session.isGuest;
  const displayName =
    state.settings.officer.trim() ||
    (authenticated ? session?.displayName.trim() : '') ||
    t('Your workspace', 'आपका कार्यक्षेत्र');
  const initials =
    state.settings.officer.trim() ||
    (authenticated ? session?.displayName.trim() : '');
  const avatarText = initials
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => Array.from(p)[0])
    .join('')
    .toLocaleUpperCase();
  const selectedState = INDIA_STATE_OPTIONS.find(
    item => item.code === stateCode,
  );
  const openEdit = () => {
    setName(
      state.settings.officer ||
        (authenticated ? session?.displayName : '') ||
        '',
    );
    setCircle(state.settings.circle);
    setNameError('');
    setSaved(false);
    setSheet('edit');
  };
  const closeSheet = () => {
    if (!pending.current) setSheet(null);
  };
  const save = async () => {
    if (pending.current) return;
    if (!name.trim()) {
      setNameError(t('Please enter your name.', 'कृपया अपना नाम भरें।'));
      nameInput.current?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      await commit('', current => ({
        ...current,
        settings: {
          ...current.settings,
          officer: name.trim(),
          circle: circle.trim(),
        },
      }));
      setSheet(null);
      setSaved(true);
    } catch {
      Alert.alert(
        t('Profile not saved', 'प्रोफाइल सेव नहीं हुई'),
        t(
          'Your changes are still here. Please try again.',
          'आपके बदलाव यहीं हैं। कृपया फिर कोशिश करें।',
        ),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const logOut = () =>
    Alert.alert(
      t('Sign out of the app?', 'ऐप से साइन आउट करें?'),
      t(
        'Your saved work stays on this device.',
        'आपका सेव किया कार्य इस डिवाइस पर रहेगा।',
      ),
      [
        { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
        {
          text: t('Sign out', 'साइन आउट'),
          style: 'destructive',
          onPress: async () => {
            if (pending.current) return;
            pending.current = true;
            setBusy(true);
            try {
              await signOut();
              let root = navigation;
              while (root.getParent?.()) root = root.getParent();
              root.reset({ index: 0, routes: [{ name: 'Login' }] });
            } catch {
              Alert.alert(
                t('Could not sign out', 'साइन आउट नहीं हुआ'),
                t('Please try again.', 'कृपया फिर कोशिश करें।'),
              );
            } finally {
              pending.current = false;
              setBusy(false);
            }
          },
        },
      ],
    );
  const section = (title: string) => (
    <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
  );
  const option = (
    title: string,
    description: string,
    icon: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        s.option,
        {
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceAlt : colors.background,
        },
      ]}
    >
      <Icon
        name={icon}
        size={25}
        color={selected ? colors.primary : colors.textMuted}
      />
      <View style={s.flex}>
        <Text style={[s.optionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[s.body, { color: colors.textMuted }]}>{description}</Text>
      </View>
      <Icon
        name={selected ? 'radiobox-marked' : 'radiobox-blank'}
        size={22}
        color={selected ? colors.primary : colors.textSoft}
      />
    </Pressable>
  );
  const sheetTitle =
    sheet === 'edit'
      ? t('Edit profile', 'प्रोफाइल संपादित करें')
      : sheet === 'language'
      ? t('App language', 'ऐप की भाषा')
      : sheet === 'appearance'
      ? t('Appearance', 'रंग रूप')
      : t('Help & app info', 'सहायता और ऐप जानकारी');
  return (
    <AppScreen scroll={false}>
      {focused && (
        <StatusBar
          barStyle="light-content"
          backgroundColor={isDarkTheme ? '#1E3A8A' : colors.primary}
        />
      )}
      <AppHeader
        title={t('Profile', 'प्रोफाइल')}
        leftIconName="arrow-left"
        onLeftPress={() =>
          navigation.getState().routeNames.includes('Home')
            ? navigation.navigate('Home')
            : navigation.navigate('GovernmentPortals', { screen: 'Home' })
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
      >
        <ProfileReveal active={focused} motion={motion}>
          <View style={[s.identity, { borderColor: colors.border }]}>
            <LinearGradient
              colors={
                isDarkTheme ? ['#263F78', '#16213E'] : ['#DCE9FF', '#EEF4FF']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.avatar}
            >
              {avatarText ? (
                <Text style={[s.initials, { color: colors.primary }]}>
                  {avatarText}
                </Text>
              ) : (
                <Icon name="account-outline" size={36} color={colors.primary} />
              )}
            </LinearGradient>
            <View style={s.flex}>
              <Text style={[s.name, { color: colors.text }]}>
                {displayName}
              </Text>
              <PremiumStatus />
              <Text style={[s.identityCaption, { color: colors.textMuted }]}>
                {t('Your field-work companion', 'आपके फील्ड कार्य का साथी')}
              </Text>
              <View style={s.statusRow}>
                <View
                  style={[
                    s.dot,
                    {
                      backgroundColor: authenticated
                        ? colors.success
                        : colors.secondary,
                    },
                  ]}
                />
                <Text style={[s.status, { color: colors.textMuted }]}>
                  {authenticated
                    ? t('Signed in', 'साइन इन है')
                    : t('Guest workspace', 'अतिथि कार्यक्षेत्र')}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Edit profile', 'प्रोफाइल संपादित करें')}
              onPress={openEdit}
              style={({ pressed }) => [
                s.edit,
                {
                  backgroundColor: pressed
                    ? colors.primarySoft
                    : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Icon name="pencil-outline" size={19} color={colors.primary} />
            </Pressable>
          </View>
          {saved && (
            <View accessibilityLiveRegion="polite" style={s.saved}>
              <Icon
                name="check-circle-outline"
                size={17}
                color={colors.success}
              />
              <Text style={[s.body, { color: colors.text }]}>
                {t('Profile updated', 'प्रोफाइल अपडेट हो गई')}
              </Text>
            </View>
          )}
        </ProfileReveal>
        <ProfileReveal active={focused} motion={motion} delay={55}>
          {section(t('WORK PROFILE', 'कार्य प्रोफाइल'))}
          {RELEASE_FEATURES.multiState && (
            <ProfileRow
              icon="map-marker-outline"
              title={t(
                'State / union territory',
                'राज्य / केंद्र शासित प्रदेश',
              )}
              description={
                selectedState?.name[language] ||
                t('Choose your state', 'अपना राज्य चुनें')
              }
              onPress={() =>
                navigation.navigate('StateSelection', { change: true })
              }
            />
          )}
          <ProfileRow
            icon="map-marker-radius-outline"
            title={t('Work area', 'कार्य क्षेत्र')}
            description={
              state.settings.circle ||
              t(
                'Add district, tehsil or circle',
                'जिला, तहसील या क्षेत्र जोड़ें',
              )
            }
            onPress={openEdit}
            accent={colors.primary}
          />
          {section(t('MAKE IT YOURS', 'अपनी पसंद'))}
          <ProfileRow
            icon="translate"
            title={t('Language', 'भाषा')}
            value={language === 'hi' ? 'हिन्दी' : 'English'}
            onPress={() => setSheet('language')}
            accent={colors.primary}
          />
          <ProfileRow
            icon={isDarkTheme ? 'weather-night' : 'white-balance-sunny'}
            title={t('Appearance', 'रंग रूप')}
            value={isDarkTheme ? t('Dark', 'डार्क') : t('Light', 'लाइट')}
            onPress={() => setSheet('appearance')}
            accent={colors.primary}
          />
        </ProfileReveal>
        <ProfileReveal active={focused} motion={motion} delay={110}>
          {section(t('ACCOUNT & SUPPORT', 'खाता और सहायता'))}
          {authenticated && session?.email && (
            <ProfileRow
              icon="email-outline"
              title={t('Email', 'ईमेल')}
              description={session.email}
            />
          )}
          {authenticated && session?.phoneNumber && (
            <ProfileRow
              icon="phone-outline"
              title={t('Mobile number', 'मोबाइल नंबर')}
              description={
                session.phoneNumber.startsWith('+')
                  ? session.phoneNumber
                  : `+91 ${session.phoneNumber}`
              }
            />
          )}
          {!authenticated && (
            <ProfileRow
              icon="login"
              title={t('Sign in', 'साइन इन करें')}
              description={t(
                'Use your app account',
                'अपने ऐप खाते का उपयोग करें',
              )}
              onPress={() => navigation.navigate('Login')}
            />
          )}
          <ProfileRow
            icon="help-circle-outline"
            title={t('Help & app info', 'सहायता और ऐप जानकारी')}
            onPress={() => setSheet('help')}
          />
          {authenticated && (
            <ProfileRow
              icon="logout"
              title={
                busy
                  ? t('Signing out…', 'साइन आउट हो रहा है…')
                  : t('Sign out', 'साइन आउट')
              }
              onPress={logOut}
              danger
            />
          )}
          <View style={s.footer}>
            <Icon name="sprout-outline" size={20} color={colors.textSoft} />
            <Text style={[s.brand, { color: colors.textMuted }]}>
              Lekhpal <Text style={{ color: colors.textSoft }}> / </Text> Smart
              Work
            </Text>
            <Text style={[s.footerNote, { color: colors.textMuted }]}>
              {t('Made for the work you do.', 'आपके रोज़ के काम के लिए।')}
            </Text>
          </View>
        </ProfileReveal>
      </ScrollView>
      <Modal
        visible={sheet !== null}
        transparent
        animationType={motion ? 'fade' : 'none'}
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={s.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={s.backdrop}
            accessibilityRole="button"
            accessibilityLabel={t('Close panel', 'पैनल बंद करें')}
            onPress={closeSheet}
          />
          <View
            accessibilityViewIsModal
            style={[
              s.sheet,
              {
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <View style={s.sheetTop}>
              <Text
                accessibilityRole="header"
                style={[s.sheetTitle, { color: colors.text }]}
              >
                {sheetTitle}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Close', 'बंद करें')}
                disabled={busy}
                onPress={closeSheet}
                style={s.close}
              >
                <Icon name="close" size={23} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.sheetContent}
            >
              {sheet === 'edit' && (
                <>
                  <Text style={[s.body, { color: colors.textMuted }]}>
                    {t(
                      'Personalise the profile for this state on your device.',
                      'इस डिवाइस पर इस राज्य की अपनी प्रोफाइल बनाएं।',
                    )}
                  </Text>
                  <Text style={[s.label, { color: colors.text }]}>
                    {t('Your name', 'आपका नाम')}
                  </Text>
                  <TextInput
                    ref={nameInput}
                    accessibilityLabel={t('Your name', 'आपका नाम')}
                    autoCapitalize="words"
                    autoComplete="name"
                    editable={!busy}
                    maxLength={70}
                    value={name}
                    onChangeText={value => {
                      setName(value);
                      setNameError('');
                    }}
                    placeholder={t('Enter your name', 'अपना नाम भरें')}
                    placeholderTextColor={colors.textSoft}
                    style={[
                      s.input,
                      {
                        color: colors.text,
                        borderColor: nameError ? colors.danger : colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                  />
                  {!!nameError && (
                    <Text
                      accessibilityLiveRegion="polite"
                      style={[s.error, { color: colors.danger }]}
                    >
                      {nameError}
                    </Text>
                  )}
                  <Text style={[s.label, { color: colors.text }]}>
                    {t('District / tehsil / circle', 'जिला / तहसील / क्षेत्र')}
                  </Text>
                  <TextInput
                    accessibilityLabel={t(
                      'District / tehsil / circle',
                      'जिला / तहसील / क्षेत्र',
                    )}
                    autoCapitalize="words"
                    editable={!busy}
                    maxLength={140}
                    value={circle}
                    onChangeText={setCircle}
                    placeholder={t(
                      'Work area (optional)',
                      'कार्य क्षेत्र (वैकल्पिक)',
                    )}
                    placeholderTextColor={colors.textSoft}
                    style={[
                      s.input,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('Save profile', 'प्रोफाइल सेव करें')}
                    accessibilityState={{ disabled: busy, busy }}
                    disabled={busy}
                    onPress={save}
                    style={({ pressed }) => [
                      s.saveButton,
                      {
                        backgroundColor: colors.primary,
                        opacity: pressed || busy ? 0.7 : 1,
                      },
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator color={buttonTextColor} />
                    ) : (
                      <>
                        <Icon name="check" size={20} color={buttonTextColor} />
                        <Text style={[s.saveText, { color: buttonTextColor }]}>
                          {t('Save profile', 'प्रोफाइल सेव करें')}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
              {sheet === 'language' && (
                <>
                  {option(
                    'English',
                    'Use the app in English',
                    'alphabetical',
                    language === 'en',
                    () => {
                      setLanguage('en');
                      setSheet(null);
                    },
                  )}
                  {option(
                    'हिन्दी',
                    'ऐप का उपयोग हिन्दी में करें',
                    'translate',
                    language === 'hi',
                    () => {
                      setLanguage('hi');
                      setSheet(null);
                    },
                  )}
                </>
              )}
              {sheet === 'appearance' && (
                <>
                  {option(
                    t('Light', 'लाइट'),
                    t(
                      'Clear surfaces, familiar blue accents',
                      'हल्की पृष्ठभूमि, नीले रंग के साथ',
                    ),
                    'white-balance-sunny',
                    !isDarkTheme,
                    () => {
                      setThemeMode('light');
                      setSheet(null);
                    },
                  )}
                  {option(
                    t('Dark', 'डार्क'),
                    t(
                      'A softer screen for low light',
                      'कम रोशनी के लिए गहरी पृष्ठभूमि',
                    ),
                    'weather-night',
                    isDarkTheme,
                    () => {
                      setThemeMode('dark');
                      setSheet(null);
                    },
                  )}
                </>
              )}
              {sheet === 'help' && (
                <View style={s.help}>
                  <Text style={[s.helpHeading, { color: colors.text }]}>
                    {t(
                      'Your profile, your workspace',
                      'आपकी प्रोफाइल, आपका कार्यक्षेत्र',
                    )}
                  </Text>
                  <Text style={[s.helpBody, { color: colors.textMuted }]}>
                    {t(
                      'Your name and work area personalise this state’s workspace on this device. Editing them does not change your sign-in details.',
                      'आपका नाम और कार्य क्षेत्र इस डिवाइस पर इस राज्य की प्रोफाइल में रहते हैं। इन्हें बदलने से साइन इन विवरण नहीं बदलता।',
                    )}
                  </Text>
                  <Text style={[s.helpHeading, { color: colors.text }]}>
                    {t('Finding saved calculations', 'सेव गणनाएं कहां मिलेंगी')}
                  </Text>
                  <Text style={[s.helpBody, { color: colors.textMuted }]}>
                    {t(
                      'Open Measurement or Calculator, choose a tool, then tap the notebook icon in the header. Saved notes can be reopened or shared.',
                      'माप या कैलकुलेटर में उपकरण चुनें, फिर हेडर में नोटबुक चिह्न दबाएं। सेव नोट दोबारा खोल या साझा कर सकते हैं।',
                    )}
                  </Text>
                  {RELEASE_FEATURES.multiState && (
                    <>
                      <Text style={[s.helpHeading, { color: colors.text }]}>
                        {t('Changing your state', 'राज्य बदलना')}
                      </Text>
                      <Text style={[s.helpBody, { color: colors.textMuted }]}>
                        {t(
                          'Tap State / union territory in your profile. Each state keeps its own workspace; your existing records stay saved.',
                          'प्रोफाइल में राज्य / केंद्र शासित प्रदेश दबाएं। हर राज्य का अलग कार्यक्षेत्र है; पुराने रिकॉर्ड सेव रहते हैं।',
                        )}
                      </Text>
                    </>
                  )}
                  <Text style={[s.helpHeading, { color: colors.text }]}>
                    Lekhpal · Smart Work
                  </Text>
                  <Text style={[s.helpBody, { color: colors.textMuted }]}>
                    {t(
                      'Tools for field calculations and access to official websites. This app profile is separate from your department account.',
                      'फील्ड गणना और आधिकारिक वेबसाइटों तक पहुंच के उपकरण। ऐप प्रोफाइल आपके विभागीय खाते से अलग है।',
                    )}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AppScreen>
  );
}
const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 22,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  identity: {
    paddingTop: 30,
    paddingBottom: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 25, fontWeight: '700' },
  name: typography.heading,
  identityCaption: { ...typography.caption, marginTop: 5 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  status: { fontSize: 11, lineHeight: 17 },
  edit: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typography.label, marginTop: 27, marginBottom: 5 },
  saved: { flexDirection: 'row', gap: 7, alignItems: 'center', paddingTop: 12 },
  body: typography.body,
  footer: { alignItems: 'center', paddingTop: 29, paddingBottom: 8, gap: 5 },
  brand: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  footerNote: { fontSize: 11, lineHeight: 18 },
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.36)',
  },
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  sheet: {
    maxHeight: '87%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 11,
  },
  handle: {
    alignSelf: 'center',
    width: 34,
    height: 4,
    borderRadius: 4,
    marginBottom: 10,
  },
  sheetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 24,
    paddingRight: 13,
    paddingBottom: 7,
  },
  sheetTitle: { ...typography.heading, flex: 1 },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContent: { paddingHorizontal: 24, paddingBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 23, marginBottom: 9 },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
  },
  error: { fontSize: 12, lineHeight: 19, marginTop: 7 },
  saveButton: {
    minHeight: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    marginTop: 28,
    marginBottom: 3,
  },
  saveText: { fontSize: 15, fontWeight: '700' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    minHeight: 88,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 4,
  },
  help: { paddingTop: 8, paddingBottom: 8 },
  helpHeading: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
    marginTop: 17,
    marginBottom: 7,
  },
  helpBody: { fontSize: 13, lineHeight: 22 },
});
