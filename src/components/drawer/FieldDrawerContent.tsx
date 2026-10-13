import { typography } from '../../theme/typography';
import PremiumStatus from '../premium/PremiumStatus';
import { requestAppUpdate, useAppUpdates } from '../../services/appUpdates';
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  DrawerContentComponentProps,
  getDrawerStatusFromState,
} from '@react-navigation/drawer';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDesk } from '../../context/DeskContext';
import { useAuthSession } from '../../context/AuthSessionContext';
import { RELEASE_FEATURES } from '../../config/releaseFeatures';
import { APP_INFO } from '../../config/appInfo';
import { openAppStore, shareApp } from '../../utils/appActions';
import { ProfileReveal, useProfileMotion } from '../profile/ProfileUI';
export default function FieldDrawerContent({
  state: navState,
  navigation,
}: DrawerContentComponentProps) {
  const { colors, isDarkTheme } = useAppTheme();
  const appUpdate = useAppUpdates();
  const { language } = useLanguage();
  const { state } = useDesk();
  const { session, signOut } = useAuthSession();
  const insets = useSafeAreaInsets();
  const motion = useProfileMotion();
  const drawerOpen = getDrawerStatusFromState(navState) === 'open';
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const route = navState.routes[navState.index];
  const tab = route.state?.routes[route.state.index ?? 0]?.name;
  const close = () => navigation.closeDrawer();
  const go = (name: string, params?: object) => {
    close();
    navigation.navigate(name, params);
  };
  const openTab = (screen: string, params?: object) =>
    go('GovernmentPortals', { screen, params });
  const external = (action: () => Promise<void>) => {
    close();
    setTimeout(
      () => {
        action().catch(() =>
          Alert.alert(
            t('Could not open', 'खुल नहीं पाया'),
            t(
              'Please check your connection and try again.',
              'कृपया कनेक्शन जांचें और फिर कोशिश करें।',
            ),
          ),
        );
      },
      motion ? 240 : 0,
    );
  };
  const logout = () => {
    close();
    Alert.alert(
      t('Sign out?', 'साइन आउट करें?'),
      t(
        'Your saved work stays on this device.',
        'सेव किया कार्य इस डिवाइस पर रहेगा।',
      ),
      [
        { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
        {
          text: t('Sign out', 'साइन आउट'),
          style: 'destructive',
          onPress: () => {
            signOut()
              .then(() =>
                navigation
                  .getParent()
                  ?.reset({ index: 0, routes: [{ name: 'Login' }] }),
              )
              .catch(() =>
                Alert.alert(
                  t('Could not sign out', 'साइन आउट नहीं हुआ'),
                  t('Please try again.', 'कृपया फिर कोशिश करें।'),
                ),
              );
          },
        },
      ],
    );
  };
  const item = (
    title: string,
    icon: string,
    onPress: () => void,
    selected = false,
    updateAvailable = false,
  ) => (
    <Pressable
      key={title}
      accessibilityRole="button"
      accessibilityLabel={
        updateAvailable
          ? `${title}. ${t('New update available', 'नया अपडेट उपलब्ध है')}`
          : title
      }
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        s.item,
        {
          backgroundColor:
            pressed || selected ? colors.surfaceAlt : colors.surface,
        },
      ]}
    >
      <Icon name={icon} size={25} color={colors.primary} />
      <Text
        style={[
          s.itemText,
          {
            color: selected ? colors.primary : colors.text,
          },
        ]}
      >
        {title}
      </Text>
      {selected && (
        <View style={[s.selectedDot, { backgroundColor: colors.primary }]} />
      )}
      {updateAvailable && (
        <View
          testID="app-update-dot"
          style={{
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: '#DC2626',
          }}
        />
      )}
    </Pressable>
  );
  const heading = (text: string) => (
    <Text style={[s.section, { color: colors.textSoft }]}>{text}</Text>
  );
  const profileName =
    state.settings.officer ||
    (!session?.isGuest && session?.displayName) ||
    t('Your workspace', 'आपका कार्यक्षेत्र');
  return (
    <View
      style={[
        s.root,
        {
          backgroundColor: colors.surface,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <LinearGradient
        colors={isDarkTheme ? ['#1E3A8A', '#254DA7'] : ['#1E40AF', '#2D64D8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={s.brandRow}>
          <Icon name="map-outline" size={25} color="#FFFFFF" />
          <View style={s.flex}>
            <Text style={s.brand}>लेखपाल</Text>
            <Text style={s.brandEnglish}>SMART WORK</Text>
          </View>
        </View>
      </LinearGradient>
      <ProfileReveal active={drawerOpen} motion={motion} delay={70}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Open profile', 'प्रोफाइल खोलें')}
          onPress={() => openTab('Profile')}
          style={({ pressed }) => [
            s.item,
            s.profile,
            { backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
          ]}
        >
          <Icon name="account-outline" size={25} color={colors.primary} />
          <View style={s.flex}>
            <Text
              numberOfLines={1}
              style={[s.profileName, { color: colors.text }]}
            >
              {profileName}
            </Text>
            <PremiumStatus />
            <Text style={[s.profileCaption, { color: colors.textMuted }]}>
              {t('View your profile', 'अपनी प्रोफाइल देखें')}
            </Text>
          </View>
          <Icon name="chevron-right" size={21} color={colors.textSoft} />
        </Pressable>
      </ProfileReveal>
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={s.items}
      >
        {heading(t('YOUR WORK', 'आपका कार्य'))}
        {item(
          t('Dashboard', 'डैशबोर्ड'),
          'view-dashboard-outline',
          () => openTab('Home'),
          route.name === 'GovernmentPortals' && (!tab || tab === 'Home'),
        )}
        {item(
          t('Official services', 'आधिकारिक सेवाएं'),
          'web',
          () => openTab('Services'),
          route.name === 'GovernmentPortals' && tab === 'Services',
        )}
        {item(
          t('Measurement', 'भूमि माप'),
          'ruler-square',
          () => openTab('Measurement'),
          route.name === 'GovernmentPortals' && tab === 'Measurement',
        )}
        {item(
          t('GPS boundary', 'GPS सीमा माप'),
          'crosshairs-gps',
          () => openTab('Measurement', { focusToolId: 'gps-land-measure' }),
          false,
        )}
        {item(
          t('Calculator', 'कैलकुलेटर'),
          'calculator-variant-outline',
          () => openTab('Calculator'),
          route.name === 'GovernmentPortals' && tab === 'Calculator',
        )}
        {item(
          t('Saved work', 'सेव किया कार्य'),
          'notebook-outline',
          () => go('SavedWork'),
          route.name === 'SavedWork',
        )}
        {RELEASE_FEATURES.premium &&
          item(t('Premium', 'प्रीमियम'), 'star-outline', () => go('Premium'))}
        {heading(t('APP & SUPPORT', 'ऐप और सहायता'))}
        {item(
          t('Settings', 'सेटिंग्स'),
          'tune-variant',
          () => go('DeskSettings'),
          route.name === 'DeskSettings',
        )}
        {RELEASE_FEATURES.multiState &&
          item(t('Change state', 'राज्य बदलें'), 'map-marker-outline', () => {
            close();
            navigation
              .getParent()
              ?.navigate('StateSelection', { change: true });
          })}
        {item(
          t('Help', 'सहायता'),
          'help-circle-outline',
          () => go('DeskHelp'),
          route.name === 'DeskHelp',
        )}
        {item(
          t('About', 'ऐप के बारे में'),
          'information-outline',
          () => go('DeskAbout'),
          route.name === 'DeskAbout',
        )}
        {item(t('Share app', 'ऐप साझा करें'), 'share-variant-outline', () =>
          external(() => shareApp(language)),
        )}
        {item(
          t('Rate app', 'ऐप को रेट करें'),
          'star-outline',
          () => external(openAppStore),
          false,
        )}
        {item(
          t('Update app', 'ऐप अपडेट करें'),
          'download-circle-outline',
          () => external(() => requestAppUpdate(language)),
          false,
          appUpdate.available,
        )}
      </ScrollView>
      <View style={[s.footer, { borderColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            session && !session.isGuest
              ? t('Sign out', 'साइन आउट')
              : t('Sign in', 'साइन इन करें')
          }
          onPress={
            session && !session.isGuest
              ? logout
              : () => {
                  close();
                  navigation.getParent()?.navigate('Login');
                }
          }
          style={s.account}
        >
          <Icon
            name={session && !session.isGuest ? 'logout' : 'login'}
            size={23}
            color={colors.primary}
          />
          <Text style={[s.accountText, { color: colors.primary }]}>
            {session && !session.isGuest
              ? t('Sign out', 'साइन आउट')
              : t('Sign in', 'साइन इन करें')}
          </Text>
        </Pressable>
        <Text style={[s.version, { color: colors.textSoft }]}>
          v{APP_INFO.version}
        </Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  header: {
    paddingHorizontal: 25,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  brand: { fontSize: 25, fontWeight: '700', color: '#FFFFFF' },
  brandEnglish: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 1,
    color: '#DBEAFE',
  },
  profile: {
    marginHorizontal: 12,
    marginTop: 14,
  },
  profileCaption: {
    fontSize: 12,
    lineHeight: 19,
    marginTop: 2,
  },
  profileName: typography.title,
  items: { paddingHorizontal: 12, paddingBottom: 14 },
  section: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginLeft: 12,
    marginTop: 21,
    marginBottom: 7,
  },
  item: {
    minHeight: 54,
    paddingHorizontal: 13,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderRadius: 10,
  },
  itemText: { ...typography.title, flex: 1 },
  selectedDot: { height: 5, width: 5, borderRadius: 3 },
  footer: {
    marginHorizontal: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  account: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountText: typography.label,
  version: { fontSize: 12 },
});
