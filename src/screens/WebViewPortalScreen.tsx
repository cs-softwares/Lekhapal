import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import { STANDARD_DESKTOP_BROWSER_USER_AGENT } from '../config/webView';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme } from '../context/ThemeContext';
import { openToolHelp } from '../navigation/toolNavigation';
import { COLORS } from '../theme/colors';
import {
  buildBhulekhServiceLaunch,
  isBhulekhWebsiteUrl,
} from '../utils/bhulekhServiceLaunch';
import { UP_PORTAL_PRESENTATION_SCRIPT } from '../utils/upPortalPresentation';
import {
  BHULEKH_HOME,
  getBhulekhPageTarget,
  buildBhulekhSessionIdle,
  buildBhulekhSessionRequest,
} from '../utils/bhulekhSession';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'WebViewPortal'> & {
  isPreloading?: boolean;
  onClose?: () => void;
  bhulekhSessionRequest?: number;
};

const DESKTOP_ONLY_PORTAL_PATTERN =
  /bhunaksha|emapi|bhuiyan|dlrs|jamabandi|biharemutationnew|bashudha|parimarjanplus|raiseaticket|kaithitranslator|biharbhumi|bor\.up\.gov\.in|revenuesoft/i;

const SOFTWARE_LAYER_PORTAL_PATTERN = /bhunaksha|emapi|bhuiyan|dlrs|jamabandi/i;

const PORTAL_VIEWPORT_FIX_PATTERN =
  /biharemutationnew|bashudha|parimarjanplus|raiseaticket|kaithitranslator|biharbhumi/i;

const LEGACY_VIEWPORT_FIX_SCRIPT = `
  (function() {
    function applyFix() {
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
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes'
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
    }
    applyFix();
    document.addEventListener('DOMContentLoaded', applyFix);
    setTimeout(applyFix, 500);
    setTimeout(applyFix, 1500);
  })();
  true;
`;

