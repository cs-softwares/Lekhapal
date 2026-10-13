import React, { useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, Text, View } from 'react-native';
import {
  Screen,
  Card,
  Field,
  Choices,
  Badge,
  Button,
  Detail,
  Empty,
  Sheet,
} from '../../components/desk/Kit';
import { useDeskDraft } from '../../hooks/useDeskDraft';
import {
  BoundaryMap,
  BoundaryMapHandle,
} from '../../components/desk/BoundaryMap';
import { useDesk } from '../../context/DeskContext';
import { deskStyles as s } from '../../theme';
import { createId, validPoint } from '../../domain/desk';
import { Incident } from '../../types';
import { exportSummaryAsPdf } from '../../utils/workspaceExport';
export default function EncroachmentScreen() {
  const { state, commit, saveDraft } = useDesk();
  const draft = state.drafts.incident || {};
  const [publicId, setPublicId] = useState<string>();
  const [violator, setViolator] = useState(draft.violator || '');
  const [details, setDetails] = useState(draft.details || '');
  const [latitude, setLatitude] = useState(draft.latitude || '');
  const [longitude, setLongitude] = useState(draft.longitude || '');
  const [filter, setFilter] = useState('All cases');
  const map = useRef<BoundaryMapHandle>(null);
  const draftError = useDeskDraft(
    'incident',
    { publicId: publicId || '', violator, details, latitude, longitude },
    !!publicId,
  );
  const land = state.publicLands.find(l => l.id === publicId);
  const save = () =>
    saveDraft('incident', {
      publicId: publicId || '',
      violator,
      details,
      latitude,
      longitude,
    });
  const update = async (incident: Incident, status: Incident['status']) =>
    commit(`Encroachment ${status.toLowerCase()} · ${incident.id}`, st => ({
      ...st,
      incidents: st.incidents.map(i =>
        i.id === incident.id
          ? {
              ...i,
              status,
              ...(status === 'Notice issued'
                ? { noticeAt: new Date().toISOString() }
                : {}),
            }
          : i,
      ),
    }));
  return (
    <Screen
      title="Gram Sabha land"
      subtitle="Public land register & encroachment protection"
    >
      <Text style={s.heading}>Protected land register</Text>
      {state.publicLands.map(l => (
        <Card key={l.id}>
          <View style={s.row}>
            <Text style={[s.heading, s.grow]}>{l.kind}</Text>
            <Badge text={`${l.hectares} ha`} tone="green" />
          </View>
          <Text style={s.muted}>
            Khasra #{l.plot} · {l.village}
          </Text>
          <Text style={s.body}>
            {
              state.incidents.filter(
                i => i.publicLandId === l.id && i.status !== 'Resolved',
              ).length
            }{' '}
            active incidents
          </Text>
          <Button
            title={`Report encroachment · #${l.plot}`}
            tone="soft"
            icon="flag-outline"
            onPress={() => {
              setPublicId(l.id);
              if (draft.publicId === l.id) {
                setViolator(draft.violator || '');
                setDetails(draft.details || '');
                setLatitude(draft.latitude || '');
                setLongitude(draft.longitude || '');
              } else {
                setViolator('');
                setDetails('');
                setLatitude('');
                setLongitude('');
              }
            }}
          />
        </Card>
      ))}
      <Text style={s.heading}>Case tracking</Text>
      <Choices
        items={['All cases', 'Active', 'Resolved']}
        value={filter}
        onChange={setFilter}
      />
      {!state.incidents.length && (
        <Empty
          title="No encroachment cases"
          body="Report an incident against a public land parcel to begin case tracking."
        />
      )}
      {state.incidents
        .filter(
          i =>
            filter === 'All cases' ||
            (filter === 'Resolved'
              ? i.status === 'Resolved'
              : i.status !== 'Resolved'),
        )
        .map(i => (
          <Card key={i.id}>
            <Badge
              text={i.status}
              tone={i.status === 'Resolved' ? 'green' : 'amber'}
            />
            <Text style={s.heading}>{i.violator}</Text>
            <Text style={s.muted}>
              {i.id} · Khasra #
              {state.publicLands.find(l => l.id === i.publicLandId)?.plot}
            </Text>
            <Text style={s.body}>{i.details}</Text>
            <Detail
              label="Tagged coordinates"
              value={`${i.location.latitude.toFixed(
                6,
              )}, ${i.location.longitude.toFixed(6)}`}
            />
            {i.status === 'Reported' && (
              <Button
                title="Generate eviction notice"
                onPress={() => update(i, 'Notice issued')}
              />
            )}
            {i.noticeAt && (
              <>
                <Text style={s.muted}>
                  Notice issued {new Date(i.noticeAt).toLocaleString('en-IN')}
                </Text>
                <Button
                  title="Export eviction notice PDF"
                  tone="soft"
                  onPress={() =>
                    exportSummaryAsPdf({
                      fileName: i.id,
                      title: 'Eviction notice · DEMO DRAFT',
                      summaryLines: [
                        `Case ${i.id}`,
                        `Respondent: ${i.violator}`,
                        `Parcel: ${
                          state.publicLands.find(l => l.id === i.publicLandId)
                            ?.plot
                        }`,
                        `Findings: ${i.details}`,
                        `Coordinates: ${i.location.latitude}, ${i.location.longitude}`,
                        `Issued: ${i.noticeAt}`,
                        'Draft for officer review. Not a legally served or signed notice.',
                      ],
                    })
                  }
                />
              </>
            )}
            {i.status === 'Notice issued' && (
              <Button
                title="Schedule physical inspection"
                tone="soft"
                onPress={() => update(i, 'Inspection scheduled')}
              />
            )}
            {i.status === 'Inspection scheduled' && (
              <Button
                title="Mark case resolved"
                onPress={() => update(i, 'Resolved')}
              />
            )}
          </Card>
        ))}
      <Sheet
        visible={!!publicId}
        title="Encroachment incident report"
        onClose={() => {
          void save().catch(() =>
            Alert.alert('Draft not saved', 'Please retry saving your draft.'),
          );
          setPublicId(undefined);
        }}
      >
        {land && (
          <>
            <Badge text={`Khasra #${land.plot} · ${land.kind}`} />
            {!!draftError && <Text style={s.muted}>{draftError}</Text>}
            <Field
              label="Violator full name / entity"
              value={violator}
              onChangeText={setViolator}
            />
            <Field
              label="Incident details & observed occupation"
              multiline
              value={details}
              onChangeText={setDetails}
            />
            <View style={{ height: 220, borderRadius: 12, overflow: 'hidden' }}>
              <BoundaryMap
                ref={map}
                center={land.location}
                points={
                  latitude.trim() &&
                  longitude.trim() &&
                  validPoint({
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                  })
                    ? [
                        {
                          latitude: Number(latitude),
                          longitude: Number(longitude),
                        },
                      ]
                    : []
                }
                satellite={false}
                online={state.online}
                onPoint={p => {
                  setLatitude(String(p.latitude));
                  setLongitude(String(p.longitude));
                }}
                onGps={p => {
                  setLatitude(String(p.latitude));
                  setLongitude(String(p.longitude));
                }}
                onError={message => Alert.alert('Location', message)}
              />
            </View>
            <Button
              title="Tag live GPS location"
              tone="soft"
              onPress={async () => {
                if (Platform.OS === 'android') {
                  const result = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                  );
                  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
                    throw new Error(
                      'Allow location access or enter coordinates manually.',
                    );
                  }
                }
                map.current?.locate();
              }}
            />
            <Button
              title="Tag registered parcel coordinates"
              tone="soft"
              icon="map-marker"
              onPress={() => {
                setLatitude(String(land.location.latitude));
                setLongitude(String(land.location.longitude));
              }}
            />
            <Text style={s.muted}>
              Use the registered location or enter coordinates from your field
              GPS.
            </Text>
            <Field
              label="Incident latitude"
              value={latitude}
              keyboardType="numbers-and-punctuation"
              onChangeText={setLatitude}
            />
            <Field
              label="Incident longitude"
              value={longitude}
              keyboardType="numbers-and-punctuation"
              onChangeText={setLongitude}
            />
            <Button
              title="Save incident draft"
              tone="soft"
              onPress={async () => {
                await save();
                Alert.alert('Draft saved');
              }}
            />
            <Button
              title="Submit incident report"
              onPress={async () => {
                const location = {
                  latitude: Number(latitude),
                  longitude: Number(longitude),
                };
                if (
                  violator.trim().length < 3 ||
                  details.trim().length < 10 ||
                  !latitude.trim() ||
                  !longitude.trim() ||
                  !validPoint(location)
                ) {
                  throw new Error(
                    'Enter a violator, at least 10 characters of details, and valid coordinates.',
                  );
                }
                await commit(
                  `Encroachment reported · Khasra ${land.plot}`,
                  st => ({
                    ...st,
                    incidents: [
                      {
                        id: createId('CASE'),
                        publicLandId: land.id,
                        violator: violator.trim(),
                        details: details.trim(),
                        location,
                        createdAt: new Date().toISOString(),
                        status: 'Reported',
                      },
                      ...st.incidents,
                    ],
                    drafts: { ...st.drafts, incident: {} },
                  }),
                );
                setPublicId(undefined);
                setViolator('');
                setDetails('');
              }}
            />
          </>
        )}
      </Sheet>
    </Screen>
  );
}
