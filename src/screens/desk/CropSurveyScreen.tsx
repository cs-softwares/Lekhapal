import NoLandRecords from '../../components/desk/NoLandRecords';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
import { useDesk } from '../../context/DeskContext';
import { deskStyles as s } from '../../theme';
import { DeskTabs } from '../../navigation/deskTypes';
import { createId, money, reliefPayout } from '../../domain/desk';
import { PhotoProof } from '../../types';
function CropSurveyScreenContent({
  route,
}: BottomTabScreenProps<DeskTabs, 'CropSurvey'>) {
  const { state, commit, saveDraft } = useDesk();
  const draft = state.drafts.crop || {};
  const [landId, setLandId] = useState(
    route.params?.landId || draft.landId || state.lands[0].id,
  );
  const [season, setSeason] = useState(draft.season || 'Kharif');
  const [crop, setCrop] = useState(draft.crop || 'Paddy');
  const [disaster, setDisaster] = useState(draft.disaster || 'Unseasonal Rain');
  const [loss, setLoss] = useState(draft.loss || '35');
  const [hectares, setHectares] = useState(
    draft.hectares || String(state.lands.find(l => l.id === landId)!.hectares),
  );
  const [photo, setPhoto] = useState<PhotoProof | undefined>(() => {
    try {
      return draft.photo ? JSON.parse(draft.photo) : undefined;
    } catch {
      return undefined;
    }
  });
  const land = state.lands.find(l => l.id === landId)!;
  const landsRef = useRef(state.lands);
  landsRef.current = state.lands;
  useEffect(() => {
    if (route.params?.landId) {
      setLandId(route.params.landId);
      setHectares(
        String(
          landsRef.current.find(l => l.id === route.params?.landId)!.hectares,
        ),
      );
      setPhoto(undefined);
    }
  }, [route.params?.landId]);
  const draftData = useMemo(
    () => ({
      landId,
      season,
      crop,
      disaster,
      loss,
      hectares,
      photo: photo ? JSON.stringify(photo) : '',
    }),
    [landId, season, crop, disaster, loss, hectares, photo],
  );
  const [draftError, setDraftError] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      void saveDraft('crop', draftData).catch(() =>
        setDraftError('Draft could not be saved. Use Save draft to retry.'),
      );
    }, 450);
    return () => clearTimeout(timer);
  }, [draftData, saveDraft]);
  let payout = 0,
    valid = true;
  try {
    if (!loss.trim() || !hectares.trim()) {
      throw new Error();
    }
    payout = reliefPayout(
      Number(hectares),
      Number(loss),
      state.settings.reliefRate,
    );
    if (Number(hectares) > land.hectares) {
      valid = false;
    }
  } catch {
    valid = false;
  }
  return (
    <Screen
      title="Girdawari & relief"
      subtitle="Seasonal crop inspection and damage assessment"
    >
      <Text style={s.label}>LAND HOLDING</Text>
      <Choices
        items={state.lands.map(l => `Khasra ${l.plot}`)}
        value={`Khasra ${land.plot}`}
        onChange={label => {
          const l = state.lands.find(x => `Khasra ${x.plot}` === label)!;
          setLandId(l.id);
          setHectares(String(l.hectares));
          setPhoto(undefined);
        }}
      />
      <Card>
        <Text style={s.heading}>Seasonal inspection</Text>
        <Choices
          items={['Rabi', 'Kharif', 'Zaid']}
          value={season}
          onChange={value => {
            setSeason(value);
            setCrop(
              value === 'Rabi'
                ? 'Wheat'
                : value === 'Kharif'
                ? 'Paddy'
                : 'Moong',
            );
          }}
        />
        <Field label="Crop name" value={crop} onChangeText={setCrop} />
        <Detail
          label="Landowner"
          value={land.owners.map(o => o.name).join(', ')}
        />
      </Card>
      <Card>
        <Text style={s.heading}>Damage assessment</Text>
        <Choices
          items={['Unseasonal Rain', 'Hailstorm', 'Flood', 'Drought']}
          value={disaster}
          onChange={setDisaster}
        />
        <Field
          label="Affected area (hectares)"
          keyboardType="decimal-pad"
          value={hectares}
          onChangeText={setHectares}
        />
        <Field
          label="Estimated loss (%)"
          keyboardType="decimal-pad"
          value={loss}
          onChangeText={setLoss}
        />
        <View
          style={{
            backgroundColor: '#E6F6EF',
            padding: 18,
            borderRadius: 12,
            gap: 8,
          }}
        >
          <Text style={s.label}>ESTIMATED DEMO RELIEF</Text>
          <Text style={{ fontSize: 32, fontWeight: '800', color: '#08734E' }}>
            {valid ? money(payout) : 'Check inputs'}
          </Text>
          <Text style={s.muted}>
            {money(state.settings.reliefRate)} / ha × affected area × loss %
          </Text>
        </View>
        <Text style={s.muted}>
          Illustrative rate, not a notified government entitlement. Configure
          the local demo rate in Settings. Area cannot exceed {land.hectares}{' '}
          ha.
        </Text>
      </Card>
      <Card>
        <Text style={s.heading}>Photo evidence</Text>
        <View
          style={{
            height: 180,
            borderRadius: 12,
            backgroundColor: '#DCECDF',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <Icon name="sprout" size={75} color="#40814D" />
          <Text style={{ color: '#285D37', fontSize: 13, fontWeight: '700' }}>
            FIELD CAPTURE SIMULATION
          </Text>
          {photo && (
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#10291DEB',
                padding: 10,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 11 }}>
                {new Date(photo.createdAt).toLocaleString('en-IN')}
                {'\n'}GPS {photo.location.latitude.toFixed(6)},{' '}
                {photo.location.longitude.toFixed(6)} · DEMO
              </Text>
            </View>
          )}
        </View>
        <Text style={s.muted}>
          Simulated photo proof uses this holding’s registered coordinates. It
          is not live camera evidence.
        </Text>
        <Button
          title={
            photo ? 'Retake simulated photo' : 'Capture simulated photo proof'
          }
          icon="camera-outline"
          tone="soft"
          onPress={() =>
            setPhoto({
              id: createId('PHOTO'),
              createdAt: new Date().toISOString(),
              location: land.location,
              simulated: true,
            })
          }
        />
      </Card>
      {draftError && <Text style={{ color: '#B91C1C' }}>{draftError}</Text>}
      <Button
        title="Save assessment draft"
        tone="soft"
        onPress={async () => {
          await saveDraft('crop', draftData);
          setDraftError('');
          Alert.alert('Draft saved', 'You can continue this assessment later.');
        }}
      />
      <Button
        title="Submit crop inspection"
        icon="check"
        onPress={async () => {
          if (!valid || crop.trim().length < 2 || !photo) {
            throw new Error(
              'Enter a crop, valid area and loss (0–100%), and capture photo proof.',
            );
          }
          await commit(`Crop inspection · Khasra ${land.plot}`, st => ({
            ...st,
            crops: [
              {
                id: createId('CROP'),
                landId,
                season,
                crop: crop.trim(),
                disaster,
                loss: Number(loss),
                hectares: Number(hectares),
                payout,
                photo,
                createdAt: new Date().toISOString(),
              },
              ...st.crops,
            ],
          }));
          Alert.alert(
            'Inspection saved',
            'The report and evidence have been added to your local field log.',
          );
          setPhoto(undefined);
        }}
      />
      <Text style={s.heading}>Inspection log</Text>
      {!state.crops.length && (
        <Empty
          title="No inspections submitted"
          body="Completed reports and estimated relief appear here."
        />
      )}
      {state.crops.map(r => (
        <Card key={r.id}>
          <View style={s.row}>
            <Text style={[s.heading, s.grow]}>
              {r.crop} · {r.season}
            </Text>
            <Badge text={money(r.payout)} tone="green" />
          </View>
          <Text style={s.body}>
            Khasra #{state.lands.find(l => l.id === r.landId)?.plot} ·{' '}
            {r.hectares} ha · {r.loss}% loss
          </Text>
          <Text style={s.muted}>
            {r.disaster} · {new Date(r.createdAt).toLocaleDateString('en-IN')}
          </Text>
          <Text style={s.muted}>
            Evidence captured{' '}
            {new Date(r.photo.createdAt).toLocaleString('en-IN')}
            {'\n'}
            {r.photo.location.latitude.toFixed(6)},{' '}
            {r.photo.location.longitude.toFixed(6)} · Simulated
          </Text>
        </Card>
      ))}
    </Screen>
  );
}

export default function CropSurveyScreen(props: BottomTabScreenProps<DeskTabs, 'CropSurvey'>) {
  const {state} = useDesk();
  if (!state.lands.length) { return <NoLandRecords title="Crop inspections" />; }
  return <CropSurveyScreenContent {...props} />;
}