const WebViewPortalScreen = ({
  navigation,
  route,
  isPreloading = false,
  onClose,
  bhulekhSessionRequest,
}: Props) => {
  const { strings, language } = useLanguage();
  const { colors, isDarkTheme } = useAppTheme();
  const returnToApp = Boolean(route.params.returnToApp);
  const insets = useSafeAreaInsets();
  const [launchPending, setLaunchPending] = useState(
    Boolean(route.params.bhulekhService),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0.05);
  const [displayUrl, setDisplayUrl] = useState(route.params.url);
  const headerColor = isDarkTheme ? '#1E3A8A' : colors.primary;
  const label = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const webRef = useRef<WebView>(null);
  const keepsBhulekhSession =
    bhulekhSessionRequest !== undefined || Boolean(route.params.bhulekhService);
  const sessionRequestId =
    bhulekhSessionRequest !== undefined
      ? `${bhulekhSessionRequest}:${isPreloading}`
      : `${route.key}:${route.params.bhulekhService}:${route.params.url}`;
  const [readyPageRequest, setReadyPageRequest] = useState<string | null>(null);
  const pagePending =
    keepsBhulekhSession &&
    !isPreloading &&
    Boolean(
      getBhulekhPageTarget(route.params.url, route.params.bhulekhService),
    ) &&
    readyPageRequest !== sessionRequestId;
  const sessionScript = keepsBhulekhSession
    ? isPreloading
      ? buildBhulekhSessionIdle(sessionRequestId)
      : buildBhulekhSessionRequest(
          route.params.url,
          route.params.bhulekhService,
          sessionRequestId,
        )
    : '';
  useEffect(() => {
    if (sessionScript) webRef.current?.injectJavaScript(sessionScript);
  }, [sessionScript]);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const closePortal = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  }, [navigation, onClose]);
  useLayoutEffect(() => {
    setLaunchPending(!isPreloading && Boolean(route.params.bhulekhService));
    setPortalError(null);
    setCanGoBack(false);
    setCanGoForward(false);
    setMenuOpen(false);
  }, [
    route.params.bhulekhService,
    route.params.url,
    isPreloading,
    bhulekhSessionRequest,
  ]);
  useFocusEffect(
    useCallback(() => {
      if (isPreloading) {
        return;
      }
      StatusBar.setBarStyle('light-content');
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (menuOpen) {
          setMenuOpen(false);
          return true;
        }
        if (canGoBack && !returnToApp) {
          setPortalError(null);
          webRef.current?.goBack();
          return true;
        }
        closePortal();
        return true;
      });
      return () => {
        handler.remove();
        StatusBar.setBarStyle(onClose ? 'light-content' : 'dark-content');
      };
    }, [canGoBack, menuOpen, isPreloading, closePortal, onClose, returnToApp]),
  );
  const [webKey, setWebKey] = useState(0);
  const [portalError, setPortalError] = useState<{
    body: string;
    title: string;
  } | null>(null);
  useEffect(() => {
    if (!launchPending) {
      return;
    }
    const launchScript =
      !keepsBhulekhSession && route.params.bhulekhService
        ? buildBhulekhServiceLaunch(route.params.bhulekhService)
        : undefined;
    if (launchScript) {
      webRef.current?.injectJavaScript(launchScript);
    }
  }, [launchPending, webKey, route.params.bhulekhService, keepsBhulekhSession]);
  const portalUrl = keepsBhulekhSession ? BHULEKH_HOME : route.params.url;
  const [currentUrl, setCurrentUrl] = useState(() =>
    portalUrl.startsWith('https://bhunaksha.bihar.gov.in/10/index.jsp')
      ? portalUrl.replace('https://', 'http://')
      : portalUrl,
  );
  useEffect(() => {
    const nextUrl = portalUrl.startsWith(
      'https://bhunaksha.bihar.gov.in/10/index.jsp',
    )
      ? portalUrl.replace('https://', 'http://')
      : portalUrl;
    setCurrentUrl(nextUrl);
    setDisplayUrl(nextUrl);
    legacyRetryTriggeredRef.current = false;
  }, [portalUrl]);
  const mainDocumentUrl = useRef(currentUrl);
  const legacyRetryTriggeredRef = useRef(false);
  const isUpBhuNakshaPortal = /^https:\/\/upbhunaksha\.gov\.in(?:\/|$)/i.test(
    currentUrl,
  );
  const usesDesktopUserAgent =
    !isUpBhuNakshaPortal && DESKTOP_ONLY_PORTAL_PATTERN.test(currentUrl);
  const usesSoftwareLayer =
    !isUpBhuNakshaPortal && SOFTWARE_LAYER_PORTAL_PATTERN.test(currentUrl);
  const needsViewportFix = PORTAL_VIEWPORT_FIX_PATTERN.test(currentUrl);
  const isBiharBhuNakshaPortal = currentUrl.includes('bhunaksha.bihar.gov.in');
  const userAgent = usesDesktopUserAgent
    ? STANDARD_DESKTOP_BROWSER_USER_AGENT
    : undefined;

  return (
    <AppScreen
      contentContainerStyle={[styles.fill, { paddingBottom: insets.bottom }]}
      scroll={false}
    >
      <View
        style={[
          styles.browserHeader,
          {
            backgroundColor: headerColor,
            paddingTop: Platform.OS === 'android' ? insets.top : 0,
          },
        ]}
      >
        <View style={styles.browserBar}>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={
              canGoBack && !returnToApp
                ? label('Previous web page', 'पिछला वेब पेज')
                : label('Back to app', 'ऐप पर वापस जाएं')
            }
            onPress={() => {
              setMenuOpen(false);
              setPortalError(null);
              if (canGoBack && !returnToApp) {
                webRef.current?.goBack();
              } else {
                closePortal();
              }
            }}
            style={styles.headerButton}
          >
            <Icon name="arrow-left" size={23} color="#FFFFFF" />
          </AppPressable>
          <View style={styles.pageIdentity}>
            <Text numberOfLines={1} style={styles.pageTitle}>
              {route.params.title}
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="middle"
              style={styles.pageAddress}
            >
              {displayUrl.replace(/^https?:\/\//, '').split(/[/?#]/)[0]}
            </Text>
          </View>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={label(
              'Refresh government website',
              'सरकारी वेबसाइट रीफ्रेश करें',
            )}
            onPress={() => {
              setMenuOpen(false);
              setPortalError(null);
              if (launchPending) {
                setWebKey(previous => previous + 1);
              } else {
                webRef.current?.reload();
              }
            }}
            style={styles.headerButton}
          >
            <Icon name="refresh" size={23} color="#FFFFFF" />
          </AppPressable>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={label('Browser options', 'ब्राउज़र विकल्प')}
            accessibilityState={{ expanded: menuOpen }}
            onPress={() => setMenuOpen(open => !open)}
            style={styles.headerButton}
          >
            <Icon
              name={menuOpen ? 'chevron-up' : 'dots-vertical'}
              size={23}
              color="#FFFFFF"
            />
          </AppPressable>
        </View>
        {menuOpen && (
          <View style={styles.browserOptions}>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={label('Next web page', 'अगला वेब पेज')}
              accessibilityState={{ disabled: !canGoForward }}
              disabled={!canGoForward}
              onPress={() => {
                setMenuOpen(false);
                setPortalError(null);
                webRef.current?.goForward();
              }}
              style={[
                styles.optionButton,
                !canGoForward && styles.disabledOption,
              ]}
            >
              <Icon name="arrow-right" size={20} color="#FFFFFF" />
              <Text style={styles.optionText}>{label('Forward', 'आगे')}</Text>
            </AppPressable>
            {route.params.toolId && (
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel={label('Portal help', 'पोर्टल सहायता')}
                onPress={() => {
                  setMenuOpen(false);
                  openToolHelp(navigation, route.params.toolId!);
                }}
                style={styles.optionButton}
              >
                <Icon name="help-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.optionText}>{label('Help', 'सहायता')}</Text>
              </AppPressable>
            )}
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={label('Close website', 'वेबसाइट बंद करें')}
              onPress={closePortal}
              style={styles.optionButton}
            >
              <Icon name="close" size={20} color="#FFFFFF" />
              <Text style={styles.optionText}>
                {label('Close', 'बंद करें')}
              </Text>
            </AppPressable>
          </View>
        )}
        <View style={styles.progressTrack}>
          {progress < 1 && (
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          )}
        </View>
      </View>
      <View style={styles.content}>
        <View
          testID="portal-web-content"
          style={[styles.webViewCard, pagePending && styles.pendingPage]}
          pointerEvents={pagePending ? 'none' : 'auto'}
          importantForAccessibility={
            pagePending ? 'no-hide-descendants' : 'auto'
          }
          accessibilityElementsHidden={pagePending}
        >
          <WebView
            ref={webRef}
            onNavigationStateChange={state => {
              mainDocumentUrl.current = state.url;
              setDisplayUrl(state.url);
              setCanGoBack(
                state.canGoBack &&
                  !(keepsBhulekhSession && state.url === route.params.url) &&
                  !(
                    route.params.bhulekhService &&
                    (state.url === 'https://upbhulekh.gov.in/#/selection' ||
                      state.url === 'https://upbhulekh.gov.in/#/index-login')
                  ),
              );
              setCanGoForward(state.canGoForward);
            }}
            onLoadProgress={event => setProgress(event.nativeEvent.progress)}
            onLoadEnd={() => {
              setProgress(1);
              webRef.current?.injectJavaScript(UP_PORTAL_PRESENTATION_SCRIPT);
              if (sessionScript) {
                webRef.current?.injectJavaScript(sessionScript);
              } else if (launchPending && route.params.bhulekhService) {
                webRef.current?.injectJavaScript(
                  buildBhulekhServiceLaunch(route.params.bhulekhService),
                );
              }
            }}
            onLoadStart={event => {
              setPortalError(null);
              setProgress(0.05);
              mainDocumentUrl.current = event.nativeEvent.url;
            }}
            allowFileAccess
            allowUniversalAccessFromFileURLs
            androidLayerType={usesSoftwareLayer ? 'software' : 'hardware'}
            cacheEnabled
            domStorageEnabled
            injectedJavaScriptBeforeContentLoaded={
              UP_PORTAL_PRESENTATION_SCRIPT +
              (sessionScript ||
                (route.params.bhulekhService
                  ? buildBhulekhServiceLaunch(route.params.bhulekhService)
                  : '')) +
              (needsViewportFix ? LEGACY_VIEWPORT_FIX_SCRIPT : '')
            }
            injectedJavaScript={
              UP_PORTAL_PRESENTATION_SCRIPT +
              (sessionScript ||
                (launchPending && route.params.bhulekhService
                  ? buildBhulekhServiceLaunch(route.params.bhulekhService)
                  : '')) +
              (needsViewportFix ? LEGACY_VIEWPORT_FIX_SCRIPT : '')
            }
            onMessage={event => {
              if (!isBhulekhWebsiteUrl(event.nativeEvent.url)) {
                return;
              }
              try {
                const message = JSON.parse(event.nativeEvent.data);
                if (message.type === 'bhulekh-page-ready') {
                  if (
                    keepsBhulekhSession &&
                    !isPreloading &&
                    message.requestId === sessionRequestId
                  ) {
                    setReadyPageRequest(message.requestId);
                  }
                  return;
                }
                if (
                  !launchPending ||
                  message.type !== 'bhulekh-service' ||
                  message.service !== route.params.bhulekhService
                ) {
                  return;
                }
                if (message.status === 'ready') {
                  setPortalError(null);
                  setLaunchPending(false);
                  setCanGoBack(false);
                }
              } catch {
                /* Ignore unrelated website messages. */
              }
            }}
            javaScriptEnabled
            javaScriptCanOpenWindowsAutomatically
            key={webKey}
            mixedContentMode="always"
            onError={syntheticEvent => {
              const { description, url } = syntheticEvent.nativeEvent;

              if (
                !legacyRetryTriggeredRef.current &&
                url?.startsWith('https://bhunaksha.bihar.gov.in') &&
                description?.includes('ERR_CONNECTION_RESET')
              ) {
                legacyRetryTriggeredRef.current = true;
                setCurrentUrl(url.replace('https://', 'http://'));
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
              const { statusCode, url } = syntheticEvent.nativeEvent;
              if (url !== mainDocumentUrl.current) {
                return;
              }

              setPortalError({
                body: `The official portal returned HTTP ${statusCode}. Please try again after some time.`,
                title: 'Portal Unavailable',
              });
            }}
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={
              returnToApp
                ? request =>
                    /^https?:\/\//i.test(request.url) ||
                    request.url === 'about:blank'
                : undefined
            }
            setSupportMultipleWindows={false}
            sharedCookiesEnabled
            source={{ uri: currentUrl }}
            startInLoadingState={false}
            style={styles.webView}
            thirdPartyCookiesEnabled
            userAgent={userAgent}
          />
        </View>

        {portalError ? (
          <View style={styles.errorOverlay}>
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>{portalError.title}</Text>
              <Text style={styles.errorBody}>{portalError.body}</Text>

              <AppPressable
                accessibilityRole="button"
                accessibilityLabel="Retry portal"
                onPress={() => {
                  legacyRetryTriggeredRef.current = false;
                  setLaunchPending(Boolean(route.params.bhulekhService));
                  setPortalError(null);
                  setWebKey(previous => previous + 1);
                }}
                style={styles.errorRetryButton}
              >
                <Text style={styles.errorRetryText}>
                  {strings.reloadPortal}
                </Text>
              </AppPressable>
              <AppPressable
                accessibilityRole="button"
                accessibilityLabel="Return to state services"
                onPress={closePortal}
                style={styles.returnButton}
              >
                <Text style={styles.returnText}>Return to state services</Text>
              </AppPressable>
            </View>
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  pendingPage: { opacity: 0 },
  browserHeader: { width: '100%' },
  browserBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 4,
  },
  headerButton: {
    width: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageIdentity: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  pageTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  pageAddress: { color: '#DBEAFE', fontSize: 11, marginTop: 2 },
  browserOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#FFFFFF33',
  },
  optionButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  disabledOption: { opacity: 0.4 },
  progressTrack: { height: 2 },
  progressFill: { height: 2, backgroundColor: '#BFDBFE' },
  returnButton: { padding: 14, alignItems: 'center' },
  returnText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
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
    backgroundColor: COLORS.background,
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
