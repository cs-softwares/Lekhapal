import { typography } from '../theme/typography';
import FreeAccountAd from '../components/ads/FreeAccountAd';
import OfficialWorkLinks from '../components/revenue/OfficialWorkLinks';
import UpWorkDashboard from '../components/dashboard/UpWorkDashboard';
import React, { useCallback } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppScreen from '../components/AppScreen';
import DashboardPressable from '../components/dashboard/DashboardPressable';
import { useProfileMotion } from '../components/profile/ProfileUI';
import { useSelectedState } from '../context/SelectedStateContext';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { getStateDashboardPortals } from '../data/statePortalCatalog';
import { getBundledStateConfig } from '../config/states';
import PortalCard from '../components/PortalCard';
import { openStatePortalEntry } from '../navigation/statePortalNavigation';
import { openDrawerFromNavigation } from '../navigation/drawerHelpers';

export default function StateDashboardScreen() {
  const navigation = useNavigation<any>();
  const { stateCode } = useSelectedState();
  const { language } = useLanguage();
  const { colors, isDarkTheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const motion = useProfileMotion();
  const linkBackground = isDarkTheme ? colors.surfaceAlt : '#EAF0FC';
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const quickPortals = getStateDashboardPortals(stateCode || '');
  const stateConfig = getBundledStateConfig(stateCode || '');
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      return () => StatusBar.setBarStyle('dark-content');
    }, []),
  );

  return (
    <AppScreen scroll={false}>
      <LinearGradient
        colors={isDarkTheme ? ['#193477', '#2451A5'] : ['#1E40AF', '#2D64D8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          { paddingTop: (Platform.OS === 'android' ? insets.top : 0) + 12 },
        ]}
      >
        <View style={styles.headerRow}>
          <DashboardPressable
            label={t('Open menu', 'मेनू खोलें')}
            motion={motion}
            onPress={() => openDrawerFromNavigation(navigation)}
            style={styles.menuButton}
          >
            <Icon name="menu" size={25} color="#FFFFFF" />
          </DashboardPressable>
          <View style={styles.copy}>
            <Text style={styles.title}>{t('Lekhpal', 'लेखपाल')}</Text>
            {stateCode !== 'UP' && stateConfig && (
              <Text style={styles.stateName}>{stateConfig.name[language]}</Text>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>
      {stateCode === 'UP' ? (
        <UpWorkDashboard navigation={navigation} motion={motion} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <OfficialWorkLinks
            stateCode={stateCode || ''}
            navigation={navigation}
          />
          <View style={styles.sectionRow}>
            <View style={styles.copy}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('Quick access', 'त्वरित पहुंच')}
              </Text>
              <Text
                style={[styles.sectionSubtitle, { color: colors.textMuted }]}
              >
                {t(
                  'Your essential government services',
                  'आपकी ज़रूरी सरकारी सेवाएं',
                )}
              </Text>
            </View>
            <DashboardPressable
              label={t('View all services', 'सभी सेवाएं देखें')}
              motion={motion}
              onPress={() => navigation.navigate('Services')}
              style={[styles.allServices, { backgroundColor: linkBackground }]}
            >
              <Text style={[styles.link, { color: colors.primary }]}>
                {t('View all', 'सभी देखें')}
              </Text>
              <Icon name="arrow-right" size={16} color={colors.primary} />
            </DashboardPressable>
          </View>
          {quickPortals.map(portal => (
            <PortalCard
              key={portal.id}
              portal={portal}
              motion={motion}
              onPress={() => openStatePortalEntry(navigation, portal, language)}
            />
          ))}
          <FreeAccountAd />
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuButton: {
    height: 44,
    width: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  title: { ...typography.heading, color: '#FFFFFF', textAlign: 'center' },
  headerSpacer: { width: 44 },
  stateName: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  content: { padding: 20, paddingTop: 24, paddingBottom: 32 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  sectionTitle: typography.heading,
  sectionSubtitle: { ...typography.caption, marginTop: 3 },
  allServices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    minHeight: 44,
    borderRadius: 12,
  },
  link: typography.label,
});
