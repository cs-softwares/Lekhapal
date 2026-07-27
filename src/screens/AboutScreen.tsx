import React from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import AppSectionTitle from '../components/AppSectionTitle';
import {useAppTheme} from '../context/ThemeContext';
import {useLanguage} from '../context/LanguageContext';
import {selectDrawerSection} from '../navigation/drawerHelpers';

const APP_NAME = 'Lekhpal : Smart Work';
const APP_VERSION = '1.0';
const APP_PACKAGE_ID = 'com.lekhpal';
const DEVELOPER_NAME = 'Sneha Shankhwar ❤️';
const DEVELOPER_PROFILE_URL =
  'https://www.linkedin.com/in/sneha-shankhwar-573348344/';
const PORTFOLIO_URL =
  'https://sneha-portfolio-kappa.vercel.app/';
const COMPANY_NAME = 'Creative Softwares';
const COMPANY_PROFILE_URL = PORTFOLIO_URL;
const CONTACT_PHONE = '9548488443';
const CONTACT_EMAIL = 'creativesoftwares96@gmail.com';
const PRIVACY_POLICY_URL = '';

type AboutRow = {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  onPress?: () => void;
  value?: string;
};

const AboutScreen = () => {
  const {language} = useLanguage();
  const {colors} = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          paddingBottom: 34,
          paddingHorizontal: 16,
          paddingTop: 18,
        },
        topBlock: {
          marginBottom: 24,
        },
        appName: {
          color: colors.text,
          fontSize: 26,
          fontWeight: '800',
          lineHeight: 32,
        },
        description: {
          color: colors.textMuted,
          fontSize: 14,
          lineHeight: 22,
          marginTop: 10,
        },
        chipRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginTop: 14,
        },
        chip: {
          borderRadius: 999,
          marginBottom: 8,
          marginRight: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        chipText: {
          fontSize: 12,
          fontWeight: '800',
        },
        listBlock: {
          marginBottom: 20,
        },
        row: {
          alignItems: 'center',
          borderBottomColor: colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
          flexDirection: 'row',
          minHeight: 68,
          paddingVertical: 10,
        },
        iconWrap: {
          alignItems: 'center',
          borderRadius: 14,
          height: 42,
          justifyContent: 'center',
          marginRight: 12,
          width: 42,
        },
        rowTextBlock: {
          flex: 1,
          marginRight: 10,
        },
        rowLabel: {
          color: colors.textMuted,
          fontSize: 12,
          fontWeight: '700',
        },
        rowValue: {
          color: colors.text,
          fontSize: 15,
          fontWeight: '700',
          marginTop: 4,
        },
        rowValueLink: {
          color: colors.primary,
        },
        footerWrap: {
          alignItems: 'center',
          paddingBottom: 8,
          paddingTop: 8,
        },
        footerLabel: {
          color: colors.textMuted,
          fontSize: 12,
        },
        footerLink: {
          color: colors.primary,
          fontSize: 15,
          fontWeight: '800',
          marginTop: 6,
        },
      }),
    [colors],
  );

  const copy =
    language === 'hi'
      ? {
          aboutTitle: 'About App',
          contactTitle: 'Contact & Links',
          description:
            'Lekhpal : Smart Work lekhpal daily use ke liye bana ek clean workspace hai jahan official portal flow, measurement, calculator aur saved work ek jagah milta hai. Iska focus fast access, simple working flow aur field se office tak useful tools ko ek hi app me rakhna hai taaki daily kaam zyada clear aur manageable lage.',
          detailsTitle: 'App Details',
          developerLabel: 'Developer',
          emailLabel: 'Gmail',
          footerLabel: 'Product of',
          packageLabel: 'App Package',
          phoneLabel: 'Contact Number',
          portfolioLabel: 'Portfolio',
          privacyLabel: 'Privacy Policy',
          privacyMissingMessage:
            'Privacy policy link abhi add nahi ki gayi hai.',
          privacyMissingTitle: 'Privacy Policy',
          versionLabel: 'App Version',
        }
      : {
          aboutTitle: 'About App',
          contactTitle: 'Contact & Links',
          description:
            'Lekhpal : Smart Work is a clean workspace for lekhpal daily use, bringing official portal flow, measurement, calculators, and saved work into one place. It is designed for faster access, simpler daily flow, and practical tools that help from field work to office follow-up inside a single app.',
          detailsTitle: 'App Details',
          developerLabel: 'Developer',
          emailLabel: 'Gmail',
          footerLabel: 'Product of',
          packageLabel: 'App Package',
          phoneLabel: 'Contact Number',
          portfolioLabel: 'Portfolio',
          privacyLabel: 'Privacy Policy',
          privacyMissingMessage:
            'No privacy policy link has been added yet.',
          privacyMissingTitle: 'Privacy Policy',
          versionLabel: 'App Version',
        };

  const openExternal = React.useCallback(
    async (
      url: string,
      title: string,
      message: string,
    ) => {
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert(title, message);
      }
    },
    [],
  );

  const openPrivacyPolicy = React.useCallback(() => {
    if (!PRIVACY_POLICY_URL.trim()) {
      Alert.alert(
        copy.privacyMissingTitle,
        copy.privacyMissingMessage,
      );
      return;
    }

    void openExternal(
      PRIVACY_POLICY_URL,
      copy.privacyMissingTitle,
      language === 'hi'
        ? 'Privacy policy link abhi open nahi ho paayi.'
        : 'The privacy policy link could not open right now.',
    );
  }, [
    copy.privacyMissingMessage,
    copy.privacyMissingTitle,
    language,
    openExternal,
  ]);

  const detailsRows: AboutRow[] = [
    {
      icon: 'application-outline',
      iconBg: 'rgba(37,99,235,0.12)',
      iconColor: '#2563EB',
      label: 'App Name',
      value: APP_NAME,
    },
    {
      icon: 'tag-outline',
      iconBg: 'rgba(14,165,233,0.12)',
      iconColor: '#0284C7',
      label: copy.versionLabel,
      value: APP_VERSION,
    },
    {
      icon: 'cube-outline',
      iconBg: 'rgba(168,85,247,0.12)',
      iconColor: '#9333EA',
      label: copy.packageLabel,
      value: APP_PACKAGE_ID,
    },
    {
      icon: 'shield-lock-outline',
      iconBg: 'rgba(16,185,129,0.12)',
      iconColor: '#059669',
      label: copy.privacyLabel,
      onPress: openPrivacyPolicy,
    },
  ];

  const contactRows: AboutRow[] = [
    {
      icon: 'account-circle-outline',
      iconBg: 'rgba(59,130,246,0.12)',
      iconColor: '#2563EB',
      label: copy.developerLabel,
      onPress: () => {
        void openExternal(
          DEVELOPER_PROFILE_URL,
          copy.developerLabel,
          language === 'hi'
            ? 'Developer profile abhi open nahi ho paayi.'
            : 'The developer profile could not open right now.',
        );
      },
      value: DEVELOPER_NAME,
    },
    {
      icon: 'web',
      iconBg: 'rgba(234,88,12,0.12)',
      iconColor: '#EA580C',
      label: copy.portfolioLabel,
      onPress: () => {
        void openExternal(
          PORTFOLIO_URL,
          copy.portfolioLabel,
          language === 'hi'
            ? 'Portfolio abhi open nahi ho paaya.'
            : 'The portfolio could not open right now.',
        );
      },
    },
    {
      icon: 'phone-outline',
      iconBg: 'rgba(16,185,129,0.12)',
      iconColor: '#059669',
      label: copy.phoneLabel,
      onPress: () => {
        void openExternal(
          `tel:${CONTACT_PHONE}`,
          copy.phoneLabel,
          language === 'hi'
            ? 'Call abhi start nahi ho paayi.'
            : 'The call could not start right now.',
        );
      },
      value: CONTACT_PHONE,
    },
    {
      icon: 'email-outline',
      iconBg: 'rgba(236,72,153,0.12)',
      iconColor: '#DB2777',
      label: copy.emailLabel,
      onPress: () => {
        void openExternal(
          `mailto:${CONTACT_EMAIL}`,
          copy.emailLabel,
          language === 'hi'
            ? 'Mail app abhi open nahi ho paayi.'
            : 'The mail app could not open right now.',
        );
      },
      value: CONTACT_EMAIL,
    },
    {
      icon: 'domain',
      iconBg: 'rgba(245,158,11,0.14)',
      iconColor: '#D97706',
      label: 'Company',
      onPress: () => {
        void openExternal(
          COMPANY_PROFILE_URL,
          'Company',
          language === 'hi'
            ? 'Company profile abhi open nahi ho paayi.'
            : 'The company profile could not open right now.',
        );
      },
      value: COMPANY_NAME,
    },
  ];

  const renderRow = (row: AboutRow) => {
    const content = (
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            {backgroundColor: row.iconBg},
          ]}>
          <Icon
            color={row.iconColor}
            name={row.icon}
            size={20}
          />
        </View>

        <View style={styles.rowTextBlock}>
          {row.value ? (
            <>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text
                numberOfLines={2}
                style={[
                  styles.rowValue,
                  row.onPress && styles.rowValueLink,
                ]}>
                {row.value}
              </Text>
            </>
          ) : (
            <Text
              numberOfLines={1}
              style={[
                styles.rowValue,
                row.onPress && styles.rowValueLink,
                {marginTop: 0},
              ]}>
              {row.label}
            </Text>
          )}
        </View>

        {row.onPress ? (
          <Icon
            color={colors.primary}
            name="chevron-right"
            size={20}
          />
        ) : null}
      </View>
    );

    if (!row.onPress) {
      return (
        <View key={`${row.label}-${row.value ?? 'single'}`}>
          {content}
        </View>
      );
    }

    return (
      <AppPressable
        key={`${row.label}-${row.value ?? 'single'}`}
        onPress={row.onPress}
        pressEffect="slide"
        pressedOpacity={0.78}>
        {content}
      </AppPressable>
    );
  };

  return (
    <AppScreen scroll={false}>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => selectDrawerSection('Workspace')}
        title={copy.aboutTitle}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBlock}>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.description}>
            {copy.description}
          </Text>

          <View style={styles.chipRow}>
            <View
              style={[
                styles.chip,
                {backgroundColor: 'rgba(37,99,235,0.12)'},
              ]}>
              <Text
                style={[
                  styles.chipText,
                  {color: '#2563EB'},
                ]}>
                v{APP_VERSION}
              </Text>
            </View>
            <View
              style={[
                styles.chip,
                {backgroundColor: 'rgba(16,185,129,0.12)'},
              ]}>
              <Text
                style={[
                  styles.chipText,
                  {color: '#059669'},
                ]}>
                Official Portals
              </Text>
            </View>
            <View
              style={[
                styles.chip,
                {backgroundColor: 'rgba(234,88,12,0.12)'},
              ]}>
              <Text
                style={[
                  styles.chipText,
                  {color: '#EA580C'},
                ]}>
                Measurement
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.listBlock}>
          <AppSectionTitle title={copy.detailsTitle} />
          {detailsRows.map(renderRow)}
        </View>

        <View style={styles.listBlock}>
          <AppSectionTitle title={copy.contactTitle} />
          {contactRows.map(renderRow)}
        </View>

        <View style={styles.footerWrap}>
          <Text style={styles.footerLabel}>
            {copy.footerLabel}
          </Text>
          <AppPressable
            onPress={() => {
              void openExternal(
                COMPANY_PROFILE_URL,
                'Company',
                language === 'hi'
                  ? 'Company profile abhi open nahi ho paayi.'
                  : 'The company profile could not open right now.',
              );
            }}
            pressEffect="none"
            pressedOpacity={0.76}>
            <Text style={styles.footerLink}>
              {COMPANY_NAME}
            </Text>
          </AppPressable>
        </View>
      </ScrollView>
    </AppScreen>
  );
};

export default AboutScreen;
