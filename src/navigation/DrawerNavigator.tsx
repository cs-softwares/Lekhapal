import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AppPressable from '../components/AppPressable';
import {useAuthSession} from '../context/AuthSessionContext';
import {useLanguage} from '../context/LanguageContext';
import {useAppTheme} from '../context/ThemeContext';
import AboutScreen from '../screens/AboutScreen';
import HelpScreen from '../screens/HelpScreen';
import NotificationScreen from '../screens/NotificationScreen';
import PremiumScreen from '../screens/PremiumScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {
  NOTIFICATION_MASTER_STORAGE_KEY,
} from '../data/notificationCatalog';
import {smartWorkNotifications} from '../native/smartWorkNotifications';
import {
  persistNotificationMasterPreference,
  sendNotificationTest,
  syncNotificationSchedules,
} from '../utils/notificationSettings';
import BottomTabNavigator from './BottomTabNavigator';
import {
  DrawerSection,
  registerDrawerController,
  unregisterDrawerController,
} from './drawerHelpers';

const APP_PACKAGE_ID = 'com.lekhpal';
const APP_WEB_URL =
  `https://play.google.com/store/apps/details?id=${APP_PACKAGE_ID}`;
const APP_MARKET_URL =
  `market://details?id=${APP_PACKAGE_ID}`;
const DRAWER_ANIMATION_DURATION = 240;

