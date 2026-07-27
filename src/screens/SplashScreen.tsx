import React, {
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import AppScreen from '../components/AppScreen';
import {useAuthSession} from '../context/AuthSessionContext';
import {useLanguage} from '../context/LanguageContext';
import {COLORS} from '../theme/colors';
import {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Splash'
>;

const SPLASH_ICON = require('../../assets/branding/play-store-icon-512.png');

const SplashScreen = ({navigation}: Props) => {
  const {strings, language} = useLanguage();
  const {isHydrated, session} = useAuthSession();
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.88)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(
    new Animated.Value(20),
  ).current;
  const subtitleOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const [primaryTitle, secondaryTitle] = useMemo(() => {
    const parts = strings.appName
      .split(':')
      .map(part => part.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return [parts[0], parts.slice(1).join(' / ')];
    }

    return [strings.appName, ''];
  }, [strings.appName]);

  const splashTagline =
    language === 'hi'
      ? 'Records, measurement aur field work ek jagah'
      : 'Records, measurement, and field work together';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(iconOpacity, {
        duration: 440,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        bounciness: 6,
        speed: 12,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        delay: 120,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        delay: 120,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        delay: 380,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    iconOpacity,
    iconScale,
    subtitleOpacity,
    titleOpacity,
    titleTranslateY,
  ]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const timer = setTimeout(() => {
      navigation.replace(session ? 'MainDrawer' : 'Login');
    }, 2800);

    return () => clearTimeout(timer);
  }, [isHydrated, navigation, session]);

  return (
    <AppScreen
      contentContainerStyle={styles.fill}
      scroll={false}>
      <LinearGradient
        colors={[
          '#050B1A',
          '#0B1E4A',
          '#123983',
        ]}
        style={styles.fill}>
        <View style={styles.centerContent}>
          <Animated.View
            style={[
              styles.iconWrap,
              {
                opacity: iconOpacity,
                transform: [{scale: iconScale}],
              },
            ]}>
            <Image
              resizeMode="cover"
              source={SPLASH_ICON}
              style={styles.icon}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.titleWrap,
              {
                opacity: titleOpacity,
                transform: [
                  {translateY: titleTranslateY},
                ],
              },
            ]}>
            <Text style={styles.titlePrimary}>
              {primaryTitle}
            </Text>

            {secondaryTitle ? (
              <Text style={styles.titleSecondary}>
                {secondaryTitle}
              </Text>
            ) : null}
          </Animated.View>

          <Animated.View
            style={[
              styles.subtitleWrap,
              {opacity: subtitleOpacity},
            ]}>
            <Text style={styles.subtitle}>
              {splashTagline}
            </Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconWrap: {
    borderRadius: 18,
    marginBottom: 24,
    overflow: 'hidden',
  },
  icon: {
    borderRadius: 18,
    height: 64,
    width: 64,
  },
  titleWrap: {
    alignItems: 'center',
  },
  titlePrimary: {
    color: COLORS.white,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 56,
    textAlign: 'center',
  },
  titleSecondary: {
    color: '#D8E4FF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2.4,
    lineHeight: 24,
    marginTop: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtitleWrap: {
    marginTop: 28,
    minHeight: 24,
  },
  subtitle: {
    color: '#FCD34D',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
});

export default SplashScreen;
