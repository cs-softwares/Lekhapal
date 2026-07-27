import React, {useRef, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import {
  STANDARD_DESKTOP_BROWSER_USER_AGENT,
  STANDARD_MOBILE_BROWSER_USER_AGENT,
} from '../config/webView';
import {useLanguage} from '../context/LanguageContext';
import {openToolHelp} from '../navigation/toolNavigation';
import {COLORS} from '../theme/colors';
import {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'WebViewPortal'
>;

const DESKTOP_ONLY_PORTAL_PATTERN =
  /bhunaksha|emapi|bhuiyan|dlrs|jamabandi|biharemutationnew|bashudha|parimarjanplus|raiseaticket|kaithitranslator|biharbhumi/i;

const SOFTWARE_LAYER_PORTAL_PATTERN =
  /bhunaksha|emapi|bhuiyan|dlrs|jamabandi/i;

const PORTAL_VIEWPORT_FIX_PATTERN =
  /biharemutationnew|bashudha|parimarjanplus|raiseaticket|kaithitranslator|biharbhumi/i;

const LEGACY_VIEWPORT_FIX_SCRIPT = `
  (function() {
    var head = document.head || document.getElementsByTagName('head')[0];
    if (head) {
      var existingMeta = document.querySelector('meta[name="viewport"]');
      if (!existingMeta) {
        existingMeta = document.createElement('meta');
        existingMeta.name = 'viewport';
        head.appendChild(existingMeta);
      }
      existingMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
      );
    }

    if (document.documentElement) {
      document.documentElement.style.width = '100%';
      document.documentElement.style.maxWidth = '100%';
      document.documentElement.style.overflowX = 'hidden';
    }

    if (document.body) {
      document.body.style.width = '100%';
      document.body.style.maxWidth = '100%';
      document.body.style.overflowX = 'hidden';
    }
  })();
  true;
`;

const WebViewPortalScreen = ({
  navigation,
  route,
}: Props) => {
  const {strings} = useLanguage();
  const [webKey, setWebKey] = useState(0);
  const [portalError, setPortalError] = useState<{
    body: string;
    title: string;
  } | null>(null);
  const portalUrl = route.params.url;
  const [currentUrl, setCurrentUrl] = useState(() =>
    portalUrl.startsWith(
      'https://bhunaksha.bihar.gov.in/10/index.jsp',
    )
      ? portalUrl.replace('https://', 'http://')
      : portalUrl,
  );
  const legacyRetryTriggeredRef = useRef(false);
  const usesDesktopUserAgent =
    DESKTOP_ONLY_PORTAL_PATTERN.test(currentUrl);
  const usesSoftwareLayer =
    SOFTWARE_LAYER_PORTAL_PATTERN.test(currentUrl);
  const needsViewportFix =
    PORTAL_VIEWPORT_FIX_PATTERN.test(currentUrl);
  const isBiharBhuNakshaPortal = currentUrl.includes(
    'bhunaksha.bihar.gov.in',
  );
  const userAgent = usesDesktopUserAgent
    ? STANDARD_DESKTOP_BROWSER_USER_AGENT
    : STANDARD_MOBILE_BROWSER_USER_AGENT;

  return (
    <AppScreen
      contentContainerStyle={styles.fill}
      scroll={false}>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => navigation.goBack()}
        rightIcons={
          route.params.toolId
            ? [
                {
                  iconName: 'help-circle-outline',
                  onPress: () =>
                    openToolHelp(
                      navigation,
                      route.params.toolId!,
                    ),
                },
              ]
            : undefined
        }
        title={route.params.title}
      />

      <View style={styles.content}>
        <View style={styles.webViewCard}>
          <WebView
            allowFileAccess
            allowUniversalAccessFromFileURLs
            androidLayerType={
              usesSoftwareLayer ? 'software' : 'hardware'
            }
            cacheEnabled
            domStorageEnabled
            injectedJavaScriptBeforeContentLoaded={
              needsViewportFix
                ? LEGACY_VIEWPORT_FIX_SCRIPT
                : undefined
            }
            javaScriptEnabled
            javaScriptCanOpenWindowsAutomatically
            key={webKey}
            mixedContentMode="always"
            onError={syntheticEvent => {
              const {description, url} =
                syntheticEvent.nativeEvent;

              if (
                !legacyRetryTriggeredRef.current &&
                url?.startsWith(
                  'https://bhunaksha.bihar.gov.in',
                ) &&
                description?.includes('ERR_CONNECTION_RESET')
              ) {
                legacyRetryTriggeredRef.current = true;
                setCurrentUrl(
                  url.replace('https://', 'http://'),
                );
                setWebKey(previous => previous + 1);
                return;
              }

              setPortalError({
                body: isBiharBhuNakshaPortal
                  ? 'The official Bihar Bhu Naksha site is not responding right now. This looks like a live portal issue, so please try again after some time.'
                  : description ||
                    'The official portal is not responding right now. Please try again.',
                title: isBiharBhuNakshaPortal
                  ? 'Bihar Bhu Naksha Unavailable'
                  : 'Portal Unavailable',
              });
            }}
            onHttpError={syntheticEvent => {
              const {statusCode} = syntheticEvent.nativeEvent;

              setPortalError({
                body: `The official portal returned HTTP ${statusCode}. Please try again after some time.`,
                title: 'Portal Unavailable',
              });
            }}
            originWhitelist={['*']}
            setSupportMultipleWindows={false}
            sharedCookiesEnabled 
            source={{uri: currentUrl}}
            startInLoadingState
            style={styles.webView}
            thirdPartyCookiesEnabled
            userAgent={userAgent}
          />
        </View>

        <View
          pointerEvents="box-none"
          style={styles.portalActionWrap}>
          <AppPressable
            onPress={() => {
              legacyRetryTriggeredRef.current = false;
              setPortalError(null);
              setWebKey(previous => previous + 1);
            }}
            pressEffect="slide"
            style={styles.portalActionButton}>
            <Text style={styles.portalActionText}>
              {strings.reloadPortal}
            </Text>
          </AppPressable>
        </View>

        {portalError ? (
          <View style={styles.errorOverlay}>
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>
                {portalError.title}
              </Text>
              <Text style={styles.errorBody}>
                {portalError.body}
              </Text>

              <AppPressable
                onPress={() => {
                  legacyRetryTriggeredRef.current = false;
                  setPortalError(null);
                  setWebKey(previous => previous + 1);
                }}
                pressEffect="slide"
                style={styles.errorRetryButton}>
                <ActivityIndicator
                  color={COLORS.white}
                  size="small"
                />
                <Text style={styles.errorRetryText}>
                  {strings.reloadPortal}
                </Text>
              </AppPressable>
            </View>
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: 0,
    position: 'relative',
  },
  errorBody: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    elevation: 10,
    marginHorizontal: 24,
    paddingHorizontal: 22,
    paddingVertical: 24,
    shadowColor: '#0f172a',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  errorOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  errorRetryButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 18,
    minWidth: 150,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  errorRetryText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  fill: {
    flex: 1,
  },
  webViewCard: {
    backgroundColor: COLORS.surface,
    flex: 1,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
  portalActionWrap: {
    bottom: 18,
    left: 12,
    position: 'absolute',
    right: 12,
  },
  portalActionButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    elevation: 8,
    justifyContent: 'center',
    minWidth: 118,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: '#0f172a',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  portalActionText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
});

export default WebViewPortalScreen;
