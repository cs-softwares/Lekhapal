import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
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
import { money } from '../../domain/desk';
import { Certificate } from '../../types';
export default function CertificateScreen() {
  const { state, commit, saveDraft } = useDesk();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<string>();
  const [notes, setNotes] = useState('');
  const [income, setIncome] = useState('');
  const [family, setFamily] = useState('');
  const draftError = useDeskDraft(
    `certificate-${selected}`,
    { notes, income, family },
    !!selected,
  );
  const item = state.certificates.find(c => c.id === selected);
  const land = state.lands.find(l => l.id === item?.landId);
  const list = state.certificates.filter(
    c =>
      (filter === 'All' || c.status === filter) &&
      `${c.id} ${c.name}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const decide = async (status: Certificate['status']) => {
    if (!item) {
      return;
    }
    if (notes.trim().length < 10) {
      throw new Error(
        'Record verification findings in at least 10 characters.',
      );
    }
    const n = Number(income),
      f = Number(family);
    if (
      !income.trim() ||
      !family.trim() ||
      !Number.isFinite(n) ||
      n < 0 ||
      !Number.isInteger(f) ||
      f < 1 ||
      f > 50
    ) {
      throw new Error('Enter valid annual income and family size (1–50).');
    }
    await commit(`Certificate ${status.toLowerCase()} · ${item.id}`, st => ({
      ...st,
      certificates: st.certificates.map(c =>
        c.id === item.id
          ? { ...c, status, reason: notes.trim(), income: n, family: f }
          : c,
      ),
    }));
    setSelected(undefined);
  };
  return (
    <Screen
      title="Certificate verification"
      subtitle="Aay · Jati · Niwas verification desk"
    >
      <Field
        label="Application ID or applicant name"
        placeholder="APP-2026-4101"
        value={query}
        onChangeText={setQuery}
      />
      <Choices
        items={['All', 'Pending', 'Recommended', 'Re-verification', 'Rejected']}
        value={filter}
        onChange={setFilter}
      />
      <Text style={s.muted}>
        Local demo portal · {list.length} matching applications
      </Text>
      {!list.length && (
        <Empty
          title="No applications found"
          body="Try APP-2026-4101 or clear the current filter."
        />
      )}
      {list.map(c => (
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          key={c.id}
          onPress={() => {
            setSelected(c.id);
            const draft = state.drafts[`certificate-${c.id}`];
            setNotes(draft?.notes || c.reason || '');
            setIncome(draft?.income || String(c.income));
            setFamily(draft?.family || String(c.family));
          }}
        >
          <Card>
            <View style={s.row}>
              <Text style={[s.heading, s.grow]}>{c.name}</Text>
              <Badge text={c.type} />
            </View>
            <Text style={s.muted}>{c.id}</Text>
            <Badge
              text={c.status}
              tone={
                c.status === 'Recommended'
                  ? 'green'
                  : c.status === 'Rejected'
                  ? 'red'
                  : 'amber'
              }
            />
          </Card>
        </TouchableOpacity>
      ))}
      <Sheet
        visible={!!item}
        title="Applicant verification sheet"
        onClose={() => setSelected(undefined)}
      >
        {item && (
          <>
            <Card>
              <Badge text={`${item.type} certificate`} />
              <Text style={s.heading}>{item.name}</Text>
              <Text style={s.muted}>{item.id}</Text>
              <Detail label="Address" value={item.address} />
              <Detail
                label="Declared family income"
                value={`${money(item.income)} / year`}
              />
              <Detail
                label="Land assets"
                value={
                  land
                    ? `Khasra ${land.plot} · ${land.hectares} ha · ${land.owners
                        .map(o => o.name)
                        .join(', ')}`
                    : 'No linked land holding declared'
                }
              />
            </Card>
            {!!draftError && <Text style={s.muted}>{draftError}</Text>}
            <Field
              label="Verified annual family income (₹)"
              keyboardType="number-pad"
              value={income}
              onChangeText={setIncome}
            />
            <Field
              label="Family members"
              keyboardType="number-pad"
              value={family}
              onChangeText={setFamily}
            />
            <Field
              label="Verification findings / rejection reason"
              multiline
              placeholder="Record household, asset and document findings…"
              value={notes}
              onChangeText={setNotes}
            />
            {['Pending', 'Re-verification'].includes(item.status) ? (
              <>
                <Button
                  title="Save verification draft"
                  tone="soft"
                  onPress={() =>
                    saveDraft(`certificate-${selected}`, {
                      notes,
                      income,
                      family,
                    })
                  }
                />
                <Button
                  title="Recommend approval to Tehsildar"
                  onPress={() => decide('Recommended')}
                />
                <Button
                  title="Mark for physical re-verification"
                  tone="soft"
                  onPress={() => decide('Re-verification')}
                />
                <Button
                  title="Reject application"
                  tone="danger"
                  onPress={() => decide('Rejected')}
                />
              </>
            ) : (
              <Card>
                <Text style={s.heading}>{item.status}</Text>
                <Text style={s.body}>{item.reason}</Text>
              </Card>
            )}
          </>
        )}
      </Sheet>
    </Screen>
  );
}
