import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppPressable from '../AppPressable';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import {
  acceptRecoveryUrl,
  discardRecovery,
  isRecoveryUrl,
  registerPasswordRecovery,
  requestRecoveryEmail,
  updateRecoveredPassword,
} from '../../services/passwordRecovery';
export default function PasswordRecoveryDialog() {
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<'request' | 'sent' | 'update' | 'success'>(
    'request',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const alive = useRef(true);
  const receiving = useRef(false);
  const close = () => {
    if (busy) return;
    setVisible(false);
    setPassword('');
    setConfirm('');
    setShow(false);
    void discardRecovery();
  };
  useEffect(() => {
    alive.current = true;
    registerPasswordRecovery(address => {
      setEmail(address || '');
      setStage('request');
      setError('');
      setPassword('');
      setConfirm('');
      setShow(false);
      setVisible(true);
    });
    const receive = async (url: string) => {
      if (!isRecoveryUrl(url) || receiving.current) return;
      receiving.current = true;
      setVisible(true);
      setBusy(true);
      setError('');
      setPassword('');
      setConfirm('');
      setShow(false);
      try {
        const address = await acceptRecoveryUrl(url);
        if (alive.current) {
          setEmail(address);
          setStage('update');
        }
      } catch {
        if (alive.current) {
          setStage('request');
          setError(
            'This link is invalid or expired. Request a new reset email.',
          );
        }
      } finally {
        receiving.current = false;
        if (alive.current) setBusy(false);
      }
    };
    const subscription = Linking.addEventListener('url', event => {
      void receive(event.url);
    });
    Linking.getInitialURL()
      .then(url => {
        if (url && alive.current) void receive(url);
      })
      .catch(() => {});
    return () => {
      alive.current = false;
      registerPasswordRecovery(null);
      subscription.remove();
      void discardRecovery();
    };
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown(value => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  const send = async () => {
    if (busy || cooldown) return;
    setBusy(true);
    setError('');
    try {
      await requestRecoveryEmail(email);
      setStage('sent');
      setCooldown(60);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'Could not send. Please retry.',
              'ईमेल नहीं भेजा जा सका। फिर कोशिश करें।',
            ),
      );
    } finally {
      setBusy(false);
    }
  };
  const update = async () => {
    if (busy) return;
    if (password !== confirm) {
      setError(t('Passwords do not match.', 'दोनों पासवर्ड समान नहीं हैं।'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updateRecoveredPassword(password);
      setPassword('');
      setConfirm('');
      setStage('success');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('Could not reset password.', 'पासवर्ड रीसेट नहीं हुआ।'),
      );
    } finally {
      setBusy(false);
    }
  };
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[s.page, { backgroundColor: colors.background }]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          <AppPressable
            disabled={busy}
            accessibilityLabel={t(
              'Close password reset',
              'पासवर्ड रीसेट बंद करें',
            )}
            onPress={close}
            style={s.close}
          >
            <Text style={{ color: colors.primary }}>
              {t('Close', 'बंद करें')}
            </Text>
          </AppPressable>
          <Text style={[s.title, { color: colors.text }]}>
            {stage === 'success'
              ? t('Password updated', 'पासवर्ड बदल गया')
              : t('Reset your password', 'पासवर्ड रीसेट करें')}
          </Text>
          {stage === 'success' ? (
            <Text style={[s.body, { color: colors.textMuted }]}>
              {t(
                'Use your new password the next time you sign in to Lekhpal.',
                'लेखपाल में अगली बार साइन इन करते समय नया पासवर्ड इस्तेमाल करें।',
              )}
            </Text>
          ) : (
            <>
              <Text style={[s.body, { color: colors.textMuted }]}>
                {stage === 'update'
                  ? t(
                      'Choose a new password for this verified account.',
                      'इस सत्यापित खाते के लिए नया पासवर्ड चुनें।',
                    )
                  : t(
                      'Enter your Lekhpal email. Open the reset link on this phone to choose a new password.',
                      'अपना लेखपाल ईमेल दर्ज करें। नया पासवर्ड बनाने के लिए इसी फोन पर ईमेल का रीसेट लिंक खोलें।',
                    )}
              </Text>
              <Text style={[s.label, { color: colors.text }]}>
                {t('Email address', 'ईमेल पता')}
              </Text>
              <TextInput
                accessibilityLabel="Recovery email"
                editable={stage === 'request' && !busy}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                style={[
                  s.input,
                  { borderColor: colors.border, color: colors.text },
                ]}
              />
              {stage === 'sent' && (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[s.body, { color: colors.textMuted }]}
                >
                  {t(
                    'If an account exists for this email, a reset email will arrive shortly. Check Spam too. Use the latest email; links expire.',
                    'यदि इस ईमेल से खाता है तो जल्द रीसेट ईमेल मिलेगा। स्पैम भी देखें। नवीनतम ईमेल इस्तेमाल करें; लिंक की अवधि सीमित है।',
                  )}
                </Text>
              )}
              {stage === 'update' && (
                <>
                  {[
                    [t('New password', 'नया पासवर्ड'), password, setPassword],
                    [
                      t('Confirm password', 'पासवर्ड दोबारा लिखें'),
                      confirm,
                      setConfirm,
                    ],
                  ].map(([label, value, setter], index) => (
                    <View key={index}>
                      <Text style={[s.label, { color: colors.text }]}>
                        {label as string}
                      </Text>
                      <TextInput
                        accessibilityLabel={
                          index ? 'Confirm new password' : 'New password'
                        }
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        secureTextEntry={!show}
                        editable={!busy}
                        value={value as string}
                        onChangeText={setter as (value: string) => void}
                        style={[
                          s.input,
                          { borderColor: colors.border, color: colors.text },
                        ]}
                      />
                    </View>
                  ))}
                  <Text style={[s.body, { color: colors.textMuted }]}>
                    {t(
                      'Use at least 8 characters.',
                      'कम से कम 8 अक्षर इस्तेमाल करें।',
                    )}
                  </Text>
                  <AppPressable
                    accessibilityLabel={
                      show ? 'Hide new passwords' : 'Show new passwords'
                    }
                    onPress={() => setShow(value => !value)}
                    style={s.close}
                  >
                    <Text style={{ color: colors.primary }}>
                      {show
                        ? t('Hide passwords', 'पासवर्ड छिपाएं')
                        : t('Show passwords', 'पासवर्ड दिखाएं')}
                    </Text>
                  </AppPressable>
                </>
              )}
            </>
          )}
          {!!error && (
            <Text
              accessibilityRole="alert"
              style={[s.body, { color: colors.danger }]}
            >
              {error}
            </Text>
          )}
          <AppPressable
            disabled={
              busy ||
              (stage === 'update'
                ? password.length < 8 || !confirm
                : stage === 'success'
                ? false
                : !validEmail || cooldown > 0)
            }
            onPress={
              stage === 'success' ? close : stage === 'update' ? update : send
            }
            style={[
              s.button,
              {
                backgroundColor: colors.primary,
                opacity:
                  busy ||
                  (stage === 'update'
                    ? password.length < 8 || !confirm
                    : stage === 'success'
                    ? false
                    : !validEmail || cooldown > 0)
                    ? 0.5
                    : 1,
              },
            ]}
          >
            <Text style={s.buttonText}>
              {busy
                ? t('Please wait…', 'कृपया प्रतीक्षा करें…')
                : stage === 'success'
                ? t('Done', 'हो गया')
                : stage === 'update'
                ? t('Save new password', 'नया पासवर्ड सेव करें')
                : cooldown
                ? `${t('Resend in', 'दोबारा भेजें')} ${cooldown}s`
                : stage === 'sent'
                ? t('Resend email', 'ईमेल फिर भेजें')
                : t('Send reset email', 'रीसेट ईमेल भेजें')}
            </Text>
          </AppPressable>
          {stage === 'sent' && (
            <AppPressable
              disabled={busy}
              onPress={() => {
                setStage('request');
                setError('');
              }}
              style={s.close}
            >
              <Text style={{ color: colors.primary }}>
                {t('Use a different email', 'दूसरा ईमेल इस्तेमाल करें')}
              </Text>
            </AppPressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 24, paddingTop: 48, paddingBottom: 48 },
  close: { minHeight: 48, justifyContent: 'center', alignItems: 'flex-end' },
  title: { fontSize: 27, fontWeight: '800', marginVertical: 18 },
  body: { fontSize: 15, lineHeight: 24, marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  button: {
    minHeight: 52,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
