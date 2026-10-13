import { typography } from '../theme/typography';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useIsFocused } from '@react-navigation/native';
import AppPressable from './AppPressable';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { BHULEKH_RELATED_LINKS } from '../data/bhulekhOptions';
import type { UpHomeEntry } from '../data/upHomeCatalog';

const CARD_WIDTH = 224;
const CARD_GAP = 10;
const TRACK_WIDTH = BHULEKH_RELATED_LINKS.length * (CARD_WIDTH + CARD_GAP);
const PIXELS_PER_SECOND = 36;

export default function BhulekhRelatedLinks({
  onOpen,
  visible,
}: {
  onOpen: (entry: UpHomeEntry) => void;
  visible: boolean;
}) {
  const { language } = useLanguage();
  const { colors, isDarkTheme } = useAppTheme();
  const labelColor = isDarkTheme ? '#E2E8F0' : '#334155';
  const focused = useIsFocused();
  const translateX = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(true);
  const [screenReader, setScreenReader] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReducedMotion(value);
    });
    AccessibilityInfo.isScreenReaderEnabled().then(value => {
      if (mounted) setScreenReader(value);
    });
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    const reader = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReader,
    );
    const app = AppState.addEventListener('change', state =>
      setActive(state === 'active'),
    );
    return () => {
      mounted = false;
      motion.remove();
      reader.remove();
      app.remove();
    };
  }, []);
  const manualScroll = reducedMotion || screenReader;
  useEffect(() => {
    if (!visible || !focused || !active || manualScroll) return;
    translateX.setValue(0);
    // The second identical track meets the first at the loop boundary.
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -TRACK_WIDTH,
        duration: (TRACK_WIDTH / PIXELS_PER_SECOND) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [visible, focused, active, manualScroll, translateX]);

  const renderLinks = () =>
    BHULEKH_RELATED_LINKS.map(entry => {
      return (
        <AppPressable
          key={entry.id}
          accessibilityRole="button"
          accessibilityLabel={entry.title[language]}
          onPress={() => onOpen(entry)}
          style={[
            styles.link,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.iconTile}>
            <Icon name={entry.icon} color={colors.primary} size={22} />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.linkText, { color: labelColor }]}
          >
            {entry.title[language]}
          </Text>
        </AppPressable>
      );
    });

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.text }]}>
        {language === 'hi'
          ? 'संबंधित सरकारी सेवाएं'
          : 'Related government services'}
      </Text>
      {manualScroll ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.manualStrip}
        >
          {renderLinks()}
        </ScrollView>
      ) : (
        <View style={styles.viewport}>
          <Animated.View
            style={[styles.movingStrip, { transform: [{ translateX }] }]}
          >
            <View style={styles.track}>{renderLinks()}</View>
            <View
              style={styles.track}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {renderLinks()}
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { marginTop: 16, marginBottom: 16 },
  title: { ...typography.heading, marginBottom: 12 },
  viewport: { overflow: 'hidden' },
  movingStrip: { flexDirection: 'row', width: TRACK_WIDTH * 2 },
  track: {
    flexDirection: 'row',
    width: TRACK_WIDTH,
    gap: CARD_GAP,
    paddingRight: CARD_GAP,
  },
  manualStrip: { gap: CARD_GAP },
  link: {
    width: CARD_WIDTH,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: { ...typography.label, flexShrink: 1 },
});
