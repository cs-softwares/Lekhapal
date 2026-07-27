import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {WebView} from 'react-native-webview';
import ViewShot, {
  ViewShotRef,
} from 'react-native-view-shot';

import {useLanguage} from '../../context/LanguageContext';
import {useSavedWorkspaceRecords} from '../../hooks/useSavedWorkspaceRecords';
import {COLORS} from '../../theme/colors';
import {WorkspaceRecord} from '../../types/workspace';
import {
  exportRefAsImage,
  exportSummaryAsPdf,
  shareTextSummary,
} from '../../utils/workspaceExport';
import {
  formatFixed,
  sanitizeFileName,
} from '../../utils/workspaceFormatters';
import AppSectionTitle from '../AppSectionTitle';
import AppPressable from '../AppPressable';
import SavedRecordsPanel from './SavedRecordsPanel';
import WorkspaceActionRow from './WorkspaceActionRow';
import WorkspaceChipSelector from './WorkspaceChipSelector';
import WorkspaceField from './WorkspaceField';
import WorkspaceMetricTile from './WorkspaceMetricTile';
import {workspaceStyles} from './workspaceStyles';

const SQM_PER_UP_BIGHA = 2500;
const SQM_PER_UP_BISWA = 125;
const SQM_PER_ACRE = 4046.8564224;

type CaptureMode =
  | 'walk-boundary'
  | 'tap-corners'
  | 'compare-record';

type AreaUnit =
  | 'sqm'
  | 'upbigha'
  | 'upbiswa'
  | 'acre';

type MeasureState = {
  areaSqm: number;
  hasGpsFix: boolean;
  lastGpsLat: number | null;
  lastGpsLng: number | null;
  perimeterM: number;
  pointsCount: number;
  statusBody: string;
  statusTitle: string;
  tracking: boolean;
};

type MapCommand =
  | 'addGpsPoint'
  | 'clearAll'
  | 'fitPlot'
  | 'locateUser'
  | 'startWalk'
  | 'stopWalk'
  | 'undoLast'
  | 'zoomIn'
  | 'zoomOut';

const DEFAULT_STATUS_TITLE = 'Field capture ready';
const DEFAULT_STATUS_BODY =
  'Tap field corners or use Start Walk outside the map to trace the boundary live while moving around the field.';

type GpsLandMeasureWorkspaceProps = {
  externalRecord?: WorkspaceRecord | null;
  onExternalRecordApplied?: () => void;
  showSavedRecords?: boolean;
};

const toNumber = (value: string) => Number(value) || 0;

const convertAreaToSqm = (
  value: number,
  unit: AreaUnit,
) => {
  if (unit === 'upbigha') {
    return value * SQM_PER_UP_BIGHA;
  }

  if (unit === 'upbiswa') {
    return value * SQM_PER_UP_BISWA;
  }

  if (unit === 'acre') {
    return value * SQM_PER_ACRE;
  }

  return value;
};

const getAccuracyLabel = (
  measureState: MeasureState,
) => {
  if (!measureState.hasGpsFix) {
    return 'No GPS lock yet';
  }

  if (measureState.tracking) {
    return 'Walking capture in progress';
  }

  if (measureState.pointsCount < 3) {
    return 'Add at least 3 boundary points';
  }

  if (measureState.pointsCount < 5) {
    return 'Basic field outline ready';
  }

  return 'Boundary outline looks strong';
};

