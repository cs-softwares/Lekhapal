import NoLandRecords from '../../components/desk/NoLandRecords';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
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
  Sheet,
} from '../../components/desk/Kit';
import { useDeskDraft } from '../../hooks/useDeskDraft';
import { useDesk } from '../../context/DeskContext';
import { deskStyles as s } from '../../theme';
import { DeskTabs } from '../../navigation/deskTypes';
import { createId, decideMutation } from '../../domain/desk';
import { Mutation, MutationStatus } from '../../types';
import { exportSummaryAsPdf } from '../../utils/workspaceExport';
function MutationScreenContent({
  route,
  navigation,
}: BottomTabScreenProps<DeskTabs, 'Mutations'>) {
  const { state, commit, saveDraft } = useDesk();
  const draft = state.drafts.mutation || {};
  const [status, setStatus] = useState<MutationStatus>(
    route.params?.status || 'Pending',
  );
  const [selected, setSelected] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [document, setDocument] = useState(false);
  const [reason, setReason] = useState('');
  const [landId, setLandId] = useState(draft.landId || state.lands[0].id);
  const [buyer, setBuyer] = useState(draft.buyer || '');
  const [seller, setSeller] = useState(
    draft.seller || state.lands[0].owners[0].name,
  );
  const [category, setCategory] = useState<Mutation['category']>(
    (draft.category as Mutation['category']) || 'Registry Sale',
  );
  const [share, setShare] = useState(draft.share || '100');
  const landsRef = useRef(state.lands);
  landsRef.current = state.lands;
  useEffect(() => {
    if (route.params?.status) {
      setStatus(route.params.status);
    }
    if (route.params?.create) {
      const l = landsRef.current.find(x => x.id === route.params?.landId);
      if (l) {
        setLandId(l.id);
        setSeller(l.owners[0].name);
        setShare(String(l.owners[0].share));
      }
      setCreating(true);
      navigation.setParams({ create: false });
    }
  }, [route.params, navigation]);
  const draftError = useDeskDraft(
    'mutation',
    { landId, buyer, seller, category, share },
    creating,
  );
  const record = state.mutations.find(m => m.id === selected);
  const land = state.lands.find(l => l.id === record?.landId);
  const list = state.mutations.filter(
    m =>
      m.status === status &&
      (!route.params?.landId || m.landId === route.params.landId),
  );
  const save = () =>
    saveDraft('mutation', { landId, buyer, seller, category, share });
  const decide = async (next: MutationStatus) => {
    if (!record) {
      return;
    }
    await commit(`Mutation ${next.toLowerCase()} · ${record.id}`, st =>
      decideMutation(st, record.id, next, reason),
    );
    setSelected(undefined);
    setStatus(next);
    setReason('');
  };
  return (
    <Screen
      title="Dakhil-Kharij desk"
      subtitle="Review transfers. Protect every ownership share."
    >
      <Button
        title="New mutation application"
        icon="plus"
        onPress={() => setCreating(true)}
      />
      <Choices
        items={['Pending', 'Objections', 'Approved', 'Rejected'] as const}
        value={status}
        onChange={setStatus}
      />
      {route.params?.landId && (
        <Button
          title="Show all land holdings"
          tone="soft"
          onPress={() => navigation.setParams({ landId: undefined })}
        />
      )}
      <Text style={s.label}>
        {list.length} {status.toUpperCase()} APPLICATIONS
      </Text>
      {!list.length && (
        <Empty
          title={`No ${status.toLowerCase()} applications`}
          body="Applications move between these queues as you issue notices and record decisions."
        />
      )}
      {list.map(m => (
        <TouchableOpacity
          accessibilityRole="button"
          key={m.id}
          activeOpacity={0.7}
          onPress={() => {
            setSelected(m.id);
            setReason('');
          }}
        >
          <Card>
            <View style={s.row}>
              <Text style={[s.heading, s.grow]}>{m.buyer}</Text>
              <Badge
                text={m.status}
                tone={
                  m.status === 'Approved'
                    ? 'green'
                    : m.status === 'Rejected'
                    ? 'red'
                    : 'amber'
                }
              />
            </View>
            <Text style={s.muted}>
              {m.id} · {m.category}
            </Text>
            <Detail label="Transfer from" value={m.seller} />
            <Text style={s.body}>
              Khasra #{state.lands.find(l => l.id === m.landId)?.plot} ·{' '}
              {m.transferShare}% share
            </Text>
            <Text style={s.muted}>
              {m.noticeAt
                ? `Notice issued ${new Date(m.noticeAt).toLocaleDateString(
                    'en-IN',
                  )}`
                : 'Public notice not yet issued'}{' '}
              →
            </Text>
          </Card>
        </TouchableOpacity>
      ))}
      <Sheet
        visible={!!record}
        title="Mutation inspection"
        onClose={() => {
          setSelected(undefined);
          setDocument(false);
        }}
      >
        {record && (
          <>
            <Badge text={`${record.id} · ${record.status}`} tone="amber" />
            <Card>
              <Text style={s.heading}>{record.category}</Text>
              <Detail label="Buyer" value={record.buyer} />
              <Badge
                text={
                  record.buyerVerified
                    ? 'Aadhaar check · Demo verified'
                    : 'Buyer identity check required'
                }
                tone={record.buyerVerified ? 'green' : 'amber'}
              />
              <Detail label="Seller" value={record.seller} />
              <Badge
                text={
                  record.sellerVerified
                    ? 'Aadhaar check · Demo verified'
                    : 'Seller identity check required'
                }
                tone={record.sellerVerified ? 'green' : 'amber'}
              />
              <Detail
                label="Holding"
                value={`Khasra ${land?.plot} · Khata ${land?.khata}`}
              />
              <Detail
                label="Transfer share"
                value={`${record.transferShare}%`}
              />
              <Text style={s.muted}>
                Identity badges represent local verification checks, not a live
                UIDAI response.
              </Text>
            </Card>
            <Button
              title={
                document
                  ? 'Hide registry document'
                  : 'Preview registry document'
              }
              tone="soft"
              icon="file-document-outline"
              onPress={() => setDocument(!document)}
            />
            {document && (
              <Card>
                <Badge text="SIMULATED REGISTRY DOCUMENT" />
                <Text style={s.heading}>Deed of {record.category}</Text>
                <Text style={s.body}>
                  Applicant: {record.buyer}
                  {'\n'}Transferor: {record.seller}
                  {'\n'}Parcel: Khasra {land?.plot}
                  {'\n'}Share: {record.transferShare}%{'\n'}Filed:{' '}
                  {new Date(record.filedAt).toLocaleDateString('en-IN')}
                </Text>
                <Text style={s.muted}>
                  Demo registry preview. No original deed or legal signature is
                  attached.
                </Text>
                <Button
                  title="Export preview PDF"
                  tone="soft"
                  onPress={() =>
                    exportSummaryAsPdf({
                      fileName: record.id,
                      title: 'Registry preview · DEMO',
                      summaryLines: [
                        record.category,
                        `Buyer: ${record.buyer}`,
                        `Seller: ${record.seller}`,
                        `Khasra: ${land?.plot}`,
                        `Share: ${record.transferShare}%`,
                        'SIMULATION — Not an original registry document.',
                      ],
                    })
                  }
                />
              </Card>
            )}
            {record.objection && (
              <Card>
                <Badge text="Objection on file" tone="red" />
                <Text style={s.body}>{record.objection}</Text>
              </Card>
            )}
            {['Pending', 'Objections'].includes(record.status) ? (
              <>
                <Field
                  label="Decision / objection resolution notes"
                  multiline
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Document evidence and the legal reason…"
                />
                {(!record.buyerVerified || !record.sellerVerified) && (
                  <Button
                    title="Record identity verification (demo)"
                    tone="soft"
                    onPress={async () => {
                      if (reason.trim().length < 10) {
                        throw new Error(
                          'Enter verification evidence in the notes first.',
                        );
                      }
                      await commit(
                        `Identity checks recorded · ${record.id}`,
                        st => ({
                          ...st,
                          mutations: st.mutations.map(m =>
                            m.id === record.id
                              ? {
                                  ...m,
                                  buyerVerified: true,
                                  sellerVerified: true,
                                  reason,
                                }
                              : m,
                          ),
                        }),
                      );
                    }}
                  />
                )}
                {record.status === 'Objections' && (
                  <Button
                    title="Resolve objection & return to pending"
                    tone="soft"
                    onPress={async () => {
                      if (reason.trim().length < 10) {
                        throw new Error(
                          'Document the resolution in at least 10 characters.',
                        );
                      }
                      await commit(`Objection resolved · ${record.id}`, st => ({
                        ...st,
                        mutations: st.mutations.map(m =>
                          m.id === record.id
                            ? {
                                ...m,
                                status: 'Pending',
                                objection: undefined,
                                reason,
                                noticeAt: undefined,
                              }
                            : m,
                        ),
                      }));
                      setStatus('Pending');
                    }}
                  />
                )}
                {record.noticeAt ? (
                  <Card>
                    <Text style={s.body}>
                      Notice period ends{' '}
                      {new Date(
                        Date.parse(record.noticeAt) + 15 * 86400000,
                      ).toLocaleDateString('en-IN')}
                    </Text>
                    <Text style={s.muted}>
                      {Math.max(
                        0,
                        Math.ceil(
                          (Date.parse(record.noticeAt) +
                            15 * 86400000 -
                            Date.now()) /
                            86400000,
                        ),
                      )}{' '}
                      days remaining
                    </Text>
                  </Card>
                ) : (
                  <Button
                    title="Issue public notice (15 days)"
                    tone="soft"
                    onPress={() =>
                      commit(`Public notice issued · ${record.id}`, st => ({
                        ...st,
                        mutations: st.mutations.map(m =>
                          m.id === record.id
                            ? { ...m, noticeAt: new Date().toISOString() }
                            : m,
                        ),
                      }))
                    }
                  />
                )}
                <Button
                  title="Approve & update Khatauni"
                  icon="check-decagram"
                  onPress={() => decide('Approved')}
                />
                <Button
                  title="Reject with legal reason"
                  tone="danger"
                  onPress={() => decide('Rejected')}
                />
              </>
            ) : (
              <Card>
                <Text style={s.heading}>Decision recorded</Text>
                <Text style={s.body}>
                  {record.reason ||
                    'Ownership transfer approved and Khatauni updated.'}
                </Text>
              </Card>
            )}
          </>
        )}
      </Sheet>
      <Sheet
        visible={creating}
        title="New mutation application"
        onClose={() => {
          void save().catch(() =>
            Alert.alert('Draft not saved', 'Please retry.'),
          );
          setCreating(false);
        }}
      >
        {!!draftError && <Text style={s.muted}>{draftError}</Text>}
        <Text style={s.label}>SELECT HOLDING</Text>
        <Choices
          items={state.lands.map(l => `Khasra ${l.plot}`)}
          value={`Khasra ${state.lands.find(l => l.id === landId)!.plot}`}
          onChange={id => {
            const l = state.lands.find(x => `Khasra ${x.plot}` === id)!;
            setLandId(l.id);
            setSeller(l.owners[0].name);
            setShare(String(l.owners[0].share));
          }}
        />
        <Field
          label="Buyer / beneficiary full name"
          value={buyer}
          onChangeText={setBuyer}
          onBlur={() => void save().catch(() => {})}
        />
        <Text style={s.label}>TRANSFEROR</Text>
        <Choices
          items={state.lands
            .find(l => l.id === landId)!
            .owners.map(o => o.name)}
          value={seller}
          onChange={name => {
            setSeller(name);
            setShare(
              String(
                state.lands
                  .find(l => l.id === landId)!
                  .owners.find(o => o.name === name)!.share,
              ),
            );
          }}
        />
        <Field
          label="Share to transfer (%)"
          keyboardType="decimal-pad"
          value={share}
          onChangeText={setShare}
        />
        <Choices
          items={['Registry Sale', 'Inheritance', 'Gift Deed'] as const}
          value={category}
          onChange={setCategory}
        />
        <Button
          title="Save application draft"
          tone="soft"
          onPress={async () => {
            await save();
            Alert.alert(
              'Draft saved',
              'Your application can be continued later.',
            );
          }}
        />
        <Button
          title="File mutation application"
          onPress={async () => {
            const n = Number(share);
            const owner = state.lands
              .find(l => l.id === landId)
              ?.owners.find(o => o.name === seller);
            if (
              buyer.trim().length < 3 ||
              buyer.trim() === seller ||
              !owner ||
              !Number.isFinite(n) ||
              n <= 0 ||
              n > owner.share
            ) {
              throw new Error(
                'Enter a different beneficiary and a valid share within the seller’s holding.',
              );
            }
            const id = createId('MUT');
            await commit(`Mutation filed · ${buyer.trim()}`, st => ({
              ...st,
              mutations: [
                {
                  id,
                  landId,
                  buyer: buyer.trim(),
                  seller,
                  category,
                  transferShare: n,
                  buyerVerified: false,
                  sellerVerified: false,
                  status: 'Pending',
                  filedAt: new Date().toISOString(),
                },
                ...st.mutations,
              ],
              drafts: { ...st.drafts, mutation: {} },
            }));
            setCreating(false);
            setBuyer('');
            setStatus('Pending');
            navigation.setParams({ landId: undefined });
            setSelected(id);
          }}
        />
      </Sheet>
    </Screen>
  );
}

export default function MutationScreen(props: BottomTabScreenProps<DeskTabs, 'Mutations'>) {
  const {state} = useDesk();
  if (!state.lands.length) { return <NoLandRecords title="Mutations" />; }
  return <MutationScreenContent {...props} />;
}
