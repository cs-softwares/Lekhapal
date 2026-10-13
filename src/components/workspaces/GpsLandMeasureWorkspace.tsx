import { PremiumLockNotice } from '../premium/PremiumLock';
import { usePremiumFeatures } from '../../hooks/usePremiumFeatures';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useSelectedState } from '../../context/SelectedStateContext';
import { useSavedWorkspaceRecords } from '../../hooks/useSavedWorkspaceRecords';
import { WorkspaceRecord, WorkspaceValues } from '../../types/workspace';
import { compareArea, positiveNumber } from '../../domain/measurement';
import {
  exportSummaryAsPdf,
  shareTextSummary,
} from '../../utils/workspaceExport';
import { sanitizeFileName } from '../../utils/workspaceFormatters';
import AppPressable from '../AppPressable';
import {
  hasFeatureAccess,
  requestPremiumAccess,
} from '../../services/premiumAccess';
import { GPS_MAP_HTML } from '../measurement/gpsMapHtml';
import MeasuredAreaCard from '../measurement/MeasuredAreaCard';
import AreaConversionResults, {
  areaConversionRows,
} from '../measurement/AreaConversionResults';
import {
  MeasurementButton,
  MeasurementChoices,
  MeasurementField,
  useMeasurementMotion,
} from '../measurement/MeasurementUI';

type Corner = { lat: number; lng: number };
type CaptureMode = 'tap-corners' | 'walk-boundary';
type MapCommand =
  | 'locateUser'
  | 'addGpsPoint'
  | 'startWalk'
  | 'stopWalk'
  | 'undoLast'
  | 'clearAll'
  | 'fitPlot'
  | 'zoomIn'
  | 'zoomOut';
type Capture = {
  points: Corner[];
  areaSqm: number;
  perimeterM: number;
  tracking: boolean;
  accuracyM: number | null;
  hasGpsFix: boolean;
  invalidBoundary: boolean;
  gpsError: string | null;
};
const EMPTY_CAPTURE: Capture = {
  points: [],
  areaSqm: 0,
  perimeterM: 0,
  tracking: false,
  accuracyM: null,
  hasGpsFix: false,
  invalidBoundary: false,
  gpsError: null,
};
const MAP_SOURCE = { html: GPS_MAP_HTML, baseUrl: 'https://localhost/' };
const initialDetails = (): WorkspaceValues => ({
  district: '',
  tehsil: '',
  villageName: '',
  plotLabel: '',
  notes: '',
  officialArea: '',
  officialAreaUnit: 'sqm',
  resultAreaUnit: 'sqm',
  bighaSqm: '',
  biswaPerBigha: '',
  biswansiPerBiswa: '',
  marlaSqm: '',
  marlaPerKanal: '',
});
const format = (number: number, digits = 2) =>
  number.toLocaleString('en-IN', { maximumFractionDigits: digits });
const validCorners = (value: unknown): Corner[] =>
  Array.isArray(value)
    ? value
        .filter(
          point =>
            point &&
            Number.isFinite(point.lat) &&
            Number.isFinite(point.lng) &&
            Math.abs(point.lat) <= 90 &&
            Math.abs(point.lng) <= 180,
        )
        .map(point => ({ lat: point.lat, lng: point.lng }))
    : [];

