import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { NativeAd } from 'react-native-google-mobile-ads';
import { useAds } from '../../hooks/useAds';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import { adUnitId } from '../../config/ads';
export default function SavedWorkAd() {
  const { sdk, ready, userId, revision } = useAds();
  const { language } = useLanguage();
  const { colors } = useAppTheme();
  const [ad, setAd] = useState<{
    value: NativeAd;
    owner: string | null;
    revision: number;
  } | null>(null);
  useEffect(() => {
    let alive = true;
    let loaded: NativeAd | null = null;
    setAd(null);
    if (sdk && ready) {
      sdk.NativeAd.createForAdRequest(adUnitId(sdk, 'NATIVE'), {
        aspectRatio: sdk.NativeMediaAspectRatio.LANDSCAPE,
        startVideoMuted: true,
      })
        .then(value => {
          if (!alive) {
            value.destroy();
            return;
          }
          loaded = value;
          setAd({ value, owner: userId, revision });
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
      loaded?.destroy();
    };
  }, [sdk, ready, userId, revision]);
  if (!sdk || !ready || !ad || ad.owner !== userId || ad.revision !== revision)
    return null;
  const native = ad.value;
  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = sdk;
  return (
    <View style={[styles.section, { borderColor: colors.border }]}>
      <NativeAdView
        nativeAd={native}
        style={{ backgroundColor: colors.surface }}
      >
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {language === 'hi' ? 'विज्ञापन' : 'Advertisement'}
        </Text>
        <View style={styles.heading}>
          {native.icon && (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: native.icon.url }} style={styles.icon} />
            </NativeAsset>
          )}
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={[styles.title, { color: colors.text }]}>
              {native.headline}
            </Text>
          </NativeAsset>
        </View>
        <NativeMediaView resizeMode="contain" style={styles.media} />
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {native.body}
          </Text>
        </NativeAsset>
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text style={[styles.cta, { backgroundColor: colors.primary }]}>
            {native.callToAction}
          </Text>
        </NativeAsset>
      </NativeAdView>
    </View>
  );
}
const styles = StyleSheet.create({
  section: { marginTop: 28, paddingTop: 20, borderTopWidth: 1 },
  label: { fontSize: 11, paddingTop: 8, paddingBottom: 16, paddingRight: 40 },
  heading: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: { width: 40, height: 40 },
  title: { fontSize: 16, fontWeight: '600', flex: 1 },
  media: { width: '100%', aspectRatio: 1.78, minHeight: 120 },
  body: { fontSize: 13, lineHeight: 19, marginVertical: 12 },
  cta: {
    color: '#FFFFFF',
    textAlign: 'center',
    padding: 12,
    borderRadius: 8,
    fontWeight: '600',
  },
});
