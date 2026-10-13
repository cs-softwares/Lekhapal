import React, { useSyncExternalStore } from 'react';
import { Text } from 'react-native';
import AppPressable from '../AppPressable';
import { useLanguage } from '../../context/LanguageContext';
import {
  adConsentSnapshot,
  openAdPrivacy,
  subscribeAdConsent,
} from '../../services/adConsent';
export default function AdPrivacyChoices() {
  const { privacy } = useSyncExternalStore(
    subscribeAdConsent,
    adConsentSnapshot,
    adConsentSnapshot,
  );
  const { language } = useLanguage();
  if (!privacy) return null;
  return (
    <AppPressable
      accessibilityLabel="Ad privacy choices"
      onPress={openAdPrivacy}
      style={{ padding: 12 }}
    >
      <Text style={{ color: '#64748B' }}>
        {language === 'hi' ? 'विज्ञापन गोपनीयता विकल्प' : 'Ad privacy choices'}
      </Text>
    </AppPressable>
  );
}