export default function GpsLandMeasureWorkspace({
  externalRecord,
  onExternalRecordApplied,
}: {
  externalRecord?: WorkspaceRecord | null;
  onExternalRecordApplied?: () => void;
  showSavedRecords?: boolean;
  onOpenSaved?: () => void;
}) {
  const { language } = useLanguage();
  const premium = usePremiumFeatures();
  const { colors, isDarkTheme } = useAppTheme();
  const { stateCode } = useSelectedState();
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const [mode, setMode] = useState<CaptureMode>('tap-corners');
  const [capture, setCapture] = useState<Capture>(EMPTY_CAPTURE);
  const [details, setDetails] = useState(initialDetails);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationPending, setLocationPending] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const web = useRef<WebView>(null);
  const readyRef = useRef(false);
  const pointsRef = useRef<Corner[]>([]);
  const modeRef = useRef<CaptureMode>('tap-corners');
  const revision = useRef(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const motion = useMeasurementMotion();
  const { saveRecord } = useSavedWorkspaceRecords('gps-land-measure');
  const draftKey = `measurement-gps-draft-v2-${stateCode || 'unassigned'}`;
  const accent = isDarkTheme ? '#93B4FF' : '#2C50B3';
  const panel = isDarkTheme ? '#17233D' : '#EDF3FF';
  const panelBorder = isDarkTheme ? '#30486F' : '#C4D3EE';
  const send = useCallback((payload: Record<string, unknown>) => {
    if (!readyRef.current) return;
    web.current?.injectJavaScript(
      `window.codexHandleNativeMessage && window.codexHandleNativeMessage(${JSON.stringify(
        JSON.stringify(payload),
      )}); true;`,
    );
  }, []);
  const command = useCallback(
    (next: MapCommand) => {
      if (
        ['addGpsPoint', 'startWalk', 'undoLast', 'clearAll'].includes(next) &&
        !requestPremiumAccess('gps_capture')
      )
        return;
      send({ type: 'map-command', command: next });
    },
    [send],
  );
  useEffect(() => {
    const updateAccess = () =>
      send({
        type: 'premium-access',
        allowed: hasFeatureAccess('gps_capture'),
      });
    updateAccess();
    const timer = setInterval(updateAccess, 1000);
    return () => clearInterval(timer);
  }, [send]);
  const applyValues = useCallback(
    (values: WorkspaceValues) => {
      let points: Corner[] = [];
      try {
        points = validCorners(JSON.parse(values.points || '[]'));
      } catch {
        /* Older notes may not have geometry. */
      }
      pointsRef.current = points;
      const nextMode: CaptureMode =
        values.captureMode === 'walk-boundary'
          ? 'walk-boundary'
          : 'tap-corners';
      modeRef.current = nextMode;
      setMode(nextMode);
      const restoredDetails = { ...initialDetails(), ...values };
      // Legacy GPS notes used an explicit 2500 m² Bigha / 125 m² Biswa.
      if (
        values.officialAreaUnit === 'upbigha' ||
        values.officialAreaUnit === 'upbiswa'
      ) {
        restoredDetails.officialArea = String(
          (positiveNumber(values.officialArea || '') || 0) *
            (values.officialAreaUnit === 'upbigha' ? 2500 : 125),
        );
        restoredDetails.officialAreaUnit = 'sqm';
      }
      setDetails(restoredDetails);
      setCapture({ ...EMPTY_CAPTURE, points });
      send({ type: 'restore-boundary', points });
      send({ type: 'capture-mode', mode: nextMode });
    },
    [send],
  );

  useEffect(() => {
    let mounted = true;
    const currentRevision = revision.current;
    AsyncStorage.getItem(draftKey)
      .then(raw => {
        if (mounted && currentRevision === revision.current && raw) {
          try {
            applyValues(JSON.parse(raw));
          } catch {
            /* Ignore an unreadable draft. */
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setDraftReady(true);
      });
    return () => {
      mounted = false;
    };
  }, [draftKey, applyValues]);
  useEffect(() => {
    if (!externalRecord) return;
    revision.current += 1;
    applyValues(externalRecord.values);
    setDraftReady(true);
    setNotice(
      externalRecord.values.points
        ? t(
            'Saved boundary restored. Tracking is stopped.',
            'सेव की सीमा खुल गई। GPS ट्रैकिंग बंद है।',
          )
        : t(
            'This older note has totals but no corner coordinates. Mark its boundary again to edit the map.',
            'इस पुराने नोट में परिणाम हैं, कोनों के निर्देशांक नहीं। नक्शा बदलने के लिए सीमा दोबारा चुनें।',
          ),
    );
    onExternalRecordApplied?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalRecord, applyValues, onExternalRecordApplied]);
  useEffect(() => {
    if (!draftReady) return;
    AsyncStorage.setItem(
      draftKey,
      JSON.stringify({
        ...details,
        captureMode: mode,
        points: JSON.stringify(capture.points),
      }),
    ).catch(() => {
      setNotice(
        t(
          'Draft could not be stored. Please save or share your measurement.',
          'ड्राफ्ट सेव नहीं हुआ। कृपया माप सेव या साझा करें।',
        ),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture.points, details, mode, draftReady, draftKey]);
  useEffect(() => {
    if (mapReady) return;
    const timer = setTimeout(() => setMapFailed(true), 18000);
    return () => clearTimeout(timer);
  }, [mapReady, mapAttempt]);
  useEffect(() => {
    if (!locationPending) return;
    const timer = setTimeout(() => setLocationPending(false), 17000);
    return () => clearTimeout(timer);
  }, [locationPending]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') command('stopWalk');
    });
    return () => {
      listener.remove();
      command('stopWalk');
    };
  }, [command]);
  useEffect(() => {
    if (!capture.tracking || !motion) {
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [capture.tracking, motion, pulse]);

  const gpsAction = async (
    action: 'locateUser' | 'startWalk' | 'addGpsPoint',
  ) => {
    if (!mapReady || locationPending) return;
    if (action !== 'locateUser' && !requestPremiumAccess('gps_capture')) return;
    try {
      if (Platform.OS === 'android') {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        const allowed =
          permissions[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED ||
          permissions[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED;
        setPermissionDenied(!allowed);
        if (!allowed) return;
      }
      setLocationPending(true);
      command(action);
    } catch {
      setLocationPending(false);
      setPermissionDenied(true);
    }
  };
  const changeMode = (next: CaptureMode) => {
    setMode(next);
    modeRef.current = next;
    send({ type: 'capture-mode', mode: next });
  };
  const retryMap = () => {
    readyRef.current = false;
    setMapReady(false);
    setMapFailed(false);
    setTilesFailed(false);
    setMapAttempt(v => v + 1);
  };
  const onMapMessage = (raw: string) => {
    try {
      const payload = JSON.parse(raw);
      if (payload.type === 'premium-required') {
        requestPremiumAccess('gps_capture');
        return;
      }
      if (payload.type === 'tile-error') {
        setTilesFailed(true);
        return;
      }
      if (payload.type === 'tile-ready') {
        setTilesFailed(false);
        return;
      }
      if (payload.type === 'webview-ready') {
        readyRef.current = true;
        setMapReady(true);
        send({
          type: 'premium-access',
          allowed: hasFeatureAccess('gps_capture'),
        });
        setMapFailed(false);
        send({ type: 'capture-mode', mode: modeRef.current });
        if (pointsRef.current.length)
          send({ type: 'restore-boundary', points: pointsRef.current });
        return;
      }
      if (payload.type !== 'measurement') return;
      // The initial empty page message must not overwrite a stored boundary before restoration.
      if (
        !payload.points?.length &&
        pointsRef.current.length &&
        payload.initial
      )
        return;
      const points = validCorners(payload.points);
      pointsRef.current = points;
      if (payload.hasGpsFix || payload.gpsError) setLocationPending(false);
      setCapture({
        points,
        areaSqm: Number.isFinite(payload.areaSqm) ? payload.areaSqm : 0,
        perimeterM: Number.isFinite(payload.perimeterM)
          ? payload.perimeterM
          : 0,
        tracking: Boolean(payload.tracking),
        hasGpsFix: Boolean(payload.hasGpsFix),
        accuracyM: Number.isFinite(payload.accuracyM)
          ? payload.accuracyM
          : null,
        invalidBoundary: Boolean(payload.invalidBoundary),
        gpsError:
          typeof payload.gpsError === 'string' ? payload.gpsError : null,
      });
    } catch {
      /* Ignore unrelated page messages. */
    }
  };
  const hasArea =
    capture.points.length >= 3 &&
    capture.areaSqm > 0 &&
    !capture.invalidBoundary;
  const canSave = hasArea && !capture.tracking && draftReady && !busy;
  const recordFactor =
    details.officialAreaUnit === 'hectare'
      ? 10000
      : details.officialAreaUnit === 'acre'
      ? 4046.8564224
      : 1;
  const recorded = positiveNumber(details.officialArea);
  const comparison =
    recorded && hasArea
      ? compareArea(capture.areaSqm, String(recorded * recordFactor))
      : null;
  const reportTitle = details.plotLabel.trim()
    ? `${t('Boundary', 'सीमा')} · ${details.plotLabel}`
    : t('GPS field measurement', 'GPS से मैदानी माप');
  const summaryLines = [
    `${t('Capture method', 'माप विधि')}: ${
      mode === 'tap-corners'
        ? t('Corners marked on map', 'नक्शे पर चुने गए कोने')
        : t('GPS boundary walk', 'सीमा पर चलकर GPS माप')
    }`,
    `${t('Area', 'क्षेत्रफल')}: ${format(capture.areaSqm, 4)} m²`,
    ...areaConversionRows(
      hasArea ? capture.areaSqm : null,
      details.bighaSqm,
      details.biswaPerBigha,
      language === 'hi',
      details,
    )
      .filter(row => row.unit === (details.resultAreaUnit || 'sqm'))
      .map(
        row =>
          `${t('Selected result', 'चयनित परिणाम')}: ${row.value} ${row.label}`,
      ),
    ...areaConversionRows(
      hasArea ? capture.areaSqm : null,
      details.bighaSqm,
      details.biswaPerBigha,
      language === 'hi',
      details,
    )
      .filter(row => row.value !== '—')
      .map(row => `${row.label}: ${row.value}`),
    ...(positiveNumber(details.bighaSqm)
      ? [
          `1 Bigha = ${details.bighaSqm} m²`,
          ...(positiveNumber(details.biswaPerBigha)
            ? [`1 Bigha = ${details.biswaPerBigha} Biswa`]
            : []),
        ]
      : []),
    `${t('Perimeter', 'परिमाप')}: ${format(capture.perimeterM)} m`,
    ...[
      ['biswansiPerBiswa', '1 Biswa =', 'Biswansi'],
      ['marlaSqm', '1 Marla =', 'm²'],
      ['marlaPerKanal', '1 Kanal =', 'Marla'],
    ]
      .filter(([key]) => positiveNumber(details[key as keyof typeof details]))
      .map(
        ([key, label, suffix]) =>
          `${label} ${details[key as keyof typeof details]} ${suffix}`,
      ),
    `${t('Corners', 'कोने')}: ${capture.points.length}`,
    `${t('Last GPS accuracy', 'अंतिम GPS सटीकता')}: ${
      capture.accuracyM === null
        ? t('Unavailable', 'उपलब्ध नहीं')
        : `±${format(capture.accuracyM, 1)} m`
    }`,
    `${t('District', 'जिला')}: ${details.district || '—'}`,
    `${t('Tehsil', 'तहसील')}: ${details.tehsil || '—'}`,
    `${t('Village', 'गांव')}: ${details.villageName || '—'}`,
    `${t('Gata / Khasra', 'गाटा / खसरा')}: ${details.plotLabel || '—'}`,
    ...(comparison
      ? [
          `${t('Recorded area', 'अभिलेख का क्षेत्रफल')}: ${format(
            recorded! * recordFactor,
          )} m²`,
          `${t('Difference', 'अंतर')}: ${format(
            comparison.difference,
          )} m² (${format(comparison.percent)}%)`,
        ]
      : []),
    ...(details.notes ? [`${t('Notes', 'टिप्पणी')}: ${details.notes}`] : []),
    ...capture.points.map(
      (point, i) =>
        `${t('Corner', 'कोना')} ${i + 1}: ${point.lat.toFixed(
          7,
        )}, ${point.lng.toFixed(7)}`,
    ),
    t(
      'Approximate phone/map measurement. Verify the boundary with a field survey.',
      'फोन/नक्शे की अनुमानित माप। मैदानी सर्वे से सीमा का सत्यापन करें।',
    ),
  ];
  const perform = async (action: 'save' | 'share' | 'pdf') => {
    if (!canSave) return;
    setBusy(true);
    try {
      if (action === 'save') {
        await saveRecord({
          title: reportTitle,
          subtitle: `${format(capture.areaSqm)} m² · ${
            details.villageName ||
            `${capture.points.length} ${t('corners', 'कोने')}`
          }`,
          summaryLines,
          values: {
            ...details,
            points: JSON.stringify(capture.points),
            areaSqm: String(capture.areaSqm),
            perimeterM: String(capture.perimeterM),
            pointsCount: String(capture.points.length),
            captureMode: mode,
            version: '2',
          },
        });
        setNotice(
          t(
            'Boundary saved with all corner coordinates.',
            'सभी कोनों के निर्देशांक के साथ सीमा सेव हो गई।',
          ),
        );
      } else if (action === 'share')
        await shareTextSummary({ title: reportTitle, summaryLines });
      else
        await exportSummaryAsPdf({
          title: reportTitle,
          summaryLines,
          fileName: sanitizeFileName(`boundary-${Date.now()}`),
          points: capture.points,
          details: {
            village: details.villageName,
            plot: details.plotLabel,
            owner: details.ownerName,
            client: details.clientName,
            notes: details.notes,
          },
        });
    } catch {
      Alert.alert(
        t('Could not finish', 'कार्य पूरा नहीं हुआ'),
        t(
          'Your boundary is still here. Please try again.',
          'आपकी सीमा सुरक्षित है। कृपया दोबारा कोशिश करें।',
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const updateDetail = (key: string, value: string) =>
    setDetails(current => ({ ...current, [key]: value }));
  const mapControl = (
    label: string,
    icon: string,
    action: () => void,
    disabled = !mapReady,
  ) => (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={action}
      style={[styles.mapControl, disabled && styles.disabled]}
    >
      <Icon name={icon} size={22} color="#294D9A" />
    </AppPressable>
  );
  const card = [styles.card, { borderColor: panelBorder }];
  return (
    <View>
      {!premium && (
        <PremiumLockNotice
          title={t('GPS capture & editing', 'GPS माप और संपादन')}
          description={t(
            'Mark corners or walk a boundary with Premium. Saved boundaries remain free to view.',
            'प्रीमियम से कोने चुनें या चलकर सीमा मापें। सेव सीमाएं देखना मुफ्त है।',
          )}
        />
      )}
      <View
        style={[
          styles.modeBar,
          { backgroundColor: panel, borderColor: panelBorder },
        ]}
      >
        {(
          [
            {
              id: 'tap-corners',
              icon: 'gesture-tap',
              title: t('Mark corners', 'कोने चुनें'),
            },
            {
              id: 'walk-boundary',
              icon: 'walk',
              title: t('Walk boundary', 'सीमा पर चलें'),
            },
          ] as const
        ).map(item => (
          <AppPressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            accessibilityState={{ selected: mode === item.id }}
            onPress={() => changeMode(item.id)}
            containerStyle={styles.flex}
            style={[styles.mode, mode === item.id && styles.modeActive]}
          >
            <Icon
              name={item.icon}
              size={19}
              color={mode === item.id ? '#FFFFFF' : colors.textMuted}
            />
            <Text
              style={[
                styles.modeText,
                { color: mode === item.id ? '#FFFFFF' : colors.textMuted },
              ]}
            >
              {item.title}
            </Text>
          </AppPressable>
        ))}
      </View>
      <View style={styles.mapFrame}>
        <WebView
          key={mapAttempt}
          ref={web}
          source={MAP_SOURCE}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          geolocationEnabled
          scrollEnabled={false}
          nestedScrollEnabled
          setSupportMultipleWindows={false}
          onMessage={event => onMapMessage(event.nativeEvent.data)}
          onError={() => setMapFailed(true)}
          style={styles.map}
        />
        <View pointerEvents="none" style={styles.mapTop}>
          <View style={styles.signalBadge}>
            <Animated.View
              style={[
                styles.signalDot,
                {
                  opacity: pulse,
                  backgroundColor: capture.tracking
                    ? '#F97316'
                    : capture.hasGpsFix
                    ? '#4269CA'
                    : '#94A3B8',
                },
              ]}
            />
            <Text style={styles.signalText}>
              {capture.tracking
                ? t('RECORDING', 'माप जारी')
                : capture.hasGpsFix
                ? capture.accuracyM !== null
                  ? `GPS ±${format(capture.accuracyM, 1)} m`
                  : 'GPS'
                : t('MAP VIEW', 'नक्शा')}
            </Text>
          </View>
          <View style={styles.north}>
            <Text style={styles.northText}>N</Text>
            <Icon name="navigation" size={19} color="#2C50B3" />
          </View>
        </View>
        <View style={styles.mapControls}>
          {mapControl(t('Zoom in', 'बड़ा करें'), 'plus', () =>
            command('zoomIn'),
          )}
          {mapControl(t('Zoom out', 'छोटा करें'), 'minus', () =>
            command('zoomOut'),
          )}
          {mapControl(
            t('Fit boundary', 'पूरी सीमा देखें'),
            'fit-to-screen-outline',
            () => command('fitPlot'),
            !mapReady || !capture.points.length,
          )}
          {mapControl(
            t('Find my location', 'मेरी लोकेशन खोजें'),
            'crosshairs-gps',
            () => {
              gpsAction('locateUser');
            },
            !mapReady || locationPending,
          )}
        </View>
        {(!mapReady || mapFailed) && (
          <View style={styles.mapLoading}>
            <Icon name="map-marker-radius-outline" size={34} color="#2C50B3" />
            <Text style={styles.loadingTitle}>
              {mapFailed
                ? t('Map unavailable', 'नक्शा उपलब्ध नहीं')
                : t('Opening field map', 'मैदानी नक्शा खुल रहा है')}
            </Text>
            <Text style={styles.loadingBody}>
              {mapFailed
                ? t(
                    'Check your internet connection. Your saved boundary is kept on this device.',
                    'इंटरनेट कनेक्शन जांचें। सेव की सीमा इस डिवाइस पर सुरक्षित है।',
                  )
                : t(
                    'Getting the map ready for your boundary.',
                    'आपकी सीमा के लिए नक्शा तैयार हो रहा है।',
                  )}
            </Text>
            {mapFailed ? (
              <MeasurementButton
                color="#2C50B3"
                title={t('Retry map', 'दोबारा खोलें')}
                icon="refresh"
                onPress={retryMap}
              />
            ) : (
              <ActivityIndicator color="#2C50B3" />
            )}
          </View>
        )}
      </View>
      {tilesFailed && (
        <AppPressable
          onPress={retryMap}
          accessibilityRole="button"
          accessibilityLabel={t('Reload map tiles', 'नक्शा दोबारा लोड करें')}
        >
          <Text style={[styles.warning, { color: colors.danger }]}>
            {t(
              'Map tiles could not load. Tap to retry.',
              'नक्शा लोड नहीं हुआ। दोबारा कोशिश के लिए दबाएं।',
            )}
          </Text>
        </AppPressable>
      )}
      <View style={[styles.captureBar]}>
        <View style={styles.cornerCount}>
          <Icon name="map-marker-multiple-outline" size={20} color={accent} />
          <Text style={[styles.countText, { color: colors.text }]}>
            {capture.points.length}
          </Text>
          <Text style={[styles.small, { color: colors.textMuted }]}>
            {t('corners', 'कोने')}
          </Text>
        </View>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t('Undo last corner', 'आखिरी कोना हटाएं')}
          disabled={!capture.points.length || capture.tracking}
          onPress={() => command('undoLast')}
          style={[
            styles.utility,
            (!capture.points.length || capture.tracking) && styles.disabled,
          ]}
        >
          <Icon name="undo-variant" size={19} color={accent} />
          <Text style={[styles.small, { color: colors.text }]}>
            {t('Undo', 'पूर्ववत')}
          </Text>
        </AppPressable>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t('Clear boundary', 'सीमा साफ करें')}
          disabled={!capture.points.length}
          onPress={() =>
            Alert.alert(
              t('Clear this boundary?', 'यह सीमा साफ करें?'),
              t('Saved notes remain available.', 'सेव किए नोट उपलब्ध रहेंगे।'),
              [
                { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
                {
                  text: t('Clear', 'साफ करें'),
                  style: 'destructive',
                  onPress: () => {
                    command('clearAll');
                    pointsRef.current = [];
                    setCapture(EMPTY_CAPTURE);
                  },
                },
              ],
            )
          }
          style={[styles.utility, !capture.points.length && styles.disabled]}
        >
          <Icon name="restart" size={19} color={colors.textMuted} />
          <Text style={[styles.small, { color: colors.text }]}>
            {t('Clear', 'साफ करें')}
          </Text>
        </AppPressable>
      </View>
      {(capture.points.length < 3 ||
        capture.invalidBoundary ||
        mode === 'walk-boundary') && (
        <Text
          style={[
            styles.instruction,
            {
              color: capture.invalidBoundary ? colors.danger : colors.textMuted,
            },
          ]}
        >
          {capture.invalidBoundary
            ? t(
                'The boundary crosses itself. Undo the last corners and trace around the field in order.',
                'सीमा की रेखाएं एक-दूसरे को काट रही हैं। आखिरी कोने हटाकर क्रम से सीमा चुनें।',
              )
            : mode === 'tap-corners'
            ? t(
                'Tap at least 3 corners around the field.',
                'खेत के चारों ओर क्रम से कम से कम 3 कोने दबाएं।',
              )
            : capture.tracking
            ? t(
                'Walk along the edge. Tap Finish walk when you return to the start.',
                'सीमा पर चलते रहें। शुरुआती जगह लौटकर चलना समाप्त करें दबाएं।',
              )
            : t(
                'Stand at a corner, start the walk and follow the field boundary.',
                'एक कोने पर खड़े होकर चलना शुरू करें और खेत की सीमा पर चलें।',
              )}
        </Text>
      )}
      {mode === 'walk-boundary' ? (
        <MeasurementButton
          title={
            capture.tracking
              ? t('Finish walk', 'चलना समाप्त करें')
              : locationPending
              ? t('Finding location…', 'लोकेशन खोज रहे हैं…')
              : t('Start boundary walk', 'सीमा पर चलना शुरू करें')
          }
          icon={
            !premium
              ? 'lock-outline'
              : capture.tracking
              ? 'stop-circle-outline'
              : 'walk'
          }
          primary
          color={capture.tracking ? '#C2410C' : '#2C50B3'}
          disabled={!mapReady || (!capture.tracking && locationPending)}
          onPress={() => {
            if (capture.tracking) command('stopWalk');
            else gpsAction('startWalk');
          }}
        />
      ) : (
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t(
            'Add my GPS position',
            'मेरी GPS लोकेशन जोड़ें',
          )}
          accessibilityState={{ disabled: !mapReady || locationPending }}
          disabled={!mapReady || locationPending}
          onPress={() => {
            gpsAction('addGpsPoint');
          }}
          style={[
            styles.gpsLink,
            (!mapReady || locationPending) && styles.disabled,
          ]}
        >
          <Icon
            name={premium ? 'map-marker-plus-outline' : 'lock-outline'}
            size={18}
            color={accent}
          />
          <Text style={[styles.small, { color: accent }]}>
            {locationPending
              ? t('Finding location…', 'लोकेशन खोज रहे हैं…')
              : t('Add my GPS position', 'मेरी GPS लोकेशन जोड़ें')}
          </Text>
        </AppPressable>
      )}
      {permissionDenied && (
        <View style={card}>
          <Text style={[styles.instruction, { color: colors.textMuted }]}>
            {t(
              'Location access is off. You can still mark corners on the map.',
              'लोकेशन अनुमति बंद है। आप नक्शे पर कोने चुन सकते हैं।',
            )}
          </Text>
          <MeasurementButton
            color="#2C50B3"
            title={t('Open location settings', 'लोकेशन सेटिंग खोलें')}
            icon="cog-outline"
            onPress={() => {
              Linking.openSettings();
            }}
          />
        </View>
      )}
      {capture.gpsError && (
        <Text style={[styles.warning, { color: colors.danger }]}>
          {t(
            'No GPS fix. Check location permission and try in an open area. Map corner marking remains available.',
            'GPS लोकेशन नहीं मिली। अनुमति जांचें और खुली जगह पर कोशिश करें। नक्शे पर कोने चुन सकते हैं।',
          )}
        </Text>
      )}
      <MeasuredAreaCard
        areaSqm={capture.areaSqm}
        perimeterM={capture.perimeterM}
        accuracyM={capture.accuracyM}
        corners={capture.points.length}
        tracking={capture.tracking}
        invalid={capture.invalidBoundary}
        unit={
          (details.resultAreaUnit ||
            'sqm') as import('../../domain/measurement').AreaUnit
        }
        onUnitChange={value => updateDetail('resultAreaUnit', value)}
        local={details}
      />
      <AreaConversionResults
        areaSqm={hasArea ? capture.areaSqm : null}
        bighaSqm={details.bighaSqm}
        biswaPerBigha={details.biswaPerBigha}
        local={details}
        onChange={updateDetail}
        showLocalInputs={[
          'bigha',
          'biswa',
          'biswansi',
          'marla',
          'kanal',
        ].includes(details.resultAreaUnit)}
      />
      <View style={card}>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t(
            'Compare with land record',
            'भूमि अभिलेख से तुलना',
          )}
          accessibilityState={{ expanded: compareOpen }}
          onPress={() => setCompareOpen(v => !v)}
          style={styles.accordion}
        >
          <View style={styles.flex}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('Compare with land record', 'भूमि अभिलेख से तुलना')}
            </Text>
          </View>
          <Icon
            name={compareOpen ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={colors.textMuted}
          />
        </AppPressable>
        {compareOpen && (
          <View style={styles.expanded}>
            <MeasurementChoices
              color="#2C50B3"
              label={t('Record unit', 'अभिलेख की इकाई')}
              value={details.officialAreaUnit}
              onChange={v => updateDetail('officialAreaUnit', v)}
              options={[
                { value: 'sqm', label: 'm²' },
                { value: 'hectare', label: t('Hectare', 'हेक्टेयर') },
                { value: 'acre', label: t('Acre', 'एकड़') },
              ]}
            />
            <MeasurementField
              focusColor="#4269CA"
              label={t('Recorded area', 'अभिलेख का क्षेत्रफल')}
              value={details.officialArea}
              onChange={v => updateDetail('officialArea', v)}
            />
            {comparison && (
              <Text style={[styles.comparison, { color: accent }]}>
                {comparison.difference > 0 ? '+' : ''}
                {format(comparison.difference)} m² ·{' '}
                {format(comparison.percent)}%
              </Text>
            )}
          </View>
        )}
      </View>
      <View style={card}>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t(
            'Parcel details and notes',
            'भूखंड विवरण और टिप्पणी',
          )}
          accessibilityState={{ expanded: detailsOpen }}
          onPress={() => setDetailsOpen(v => !v)}
          style={styles.accordion}
        >
          <View style={styles.flex}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('Parcel details & notes', 'भूखंड विवरण और टिप्पणी')}
            </Text>
          </View>
          <Icon
            name={detailsOpen ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={colors.textMuted}
          />
        </AppPressable>
        {detailsOpen && (
          <View style={styles.expanded}>
            {[
              ['district', t('District', 'जिला')],
              ['tehsil', t('Tehsil', 'तहसील')],
              ['villageName', t('Village', 'गांव')],
              ['plotLabel', t('Gata / Khasra', 'गाटा / खसरा')],
              ['notes', t('Field notes', 'मैदानी टिप्पणी')],
            ].map(([key, label]) => (
              <MeasurementField
                focusColor="#4269CA"
                key={key}
                label={label}
                value={details[key]}
                onChange={v => updateDetail(key, v)}
                numeric={false}
                multiline={key === 'notes'}
              />
            ))}
          </View>
        )}
      </View>
      {notice ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.notice, { color: accent }]}
        >
          {notice}
        </Text>
      ) : null}
      <View style={styles.actions}>
        {(
          [
            {
              action: 'save',
              title: busy
                ? t('Saving…', 'सेव हो रहा…')
                : t('Save boundary', 'सीमा सेव करें'),
              icon: 'content-save-outline',
            },
            {
              action: 'share',
              title: t('Share', 'साझा करें'),
              icon: 'share-variant-outline',
            },
            {
              action: 'pdf',
              title: premium ? 'PDF' : 'PDF · Premium',
              icon: premium ? 'file-pdf-box' : 'lock-outline',
            },
          ] as const
        ).map(item => (
          <AppPressable
            key={item.action}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={() => {
              perform(item.action);
            }}
            containerStyle={
              item.action === 'save' ? styles.saveAction : undefined
            }
            style={[
              styles.reportAction,
              item.action === 'save' && styles.modeActive,
              !canSave && styles.disabled,
            ]}
          >
            <Icon
              name={item.icon}
              size={18}
              color={item.action === 'save' ? '#FFFFFF' : accent}
            />
            <Text
              style={[
                styles.small,
                { color: item.action === 'save' ? '#FFFFFF' : accent },
              ]}
            >
              {item.title}
            </Text>
          </AppPressable>
        ))}
      </View>
      <Text style={[styles.footer, { color: colors.textMuted }]}>
        {t(
          'Approximate area. Verify boundaries on site. Map requires internet.',
          'अनुमानित क्षेत्रफल। स्थल पर सीमा जांचें। नक्शे के लिए इंटरनेट चाहिए।',
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  small: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  modeBar: {
    flexDirection: 'row',
    padding: 3,
    gap: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  mode: {
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    padding: 8,
  },
  modeActive: { backgroundColor: '#2C50B3' },
  modeText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  mapFrame: {
    height: 320,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#B4C9EF',
    backgroundColor: '#EBF1FC',
  },
  map: { flex: 1, backgroundColor: '#EBF1FC' },
  mapTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  signalBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FFFFFFF2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  signalDot: { width: 7, height: 7, borderRadius: 4 },
  signalText: {
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '800',
    color: '#294D9A',
  },
  north: {
    width: 36,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#FFFFFFEE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  northText: { fontSize: 10, fontWeight: '800', color: '#294D9A' },
  mapControls: { position: 'absolute', right: 12, bottom: 30, gap: 8 },
  mapControl: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#F3F7FFF5',
    borderWidth: 1,
    borderColor: '#CDDBF3',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  disabled: { opacity: 0.4 },
  mapLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EBF1FC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 14,
  },
  loadingTitle: { fontSize: 18, fontWeight: '700', color: '#294D9A' },
  loadingBody: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: '#5E7396',
  },
  captureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
    marginTop: 2,
  },
  cornerCount: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center' },
  countText: { fontSize: 17, fontWeight: '700' },
  utility: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 6,
  },
  gpsLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 0,
    marginBottom: 10,
  },
  warning: { fontSize: 12, lineHeight: 19, marginVertical: 12 },
  card: { borderBottomWidth: 1, paddingVertical: 2 },
  accordion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    marginBottom: 0,
  },
  expanded: { marginTop: 20 },
  comparison: { fontSize: 21, lineHeight: 28, fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  saveAction: { flexGrow: 1 },
  reportAction: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  notice: { paddingVertical: 12, fontSize: 13, lineHeight: 20 },
  footer: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginTop: 18,
    marginBottom: 10,
  },
});