const DrawerNavigator = () => {
  const {width} = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.8, 304);
  const {language, setLanguage, strings} = useLanguage();
  const {colors, isDarkTheme, setThemeMode} =
    useAppTheme();
  const drawerHeaderBackgroundColor = isDarkTheme
    ? '#1E3A8A'
    : colors.primary;
  const {session} = useAuthSession();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          backgroundColor: colors.background,
          flex: 1,
        },
        content: {
          backgroundColor: colors.background,
          flex: 1,
        },
        modalRoot: {
          flex: 1,
        },
        overlay: {
          backgroundColor: colors.overlay,
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        },
        drawerPanel: {
          backgroundColor: colors.surface,
          bottom: 0,
          elevation: 18,
          left: 0,
          position: 'absolute',
          top: 0,
        },
        drawerScrollContent: {
          paddingBottom: 24,
        },
        drawerHeaderCard: {
          backgroundColor: drawerHeaderBackgroundColor,
          marginBottom: 14,
          paddingBottom: 42,
          paddingHorizontal: 18,
          paddingTop: 52,
        },
        drawerUserRow: {
          alignItems: 'center',
          flexDirection: 'row',
        },
        avatarCircle: {
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.18)',
          borderRadius: 24,
          height: 58,
          justifyContent: 'center',
          width: 58,
        },
        drawerUserInfo: {
          flex: 1,
          marginLeft: 14,
        },
        drawerTitle: {
          color: colors.white,
          fontSize: 20,
          fontWeight: '800',
        },
        drawerEmail: {
          color: 'rgba(255,255,255,0.82)',
          fontSize: 13,
          marginTop: 4,
        },
        drawerPlanPill: {
          alignSelf: 'flex-start',
          backgroundColor: 'rgba(255,255,255,0.18)',
          borderRadius: 999,
          marginTop: 10,
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        drawerPlanText: {
          color: colors.white,
          fontSize: 11,
          fontWeight: '800',
        },
        drawerBody: {
          paddingBottom: 20,
          paddingHorizontal: 12,
        },
        primaryItem: {
          marginBottom: 8,
          paddingHorizontal: 8,
          paddingVertical: 10,
        },
        primaryItemActive: {
          backgroundColor: 'transparent',
        },
        primaryItemRow: {
          alignItems: 'center',
          flexDirection: 'row',
        },
        primaryIconBox: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        primaryIconBoxActive: {
          backgroundColor: 'transparent',
        },
        primaryItemText: {
          color: colors.text,
          fontSize: 15,
          fontWeight: '700',
          marginLeft: 12,
        },
        primaryItemTextActive: {
          color: colors.primary,
        },
        sectionLabel: {
          color: colors.textMuted,
          fontSize: 12,
          fontWeight: '800',
          marginBottom: 8,
          marginHorizontal: 4,
          marginTop: 18,
          textTransform: 'uppercase',
        },
        toggleCard: {
          paddingHorizontal: 4,
        },
        toggleRow: {
          alignItems: 'center',
          borderBottomColor:
            colors.surface === '#FFFFFF'
              ? 'rgba(148, 163, 184, 0.18)'
              : 'rgba(148, 163, 184, 0.28)',
          borderBottomWidth: StyleSheet.hairlineWidth,
          flexDirection: 'row',
          justifyContent: 'space-between',
          minHeight: 62,
        },
        toggleLeft: {
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
          marginRight: 10,
        },
        toggleIconBox: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        toggleTextBlock: {
          flex: 1,
          marginLeft: 12,
        },
        toggleLabel: {
          color: colors.text,
          fontSize: 14,
          fontWeight: '700',
        },
        toggleHelper: {
          color: colors.textMuted,
          fontSize: 12,
          marginTop: 2,
        },
        secondaryItem: {
          marginBottom: 6,
          paddingHorizontal: 8,
          paddingVertical: 11,
        },
        secondaryItemRow: {
          alignItems: 'center',
          flexDirection: 'row',
        },
        secondaryIconBox: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        secondaryItemText: {
          color: colors.text,
          fontSize: 14,
          fontWeight: '600',
          marginLeft: 12,
        },
      }),
    [colors, drawerHeaderBackgroundColor],
  );
  const progress = useRef(new Animated.Value(0)).current;
  const isDrawerOpenRef = useRef(false);
  const isDrawerVisibleRef = useRef(false);
  const [activeSection, setActiveSection] =
    useState<DrawerSection>('Workspace');
  const [isDrawerVisible, setIsDrawerVisible] =
    useState(false);
  const [notificationsEnabled, setNotificationsEnabled] =
    useState(true);

  const drawerTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  const overlayOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const copy = useMemo(() => {
    if (language === 'hi') {
      return {
        about: 'About App',
        dark: 'Dark',
        darkTheme: 'Dark Theme',
        help: 'Help',
        home: 'Home',
        languageLabel: 'Language',
        languageMode: 'Hindi / English',
        light: 'Light',
        notifications: 'Notifications',
        off: 'Off',
        on: 'On',
        preferences: 'Preferences',
        premium: 'Premium',
        premiumTools: 'Premium Tools',
        quickActions: 'Quick Actions',
        rateApp: 'रेट ऐप',
        settings: 'Settings',
        shareApp: 'शेयर ऐप',
        support: 'Support Center',
        themeLabel: 'Theme',
      };
    }

    return {
      about: 'About App',
      dark: 'Dark',
      darkTheme: 'Dark Theme',
      help: 'Help',
      home: 'Home',
      languageLabel: 'Language',
      languageMode: 'Hindi / English',
      light: 'Light',
      notifications: 'Notifications',
      off: 'Off',
      on: 'On',
      preferences: 'Preferences',
      premium: strings.premium,
      premiumTools: 'Premium Tools',
      quickActions: 'Quick Actions',
      rateApp: 'Rate App',
      settings: strings.settings,
      shareApp: 'Share App',
      support: 'Support Center',
      themeLabel: 'Theme',
    };
  }, [language, strings.premium, strings.settings]);

  const drawerUserName =
    session?.displayName ??
    'Guest User';
  const drawerUserSubline =
    session?.isGuest || !session?.phoneNumber
      ? 'Guest access'
      : `+91 ${session.phoneNumber}`;
  const drawerPlanLabel =
    session?.plan === 'premium'
      ? 'Premium account'
      : 'Guest plan';

  useEffect(() => {
    let isMounted = true;

    const loadDrawerPreferences = async () => {
      try {
        const savedNotificationPreference =
          await AsyncStorage.getItem(
            NOTIFICATION_MASTER_STORAGE_KEY,
          );

        if (
          isMounted &&
          (savedNotificationPreference === 'true' ||
            savedNotificationPreference === 'false')
        ) {
          setNotificationsEnabled(
            savedNotificationPreference === 'true',
          );
        }
      } catch {
        // Keep default in-memory values if preference loading fails.
      }
    };

    loadDrawerPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncSystemNotificationState = async () => {
      if (!smartWorkNotifications.isAvailable) {
        return;
      }

      try {
        const enabledOnSystem =
          await smartWorkNotifications.areNotificationsEnabled();

        if (isMounted && !enabledOnSystem) {
          setNotificationsEnabled(false);
          await AsyncStorage.setItem(
            NOTIFICATION_MASTER_STORAGE_KEY,
            'false',
          );
        }
      } catch {
        // Ignore sync failures and keep the current UI state.
      }
    };

    syncSystemNotificationState();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistNotificationPreference = useCallback(
    async (value: boolean) => {
      try {
        await persistNotificationMasterPreference(value);
      } catch {
        // Keep the UI state even if persistence fails.
      }
    },
    [],
  );

  const handleNotificationToggle = useCallback(
    async (nextValue: boolean) => {
      if (!nextValue) {
        setNotificationsEnabled(false);
        await persistNotificationPreference(false);
        await syncNotificationSchedules(false, language);
        return;
      }

      if (
        Platform.OS === 'android' &&
        typeof Platform.Version === 'number' &&
        Platform.Version >= 33
      ) {
        try {
          const permissionResult =
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS
                .POST_NOTIFICATIONS,
            );

          if (
            permissionResult !==
            PermissionsAndroid.RESULTS.GRANTED
          ) {
            setNotificationsEnabled(false);
            await persistNotificationPreference(false);
            Alert.alert(
              language === 'hi'
                ? 'Notification permission needed'
                : 'Notification permission needed',
              language === 'hi'
                ? 'Notifications on karne ke liye phone permission allow karni hogi.'
                : 'Allow the phone notification permission to turn notifications on.',
            );
            return;
          }
        } catch {
          setNotificationsEnabled(false);
          await persistNotificationPreference(false);
          return;
        }
      }

      if (!smartWorkNotifications.isAvailable) {
        Alert.alert(
          language === 'hi'
            ? 'Rebuild needed'
            : 'Rebuild needed',
          language === 'hi'
            ? 'Notification module activate karne ke liye app ko dobara build karke install karna hoga.'
            : 'The app needs one full rebuild and reinstall before the native notification module can start working.',
        );
      }

      setNotificationsEnabled(true);
      await persistNotificationPreference(true);
      if (smartWorkNotifications.isAvailable) {
        await syncNotificationSchedules(true, language);
        await sendNotificationTest(language);
      }
    },
    [language, persistNotificationPreference],
  );

  useEffect(() => {
    syncNotificationSchedules(
      notificationsEnabled,
      language,
    )
      .catch(() => {
        // Ignore scheduling failures and keep the UI responsive.
      });
  }, [language, notificationsEnabled]);

  const animateDrawer = useCallback(
    (nextValue: 0 | 1, onComplete?: () => void) => {
      progress.stopAnimation();
      Animated.timing(progress, {
        toValue: nextValue,
        duration: DRAWER_ANIMATION_DURATION,
        easing:
          nextValue === 1
            ? Easing.out(Easing.cubic)
            : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({finished}) => {
        if (finished) {
          onComplete?.();
        }
      });
    },
    [progress],
  );

  const openDrawer = useCallback(() => {
    if (isDrawerOpenRef.current) {
      return;
    }

    isDrawerOpenRef.current = true;
    setIsDrawerVisible(true);
    animateDrawer(1);
  }, [animateDrawer]);

  const closeDrawer = useCallback(() => {
    if (
      !isDrawerOpenRef.current &&
      !isDrawerVisibleRef.current
    ) {
      return;
    }

    isDrawerOpenRef.current = false;
    animateDrawer(0, () => {
      if (!isDrawerOpenRef.current) {
        setIsDrawerVisible(false);
      }
    });
  }, [animateDrawer]);

  const selectSection = useCallback(
    (section: DrawerSection) => {
      setActiveSection(section);
      closeDrawer();
    },
    [closeDrawer],
  );

  useEffect(() => {
    isDrawerVisibleRef.current = isDrawerVisible;
  }, [isDrawerVisible]);

  useEffect(() => {
    registerDrawerController({
      closeDrawer,
      openDrawer,
      selectSection,
    });

    return () => {
      unregisterDrawerController();
    };
  }, [closeDrawer, openDrawer, selectSection]);

  useEffect(() => {
    if (!isDrawerVisible) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!isDrawerOpenRef.current) {
          return false;
        }

        closeDrawer();
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [closeDrawer, isDrawerVisible]);

  const shareApp = async () => {
    closeDrawer();

    try {
      await Share.share({
        message:
          language === 'hi'
            ? `Smart Work app शेयर करें:\n${APP_WEB_URL}`
            : `Share Smart Work app:\n${APP_WEB_URL}`,
        title: 'Smart Work',
        url: APP_WEB_URL,
      });
    } catch {
      Alert.alert(
        language === 'hi' ? 'शेयर ऐप' : 'Share App',
        language === 'hi'
          ? 'अभी शेयर शीट ओपन नहीं हो पाई।'
          : 'The share sheet could not open right now.',
      );
    }
  };

  const rateApp = async () => {
    closeDrawer();

    try {
      if (Platform.OS === 'android') {
        await Linking.openURL(APP_MARKET_URL);
        return;
      }

      await Linking.openURL(APP_WEB_URL);
    } catch {
      try {
        await Linking.openURL(APP_WEB_URL);
      } catch {
        Alert.alert(
          language === 'hi' ? 'रेट ऐप' : 'Rate App',
          language === 'hi'
            ? 'Play Store लिंक अभी ओपन नहीं हो पाया।'
            : 'The Play Store link could not open right now.',
        );
      }
    }
  };

  const renderPrimaryItem = (
    section: DrawerSection,
    label: string,
    icon: string,
  ) => {
    const active = activeSection === section;

    return (
      <AppPressable
        key={section}
        onPress={() => selectSection(section)}
        pressedOpacity={0.72}
        style={[
          styles.primaryItem,
          active && styles.primaryItemActive,
        ]}>
        <View style={styles.primaryItemRow}>
          <View
            style={[
              styles.primaryIconBox,
              active && styles.primaryIconBoxActive,
            ]}>
            <Icon
              color={colors.primary}
              name={icon}
              size={20}
            />
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.primaryItemText,
              active && styles.primaryItemTextActive,
            ]}>
            {label}
          </Text>
        </View>
      </AppPressable>
    );
  };

  const renderSecondaryItem = (
    icon: string,
    label: string,
    onPress: () => void,
  ) => (
    <AppPressable
      key={label}
      onPress={onPress}
      pressedOpacity={0.72}
      style={styles.secondaryItem}>
      <View style={styles.secondaryItemRow}>
        <View style={styles.secondaryIconBox}>
          <Icon
            color={colors.primary}
            name={icon}
            size={20}
          />
        </View>
        <Text
          numberOfLines={1}
          style={styles.secondaryItemText}>
          {label}
        </Text>
      </View>
    </AppPressable>
  );

  const renderToggleRow = (
    icon: string,
    label: string,
    helper: string,
    value: boolean,
    onValueChange: (nextValue: boolean) => void,
  ) => (
    <View key={label} style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <View style={styles.toggleIconBox}>
          <Icon
            color={colors.primary}
            name={icon}
            size={20}
          />
        </View>
        <View style={styles.toggleTextBlock}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.toggleHelper}>{helper}</Text>
        </View>
      </View>

      <Switch
        onValueChange={onValueChange}
        thumbColor={value ? colors.primary : '#F8FAFC'}
        trackColor={{
          false: '#CBD5E1',
          true: colors.primarySoft,
        }}
        value={value}
      />
    </View>
  );

  const content =
    activeSection === 'Notifications' ? (
      <NotificationScreen
        masterEnabled={notificationsEnabled}
        onMasterToggle={handleNotificationToggle}
      />
    ) : activeSection === 'Premium' ? (
      <PremiumScreen />
    ) : activeSection === 'Help' ? (
      <HelpScreen />
    ) : activeSection === 'About' ? (
      <AboutScreen />
    ) : activeSection === 'Settings' ? (
      <SettingsScreen />
    ) : (
      <BottomTabNavigator />
    );

  return (
    <View style={styles.screen}>
      <View style={styles.content}>{content}</View>

      <Modal
        animationType="none"
        onRequestClose={closeDrawer}
        statusBarTranslucent
        transparent
        visible={isDrawerVisible}>
        <View style={styles.modalRoot}>
          <Pressable
            onPress={closeDrawer}
            style={StyleSheet.absoluteFill}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.overlay,
                {
                  opacity: overlayOpacity,
                },
              ]}
            />
          </Pressable>

          <Animated.View
            style={[
              styles.drawerPanel,
              {
                transform: [{translateX: drawerTranslateX}],
                width: drawerWidth,
              },
            ]}>
            <ScrollView
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={false}>
              <View style={styles.drawerHeaderCard}>
                <View style={styles.drawerUserRow}>
                  <View style={styles.avatarCircle}>
                    <Icon
                      color={colors.white}
                      name="account"
                      size={28}
                    />
                  </View>

                  <View style={styles.drawerUserInfo}>
                    <Text style={styles.drawerTitle}>
                      {drawerUserName}
                    </Text>
                    <Text style={styles.drawerEmail}>
                      {drawerUserSubline}
                    </Text>
                    <View style={styles.drawerPlanPill}>
                      <Text style={styles.drawerPlanText}>
                        {drawerPlanLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.drawerBody}>
                {renderPrimaryItem(
                  'Workspace',
                  copy.home,
                  'home-outline',
                )}
                {renderPrimaryItem(
                  'Notifications',
                  copy.notifications,
                  'bell-outline',
                )}
                {renderPrimaryItem(
                  'Premium',
                  copy.premium,
                  'crown-outline',
                )}
                {renderPrimaryItem(
                  'Settings',
                  copy.settings,
                  'cog-outline',
                )}

                {renderSecondaryItem(
                  'help-circle-outline',
                  copy.help,
                  () => selectSection('Help'),
                )}

                <Text style={styles.sectionLabel}>
                  {copy.preferences}
                </Text>

                <View style={styles.toggleCard}>
                  {renderToggleRow(
                    'theme-light-dark',
                    copy.themeLabel,
                    isDarkTheme ? copy.dark : copy.light,
                    isDarkTheme,
                    value =>
                      setThemeMode(
                        value ? 'dark' : 'light',
                      ),
                  )}
                  {renderToggleRow(
                    'translate',
                    copy.languageLabel,
                    language === 'hi'
                      ? strings.hindi
                      : strings.english,
                    language === 'hi',
                    value => setLanguage(value ? 'hi' : 'en'),
                  )}
                </View>

                <Text style={styles.sectionLabel}>
                  {copy.quickActions}
                </Text>

                {renderSecondaryItem(
                  'share-variant-outline',
                  copy.shareApp,
                  shareApp,
                )}
                {renderSecondaryItem(
                  'star-outline',
                  copy.rateApp,
                  rateApp,
                )}
                {renderSecondaryItem(
                  'information-outline',
                  copy.about,
                  () => selectSection('About'),
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default DrawerNavigator;

