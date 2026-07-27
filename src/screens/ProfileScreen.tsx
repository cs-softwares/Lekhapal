import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import {useAppTheme} from '../context/ThemeContext';
import {useAuthSession} from '../context/AuthSessionContext';
import {useLanguage} from '../context/LanguageContext';

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const {language} = useLanguage();
  const {colors} = useAppTheme();
  const {session, signOut} = useAuthSession();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          padding: 16,
        },
        contentBlock: {
          alignItems: 'center',
          paddingVertical: 8,
        },
        avatar: {
          alignItems: 'center',
          backgroundColor: colors.primary,
          borderRadius: 36,
          height: 72,
          justifyContent: 'center',
          width: 72,
        },
        avatarText: {
          color: colors.white,
          fontSize: 22,
          fontWeight: '800',
        },
        title: {
          color: colors.text,
          fontSize: 22,
          fontWeight: '800',
          marginTop: 14,
          textAlign: 'center',
        },
        helperText: {
          color: colors.textMuted,
          fontSize: 13,
          lineHeight: 20,
          marginTop: 8,
          textAlign: 'center',
        },
        infoList: {
          marginTop: 22,
          width: '100%',
        },
        infoRow: {
          borderBottomColor: colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
          paddingVertical: 14,
        },
        infoLabel: {
          color: colors.textMuted,
          fontSize: 12,
          fontWeight: '700',
          marginBottom: 6,
        },
        infoValue: {
          color: colors.text,
          fontSize: 15,
          fontWeight: '700',
        },
        planValue: {
          color: colors.primary,
          fontSize: 15,
          fontWeight: '800',
        },
        buttonRow: {
          flexDirection: 'row',
          marginTop: 22,
          width: '100%',
        },
        guestButtonGroup: {
          marginTop: 22,
          width: '100%',
        },
        guestPrimaryButton: {
          alignItems: 'center',
          backgroundColor: colors.primary,
          borderRadius: 18,
          justifyContent: 'center',
          minHeight: 54,
          paddingHorizontal: 18,
          width: '100%',
        },
        guestSecondaryButton: {
          alignItems: 'center',
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.primarySoft,
          borderRadius: 18,
          borderWidth: 1,
          justifyContent: 'center',
          marginTop: 14,
          minHeight: 54,
          paddingHorizontal: 18,
          width: '100%',
        },
        primaryButton: {
          alignItems: 'center',
          backgroundColor: colors.primary,
          borderRadius: 16,
          flex: 1,
          justifyContent: 'center',
          marginRight: 8,
          minHeight: 50,
        },
        primaryButtonText: {
          color: colors.white,
          fontSize: 14,
          fontWeight: '800',
        },
        secondaryButton: {
          alignItems: 'center',
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.primarySoft,
          borderRadius: 16,
          borderWidth: 1,
          flex: 1,
          justifyContent: 'center',
          marginLeft: 8,
          minHeight: 50,
        },
        secondaryButtonText: {
          color: colors.primary,
          fontSize: 14,
          fontWeight: '800',
        },
      }),
    [colors],
  );

  const isSignedIn = Boolean(session && !session.isGuest);
  const displayName =
    session?.displayName ?? 'Guest User';
  const phoneLabel = 'Mobile number';
  const planLabel = 'Your active plan';
  const statusLabel = 'Account status';
  const guestText = 'Guest access';
  const planText =
    session?.plan === 'premium'
      ? 'Premium account'
      : 'Guest plan';
  const phoneValue = session?.phoneNumber
    ? `+91 ${session.phoneNumber}`
    : 'Not linked yet';
  const statusValue = isSignedIn
    ? 'Signed in'
    : guestText;
  const nameLabel = 'User name';
  const helperText = isSignedIn
    ? language === 'hi'
      ? 'This account अभी app में active है।'
      : 'This account is active in the app right now.'
    : language === 'hi'
      ? 'अपना real name और premium plan यहाँ दिखाने के लिए Log in या Sign in करें।'
      : 'Login or sign in to show your real name and premium plan here.';
  const screenTitle = 'Profile';
  const switchAccountLabel = 'Switch account';
  const signOutLabel = 'Sign out';
  const loginLabel = 'Log in';
  const signInLabel = 'Sign in';

  const handleAccountReset = async () => {
    await signOut();
    navigation.reset({
      index: 0,
      routes: [{name: 'Login'}],
    });
  };

  return (
    <AppScreen>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => navigation.navigate('Home')}
        title={screenTitle}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.contentBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map(part => part[0]?.toUpperCase() ?? '')
                .join('') || 'GU'}
            </Text>
          </View>

          <Text style={styles.title}>{displayName}</Text>
          <Text style={styles.helperText}>{helperText}</Text>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{nameLabel}</Text>
              <Text style={styles.infoValue}>{displayName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{phoneLabel}</Text>
              <Text style={styles.infoValue}>{phoneValue}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{planLabel}</Text>
              <Text style={styles.planValue}>{planText}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{statusLabel}</Text>
              <Text style={styles.infoValue}>{statusValue}</Text>
            </View>
          </View>

          {isSignedIn ? (
            <View style={styles.buttonRow}>
              <AppPressable
                onPress={() => navigation.navigate('Login')}
                pressEffect="tilt"
                style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {switchAccountLabel}
                </Text>
              </AppPressable>

              <AppPressable
                onPress={handleAccountReset}
                pressEffect="slide"
                style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>
                  {signOutLabel}
                </Text>
              </AppPressable>
            </View>
          ) : (
            <View style={styles.guestButtonGroup}>
              <AppPressable
                onPress={() => navigation.navigate('Login')}
                pressEffect="tilt"
                style={styles.guestPrimaryButton}>
                <Text style={styles.primaryButtonText}>
                  {loginLabel}
                </Text>
              </AppPressable>

              <AppPressable
                onPress={() => navigation.navigate('Login')}
                pressEffect="slide"
                style={styles.guestSecondaryButton}>
                <Text style={styles.secondaryButtonText}>
                  {signInLabel}
                </Text>
              </AppPressable>
            </View>
          )}
        </View>
      </ScrollView>
    </AppScreen>
  );
};

export default ProfileScreen;
