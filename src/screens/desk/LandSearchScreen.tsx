import React, { useEffect, useState } from 'react';
import { Linking, Share, Text, TouchableOpacity, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
import { deskStyles as s, theme } from '../../theme';
import { DeskTabs } from '../../navigation/deskTypes';
import { exportSummaryAsPdf } from '../../utils/workspaceExport';
export default function LandSearchScreen({
  navigation,
  route,
}: BottomTabScreenProps<DeskTabs, 'LandSearch'>) {
  const { state, commit } = useDesk();
  const [query, setQuery] = useState(route.params?.query || '');
  const [filter, setFilter] = useState('All records');
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    if (route.params?.query !== undefined) {
      setQuery(route.params.query);
    }
  }, [route.params?.query]);
  const q = query.trim().toLowerCase().replace(/^#/, '');
  const records = state.lands.filter(l =>
    (filter === 'Plot number'
      ? l.plot
      : filter === 'Khata number'
      ? l.khata
      : filter === 'Owner name'
      ? l.owners.map(o => o.name).join(' ')
      : [l.plot, l.khata, l.village, ...l.owners.map(o => o.name)].join(' ')
    )
      .toLowerCase()
      .includes(q),
  );
  return (
    <Screen title="Revenue records" subtitle="Khatauni & Khasra · Sadar Tehsil">
      <Field
        label="Search land records"
        placeholder="Plot, khata number or landowner name"
        value={query}
        onChangeText={setQuery}
      />
      <Choices
        items={['All records', 'Plot number', 'Khata number', 'Owner name']}
        value={filter}
        onChange={setFilter}
      />
      <View style={s.row}>
        <Text style={[s.label, s.grow]}>{records.length} HOLDINGS FOUND</Text>
        <Badge text="Village register · Demo" />
      </View>
      {records.length === 0 && (
        <Empty
          title="No matching holdings"
          body="Try plot 142, khata 1041, or Ram Prasad. Clear your search to see all records."
        />
      )}
      {records.map(l => {
        const open = expanded === l.id;
        const lines = [
          `Khatauni ${l.khata} | Khasra ${l.plot}`,
          `${l.village} (${l.villageCode}), ${l.tehsil}`,
          `Area: ${l.hectares} ha / ${(
            (l.hectares * 10000) /
            state.settings.bighaSqm
          ).toFixed(3)} bigha`,
          l.classification,
          ...l.owners.map(o => `${o.name}: ${o.share}%`),
          `Bigha conversion: ${state.settings.bighaSqm} m² per bigha`,
          'DEMO / UNOFFICIAL COPY — Not a certified government record.',
          `Prepared ${new Date().toLocaleString('en-IN')}`,
        ];
        return (
          <Card key={l.id}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Expand Khasra ${l.plot}`}
              accessibilityState={{ expanded: open }}
              activeOpacity={0.7}
              onPress={() => setExpanded(open ? null : l.id)}
            >
              <View style={s.row}>
                <View
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: theme.colors.blueSoft,
                  }}
                >
                  <Icon
                    name="map-outline"
                    color={theme.colors.primary}
                    size={24}
                  />
                </View>
                <View style={s.grow}>
                  <Text style={s.heading}>Khasra #{l.plot}</Text>
                  <Text style={s.muted}>
                    {l.village} · Khata {l.khata}
                  </Text>
                </View>
                <Icon
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <View style={[s.row, { marginTop: 15 }]}>
                <Text style={[s.body, s.grow, { fontWeight: '600' }]}>
                  {l.owners.map(o => o.name).join(' & ')}
                </Text>
                <Text style={[s.heading, { color: theme.colors.primary }]}>
                  {l.hectares} ha
                </Text>
              </View>
            </TouchableOpacity>
            <Badge
              text={
                l.flagged ? 'Flagged for mutation' : 'Land holding recorded'
              }
              tone={l.flagged ? 'amber' : 'green'}
            />
            {open && (
              <>
                <View style={s.divider} />
                <View style={s.wrap}>
                  <Detail label="Village code" value={l.villageCode} />
                  <Detail label="Tehsil division" value={l.tehsil} />
                  <Detail
                    label="Area in bigha"
                    value={(
                      (l.hectares * 10000) /
                      state.settings.bighaSqm
                    ).toFixed(3)}
                  />
                </View>
                <Detail label="Land classification" value={l.classification} />
                <Text style={s.label}>CO-OWNER SHARES</Text>
                {l.owners.map(o => (
                  <View key={o.name} style={s.row}>
                    <Text style={[s.body, s.grow]}>{o.name}</Text>
                    <Text style={s.heading}>{o.share}%</Text>
                  </View>
                ))}
                <Button
                  title="Map plot boundary"
                  icon="map-marker-path"
                  onPress={() =>
                    navigation.navigate('FieldMap', { landId: l.id })
                  }
                />
                <Button
                  title="Apply mutation"
                  icon="scale-balance"
                  tone="soft"
                  onPress={() =>
                    navigation.navigate('Mutations', {
                      landId: l.id,
                      create: true,
                      status: 'Pending',
                    })
                  }
                />
                <Button
                  title={
                    l.flagged ? 'Remove mutation flag' : 'Flag for mutation'
                  }
                  tone="soft"
                  onPress={() =>
                    commit(`Mutation flag updated · Khasra ${l.plot}`, st => ({
                      ...st,
                      lands: st.lands.map(x =>
                        x.id === l.id ? { ...x, flagged: !x.flagged } : x,
                      ),
                    }))
                  }
                />
                <Button
                  title="Print / export record PDF"
                  icon="file-pdf-box"
                  tone="soft"
                  onPress={() =>
                    exportSummaryAsPdf({
                      fileName: `khatauni-${l.khata}`,
                      title: 'Khatauni record · Demo copy',
                      summaryLines: lines,
                    })
                  }
                />
                <Button
                  title="Share via WhatsApp"
                  icon="whatsapp"
                  tone="soft"
                  onPress={async () => {
                    try {
                      await Linking.openURL(
                        `whatsapp://send?text=${encodeURIComponent(
                          lines.join('\n'),
                        )}`,
                      );
                    } catch {
                      await Share.share({
                        message: lines.join('\n'),
                        title: 'Khatauni record',
                      });
                    }
                  }}
                />
                <Button
                  title="Start crop inspection"
                  tone="soft"
                  onPress={() =>
                    navigation.navigate('CropSurvey', { landId: l.id })
                  }
                />
                <Text style={s.muted}>
                  Bigha varies by locality. Current setting:{' '}
                  {state.settings.bighaSqm} m². Exports are marked as demo
                  copies.
                </Text>
              </>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
