import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useSelectedState } from '../context/SelectedStateContext';
import AppScreen from '../components/AppScreen';
import { useAuthSession } from '../context/AuthSessionContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme/colors';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SPLASH_ICON = require('../../assets/branding/play-store-icon-le-land-512.png');

const SplashScreen = ({ navigation }: Props) => {
  const { stateCode, ready: stateReady } = useSelectedState();
  const { strings } = useLanguage();
  const { isHydrated, session } = useAuthSession();
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.88)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;

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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(iconOpacity, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        bounciness: 4,
        speed: 10,
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
    ]).start();
  }, [iconOpacity, iconScale, titleOpacity, titleTranslateY]);

  useEffect(() => {
    if (!isHydrated || !stateReady) {
      return;
    }

    navigation.replace(
      session ? (stateCode ? 'MainDrawer' : 'StateSelection') : 'Login',
    );
  }, [isHydrated, navigation, session, stateCode, stateReady]);

  return (
    <AppScreen contentContainerStyle={styles.fill} scroll={false}>
      <LinearGradient
        colors={['#050B1A', '#0B1E4A', '#123983']}
        style={styles.fill}
      >
        <View style={styles.orbTop} />
        <View style={styles.orbBottom} />
        <View style={styles.centerContent}>
          <Animated.View
            style={[
              styles.iconStage,
              {
                opacity: iconOpacity,
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <Image
              resizeMode="cover"
              source={SPLASH_ICON}
              style={styles.iconWrap}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.titleWrap,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            <Text style={styles.titlePrimary}>{primaryTitle}</Text>

            {secondaryTitle ? (
              <Text style={styles.titleSecondary}>{secondaryTitle}</Text>
            ) : null}
            <View style={styles.brandRule}>
              <View style={styles.ruleLine} />
              <View style={styles.ruleDot} />
              <View style={styles.ruleLine} />
            </View>
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
  orbTop: {
    backgroundColor: 'rgba(54, 111, 255, 0.16)',
    borderRadius: 220,
    height: 440,
    position: 'absolute',
    right: -210,
    top: -170,
    width: 440,
  },
  orbBottom: {
    backgroundColor: 'rgba(20, 77, 181, 0.18)',
    borderRadius: 190,
    bottom: -210,
    height: 380,
    left: -180,
    position: 'absolute',
    width: 380,
  },
  iconStage: {
    alignItems: 'center',
    height: 152,
    justifyContent: 'center',
    marginBottom: 28,
    width: 152,
  },
  iconWrap: {
    borderRadius: 25,
    elevation: 12,
    height: 104,
    shadowColor: '#3972FF',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 24,
    width: 104,
  },
  titleWrap: {
    alignItems: 'center',
  },
  titlePrimary: {
    color: COLORS.white,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 52,
    textAlign: 'center',
  },
  titleSecondary: {
    color: '#D8E4FF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 3.2,
    lineHeight: 24,
    marginTop: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  brandRule: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 22,
  },
  ruleDot: {
    backgroundColor: '#8EB1FF',
    borderRadius: 3,
    height: 6,
    marginHorizontal: 9,
    width: 6,
  },
  ruleLine: {
    backgroundColor: 'rgba(180, 205, 255, 0.44)',
    height: 1,
    width: 38,
  },
});

export default SplashScreen;
