import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from 'react';
import {
  BackHandler,
  findNodeHandle,
  NativeSyntheticEvent,
  Platform,
  requireNativeComponent,
  UIManager,
  ViewProps,
} from 'react-native';
import { WebView, WebViewProps } from 'react-native-webview';

type PortalEvent = {
  kind: string;
  data: string;
  url: string;
  canGoBack: boolean;
  popupDepth: number;
};
type NativeProps = ViewProps & {
  sourceUrl: string;
  injectedScript: string;
  presentationScript: string;
  userAgent?: string;
  onPortalEvent: (event: NativeSyntheticEvent<PortalEvent>) => void;
};
const supported =
  Platform.OS === 'android' &&
  !!UIManager.getViewManagerConfig('LekhpalCensusPortal');
const NativePortal = supported
  ? requireNativeComponent<NativeProps>('LekhpalCensusPortal')
  : null;

/** The parent and official popup share the real browser opener and cookies. */
const CensusPortal = forwardRef<
  WebView,
  WebViewProps & { onPopupBack?: () => void }
>((props, ref) => {
  const native =
    useRef<React.ComponentRef<NonNullable<typeof NativePortal>>>(null);
  const fallback = useRef<WebView>(null);
  const popupDepth = useRef(0);
  const onPopupBack = useRef(props.onPopupBack);
  onPopupBack.current = props.onPopupBack;
  const dispatch = (name: string, args: unknown[] = []) => {
    const handle = findNodeHandle(native.current);
    if (handle) UIManager.dispatchViewManagerCommand(handle, name, args);
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!NativePortal || !popupDepth.current) return false;
        onPopupBack.current?.();
        dispatch('back');
        return true;
      },
    );
    return () => subscription.remove();
  }, []);
  useImperativeHandle(
    ref,
    () =>
      NativePortal
        ? ({
            injectJavaScript: (script: string) => dispatch('inject', [script]),
            goBack: () => dispatch('back'),
            reload: () => dispatch('reload'),
          } as WebView)
        : fallback.current!,
    [],
  );
  if (!NativePortal) return <WebView {...props} ref={fallback} />;
  const source =
    props.source && 'uri' in props.source ? props.source.uri || '' : '';
  return (
    <NativePortal
      ref={native}
      style={props.style}
      sourceUrl={source}
      userAgent={props.userAgent}
      injectedScript={props.injectedJavaScript || ''}
      presentationScript={props.injectedJavaScriptBeforeContentLoaded || ''}
      onPortalEvent={event => {
        const value = event.nativeEvent;
        popupDepth.current = value.popupDepth;
        if (value.kind === 'message')
          props.onMessage?.({
            nativeEvent: { data: value.data, url: value.url },
          } as Parameters<NonNullable<WebViewProps['onMessage']>>[0]);
        else if (value.kind === 'navigation')
          props.onNavigationStateChange?.({
            url: value.url,
            canGoBack: value.canGoBack,
            canGoForward: false,
            loading: false,
            title: 'Agricultural Census',
            navigationType: 'other',
            lockIdentifier: 0,
          });
        else if (value.kind === 'start')
          props.onLoadStart?.(
            event as unknown as Parameters<
              NonNullable<WebViewProps['onLoadStart']>
            >[0],
          );
        else if (value.kind === 'loaded')
          props.onLoadEnd?.(
            event as unknown as Parameters<
              NonNullable<WebViewProps['onLoadEnd']>
            >[0],
          );
        else if (value.kind === 'error')
          props.onError?.(
            event as unknown as Parameters<
              NonNullable<WebViewProps['onError']>
            >[0],
          );
      }}
    />
  );
});
export default CensusPortal;
