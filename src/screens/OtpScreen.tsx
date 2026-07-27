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
  const {language, strings} = useLanguage();
  const {signInWithOtp} = useAuthSession();
  const metrics = useResponsiveMetrics();
  const [otp, setOtp] = useState('');

  const helperText =
    language === 'hi'
      ? `OTP verify karke ${route.params.displayName} ka premium account khol dein.`
      : `Verify OTP to open the premium account for ${route.params.displayName}.`;

  const handleVerify = async () => {
    if (otp.trim().length < 4) {
      Alert.alert(
        strings.invalidOtpTitle,
        strings.invalidOtpBody,
      );
      return;
    }

    await signInWithOtp({
      displayName: route.params.displayName,
      phoneNumber: route.params.phoneNumber,
    });

    navigation.reset({
      index: 0,
      routes: [{name: 'MainDrawer'}],
    });
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
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setOtp}
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
              {strings.verifyOtp}
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
});

export default OtpScreen;
