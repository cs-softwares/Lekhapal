import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  findNodeHandle,
  NativeSyntheticEvent,
  Platform,
  requireNativeComponent,
  UIManager,
  ViewProps,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ERO_URL, isEroBrowserUrl } from '../../domain/eroPdf';
import { ERO_PDF_BRIDGE } from '../../utils/eroPdfBridge';
import { FEEDING_USER_AGENT } from '../../domain/khasraFeeding';
export type EroEvent = {
  kind: string;
  data: string;
  url: string;
  canGoBack: boolean;
};
export type EroPortalHandle = {
  injectJavaScript: (script: string) => void;
  goBack: () => void;
};
type Props = ViewProps & { onEvent: (event: EroEvent) => void };
type NativeProps = ViewProps & {
  sourceUrl: string;
  script: string;
  userAgent: string;
  onEroEvent: (event: NativeSyntheticEvent<EroEvent>) => void;
};
const supported =
  Platform.OS === 'android' &&
  !!UIManager.getViewManagerConfig('LekhpalEroPortal');
const NativePortal = supported
  ? requireNativeComponent<NativeProps>('LekhpalEroPortal')
  : null;
const EroPortal = forwardRef<EroPortalHandle, Props>(
  ({ onEvent, style }, ref) => {
    const native =
        useRef<React.ComponentRef<NonNullable<typeof NativePortal>>>(null),
      fallback = useRef<WebView>(null);
    const dispatch = (command: string, args: unknown[] = []) => {
      const id = findNodeHandle(native.current);
      if (id) UIManager.dispatchViewManagerCommand(id, command, args);
    };
    useImperativeHandle(
      ref,
      () => ({
        injectJavaScript: script =>
          NativePortal
            ? dispatch('inject', [script])
            : fallback.current?.injectJavaScript(script),
        goBack: () =>
          NativePortal ? dispatch('back') : fallback.current?.goBack(),
      }),
      [],
    );
    if (NativePortal)
      return (
        <NativePortal
          ref={native}
          style={style}
          sourceUrl={ERO_URL}
          script={ERO_PDF_BRIDGE}
          userAgent={FEEDING_USER_AGENT}
          onEroEvent={e => onEvent(e.nativeEvent)}
        />
      );
    return (
      <WebView
        ref={fallback}
        style={style}
        source={{ uri: ERO_URL }}
        userAgent={FEEDING_USER_AGENT}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        mixedContentMode="never"
        allowFileAccess={false}
        originWhitelist={[
          'https://officials.eci.gov.in',
          'https://ecinet.eci.gov.in',
        ]}
        onShouldStartLoadWithRequest={r => isEroBrowserUrl(r.url)}
        injectedJavaScript={ERO_PDF_BRIDGE}
        onNavigationStateChange={state =>
          onEvent({
            kind: 'navigation',
            data: '',
            url: state.url,
            canGoBack: state.canGoBack,
          })
        }
        onMessage={e =>
          onEvent({
            kind: 'message',
            data: e.nativeEvent.data,
            url: e.nativeEvent.url,
            canGoBack: false,
          })
        }
        onLoadStart={e =>
          onEvent({
            kind: 'start',
            data: '',
            url: e.nativeEvent.url,
            canGoBack: false,
          })
        }
        onError={e =>
          onEvent({
            kind: 'error',
            data: 'The official ERO page could not load.',
            url: e.nativeEvent.url,
            canGoBack: false,
          })
        }
        onTouchStart={() =>
          onEvent({ kind: 'touch', data: '', url: ERO_URL, canGoBack: false })
        }
      />
    );
  },
);
export default EroPortal;