const MAP_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
    <style>
      html,
      body,
      #map {
        background: #f8fafc;
        height: 100%;
        margin: 0;
        padding: 0;
        width: 100%;
      }
      body {
        font-family: sans-serif;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      var map = L.map('map', {
        zoomControl: false
      }).setView([26.8467, 80.9462], 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 22
      }).addTo(map);

      var MIN_TRACK_DISTANCE = 4;
      var gpsMarker = null;
      var lastGps = null;
      var markers = [];
      var points = [];
      var polygon = null;
      var polyline = null;
      var tracking = false;
      var watchId = null;

      function getStatusInfo() {
        if (tracking) {
          return {
            title: 'Walking boundary live',
            body: 'Keep moving along the field edge. The map is drawing the boundary as new GPS points are captured.'
          };
        }

        if (points.length >= 3) {
          return {
            title: 'Boundary ready',
            body: 'The measured field shape is visible on the map. You can still add, undo, zoom, or compare it with the official area.'
          };
        }

        return {
          title: 'Field capture ready',
          body: 'Tap field corners or use Start Walk outside the map to trace the boundary live while moving around the field.'
        };
      }

      function radians(value) {
        return value * Math.PI / 180;
      }

      function haversineDistance(a, b) {
        var R = 6371008.8;
        var dLat = radians(b.lat - a.lat);
        var dLng = radians(b.lng - a.lng);
        var lat1 = radians(a.lat);
        var lat2 = radians(b.lat);
        var sinLat = Math.sin(dLat / 2);
        var sinLng = Math.sin(dLng / 2);
        var h =
          sinLat * sinLat +
          Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
        return 2 * R * Math.asin(Math.sqrt(h));
      }

      function polygonArea(latLngs) {
        if (latLngs.length < 3) {
          return 0;
        }

        var area = 0;
        var radius = 6378137;

        for (var i = 0; i < latLngs.length; i++) {
          var p1 = latLngs[i];
          var p2 = latLngs[(i + 1) % latLngs.length];
          area +=
            radians(p2.lng - p1.lng) *
            (
              2 +
              Math.sin(radians(p1.lat)) +
              Math.sin(radians(p2.lat))
            );
        }

        return Math.abs((area * radius * radius) / 2);
      }

      function perimeter(latLngs) {
        if (latLngs.length < 2) {
          return 0;
        }

        var total = 0;
        for (var i = 0; i < latLngs.length - 1; i++) {
          total += haversineDistance(latLngs[i], latLngs[i + 1]);
        }

        if (latLngs.length > 2) {
          total += haversineDistance(
            latLngs[latLngs.length - 1],
            latLngs[0]
          );
        }

        return total;
      }

      function postState() {
        var status = getStatusInfo();
        var payload = {
          type: 'measurement',
          areaSqm: polygonArea(points),
          hasGpsFix: !!lastGps,
          lastGpsLat: lastGps ? lastGps.lat : null,
          lastGpsLng: lastGps ? lastGps.lng : null,
          perimeterM: perimeter(points),
          pointsCount: points.length,
          statusBody: status.body,
          statusTitle: status.title,
          tracking: tracking
        };

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify(payload)
          );
        }
      }

      function redraw() {
        if (polygon) {
          map.removeLayer(polygon);
          polygon = null;
        }

        if (polyline) {
          map.removeLayer(polyline);
          polyline = null;
        }

        if (points.length >= 2) {
          polyline = L.polyline(points, {
            color: '#1e40af',
            weight: 3
          }).addTo(map);
        }

        if (points.length >= 3) {
          polygon = L.polygon(points, {
            color: '#1e40af',
            fillColor: '#93c5fd',
            fillOpacity: 0.34,
            weight: 2
          }).addTo(map);
        }

        postState();
      }

      function addPoint(latlng, shouldPan) {
        points.push({
          lat: latlng.lat,
          lng: latlng.lng
        });

        var marker = L.circleMarker(latlng, {
          color: '#1e40af',
          fillColor: '#1e40af',
          fillOpacity: 1,
          radius: 5
        }).addTo(map);

        markers.push(marker);
        redraw();

        if (shouldPan) {
          map.panTo(latlng);
        }
      }

      function pushTrackingPoint(current) {
        if (!points.length) {
          addPoint(current, true);
          return;
        }

        var lastPoint = points[points.length - 1];
        if (
          haversineDistance(lastPoint, current) >=
          MIN_TRACK_DISTANCE
        ) {
          addPoint(current, true);
        }
      }

      function fitPlot() {
        if (!points.length) {
          return;
        }

        var bounds = L.latLngBounds(points);
        map.fitBounds(bounds.pad(0.35));
      }

      function zoomIn() {
        map.zoomIn();
      }

      function zoomOut() {
        map.zoomOut();
      }

      function updateGpsMarker(current) {
        if (gpsMarker) {
          gpsMarker.setLatLng(current);
          return;
        }

        gpsMarker = L.circleMarker(current, {
          color: '#16a34a',
          fillColor: '#16a34a',
          fillOpacity: 1,
          radius: 6
        }).addTo(map);
      }

      function onGpsSuccess(position, allowTrackingPoint) {
        var current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        lastGps = current;
        updateGpsMarker(current);
        map.setView([current.lat, current.lng], 19);

        if (tracking && allowTrackingPoint) {
          pushTrackingPoint(current);
        } else {
          postState();
        }
      }

      function onGpsError() {
        postState();
      }

      function locateUser() {
        navigator.geolocation.getCurrentPosition(
          function(position) {
            onGpsSuccess(position, false);
          },
          onGpsError,
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 15000
          }
        );
      }

      function startWalk() {
        if (tracking) {
          return;
        }

        tracking = true;
        locateUser();
        postState();

        watchId = navigator.geolocation.watchPosition(
          function(position) {
            onGpsSuccess(position, true);
          },
          onGpsError,
          {
            enableHighAccuracy: true,
            maximumAge: 2000,
            timeout: 12000
          }
        );
      }

      function stopWalk() {
        tracking = false;

        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }

        redraw();
      }

      function addGpsPoint() {
        if (lastGps) {
          addPoint(lastGps, true);
          return;
        }

        locateUser();
        setTimeout(function() {
          if (lastGps) {
            addPoint(lastGps, true);
          }
        }, 1200);
      }

      function undoLast() {
        var marker = markers.pop();
        if (marker) {
          map.removeLayer(marker);
        }

        points.pop();
        redraw();
      }

      function clearAll() {
        points = [];

        while (markers.length) {
          map.removeLayer(markers.pop());
        }

        redraw();
      }

      map.on('click', function(event) {
        addPoint(event.latlng, false);
      });

      function handleNativeMessage(raw) {
        try {
          var payload = JSON.parse(raw);
          if (
            payload &&
            payload.type === 'map-command' &&
            payload.command &&
            window.codexMapActions &&
            typeof window.codexMapActions[payload.command] === 'function'
          ) {
            window.codexMapActions[payload.command]();
          }
        } catch (error) {}
      }

      window.codexMapActions = {
        addGpsPoint: addGpsPoint,
        clearAll: clearAll,
        fitPlot: fitPlot,
        locateUser: locateUser,
        startWalk: startWalk,
        stopWalk: stopWalk,
        undoLast: undoLast,
        zoomIn: zoomIn,
        zoomOut: zoomOut
      };

      window.codexHandleNativeMessage = handleNativeMessage;
      document.addEventListener('message', function(event) {
        handleNativeMessage(event.data);
      });
      window.addEventListener('message', function(event) {
        handleNativeMessage(event.data);
      });

      window.addEventListener('beforeunload', stopWalk);

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'webview-ready'
          })
        );
      }

      locateUser();
      postState();
    </script>
  </body>
