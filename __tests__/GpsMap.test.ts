import { GPS_MAP_HTML } from '../src/components/measurement/gpsMapHtml';
const vm = require('vm');

function mapHarness(premium = true) {
  const messages: any[] = [];
  const events: Record<string, (event: any) => void> = {};
  let watch: ((position: any) => void) | null = null;
  const map = {
    setView: jest.fn().mockReturnThis(),
    panTo: jest.fn(),
    getZoom: () => 18,
    fitBounds: jest.fn(),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    removeLayer: jest.fn(),
    on: (name: string, fn: any) => {
      events[name] = fn;
    },
  };
  const layer = () => ({
    addTo: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    setLatLng: jest.fn(),
  });
  const geolocation = {
    getCurrentPosition: jest.fn((success: any) =>
      success({ coords: { latitude: 26.8, longitude: 80.9, accuracy: 4 } }),
    ),
    watchPosition: jest.fn((success: any) => {
      watch = success;
      return 7;
    }),
    clearWatch: jest.fn(),
  };
  const context: any = {
    L: {
      map: () => map,
      tileLayer: layer,
      control: { scale: layer },
      circleMarker: layer,
      marker: layer,
      divIcon: (options: any) => options,
      polygon: layer,
      polyline: layer,
      latLngBounds: () => ({ pad: () => ({}) }),
    },
    navigator: { geolocation },
    document: { addEventListener: jest.fn() },
    window: {
      ReactNativeWebView: {
        postMessage: (raw: string) => messages.push(JSON.parse(raw)),
      },
      addEventListener: jest.fn(),
    },
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(
    GPS_MAP_HTML.match(/<script>([\s\S]*?)<\/script>/)![1],
    context,
  );
  const send = (payload: any) =>
    context.window.codexHandleNativeMessage(JSON.stringify(payload));
  send({type: 'premium-access', allowed: premium});
  const command = (name: string) =>
    send({ type: 'map-command', command: name });
  const tap = (lat: number, lng: number) =>
    events.click({ latlng: { lat, lng } });
  const last = () =>
    messages.filter(message => message.type === 'measurement').at(-1);
  return {
    tap,
    send,
    command,
    last,
    geolocation,
    map,
    gps: (lat: number, lng: number) =>
      watch?.({ coords: { latitude: lat, longitude: lng, accuracy: 3 } }),
  };
}

test('map starts without requesting location; taps create numbered corners, area and perimeter', () => {
  const h = mapHarness();
  expect(h.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  h.tap(0, 0);
  h.tap(0, 0.0001);
  h.tap(0.0001, 0.0001);
  h.tap(0.0001, 0);
  expect(h.last().pointsCount).toBe(4);
  expect(h.last().areaSqm).toBeGreaterThan(120);
  expect(h.last().areaSqm).toBeLessThan(125);
  expect(h.last().perimeterM).toBeCloseTo(44.478, 2);
  expect(h.last().invalidBoundary).toBe(false);
  h.command('undoLast');
  expect(h.last().pointsCount).toBe(3);
  h.command('clearAll');
  expect(h.last().pointsCount).toBe(0);
  expect(h.last().areaSqm).toBe(0);
});

test('GPS position is added exactly once after the actual location callback', () => {
  const h = mapHarness();
  h.command('addGpsPoint');
  expect(h.last().pointsCount).toBe(1);
  expect(h.last().points).toEqual([{ lat: 26.8, lng: 80.9 }]);
  expect(h.last().accuracyM).toBe(4);
});

test('walk mode ignores map taps, captures real updates and stops the location watcher', () => {
  const h = mapHarness();
  h.send({ type: 'capture-mode', mode: 'walk-boundary' });
  h.tap(0, 0);
  expect(h.last().pointsCount).toBe(0);
  h.command('startWalk');
  expect(h.last().tracking).toBe(true);
  h.gps(26.8, 80.9);
  h.gps(26.8001, 80.9);
  expect(h.last().pointsCount).toBe(2);
  h.command('stopWalk');
  expect(h.last().tracking).toBe(false);
  expect(h.geolocation.clearWatch).toHaveBeenCalledWith(7);
});

test('restoring a saved boundary recreates its points and totals without restarting tracking', () => {
  const h = mapHarness();
  h.send({
    type: 'restore-boundary',
    points: [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0.0001 },
      { lat: 0.0001, lng: 0 },
    ],
  });
  expect(h.last().pointsCount).toBe(3);
  expect(h.last().areaSqm).toBeGreaterThan(60);
  expect(h.last().tracking).toBe(false);
  expect(h.map.fitBounds).toHaveBeenCalled();
});

test('crossed boundaries are flagged and duplicate consecutive points are ignored', () => {
  const h = mapHarness();
  h.tap(0, 0);
  h.tap(0, 0);
  expect(h.last().pointsCount).toBe(1);
  h.tap(0.001, 0.001);
  h.tap(0, 0.001);
  h.tap(0.001, 0);
  expect(h.last().invalidBoundary).toBe(true);
});

test('locate recenters the map even when a boundary already exists', () => {
  const h = mapHarness();
  h.tap(10, 10);
  h.tap(10, 10.001);
  h.map.setView.mockClear();
  h.command('locateUser');
  expect(h.map.setView).toHaveBeenCalledWith([26.8, 80.9], 18);
  expect(h.last().pointsCount).toBe(2);
});

test('clearing or restoring a boundary cancels a pending GPS corner request', () => {
  const h = mapHarness();
  let complete: (position: any) => void = () => {};
  h.geolocation.getCurrentPosition.mockImplementation(success => {
    complete = success;
  });
  h.command('addGpsPoint');
  h.command('clearAll');
  complete({ coords: { latitude: 26.8, longitude: 80.9, accuracy: 4 } });
  expect(h.last().pointsCount).toBe(0);
  h.command('addGpsPoint');
  h.send({ type: 'restore-boundary', points: [{ lat: 20, lng: 80 }] });
  complete({ coords: { latitude: 26.8, longitude: 80.9, accuracy: 4 } });
  expect(h.last().points).toEqual([{ lat: 20, lng: 80 }]);
});

test('late watcher callbacks cannot add points after walking stops', () => {
  const h = mapHarness();
  h.command('startWalk');
  h.gps(26.8, 80.9);
  h.command('stopWalk');
  h.gps(26.801, 80.901);
  expect(h.last().pointsCount).toBe(1);
  expect(h.last().tracking).toBe(false);
});


test('free users can view saved geometry but cannot capture new corners or start a walk', () => {
  const h = mapHarness(false);
  h.tap(0, 0);
  h.command('startWalk');
  expect(h.last().points).toHaveLength(0);
  expect(h.geolocation.watchPosition).not.toHaveBeenCalled();
  h.send({type: 'restore-boundary', points: [{lat: 0, lng: 0}, {lat: 0, lng: 0.001}, {lat: 0.001, lng: 0.001}]});
  expect(h.last().points).toHaveLength(3);
  h.tap(0.001, 0);
  expect(h.last().points).toHaveLength(3);
});

test('expiry stops a running GPS walk without deleting measured points', () => {
  const h = mapHarness();
  h.command('startWalk');
  h.gps(26.801, 80.9);
  const count = h.last().points.length;
  h.send({type: 'premium-access', allowed: false});
  expect(h.last().tracking).toBe(false);
  expect(h.geolocation.clearWatch).toHaveBeenCalled();
  h.gps(26.802, 80.9);
  expect(h.last().points).toHaveLength(count);
});
