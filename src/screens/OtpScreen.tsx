import { postAuthDestination } from '../config/releaseFeatures';
import React, {useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import {useAuthSession} from '../context/AuthSessionContext';
import {useLanguage} from '../context/LanguageContext';
import {useResponsiveMetrics} from '../hooks/useResponsiveMetrics';
import {COLORS} from '../theme/colors';
import {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Otp'>;

const OtpScreen = ({navigation, route}: Props) => {
  const {strings} = useLanguage();
  const {sendOtp, verifyOtp} = useAuthSession();
  const metrics = useResponsiveMetrics();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const helperText =
    route.params.channel === 'phone'
      ? `Enter the 6-digit code sent to +91 ${route.params.phoneNumber}.`
      : `Enter the 6-digit code sent to ${route.params.email}.`;

  const handleVerify = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert(
        strings.invalidOtpTitle,
        strings.invalidOtpBody,
      );
      return;
    }

    try {
      setIsVerifying(true);
      await verifyOtp({
        displayName: route.params.displayName,
        otp: otp.trim(),
        phoneNumber: route.params.phoneNumber,
      });
      navigation.reset({
        index: 0,
        routes: [{name: postAuthDestination()}],
      });
    } catch (error) {
      Alert.alert(
        strings.invalidOtpTitle,
        error instanceof Error
          ? error.message
          : strings.invalidOtpBody,
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      setIsResending(true);
      await sendOtp({
        displayName: route.params.displayName,
        email: route.params.email,
        phoneNumber: route.params.phoneNumber,
      });
      Alert.alert('OTP sent', 'A new OTP has been sent to your phone.');
    } catch (error) {
      Alert.alert(
        'Could not resend OTP',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => navigation.goBack()}
        title="OTP"
      />

      <View
        style={[
          styles.content,
          {
            paddingHorizontal: metrics.contentPadding,
            paddingTop: metrics.verticalScale(18, {
              maxFactor: 1.08,
              minFactor: 0.9,
            }),
          },
        ]}>
        <View
          style={[
            styles.card,
            {
              borderRadius: metrics.scale(24, {
                maxFactor: 1.08,
                minFactor: 0.9,
              }),
              padding: metrics.scale(20, {
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
            {strings.otpTitle}
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
            {helperText}
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
            {strings.otpLabel}
          </Text>
          <TextInput
            autoComplete="one-time-code"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={value =>
              setOtp(value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder={strings.enterOtp}
            placeholderTextColor={COLORS.textSoft}
            style={[
              styles.input,
              {
                borderRadius: metrics.scale(18, {
                  maxFactor: 1.08,
                  minFactor: 0.9,
                }),
                fontSize: metrics.responsiveFont(18, {
                  maxFactor: 1.06,
                  minFactor: 0.9,
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
            value={otp}
          />

          <AppPressable
            disabled={isVerifying}
            onPress={handleVerify}
            style={[
              styles.primaryButton,
              {
                borderRadius: metrics.scale(18, {
                  maxFactor: 1.08,
                  minFactor: 0.9,
                }),
                marginTop: metrics.verticalScale(18, {
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
              {isVerifying ? 'Verifying...' : strings.verifyOtp}
            </Text>
          </AppPressable>

          <AppPressable
            disabled={isResending}
            onPress={handleResend}
            style={styles.resendButton}>
            <Text style={styles.resendButtonText}>
              {isResending ? 'Sending...' : 'Resend OTP'}
            </Text>
          </AppPressable>
        </View>
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  content: {},
  card: {
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
  resendButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  resendButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});

export default OtpScreen;
