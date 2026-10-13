export const GPS_MAP_HTML = `
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
        background: #ebf1fc;
        height: 100%;
        margin: 0;
        padding: 0;
        width: 100%;
      }
      body { font-family: system-ui, sans-serif; }
      .parcel-point { background: #ffffff; color: #2c50b3; border: 2px solid #2c50b3; border-radius: 50%; font-size: 11px; font-weight: 800; text-align: center; line-height: 22px; box-shadow: 0 2px 9px #0f172a30; }
      .leaflet-control-attribution { font-size: 9px !important; background: rgba(255,255,255,.85) !important; }
      .leaflet-control-scale { margin-bottom: 26px !important; }

    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      var map = L.map('map', {
        zoomControl: false
      }).setView([26.8467, 80.9462], 15);
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
      var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxNativeZoom: 19,
        maxZoom: 22
      }).addTo(map);

      tiles.on('tileerror', function() { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tile-error' })); });
      tiles.on('tileload', function() { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tile-ready' })); });
      var initialMessage = true;
      var MIN_TRACK_DISTANCE = 4;
      var gpsMarker = null;
      var lastGps = null;
      var accuracyM = null;
      var gpsError = null;
      var markers = [];
      var points = [];
      var polygon = null;
      var polyline = null;
      var tracking = false;
      var captureMode = 'tap-corners';
      var watchId = null;
      var locationRequest = 0;

      function getStatusInfo() {
        if (gpsError) return { title: 'GPS unavailable', body: gpsError };
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

      function hasCrossedEdges(list) {
        function orientation(a,b,c) { return (b.lng-a.lng)*(c.lat-a.lat)-(b.lat-a.lat)*(c.lng-a.lng); }
        for (var i=0; i<list.length; i++) {
          var a=list[i], b=list[(i+1)%list.length];
          for (var j=i+1; j<list.length; j++) {
            if (j===i+1 || (i===0 && j===list.length-1)) continue;
            var c=list[j], d=list[(j+1)%list.length];
            if (orientation(a,b,c)*orientation(a,b,d)<0 && orientation(c,d,a)*orientation(c,d,b)<0) return true;
          }
        }
        return false;
      }

      function postState() {
        var status = getStatusInfo();
        var payload = {
          type: 'measurement',
          initial: initialMessage,
          areaSqm: polygonArea(points),
          points: points,
          accuracyM: accuracyM,
          invalidBoundary: hasCrossedEdges(points),
          gpsError: gpsError,
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
        initialMessage = false;
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
            color: '#2c50b3',
            weight: 3
          }).addTo(map);
        }

        if (points.length >= 3) {
          polygon = L.polygon(points, {
            color: '#2c50b3',
            fillColor: '#7da5f0',
            fillOpacity: 0.2,
            weight: 2
          }).addTo(map);
        }

        postState();
      }

      var premiumAllowed = false;
      var restoringBoundary = false;
      function canCapture() {
        if (premiumAllowed || restoringBoundary) return true;
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type: 'premium-required'}));
        return false;
      }
      function addPoint(latlng, shouldPan) {
        if (!canCapture()) return;
        if (points.length && haversineDistance(points[points.length-1], latlng) < 0.1) return;
        points.push({
          lat: latlng.lat,
          lng: latlng.lng
        });

        var marker = L.marker(latlng, {
          icon: L.divIcon({ className: 'parcel-point', html: String(points.length), iconSize: [24,24], iconAnchor: [12,12] }),
          interactive: false
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
          color: '#2c50b3',
          fillColor: '#2c50b3',
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
        gpsError = null;
        accuracyM = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null;
        updateGpsMarker(current);
        if (!points.length || tracking) map.setView([current.lat, current.lng], Math.max(map.getZoom(), 18));

        if (tracking && allowTrackingPoint) {
          pushTrackingPoint(current);
        } else {
          postState();
        }
      }

      function onGpsError(error) {
        gpsError = error && error.code === 1
          ? 'Allow location access in device settings, or mark corners on the map.'
          : 'No location fix. Move to an open area and tap Locate, or mark corners on the map.';
        postState();
      }

      function locateUser() {
        var request = ++locationRequest;
        navigator.geolocation.getCurrentPosition(
          function(position) {
            if (request !== locationRequest) return;
            onGpsSuccess(position, false);
            map.setView([lastGps.lat, lastGps.lng], Math.max(map.getZoom(), 18));
          },
          function(error) { if (request === locationRequest) onGpsError(error); },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 15000
          }
        );
      }

      function startWalk() {
        if (!canCapture()) return;
        if (tracking) {
          return;
        }

        tracking = true;
        locateUser();
        postState();

        watchId = navigator.geolocation.watchPosition(
          function(position) {
            if (!tracking) return;
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
        locationRequest++;
        tracking = false;

        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }

        redraw();
      }

      function addGpsPoint() {
        if (!canCapture()) return;
        var request = ++locationRequest;
        navigator.geolocation.getCurrentPosition(function(position) {
          if (request !== locationRequest) return;
          onGpsSuccess(position, false);
          addPoint(lastGps, true);
        }, function(error) { if (request === locationRequest) onGpsError(error); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
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
        stopWalk();
        points = [];

        while (markers.length) {
          map.removeLayer(markers.pop());
        }

        redraw();
      }

      map.on('click', function(event) {
        if (captureMode === 'tap-corners' && !tracking) addPoint(event.latlng, false);
      });

      function handleNativeMessage(raw) {
        try {
          var payload = JSON.parse(raw);
          if (payload && payload.type === 'premium-access') { premiumAllowed = payload.allowed === true; if (!premiumAllowed && tracking) stopWalk(); return; }
          if (payload && payload.type === 'capture-mode') { captureMode = payload.mode; if (captureMode !== 'walk-boundary') stopWalk(); return; }
          if (payload && payload.type === 'restore-boundary' && Array.isArray(payload.points)) {
            clearAll();
            restoringBoundary = true;
            payload.points.forEach(function(point) {
              if (Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180) addPoint(point, false);
            });
            restoringBoundary = false;
            fitPlot();
            return;
          }
          if (
            payload &&
            payload.type === 'map-command' &&
            payload.command &&
            window.codexMapActions &&
            typeof window.codexMapActions[payload.command] === 'function'
          ) {
            if (['startWalk', 'addGpsPoint', 'undoLast', 'clearAll'].indexOf(payload.command) >= 0 && !canCapture()) return;
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

      postState();
    </script>
  </body>
</html>
`;
