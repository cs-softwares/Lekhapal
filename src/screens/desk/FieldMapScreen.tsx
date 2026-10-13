import NoLandRecords from '../../components/desk/NoLandRecords';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  Switch,
  Text,
  View,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  Screen,
  Card,
  Field,
  Choices,
  Badge,
  Button,
  Detail,
  Empty,
} from '../../components/desk/Kit';
import {
  BoundaryMap,
  BoundaryMapHandle,
} from '../../components/desk/BoundaryMap';
import { useDesk } from '../../context/DeskContext';
import { deskStyles as s } from '../../theme';
import { DeskTabs } from '../../navigation/deskTypes';
import {
  createId,
  polygonArea,
  selfIntersects,
  validPoint,
} from '../../domain/desk';
import { Point } from '../../types';
function FieldMapScreenContent({
  route,
}: BottomTabScreenProps<DeskTabs, 'FieldMap'>) {
  const { state, commit, saveDraft } = useDesk();
  const [landId, setLandId] = useState(
    route.params?.landId || state.lands[0].id,
  );
  const land = state.lands.find(l => l.id === landId)!;
  const map = useRef<BoundaryMapHandle>(null);
  const readPoints = (id: string): Point[] => {
    try {
      const parsed: unknown = JSON.parse(
        state.drafts[`map-${id}`]?.points || '[]',
      );
      return Array.isArray(parsed) && parsed.every(p => p && validPoint(p))
        ? parsed
        : [];
    } catch {
      return [];
    }
  };
  const [points, setPoints] = useState<Point[]>(() => readPoints(landId));
  const [selected, setSelected] = useState(-1);
  const [satellite, setSatellite] = useState(false);
  const [gps, setGps] = useState<Point>();
  const [gpsAt, setGpsAt] = useState(0);
  const [message, setMessage] = useState(
    'Tap map corners or enter surveyed coordinates.',
  );
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [source, setSource] = useState<'GPS' | 'Manual'>('Manual');
  const draftReader = useRef(readPoints);
  draftReader.current = readPoints;
  useEffect(() => {
    if (route.params?.landId) {
      setLandId(route.params.landId);
      setPoints(draftReader.current(route.params.landId));
      setSelected(-1);
    }
  }, [route.params?.landId]);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const landRef = useRef(landId);
  landRef.current = landId;
  const pointWrites = useRef<Promise<void>>(Promise.resolve());
  const persist = (
    update: Point[] | ((previous: Point[]) => Point[]),
    mode?: 'GPS' | 'Manual',
  ) => {
    const targetLand = landId;
    const task = pointWrites.current.then(async () => {
      if (landRef.current !== targetLand) {
        throw new Error('The selected holding changed. Tag this point again.');
      }
      const previous = pointsRef.current;
      const next = typeof update === 'function' ? update(previous) : update;
      await saveDraft(`map-${targetLand}`, { points: JSON.stringify(next) });
      pointsRef.current = next;
      if (landRef.current === targetLand) {
        setPoints(next);
        setSelected(next.length - 1);
        if (mode) {
          setSource(current =>
            mode === 'Manual'
              ? 'Manual'
              : previous.length === 0
              ? 'GPS'
              : current,
          );
        }
      }
    });
    pointWrites.current = task.catch(() => {});
    return task;
  };
  const add = (p: Point, mode: 'GPS' | 'Manual' = 'Manual') =>
    persist(previous => {
      if (!validPoint(p)) {
        throw new Error('Enter valid latitude and longitude.');
      }
      if (
        previous.some(
          x =>
            Math.abs(x.latitude - p.latitude) < 0.0000001 &&
            Math.abs(x.longitude - p.longitude) < 0.0000001,
        )
      ) {
        throw new Error(
          'This corner is already tagged. Move to the next corner.',
        );
      }
      return [...previous, p];
    }, mode);
  const area = polygonArea(points);
  const crossing = selfIntersects(points);
  return (
    <Screen
      title="GPS boundary survey"
      subtitle={`Khasra #${land.plot} · ${land.village} · ${land.hectares} ha on record`}
    >
      <Choices
        items={state.lands.map(l => `Khasra ${l.plot}`)}
        value={`Khasra ${land.plot}`}
        onChange={label => {
          const next = state.lands.find(l => `Khasra ${l.plot}` === label)!;
          setLandId(next.id);
          setPoints(readPoints(next.id));
          setSelected(-1);
        }}
      />
      <View style={s.row}>
        <Badge
          text={
            gps ? `GPS ±${gps.accuracy?.toFixed(1)} m` : 'Manual survey mode'
          }
          tone={gps ? 'green' : 'amber'}
        />
        <View style={s.grow} />
        <Text style={s.muted}>Satellite</Text>
        <Switch
          accessibilityLabel="Satellite layer"
          value={satellite}
          onValueChange={setSatellite}
        />
      </View>
      <View
        style={{
          height: 340,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#CBD5E1',
        }}
      >
        <BoundaryMap
          key={landId}
          ref={map}
          center={land.location}
          points={points}
          satellite={satellite}
          online={state.online}
          onPoint={p =>
            void add(p).catch(e => Alert.alert('Corner not saved', e.message))
          }
          onGps={p => {
            if (validPoint(p)) {
              setGps(p);
              setGpsAt(Date.now());
              setMessage(
                'Live GPS available. Tag points while walking the boundary.',
              );
            }
          }}
          onError={setMessage}
        />
      </View>
      <Text style={s.muted}>{message}</Text>
      <Button
        title="Locate me / refresh live GPS"
        icon="crosshairs-gps"
        tone="soft"
        onPress={async () => {
          if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              throw new Error(
                'Location permission denied. You can still tag corners manually.',
              );
            }
          }
          map.current?.locate();
        }}
      />
      <Card>
        <View style={s.wrap}>
          <Detail
            label="Latitude"
            value={gps ? gps.latitude.toFixed(6) : 'Awaiting live fix'}
          />
          <Detail
            label="Longitude"
            value={gps ? gps.longitude.toFixed(6) : 'Awaiting live fix'}
          />
          <Detail
            label="Boundary area"
            value={`${(area / 10000).toFixed(4)} ha`}
          />
          <Detail label="Square metres" value={area.toFixed(1)} />
        </View>
        {crossing && (
          <Badge text="Boundary crosses itself — reorder corners" tone="red" />
        )}
        <Button
          title={`Tag GPS corner point ${points.length + 1}`}
          icon="map-marker-plus"
          onPress={async () => {
            if (!gps || Date.now() - gpsAt > 30000) {
              throw new Error(
                'Acquire a fresh GPS fix before tagging a corner.',
              );
            }
            await add(gps, 'GPS');
          }}
        />
        <Text style={s.muted}>
          For manual entry, use decimal degrees. Tag corners in boundary order.
        </Text>
        <Field
          label="Corner latitude"
          keyboardType="numbers-and-punctuation"
          placeholder="26.846700"
          value={latitude}
          onChangeText={setLatitude}
        />
        <Field
          label="Corner longitude"
          keyboardType="numbers-and-punctuation"
          placeholder="80.946200"
          value={longitude}
          onChangeText={setLongitude}
        />
        <Button
          title="Add manual corner"
          tone="soft"
          onPress={async () => {
            if (!latitude.trim() || !longitude.trim()) {
              throw new Error('Enter both coordinates.');
            }
            await add({
              latitude: Number(latitude),
              longitude: Number(longitude),
            });
          }}
        />
        {points.length > 0 && (
          <>
            <Choices
              items={points.map((_, i) => `Point ${i + 1}`)}
              value={`Point ${selected + 1}`}
              onChange={v => setSelected(Number(v.split(' ')[1]) - 1)}
            />
            {points[selected] && (
              <Text style={s.muted}>
                {points[selected].latitude.toFixed(6)},{' '}
                {points[selected].longitude.toFixed(6)}
              </Text>
            )}
            <Button
              title="Clear selected"
              tone="soft"
              onPress={async () => {
                if (selected < 0) {
                  throw new Error('Select a point to remove.');
                }
                await persist(previous =>
                  previous.filter((_, i) => i !== selected),
                );
              }}
            />
          </>
        )}
        <Button
          title="Recalculate area"
          tone="soft"
          onPress={() => {
            if (points.length < 3 || crossing) {
              throw new Error(
                'Tag at least three corners without crossing the boundary.',
              );
            }
            Alert.alert(
              'Boundary area',
              `${area.toFixed(2)} m² · ${(area / 10000).toFixed(4)} ha`,
            );
          }}
        />
        <Button
          title="Save geo-fence to survey log"
          icon="content-save-outline"
          onPress={async () => {
            if (points.length < 3 || area < 1 || crossing) {
              throw new Error(
                'A valid boundary needs at least three corners and no crossing edges.',
              );
            }
            await commit(`Boundary saved · Khasra ${land.plot}`, st => ({
              ...st,
              surveys: [
                {
                  id: createId('SUR'),
                  landId,
                  points: [...points],
                  areaSqm: area,
                  source,
                  createdAt: new Date().toISOString(),
                },
                ...st.surveys,
              ],
              drafts: { ...st.drafts, [`map-${landId}`]: {} },
            }));
            setPoints([]);
            setSelected(-1);
            Alert.alert(
              'Survey saved',
              'The geo-fence is in the survey log and local sync queue.',
            );
          }}
        />
      </Card>
      <Text style={s.heading}>Survey log</Text>
      {!state.surveys.length && (
        <Empty
          title="No surveys saved yet"
          body="Your saved boundaries can be reopened here, including when offline."
        />
      )}
      {state.surveys.map(survey => (
        <Card key={survey.id}>
          <Text style={s.heading}>
            Khasra #{state.lands.find(l => l.id === survey.landId)?.plot}
          </Text>
          <Text style={s.body}>
            {(survey.areaSqm / 10000).toFixed(4)} ha · {survey.points.length}{' '}
            corners · {survey.source}
          </Text>
          <Text style={s.muted}>
            {new Date(survey.createdAt).toLocaleString('en-IN')}
          </Text>
          <Button
            title="Load boundary"
            tone="soft"
            onPress={() => {
              setLandId(survey.landId);
              setPoints(survey.points);
              setSource(survey.source);
              setSelected(0);
            }}
          />
        </Card>
      ))}
    </Screen>
  );
}

export default function FieldMapScreen(props: BottomTabScreenProps<DeskTabs, 'FieldMap'>) {
  const {state} = useDesk();
  if (!state.lands.length) { return <NoLandRecords title="GPS mapping" />; }
  return <FieldMapScreenContent {...props} />;
}