</html>
`;

const GpsLandMeasureWorkspace = ({
  externalRecord,
  onExternalRecordApplied,
  showSavedRecords = true,
}: GpsLandMeasureWorkspaceProps) => {
  const {language} = useLanguage();
  const reportRef = useRef<ViewShotRef>(null);
  const webViewRef = useRef<WebView>(null);
  const [captureMode, setCaptureMode] =
    useState<CaptureMode>('walk-boundary');
  const [district, setDistrict] = useState('');
  const [tehsil, setTehsil] = useState('');
  const [plotLabel, setPlotLabel] = useState('');
  const [villageName, setVillageName] = useState('');
  const [officialArea, setOfficialArea] = useState('');
  const [officialAreaUnit, setOfficialAreaUnit] =
    useState<AreaUnit>('upbigha');
  const [notes, setNotes] = useState('');
  const [permissionReady, setPermissionReady] =
    useState(Platform.OS !== 'android');
  const [mapReady, setMapReady] = useState(false);
  const [measureState, setMeasureState] =
    useState<MeasureState>({
      areaSqm: 0,
      hasGpsFix: false,
      lastGpsLat: null,
      lastGpsLng: null,
      perimeterM: 0,
      pointsCount: 0,
      statusBody: DEFAULT_STATUS_BODY,
      statusTitle: DEFAULT_STATUS_TITLE,
      tracking: false,
    });
  const {deleteRecord, records, saveRecord} =
    useSavedWorkspaceRecords('gps-land-measure');

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ])
      .then(result => {
        const fineGranted =
          result[
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          ] === PermissionsAndroid.RESULTS.GRANTED;
        const coarseGranted =
          result[
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
          ] === PermissionsAndroid.RESULTS.GRANTED;

        setPermissionReady(fineGranted || coarseGranted);
      })
      .catch(() => {
        setPermissionReady(false);
      });
  }, []);

  const copy = useMemo(
    () => ({
      intro:
        language === 'hi'
          ? 'Trace the field live while walking, or tap parcel corners on the map. As the boundary grows, the exact field shape appears on the map and the area report updates automatically.'
          : 'Trace the field live while walking, or tap parcel corners on the map. As the boundary grows, the exact field shape appears on the map and the area report updates automatically.',
      currentReport:
        language === 'hi'
          ? 'Current GPS field report'
          : 'Capture review',
      districtLabel:
        language === 'hi' ? 'District' : 'District',
      emptyBody:
        language === 'hi'
          ? 'Saved GPS field reports will appear here for quick reuse.'
          : 'Saved GPS captures will appear here for quick reuse.',
      emptyTitle:
        language === 'hi'
          ? 'No saved GPS field report yet'
          : 'No saved GPS capture yet',
      exportError:
        language === 'hi'
          ? 'Export could not finish'
          : 'Export could not finish',
      gpsPending:
        language === 'hi'
          ? 'Location permission is required for live field capture.'
          : 'Location permission is required for live field capture.',
      image: 'Image',
      load: language === 'hi' ? 'Load' : 'Load',
      modeLabel:
        language === 'hi'
          ? 'Capture style'
          : 'Capture style',
      notesLabel:
        language === 'hi' ? 'Notes' : 'Notes',
      officialAreaLabel:
        language === 'hi'
          ? 'Official record area'
          : 'Official record area',
      officialAreaUnitLabel:
        language === 'hi'
          ? 'Official area unit'
          : 'Official area unit',
      pdf: 'PDF',
      plotLabel:
        language === 'hi'
          ? 'Plot / Khasra / Gata'
          : 'Plot / Khasra / Gata',
      resultTitle:
        language === 'hi'
          ? 'GPS result'
          : 'GPS result',
      save: language === 'hi' ? 'Save' : 'Save',
      saveBlocked:
        language === 'hi'
          ? 'Complete the field boundary first'
          : 'Complete the field boundary first',
      saveBlockedBody:
        language === 'hi'
          ? 'Mark at least 3 field corners before saving or exporting.'
          : 'Mark at least 3 field corners before saving or exporting.',
      saveDoneBody:
        language === 'hi'
          ? 'This field report is now in your saved list.'
          : 'This GPS capture is now in your saved list.',
      saveDoneTitle:
        language === 'hi'
          ? 'GPS field report saved'
          : 'GPS capture saved',
      savedReports:
        language === 'hi'
          ? 'Saved GPS field reports'
          : 'Saved GPS captures',
      share: language === 'hi' ? 'Share' : 'Share',
      tehsilLabel:
        language === 'hi' ? 'Tehsil' : 'Tehsil',
      villageLabel:
        language === 'hi' ? 'Village' : 'Village',
      workflowTitle:
        language === 'hi'
          ? 'Field workflow'
          : 'Field workflow',
    }),
    [language],
  );

  const measuredAreaUpBigha =
    measureState.areaSqm / SQM_PER_UP_BIGHA;
  const measuredAreaUpBiswa =
    measureState.areaSqm / SQM_PER_UP_BISWA;
  const measuredAreaAcre =
    measureState.areaSqm / SQM_PER_ACRE;
  const officialAreaSqm = convertAreaToSqm(
    toNumber(officialArea),
    officialAreaUnit,
  );
  const areaGapSqm =
    officialAreaSqm > 0
      ? measureState.areaSqm - officialAreaSqm
      : 0;
  const areaGapPercent =
    officialAreaSqm > 0
      ? (Math.abs(areaGapSqm) / officialAreaSqm) * 100
      : 0;
  const accuracyLabel = getAccuracyLabel(measureState);
  const mapStatusTitle =
    measureState.statusTitle || DEFAULT_STATUS_TITLE;
  const mapStatusBody =
    measureState.statusBody || DEFAULT_STATUS_BODY;

  const comparisonStatus =
    officialAreaSqm <= 0
      ? 'Add official area for comparison'
      : areaGapPercent <= 5
        ? 'Very close to the record'
        : areaGapPercent <= 12
          ? 'Small difference, check once'
          : 'Large difference, recheck the boundary';

  const nextStep =
    measureState.pointsCount < 3
      ? 'Keep marking boundary points until the plot closes clearly on the map.'
      : officialAreaSqm > 0 && areaGapPercent > 12
        ? 'Walk the field once more or compare it with the official parcel area before final save.'
        : measureState.tracking
          ? 'Stop walking after the full field edge is covered.'
          : 'The field outline is ready. Save it, export it, or compare it with the official record.';

  const recordTitle =
    plotLabel.trim() || 'Field measurement';
  const recordSubtitle =
    villageName.trim() ||
    `${measureState.pointsCount} boundary points marked`;
  const captureModeLabel =
    captureMode === 'walk-boundary'
      ? 'Walk boundary live'
      : captureMode === 'tap-corners'
        ? 'Tap field corners'
        : 'Compare with official record';
  const gpsSignalLabel = measureState.hasGpsFix
    ? 'Locked'
    : 'Searching';
  const recordGapLabel =
    officialAreaSqm > 0
      ? `${formatFixed(areaGapSqm, 2)} Sq M (${formatFixed(areaGapPercent, 2)}%)`
      : 'Official area not added yet';
  const lastGpsLabel =
    measureState.lastGpsLat !== null &&
    measureState.lastGpsLng !== null
      ? `${formatFixed(
          measureState.lastGpsLat,
          6,
        )}, ${formatFixed(measureState.lastGpsLng, 6)}`
      : 'No live point yet';
  const reportHighlights = [
    {
      accentColor: '#EA580C',
      iconName: 'map-marker-path',
      label: 'Mode',
      softColor: '#FFF1E8',
      value: captureModeLabel,
    },
    {
      accentColor: '#2563EB',
      iconName: 'crosshairs-gps',
      label: 'GPS',
      softColor: '#EAF2FF',
      value: gpsSignalLabel,
    },
    {
      accentColor: '#059669',
      iconName: 'vector-polyline',
      label: 'Points',
      softColor: '#E8FFF6',
      value: String(measureState.pointsCount),
    },
  ];
  const reportSections = [
    {
      accentColor: '#0F766E',
      rows: [
        {
          iconName: 'office-building-marker-outline',
          label: 'District',
          value: district.trim() || '-',
        },
        {
          iconName: 'map-marker-outline',
          label: 'Tehsil',
          value: tehsil.trim() || '-',
        },
        {
          iconName: 'home-city-outline',
          label: 'Village',
          value: villageName.trim() || '-',
        },
        {
          iconName: 'pound-box-outline',
          label: 'Plot / Khasra',
          value: plotLabel.trim() || '-',
        },
      ],
      softColor: '#ECFEFF',
      title: 'Location details',
    },
    {
      accentColor: '#D97706',
      rows: [
        {
          iconName: 'ruler-square',
          label: 'Area (Sq M)',
          value: `${formatFixed(
            measureState.areaSqm,
            2,
          )} Sq M`,
        },
        {
          iconName: 'texture-box',
          label: 'Area (UP Bigha)',
          value: `${formatFixed(
            measuredAreaUpBigha,
            4,
          )} UP Bigha`,
        },
        {
          iconName: 'grid-large',
          label: 'Area (UP Biswa)',
          value: `${formatFixed(
            measuredAreaUpBiswa,
            4,
          )} UP Biswa`,
        },
        {
          iconName: 'map-outline',
          label: 'Boundary length',
          value: `${formatFixed(
            measureState.perimeterM,
            2,
          )} m`,
        },
      ],
      softColor: '#FFF7ED',
      title: 'Measured output',
    },
    {
      accentColor: '#7C3AED',
      rows: [
        {
          iconName: 'shield-check-outline',
          label: 'Capture quality',
          value: accuracyLabel,
        },
        {
          iconName: 'scale-balance',
          label: 'Record match',
          value: comparisonStatus,
        },
        {
          iconName: 'swap-horizontal-bold',
          label: 'Difference from record',
          value: recordGapLabel,
        },
        {
          iconName: 'crosshairs-question',
          label: 'Last GPS fix',
          value: lastGpsLabel,
        },
      ],
      softColor: '#F5F3FF',
      title: 'Field check',
    },
  ];
  const statusTone = !measureState.hasGpsFix
    ? {
        backgroundColor: COLORS.warningSoft,
        textColor: COLORS.warning,
      }
    : measureState.tracking
      ? {
          backgroundColor: COLORS.successSoft,
          textColor: COLORS.success,
        }
      : {
          backgroundColor: COLORS.primarySoft,
          textColor: COLORS.primary,
        };

  const summaryLines = [
    `Capture mode: ${captureModeLabel}`,
    `District: ${district.trim() || '-'}`,
    `Tehsil: ${tehsil.trim() || '-'}`,
    `Village: ${villageName.trim() || '-'}`,
    `Plot / Khasra: ${plotLabel.trim() || '-'}`,
    `GPS signal: ${gpsSignalLabel}`,
    `Boundary points: ${measureState.pointsCount}`,
    `Area (Sq M): ${formatFixed(
      measureState.areaSqm,
      2,
    )} Sq M`,
    `Area (UP Bigha): ${formatFixed(
      measuredAreaUpBigha,
      4,
    )} UP Bigha`,
    `Area (UP Biswa): ${formatFixed(
      measuredAreaUpBiswa,
      4,
    )} UP Biswa`,
    `Area (Acre): ${formatFixed(
      measuredAreaAcre,
      4,
    )} Acre`,
    `Boundary length: ${formatFixed(
      measureState.perimeterM,
      2,
    )} m`,
    `Capture quality: ${accuracyLabel}`,
    `Record match: ${comparisonStatus}`,
    `Difference from record: ${recordGapLabel}`,
    `Suggested next step: ${nextStep}`,
  ];

  if (
    measureState.lastGpsLat !== null &&
    measureState.lastGpsLng !== null
  ) {
    summaryLines.push(
      `Last GPS fix: ${lastGpsLabel}`,
    );
  }

  const ensureData = () => {
    if (measureState.pointsCount >= 3) {
      return true;
    }

    Alert.alert(copy.saveBlocked, copy.saveBlockedBody);
    return false;
  };

  const handleSave = async () => {
    if (!ensureData()) {
      return;
    }

    await saveRecord({
      subtitle: recordSubtitle,
      summaryLines,
      title: recordTitle,
      values: {
        areaSqm: String(measureState.areaSqm),
        captureMode,
        district,
        hasGpsFix: measureState.hasGpsFix
          ? 'true'
          : 'false',
        lastGpsLat:
          measureState.lastGpsLat === null
            ? ''
            : String(measureState.lastGpsLat),
        lastGpsLng:
          measureState.lastGpsLng === null
            ? ''
            : String(measureState.lastGpsLng),
        notes,
        officialArea,
        officialAreaUnit,
        perimeterM: String(measureState.perimeterM),
        plotLabel,
        pointsCount: String(measureState.pointsCount),
        tehsil,
        tracking: measureState.tracking
          ? 'true'
          : 'false',
        villageName,
      },
    });

    Alert.alert(copy.saveDoneTitle, copy.saveDoneBody);
  };

  const handleLoad = (record: WorkspaceRecord) => {
    setCaptureMode(
      (record.values.captureMode as CaptureMode) ||
        'walk-boundary',
    );
    setDistrict(record.values.district ?? '');
    setTehsil(record.values.tehsil ?? '');
    setPlotLabel(record.values.plotLabel ?? '');
    setVillageName(record.values.villageName ?? '');
    setOfficialArea(record.values.officialArea ?? '');
    setOfficialAreaUnit(
      (record.values.officialAreaUnit as AreaUnit) ||
        'upbigha',
    );
    setNotes(record.values.notes ?? '');
    setMeasureState({
      areaSqm: Number(record.values.areaSqm) || 0,
      hasGpsFix: record.values.hasGpsFix === 'true',
      lastGpsLat: record.values.lastGpsLat
        ? Number(record.values.lastGpsLat)
        : null,
      lastGpsLng: record.values.lastGpsLng
        ? Number(record.values.lastGpsLng)
        : null,
      perimeterM: Number(record.values.perimeterM) || 0,
      pointsCount: Number(record.values.pointsCount) || 0,
      statusBody: DEFAULT_STATUS_BODY,
      statusTitle: DEFAULT_STATUS_TITLE,
      tracking: record.values.tracking === 'true',
    });
  };

  useEffect(() => {
    if (!externalRecord) {
      return;
    }

    handleLoad(externalRecord);
    onExternalRecordApplied?.();
  }, [externalRecord, onExternalRecordApplied]);

  const handleShare = async (
    title: string,
    lines: string[],
  ) => {
    try {
      await shareTextSummary({
        summaryLines: lines,
        title,
      });
    } catch {
      Alert.alert(copy.exportError);
    }
  };

  const runMapCommand = (command: MapCommand) => {
    if (!mapReady) {
      return;
    }

    const payload = JSON.stringify({
      command,
      type: 'map-command',
    });

    webViewRef.current?.postMessage(payload);
    webViewRef.current?.injectJavaScript(
      `window.codexHandleNativeMessage && window.codexHandleNativeMessage(${JSON.stringify(payload)}); true;`,
    );
  };

  return (
    <View>
      <View style={styles.workflowRow}>
        {[
          '1. Capture on map',
          '2. Add parcel details',
          '3. Compare record',
          '4. Save report',
        ].map(step => (
          <View
            key={step}
            style={styles.workflowStep}>
            <Text style={styles.workflowStepText}>
              {step}
            </Text>
          </View>
        ))}
      </View>

      <View style={workspaceStyles.formCard}>
        <WorkspaceChipSelector
          label={copy.modeLabel}
          onSelect={value =>
            setCaptureMode(value as CaptureMode)
          }
          options={[
            {
              label: 'Walk Boundary',
              value: 'walk-boundary',
            },
            {
              label: 'Tap Corners',
              value: 'tap-corners',
            },
            {
              label: 'Compare Record',
              value: 'compare-record',
            },
          ]}
          selectedValue={captureMode}
        />
      </View>

      {!permissionReady ? (
        <Text style={styles.permissionNote}>
          {copy.gpsPending}
        </Text>
      ) : null}

      <View style={styles.mapWrap}>
        <WebView
          ref={webViewRef}
          domStorageEnabled
          geolocationEnabled
          javaScriptEnabled
          onMessage={event => {
            try {
              const payload = JSON.parse(
                event.nativeEvent.data,
              );

              if (payload.type === 'webview-ready') {
                setMapReady(true);
                return;
              }

              if (payload.type === 'measurement') {
                setMapReady(true);
                setMeasureState({
                  areaSqm: Number(payload.areaSqm) || 0,
                  hasGpsFix: Boolean(payload.hasGpsFix),
                  lastGpsLat:
                    typeof payload.lastGpsLat === 'number'
                      ? payload.lastGpsLat
                      : null,
                  lastGpsLng:
                    typeof payload.lastGpsLng === 'number'
                      ? payload.lastGpsLng
                      : null,
                  perimeterM:
                    Number(payload.perimeterM) || 0,
                  pointsCount:
                    Number(payload.pointsCount) || 0,
                  statusBody:
                    typeof payload.statusBody === 'string'
                      ? payload.statusBody
                      : DEFAULT_STATUS_BODY,
                  statusTitle:
                    typeof payload.statusTitle === 'string'
                      ? payload.statusTitle
                      : DEFAULT_STATUS_TITLE,
                  tracking: Boolean(payload.tracking),
                });
              }
            } catch {}
          }}
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          source={{html: MAP_HTML}}
          style={styles.map}
        />
      </View>

      <View style={styles.toolbarWrap}>
        <ScrollView
          contentContainerStyle={styles.toolbarRow}
          horizontal
          showsHorizontalScrollIndicator={false}>
          <AppPressable
            disabled={!mapReady || !permissionReady}
            onPress={() => runMapCommand('locateUser')}
            pressEffect="none"
            pressedOpacity={0.88}
            style={[
              styles.primaryToolChip,
              styles.primaryToolChipSoft,
              (!mapReady || !permissionReady) &&
                styles.toolChipDisabled,
            ]}>
            <View style={styles.toolChipContent}>
              <Icon
                color={COLORS.primary}
                name="crosshairs-gps"
                size={18}
              />
              <Text style={styles.primaryToolChipText}>
                Locate
              </Text>
            </View>
          </AppPressable>

          <AppPressable
            disabled={!mapReady || !permissionReady}
            onPress={() =>
              runMapCommand(
                measureState.tracking
                  ? 'stopWalk'
                  : 'startWalk',
              )
            }
            pressEffect="none"
            pressedOpacity={0.88}
            style={[
              styles.primaryToolChip,
              measureState.tracking
                ? styles.primaryToolChipDanger
                : styles.primaryToolChipActive,
              (!mapReady || !permissionReady) &&
                styles.toolChipDisabled,
            ]}>
            <View style={styles.toolChipContent}>
              <Icon
                color={COLORS.white}
                name={
                  measureState.tracking
                    ? 'stop-circle-outline'
                    : 'walk'
                }
                size={18}
              />
              <Text
                style={styles.primaryToolChipTextStrong}>
                {measureState.tracking
                  ? 'Stop walk'
                  : 'Start walk'}
              </Text>
            </View>
          </AppPressable>

          <AppPressable
            disabled={!mapReady || !permissionReady}
            onPress={() => runMapCommand('addGpsPoint')}
            pressEffect="none"
            pressedOpacity={0.88}
            style={[
              styles.primaryToolChip,
              styles.primaryToolChipSoft,
              (!mapReady || !permissionReady) &&
                styles.toolChipDisabled,
            ]}>
            <View style={styles.toolChipContent}>
              <Icon
                color={COLORS.primary}
                name="map-marker-plus-outline"
                size={18}
              />
              <Text style={styles.primaryToolChipText}>
                Add point
              </Text>
            </View>
          </AppPressable>
        </ScrollView>

        <ScrollView
          contentContainerStyle={[
            styles.toolbarRow,
            styles.secondaryToolbarRow,
          ]}
          horizontal
          showsHorizontalScrollIndicator={false}>
          <AppPressable
            disabled={!mapReady}
            onPress={() => runMapCommand('fitPlot')}
            pressEffect="none"
            pressedOpacity={0.88}
            style={[
              styles.utilityChip,
              !mapReady && styles.toolChipDisabled,
            ]}>
            <View style={styles.toolChipContent}>
              <Icon
                color={COLORS.text}
                name="fit-to-screen-outline"
                size={17}
              />
              <Text style={styles.utilityChipText}>
                Fit
              </Text>
            </View>
          </AppPressable>

          <AppPressable
            disabled={!mapReady}
            onPress={() => runMapCommand('zoomIn')}
            pressEffect="none"
            pressedOpacity={0.88}
            style={[
              styles.utilityChip,
              !mapReady && styles.toolChipDisabled,
            ]}>
            <View style={styles.toolChipContent}>
              <Icon
                color={COLORS.text}
                name="plus"
                size={17}
              />
              <Text style={styles.utilityChipText}>
                Zoom in
              </Text>
            </View>
          </AppPressable>

          <AppPressable
            disabled={!mapReady}
            onPress={() => runMapCommand('zoomOut')}
            pressEffect="none"
            pressedOpacity={0.88}
            style={[
              styles.utilityChip,
              !mapReady && styles.toolChipDisabled,
            ]}>
            <View style={styles.toolChipContent}>
              <Icon
                color={COLORS.text}
                name="minus"
                size={17}
              />
              <Text style={styles.utilityChipText}>
                Zoom out
              </Text>
            </View>
          </AppPressable>

          <AppPressable
            disabled={!mapReady}
            onPress={() => runMapCommand('undoLast')}
            pressEffect="none"
            pressedOpacity={0.88}
            style={[
              styles.utilityChip,
              !mapReady && styles.toolChipDisabled,
            ]}>
            <View style={styles.toolChipContent}>
              <Icon
                color={COLORS.text}
                name="undo-variant"
                size={17}
              />
              <Text style={styles.utilityChipText}>
                Undo
              </Text>
            </View>
          </AppPressable>

          <AppPressable
            disabled={!mapReady}
            onPress={() => runMapCommand('clearAll')}
            pressEffect="none"
            pressedOpacity={0.88}
            style={[
              styles.utilityChip,
              styles.utilityChipDanger,
              !mapReady && styles.toolChipDisabled,
            ]}>
            <View style={styles.toolChipContent}>
              <Icon
                color="#B91C1C"
                name="delete-outline"
                size={17}
              />
              <Text
                style={[
                  styles.utilityChipText,
                  styles.utilityChipDangerText,
                ]}>
                Clear
              </Text>
            </View>
          </AppPressable>
        </ScrollView>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>
          {mapStatusTitle}
        </Text>
        <Text style={styles.statusBody}>
          {mapStatusBody}
        </Text>
      </View>

      <View style={workspaceStyles.formCard}>
        <WorkspaceField
          label={copy.districtLabel}
          onChangeText={setDistrict}
          value={district}
        />
        <WorkspaceField
          label={copy.tehsilLabel}
          onChangeText={setTehsil}
          value={tehsil}
        />
        <WorkspaceField
          label={copy.villageLabel}
          onChangeText={setVillageName}
          value={villageName}
        />
        <WorkspaceField
          label={copy.plotLabel}
          onChangeText={setPlotLabel}
          value={plotLabel}
        />
        <WorkspaceChipSelector
          label={copy.officialAreaUnitLabel}
          onSelect={value =>
            setOfficialAreaUnit(value as AreaUnit)
          }
          options={[
            {label: 'Sq M', value: 'sqm'},
            {label: 'UP Bigha', value: 'upbigha'},
            {label: 'UP Biswa', value: 'upbiswa'},
            {label: 'Acre', value: 'acre'},
          ]}
          selectedValue={officialAreaUnit}
        />
        <WorkspaceField
          keyboardType="numeric"
          label={copy.officialAreaLabel}
          onChangeText={setOfficialArea}
          value={officialArea}
        />
        <WorkspaceField
          label={copy.notesLabel}
          multiline
          onChangeText={setNotes}
          value={notes}
        />
      </View>

      <View style={workspaceStyles.resultSection}>
        <AppSectionTitle title={copy.resultTitle} />

        <ViewShot ref={reportRef}>
          <View style={styles.captureSheetCard}>
            <View style={styles.captureSheetHeader}>
              <View style={styles.captureSheetHeaderCopy}>
                <Text style={styles.captureSheetTitle}>
                  {recordTitle}
                </Text>
                <Text style={styles.captureSheetSubtitle}>
                  {recordSubtitle}
                </Text>
              </View>

              <View
                style={[
                  styles.captureSheetStatusPill,
                  {
                    backgroundColor:
                      statusTone.backgroundColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.captureSheetStatusText,
                    {
                      color: statusTone.textColor,
                    },
                  ]}>
                  {accuracyLabel}
                </Text>
              </View>
            </View>

            <View style={styles.captureMetricsSection}>
              <View style={workspaceStyles.metricsRow}>
                <WorkspaceMetricTile
                  accentColor="#1E40AF"
                  label="Capture status"
                  value={accuracyLabel}
                />
                <WorkspaceMetricTile
                  accentColor="#2563EB"
                  label="GPS fix"
                  value={
                    measureState.hasGpsFix
                      ? 'Ready'
                      : 'Pending'
                  }
                />
                <WorkspaceMetricTile
                  accentColor="#0F766E"
                  label="Corners captured"
                  value={String(measureState.pointsCount)}
                />
                <WorkspaceMetricTile
                  accentColor="#10B981"
                  label="Measured area"
                  value={`${formatFixed(
                    measureState.areaSqm,
                    2,
                  )} Sq M`}
                />
                <WorkspaceMetricTile
                  accentColor="#0891B2"
                  label="Area in UP Bigha"
                  value={formatFixed(
                    measuredAreaUpBigha,
                    4,
                  )}
                />
                <WorkspaceMetricTile
                  accentColor="#7C3AED"
                  label="Perimeter"
                  value={`${formatFixed(
                    measureState.perimeterM,
                    2,
                  )} m`}
                />
                <WorkspaceMetricTile
                  accentColor="#EA580C"
                  label="Record status"
                  value={comparisonStatus}
                />
                <WorkspaceMetricTile
                  accentColor="#DC2626"
                  label="Area gap"
                  value={
                    officialAreaSqm > 0
                      ? `${formatFixed(
                          areaGapPercent,
                          2,
                        )}%`
                      : 'Not added'
                  }
                />
              </View>
            </View>

            <View style={styles.captureDetailStack}>
              <View style={styles.captureMetaRow}>
                {reportHighlights.map(item => (
                  <View
                    key={item.label}
                    style={styles.captureMetaItem}>
                    <Icon
                      color={item.accentColor}
                      name={item.iconName}
                      size={15}
                    />
                    <Text
                      style={[
                        styles.captureMetaLabel,
                        {
                          color: item.accentColor,
                        },
                      ]}>
                      {item.label}
                    </Text>
                    <Text style={styles.captureMetaValue}>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>

              {reportSections.map(section => (
                <View
                  key={section.title}
                  style={styles.captureSectionBlock}>
                  <Text
                    style={[
                      styles.captureSectionTitle,
                      {
                        color: section.accentColor,
                      },
                    ]}>
                    {section.title}
                  </Text>

                  <View style={styles.captureSectionBody}>
                    {section.rows.map(row => (
                      <View
                        key={`${section.title}-${row.label}`}
                        style={styles.captureInfoRow}>
                        <View
                          style={styles.captureInfoIconBox}>
                          <Icon
                            color={section.accentColor}
                            name={row.iconName}
                            size={16}
                          />
                        </View>

                        <View
                          style={styles.captureInfoCopy}>
                          <Text
                            style={styles.captureInfoLabel}>
                            {row.label}
                          </Text>
                          <Text
                            style={styles.captureInfoValue}>
                            {row.value}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              <View style={styles.capturePlainSection}>
                <Text style={styles.capturePlainLabel}>
                  Suggested next step
                </Text>
                <Text style={styles.capturePlainValue}>
                  {nextStep}
                </Text>
              </View>

              {notes.trim() ? (
                <View style={styles.capturePlainSection}>
                  <Text style={styles.capturePlainLabel}>
                    Notes
                  </Text>
                  <Text style={styles.capturePlainValue}>
                    {notes.trim()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </ViewShot>
      </View>

      <WorkspaceActionRow
        labels={copy}
        onExportImage={() =>
          ensureData() &&
          exportRefAsImage({
            fileName: sanitizeFileName(
              `gps-field-${recordTitle}`,
            ),
            ref: reportRef,
            title: `GPS Field Report - ${recordTitle}`,
          }).catch(() => {
            Alert.alert(copy.exportError);
          })
        }
        onExportPdf={() =>
          ensureData() &&
          exportSummaryAsPdf({
            fileName: sanitizeFileName(
              `gps-field-${recordTitle}`,
            ),
            summaryLines: notes.trim()
              ? [
                  ...summaryLines,
                  `Notes: ${notes.trim()}`,
                ]
              : summaryLines,
            title: `GPS Field Report - ${recordTitle}`,
          }).catch(() => {
            Alert.alert(copy.exportError);
          })
        }
        onSave={handleSave}
        onShare={() =>
          ensureData() &&
          handleShare(
            `GPS Field Report - ${recordTitle}`,
            notes.trim()
              ? [
                  ...summaryLines,
                  `Notes: ${notes.trim()}`,
                ]
              : summaryLines,
          )
        }
      />

      {showSavedRecords ? (
        <SavedRecordsPanel
          emptyBody={copy.emptyBody}
          emptyTitle={copy.emptyTitle}
          loadLabel={copy.load}
          onDelete={deleteRecord}
          onLoad={handleLoad}
          onShare={record =>
            handleShare(record.title, record.summaryLines)
          }
          records={records}
          shareLabel={copy.share}
          title={copy.savedReports}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  captureInfoCopy: {
    flex: 1,
    marginLeft: 12,
  },
  captureInfoIconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  captureInfoLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  captureInfoRow: {
    alignItems: 'flex-start',
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: 10,
    paddingBottom: 10,
  },
  captureInfoValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 3,
  },
  captureMetaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 18,
    marginTop: 10,
  },
  captureMetaLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
  },
  captureMetaRow: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    paddingBottom: 10,
  },
  captureMetaValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  capturePlainLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  capturePlainSection: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 12,
  },
  capturePlainValue: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  captureSectionBlock: {
    marginTop: 16,
  },
  captureSectionBody: {
    marginTop: 10,
  },
  captureSectionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  captureSheetCard: {
    backgroundColor: '#F6FAFF',
    borderColor: '#DCE7F8',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 2,
    padding: 16,
  },
  captureMetricsSection: {
    marginTop: 16,
  },
  captureDetailStack: {
    marginTop: 14,
  },
  captureSheetHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  captureSheetHeaderCopy: {
    flex: 1,
    paddingRight: 10,
  },
  captureSheetStatusPill: {
    backgroundColor: COLORS.successSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  captureSheetStatusText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '800',
  },
  captureSheetSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  captureSheetTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  map: {
    flex: 1,
  },
  mapWrap: {
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 430,
    marginTop: 12,
    overflow: 'hidden',
  },
  permissionNote: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  primaryToolChip: {
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 10,
    minHeight: 46,
    minWidth: 122,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  primaryToolChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  primaryToolChipDanger: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  primaryToolChipSoft: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  primaryToolChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },
  primaryToolChipTextStrong: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },
  secondaryToolbarRow: {
    paddingTop: 10,
  },
  statusBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  statusCard: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    marginTop: 12,
    paddingBottom: 12,
  },
  statusTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  toolChipContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  toolChipDisabled: {
    opacity: 0.46,
  },
  toolbarRow: {
    paddingRight: 4,
  },
  toolbarWrap: {
    marginTop: 12,
  },
  utilityChip: {
    backgroundColor: COLORS.surfaceAlt,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  utilityChipDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  utilityChipDangerText: {
    color: '#B91C1C',
  },
  utilityChipText: {
    color: COLORS.text,
    fontSize: 12.5,
    fontWeight: '700',
    marginLeft: 7,
  },
  workflowRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    marginTop: 6,
  },
  workflowStep: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  workflowStepText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
});

export default GpsLandMeasureWorkspace;
