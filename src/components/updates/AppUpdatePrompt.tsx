import React, { useEffect } from 'react';
import {
  AppState,
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  checkAppUpdate,
  startAppUpdate,
  updateSnapshot,
  useAppUpdates,
} from '../../services/appUpdates';

export default function AppUpdatePrompt() {
  const update = useAppUpdates();
  const { colors } = useAppTheme();
  const { language } = useLanguage();
  const hi = language === 'hi';
  useEffect(() => {
    const check = async () => {
      await checkAppUpdate();
      if (
        AppState.currentState === 'active' &&
        updateSnapshot().inProgress &&
        !updateSnapshot().busy
      ) {
        void startAppUpdate();
      }
    };
    void check();
    const listener = AppState.addEventListener('change', status => {
      if (status === 'active' && !updateSnapshot().busy) void check();
    });
    return () => listener.remove();
  }, []);
  return (
    <Modal
      transparent
      animationType="fade"
      visible={update.available}
      onRequestClose={() => BackHandler.exitApp()}
    >
      <View style={styles.backdrop}>
        <View
          accessibilityViewIsModal
          style={[styles.panel, { backgroundColor: colors.surface }]}
        >
          <Icon
            name="download-circle-outline"
            size={38}
            color={colors.primary}
          />
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            {hi ? 'लेखपाल अपडेट करें' : 'Update Lekhpal'}
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {hi
              ? 'नया संस्करण उपलब्ध है। नवीनतम सुधार और सुविधाओं के साथ काम जारी रखने के लिए Google Play से ऐप अपडेट करें।'
              : 'A newer version is available. Update through Google Play to continue with the latest improvements and features.'}
          </Text>
          {update.error && (
            <Text
              accessibilityRole="alert"
              style={[styles.body, { color: colors.text }]}
            >
              {hi
                ? 'Google Play नहीं खुल पाया। इंटरनेट जांचें और फिर कोशिश करें।'
                : 'Could not open Google Play. Check your connection and try again.'}
            </Text>
          )}
          <Pressable
            testID="update-now"
            accessibilityRole="button"
            disabled={update.busy}
            accessibilityState={{ disabled: update.busy, busy: update.busy }}
            onPress={() => {
              void startAppUpdate();
            }}
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.buttonText}>
              {update.busy
                ? hi
                  ? 'Google Play में जारी रखें…'
                  : 'Continue in Google Play…'
                : hi
                ? 'अभी अपडेट करें'
                : 'Update now'}
            </Text>
          </Pressable>
          <Pressable
            testID="close-for-update"
            accessibilityRole="button"
            onPress={() => BackHandler.exitApp()}
            style={styles.exit}
          >
            <Text style={{ color: colors.textMuted }}>
              {hi ? 'ऐप बंद करें' : 'Close app'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    padding: 24,
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  title: { fontSize: 23, fontWeight: '700', marginTop: 16 },
  body: { fontSize: 15, lineHeight: 23, marginVertical: 16 },
  button: {
    minHeight: 48,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  exit: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});
