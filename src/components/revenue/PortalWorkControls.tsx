import React, { useEffect } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppHeader from '../AppHeader';
import { useAppTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

/** Keeps the official page visible; only active work or a result needs a strip. */
export function PortalWorkStatus({
  status,
  active,
  onStop,
  onDetails,
}: {
  status: string;
  active: boolean;
  onStop: () => void;
  onDetails: () => void;
}) {
  const { colors } = useAppTheme();
  const { language } = useLanguage();
  if (!status && !active) return null;
  return (
    <View
      style={[
        styles.status,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          language === 'hi' ? 'कार्य का विवरण' : 'Work details'
        }
        onPress={onDetails}
        style={styles.message}
      >
        <Text
          numberOfLines={2}
          accessibilityLiveRegion="polite"
          style={[styles.statusText, { color: colors.text }]}
        >
          {status || (language === 'hi' ? 'कार्य जारी है' : 'Work in progress')}
        </Text>
      </Pressable>
      {active && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'hi' ? 'रोकें' : 'Stop'}
          onPress={onStop}
          style={styles.stop}
        >
          <Text style={styles.stopText}>
            {language === 'hi' ? 'रोकें' : 'Stop'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** An overlay, not a second pane: the browser and queue stay mounted underneath. */
export function PortalWorkPanel({
  visible,
  title,
  onClose,
  onHistory,
  onStop,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onHistory: () => void;
  onStop: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  const { language } = useLanguage();
  useEffect(() => {
    if (!visible) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => listener.remove();
  }, [visible, onClose]);
  return (
    <View
      testID="portal-work-settings"
      accessibilityElementsHidden={!visible}
      accessibilityViewIsModal={visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[
        styles.panel,
        { backgroundColor: colors.background },
        !visible && styles.hidden,
      ]}
    >
      <AppHeader
        title={language === 'hi' ? 'कार्य सेटिंग्स' : 'Work settings'}
        subtitle={title}
        leftIconName="arrow-left"
        onLeftPress={onClose}
        rightIcons={[
          {
            iconName: 'history',
            accessibilityLabel: language === 'hi' ? 'इतिहास' : 'History',
            onPress: onHistory,
          },
        ]}
      />
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {children}
      </KeyboardAvoidingView>
      <View
        style={[
          styles.footer,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'hi' ? 'रोकें' : 'Stop'}
          onPress={onStop}
          style={styles.stop}
        >
          <Text style={styles.stopText}>
            {language === 'hi' ? 'रोकें' : 'Stop'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            language === 'hi'
              ? 'आधिकारिक पेज पर लौटें'
              : 'Return to official page'
          }
          onPress={onClose}
          style={[styles.returnButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.returnText}>
            {language === 'hi'
              ? 'आधिकारिक पेज पर लौटें'
              : 'Return to official page'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    elevation: 10,
  },
  hidden: { display: 'none' },
  content: { flex: 1 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  message: { flex: 1, minHeight: 44, justifyContent: 'center' },
  statusText: { fontSize: 13 },
  stop: {
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  stopText: { color: '#991B1B', fontSize: 14, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  returnButton: {
    flex: 1,
    minHeight: 48,
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  returnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
