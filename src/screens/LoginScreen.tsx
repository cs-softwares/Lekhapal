import {openPasswordRecovery} from '../services/passwordRecovery';
import { postAuthDestination } from '../config/releaseFeatures';
import React, {useState} from 'react';
import {Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import {useAuthSession} from '../context/AuthSessionContext';
import {useLanguage} from '../context/LanguageContext';
import {COLORS} from '../theme/colors';
import {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
type AuthMode = 'signIn' | 'signUp';

const BRAND_ICON = require('../../assets/branding/play-store-icon-le-land-512.png');

const LoginScreen = ({navigation}: Props) => {
  const {language, strings} = useLanguage();
  const {
    session,
    signInWithEmail,
    signUpWithEmail,
  } = useAuthSession();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [fullName, setFullName] = useState(session?.isGuest ? '' : session?.displayName ?? '');
  const [email, setEmail] = useState(session?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const name = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const canContinue = emailIsValid && password.length >= 6 && (mode === 'signIn' || name.length >= 2);

  const handleContinue = async () => {
    if (!canContinue) {
      Alert.alert(
        language === 'hi' ? 'Details check karein' : 'Check your details',
        mode === 'signUp'
          ? 'Enter your name, a valid email and a password of at least 6 characters.'
          : 'Enter a valid email and a password of at least 6 characters.',
      );
      return;
    }

    try {
      setIsSending(true);
      const input = {displayName: name, email: normalizedEmail, password};
      if (mode === 'signUp') {
        await signUpWithEmail(input);
      } else {
        await signInWithEmail(input);
      }
      navigation.replace(postAuthDestination());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '';
      const isNetworkError = /network request failed|failed to fetch|fetch failed/i.test(
        errorMessage,
      );
      Alert.alert(
        language === 'hi' ? 'Login nahi hua' : 'Could not continue',
        isNetworkError
          ? language === 'hi'
            ? 'इंटरनेट उपलब्ध नहीं है। कनेक्शन जांचकर फिर साइन इन करें।'
            : 'Unable to connect. Check your internet connection and try signing in again.'
          : errorMessage || 'Please check your connection and try again.',
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppScreen contentContainerStyle={styles.screen} scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Image source={BRAND_ICON} style={styles.brandMark} />
          <Text style={styles.appName}>{strings.appName}</Text>
          <Text style={styles.welcome}>Welcome</Text>
          <Text style={styles.subtitle}>Sign in securely to continue your field work</Text>

          <View style={styles.methodTabs}>
            {(['signIn', 'signUp'] as AuthMode[]).map(item => (
              <AppPressable
                containerStyle={styles.methodTabContainer}
                key={item}
                onPress={() => { setMode(item); setShowPassword(false); }}
                style={[styles.methodTab, mode === item && styles.methodTabActive]}>
                <Text style={[styles.methodText, mode === item && styles.methodTextActive]}>
                  {item === 'signIn' ? 'Sign in' : 'Create account'}
                </Text>
              </AppPressable>
            ))}
          </View>

          {mode === 'signUp' && (
            <>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                autoCapitalize="words"
                autoComplete="name"
                onChangeText={setFullName}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textSoft}
                style={styles.input}
                value={fullName}
              />
            </>
          )}

          <Text style={styles.label}>Email address</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="name@gmail.com"
            placeholderTextColor={COLORS.textSoft}
            style={styles.input}
            value={email}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            onChangeText={setPassword}
            placeholder="Minimum 6 characters"
            placeholderTextColor={COLORS.textSoft}
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
            value={password}
          />
          <AppPressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(value => !value)} style={styles.passwordToggle}>
            <Text style={styles.methodText}>{showPassword ? (language === 'hi' ? 'छिपाएं' : 'Hide') : (language === 'hi' ? 'दिखाएं' : 'Show')}</Text>
          </AppPressable>
          </View>

          {mode === 'signIn' && <AppPressable disabled={isSending} accessibilityRole="button" accessibilityLabel={language === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot password?'} onPress={() => openPasswordRecovery(email)} style={styles.passwordToggle}>
            <Text style={styles.methodText}>{language === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot password?'}</Text>
          </AppPressable>}
          <AppPressable
            disabled={!canContinue || isSending}
            onPress={handleContinue}
            style={[styles.continueButton, (!canContinue || isSending) && styles.buttonDisabled]}>
            <Text style={styles.continueText}>
              {isSending ? 'Please wait…' : mode === 'signIn' ? 'Sign in securely' : 'Create account'}
            </Text>
          </AppPressable>
          <Text style={styles.securityText}>Sign in to keep Premium purchases linked to your account.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {backgroundColor: '#F8FAFC', flex: 1},
  content: {alignSelf: 'center', flexGrow: 1, justifyContent: 'center', maxWidth: 440, paddingHorizontal: 24, paddingVertical: 24, width: '100%'},
  brandMark: {alignSelf: 'center', borderRadius: 18, height: 58, shadowColor: COLORS.primary, shadowOffset: {height: 8, width: 0}, shadowOpacity: 0.2, shadowRadius: 16, width: 58},
  appName: {color: COLORS.primary, fontSize: 15, fontWeight: '800', marginTop: 12, textAlign: 'center'},
  welcome: {color: COLORS.text, fontSize: 30, fontWeight: '900', marginTop: 24, textAlign: 'center'},
  subtitle: {color: COLORS.textMuted, fontSize: 14, lineHeight: 20, marginTop: 7, textAlign: 'center'},
  methodTabs: {backgroundColor: '#E8EEF9', borderRadius: 14, flexDirection: 'row', marginTop: 28, padding: 4},
  methodTabContainer: {flex: 1},
  methodTab: {alignItems: 'center', borderRadius: 11, padding: 11, width: '100%'},
  methodTabActive: {backgroundColor: COLORS.white},
  methodText: {color: COLORS.textMuted, fontSize: 13, fontWeight: '700'},
  methodTextActive: {color: COLORS.primary},
  label: {color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 18},
  input: {backgroundColor: COLORS.white, borderColor: COLORS.border, borderRadius: 14, borderWidth: 1, color: COLORS.text, fontSize: 16, paddingHorizontal: 16, paddingVertical: 14},
  phoneInput: {alignItems: 'center', backgroundColor: COLORS.white, borderColor: COLORS.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row'},
  countryCode: {color: COLORS.text, fontSize: 16, fontWeight: '700', paddingLeft: 16},
  divider: {backgroundColor: COLORS.border, height: 24, marginHorizontal: 12, width: 1},
  phoneField: {color: COLORS.text, flex: 1, fontSize: 16, paddingRight: 16, paddingVertical: 14},
  continueButton: {alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 14, marginTop: 24, paddingVertical: 16},
  buttonDisabled: {opacity: 0.45},
  continueText: {color: COLORS.white, fontSize: 15, fontWeight: '800'},
  passwordRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14},
  passwordInput: {flex: 1, color: COLORS.text, fontSize: 16, paddingHorizontal: 16, paddingVertical: 14},
  passwordToggle: {minHeight: 48, minWidth: 64, justifyContent: 'center', alignItems: 'center'},
  securityText: {color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginTop: 13, textAlign: 'center'},
});

export default LoginScreen;
