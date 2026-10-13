import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useAds } from '../../hooks/useAds';
import { adUnitId } from '../../config/ads';
import AdPrivacyChoices from './AdPrivacyChoices';
export default function FreeAccountAd() {
  const { sdk, ready, eligible, focused, userId, revision } = useAds();
  const { language } = useLanguage();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [focused, userId, revision]);
  if (!eligible || !focused) return null;
  const Banner = sdk?.BannerAd;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
      {ready && Banner && sdk && !failed && (
        <>
          <Text style={{ color: '#64748B', fontSize: 11, marginBottom: 8 }}>
            {language === 'hi' ? 'विज्ञापन' : 'Advertisement'}
          </Text>
          <Banner
            key={`${userId}-${revision}`}
            unitId={adUnitId(sdk, 'BANNER')}
            size={sdk.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            onAdFailedToLoad={() => setFailed(true)}
          />
        </>
      )}
      <AdPrivacyChoices />
    </View>
  );
}
