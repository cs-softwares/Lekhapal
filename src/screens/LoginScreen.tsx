import React, {useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import {useAuthSession} from '../context/AuthSessionContext';
import {useLanguage} from '../context/LanguageContext';
import {useResponsiveMetrics} from '../hooks/useResponsiveMetrics';
import {COLORS} from '../theme/colors';
import {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen = ({navigation}: Props) => {
  const {language, strings} = useLanguage();
  const {continueAsGuest, session} = useAuthSession();
  const metrics = useResponsiveMetrics();
  const [fullName, setFullName] = useState(
    session?.isGuest ? '' : session?.displayName ?? '',
  );
  const [phoneNumber, setPhoneNumber] = useState(
    session?.phoneNumber ?? '',
  );

  const trimmedName = fullName.trim();
  const phoneDigits = phoneNumber.replace(/\D/g, '');
  const canContinue =
    trimmedName.length >= 2 && phoneDigits.length >= 10;

  const copy = {
    enterFullName:
      language === 'hi'
        ? 'Apna naam darj karein'
        : 'Enter your full name',
    fullName:
      language === 'hi' ? 'Pura naam' : 'Full name',
    guestHelperText:
      language === 'hi'
        ? 'Guest mode app ko turant kholta hai. Naam aur mobile number baad me bhi add kiya ja sakta hai.'
        : 'Guest mode opens the app instantly. You can add your name and mobile number later.',
    invalidNameBody:
      language === 'hi'
        ? 'Aage badhne ke liye kam se kam 2 letters ka naam darj karein.'
        : 'Enter at least 2 letters in the name to continue.',
    invalidNameTitle:
      language === 'hi' ? 'Naam darj karein' : 'Enter full name',
  };

  const handleContinue = () => {
    if (trimmedName.length < 2) {
      Alert.alert(
        copy.invalidNameTitle,
        copy.invalidNameBody,
      );
      return;
    }

    if (phoneDigits.length < 10) {
      Alert.alert(
        strings.invalidMobileTitle,
        strings.invalidMobileBody,
      );
      return;
    }

    navigation.navigate('Otp', {
      displayName: trimmedName,
      phoneNumber: phoneDigits,
    });
  };

  const handleGuestContinue = async () => {
    await continueAsGuest();
    navigation.replace('MainDrawer');
  };

  return (
    <AppScreen
      contentContainerStyle={styles.fill}
      scroll={false}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        style={styles.fill}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.fill}>
          <View
            style={[
              styles.content,
              {
                paddingHorizontal: metrics.scale(20, {
                  maxFactor: 1.08,
                  minFactor: 0.86,
                }),
              },
            ]}>
            <View
              style={[
                styles.brandCard,
                {
                  marginBottom: metrics.verticalScale(24, {
                    maxFactor: 1.08,
                    minFactor: 0.9,
                  }),
                },
              ]}>
              <Text
                style={[
                  styles.brandTitle,
                  {
                    fontSize: metrics.responsiveFont(30, {
                      maxFactor: 1.06,
                      minFactor: 0.84,
                    }),
                  },
                ]}>
                {strings.appName}
              </Text>
              <Text
                style={[
                  styles.brandTagline,
                  {
                    fontSize: metrics.responsiveFont(15, {
                      maxFactor: 1.06,
                      minFactor: 0.9,
                    }),
                    lineHeight: metrics.verticalScale(22, {
                      maxFactor: 1.08,
                      minFactor: 0.92,
                    }),
                    marginTop: metrics.verticalScale(8, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                  },
                ]}>
                {strings.appTagline}
              </Text>
            </View>

            <View
              style={[
                styles.formCard,
                {
                  borderRadius: metrics.scale(28, {
                    maxFactor: 1.08,
                    minFactor: 0.88,
                  }),
                  padding: metrics.scale(22, {
                    maxFactor: 1.08,
                    minFactor: 0.9,
                  }),
                },
              ]}>
              <Text
                style={[
                  styles.title,
                  {
                    fontSize: metrics.responsiveFont(24, {
                      maxFactor: 1.06,
                      minFactor: 0.88,
                    }),
                  },
                ]}>
                {strings.loginTitle}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    fontSize: metrics.responsiveFont(14, {
                      maxFactor: 1.06,
                      minFactor: 0.92,
                    }),
                    lineHeight: metrics.verticalScale(20, {
                      maxFactor: 1.08,
                      minFactor: 0.94,
                    }),
                    marginTop: metrics.verticalScale(8, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                  },
                ]}>
                {strings.loginSubtitle}
              </Text>

              <Text
                style={[
                  styles.label,
                  {
                    fontSize: metrics.responsiveFont(13, {
                      maxFactor: 1.06,
                      minFactor: 0.92,
                    }),
                    marginTop: metrics.verticalScale(18, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                  },
                ]}>
                {copy.fullName}
              </Text>
              <TextInput
                autoCapitalize="words"
                autoComplete="name"
                onChangeText={setFullName}
                placeholder={copy.enterFullName}
                placeholderTextColor={COLORS.textSoft}
                returnKeyType="next"
                style={[
                  styles.input,
                  {
                    borderRadius: metrics.scale(18, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                    fontSize: metrics.responsiveFont(16, {
                      maxFactor: 1.06,
                      minFactor: 0.92,
                    }),
                    marginTop: metrics.verticalScale(10, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                    paddingHorizontal: metrics.scale(16, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                    paddingVertical: metrics.verticalScale(14, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                  },
                ]}
                value={fullName}
              />

              <Text
                style={[
                  styles.label,
                  {
                    fontSize: metrics.responsiveFont(13, {
                      maxFactor: 1.06,
                      minFactor: 0.92,
                    }),
                    marginTop: metrics.verticalScale(18, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                  },
                ]}>
                {strings.mobileNumber}
              </Text>
              <TextInput
                autoComplete="tel"
                keyboardType="phone-pad"
                maxLength={10}
                onChangeText={value =>
                  setPhoneNumber(
                    value.replace(/\D/g, '').slice(0, 10),
                  )
                }
                placeholder={strings.enterMobileNumber}
                placeholderTextColor={COLORS.textSoft}
                returnKeyType="done"
                style={[
                  styles.input,
                  {
                    borderRadius: metrics.scale(18, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                    fontSize: metrics.responsiveFont(16, {
                      maxFactor: 1.06,
                      minFactor: 0.92,
                    }),
                    marginTop: metrics.verticalScale(10, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                    paddingHorizontal: metrics.scale(16, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                    paddingVertical: metrics.verticalScale(14, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                  },
                ]}
                value={phoneDigits}
              />

              <AppPressable
                disabled={!canContinue}
                onPress={handleContinue}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: canContinue
                      ? COLORS.primary
                      : '#9FB3EA',
                    borderRadius: metrics.scale(18, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                    marginTop: metrics.verticalScale(20, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                    paddingVertical: metrics.verticalScale(15, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                  },
                ]}>
                <Text
                  style={[
                    styles.primaryButtonText,
                    {
                      fontSize: metrics.responsiveFont(15, {
                        maxFactor: 1.06,
                        minFactor: 0.92,
                      }),
                    },
                  ]}>
                  {strings.getOtp}
                </Text>
              </AppPressable>

              <AppPressable
                onPress={handleGuestContinue}
                style={[
                  styles.secondaryButton,
                  {
                    borderRadius: metrics.scale(18, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                    marginTop: metrics.verticalScale(12, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                    paddingVertical: metrics.verticalScale(15, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                  },
                ]}>
                <Text
                  style={[
                    styles.secondaryButtonText,
                    {
                      fontSize: metrics.responsiveFont(15, {
                        maxFactor: 1.06,
                        minFactor: 0.92,
                      }),
                    },
                  ]}>
                  {strings.continueAsGuest}
                </Text>
              </AppPressable>

              <Text
                style={[
                  styles.helperText,
                  {
                    fontSize: metrics.responsiveFont(12, {
                      maxFactor: 1.06,
                      minFactor: 0.92,
                    }),
                    lineHeight: metrics.verticalScale(18, {
                      maxFactor: 1.08,
                      minFactor: 0.94,
                    }),
                    marginTop: metrics.verticalScale(14, {
                      maxFactor: 1.08,
                      minFactor: 0.9,
                    }),
                  },
                ]}>
                {copy.guestHelperText}
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  brandCard: {},
  brandTitle: {
    color: COLORS.white,
    fontWeight: '800',
  },
  brandTagline: {
    color: COLORS.primarySoft,
  },
  formCard: {
    backgroundColor: COLORS.surface,
  },
  title: {
    color: COLORS.text,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textMuted,
  },
  label: {
    color: COLORS.text,
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    color: COLORS.text,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  helperText: {
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default LoginScreen;
