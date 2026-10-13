import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { DrawerScreenProps } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, Card, Badge, Button, Empty } from '../../components/desk/Kit';
import { useDesk } from '../../context/DeskContext';
import { deskStyles as s, theme } from '../../theme';
import { DeskTabs, DeskDrawer } from '../../navigation/deskTypes';
type Props = CompositeScreenProps<
  BottomTabScreenProps<DeskTabs, 'Dashboard'>,
  DrawerScreenProps<DeskDrawer>
>;
export default function DashboardScreen({ navigation }: Props) {
  const { state } = useDesk();
  const metrics = [
    {
      label: 'Pending mutations',
      value: state.mutations.filter(m => m.status === 'Pending').length,
      icon: 'file-document-edit-outline',
      color: theme.colors.primary,
      press: () =>
        navigation.navigate('Mutations', {
          status: 'Pending',
          landId: undefined,
        }),
    },
    {
      label: 'Certificate requests',
      value: state.certificates.filter(
        c => c.status === 'Pending' || c.status === 'Re-verification',
      ).length,
      icon: 'shield-check-outline',
      color: theme.colors.primary,
      press: () => navigation.navigate('Certificates'),
    },
    {
      label: 'Field surveys saved',
      value: state.surveys.length,
      icon: 'map-marker-radius-outline',
      color: theme.colors.primary,
      press: () => navigation.navigate('FieldMap'),
    },
    {
      label: 'Open land cases',
      value: state.incidents.filter(i => i.status !== 'Resolved').length,
      icon: 'flag-outline',
      color: theme.colors.primary,
      press: () => navigation.navigate('Encroachment'),
    },
  ];
  return (
    <Screen
      title="Your circle, at a glance"
      subtitle={new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}
    >
      <Card>
        <View style={s.row}>
          <Icon name="bank-outline" size={28} color={theme.colors.primary} />
          <View style={s.grow}>
            <Text style={s.heading}>Government websites</Text>
            <Text style={s.muted}>
              Khasra · RC-9 login · eDistrict · Bhunaksha
            </Text>
          </View>
        </View>
        <Button
          title="Open government services in app"
          icon="web"
          onPress={() => navigation.navigate('GovernmentPortals')}
        />
      </Card>
      <View style={[s.wrap, { gap: 12 }]}>
        {metrics.map(m => (
          <TouchableOpacity
            key={m.label}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${m.value} ${m.label}`}
            onPress={m.press}
            style={{
              width: '48%',
              flexGrow: 1,
              backgroundColor: '#FFF',
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 17,
              gap: 9,
            }}
          >
            <View style={s.row}>
              <Icon name={m.icon} color={m.color} size={25} />
              <View style={s.grow} />
              <Icon
                name="arrow-top-right"
                color={theme.colors.subtitle}
                size={18}
              />
            </View>
            <Text
              style={{
                fontSize: 32,
                fontWeight: '800',
                color: theme.colors.text,
              }}
            >
              {m.value.toString().padStart(2, '0')}
            </Text>
            <Text style={s.muted}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.heading}>Start field work</Text>
      <Card>
        <View style={s.row}>
          <Icon
            name="map-search-outline"
            size={32}
            color={theme.colors.primary}
          />
          <View style={s.grow}>
            <Text style={s.heading}>A clearer picture of your land</Text>
            <Text style={s.muted}>
              Find a holding, map its boundary, record a visit.
            </Text>
          </View>
        </View>
        <Button
          title="Search revenue records"
          icon="magnify"
          onPress={() => navigation.navigate('LandSearch', { query: '' })}
        />
        <Button
          title="New crop & relief assessment"
          tone="soft"
          icon="sprout"
          onPress={() => navigation.navigate('CropSurvey')}
        />
      </Card>
      <View style={s.row}>
        <Text style={[s.heading, s.grow]}>Needs your attention</Text>
        <Badge
          text={`${
            state.mutations.filter(m => m.status === 'Objections').length
          } objections`}
          tone="amber"
        />
      </View>
      {state.mutations
        .filter(m => m.status === 'Pending' || m.status === 'Objections')
        .slice(0, 3)
        .map(m => (
          <TouchableOpacity
            key={m.id}
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('Mutations', {
                status: m.status,
                landId: m.landId,
              })
            }
          >
            <Card>
              <View style={s.row}>
                <View
                  style={{
                    backgroundColor: theme.colors.blueSoft,
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  <Icon
                    name="scale-balance"
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={s.grow}>
                  <Text style={[s.body, { fontWeight: '700' }]}>{m.buyer}</Text>
                  <Text style={s.muted}>
                    {m.id} · {m.category}
                  </Text>
                </View>
                <Icon
                  name="chevron-right"
                  color={theme.colors.subtitle}
                  size={22}
                />
              </View>
              <Badge
                text={
                  m.status === 'Objections'
                    ? 'Objection requires review'
                    : m.noticeAt
                    ? 'Public notice issued'
                    : 'Awaiting public notice'
                }
                tone={m.status === 'Objections' ? 'red' : 'amber'}
              />
            </Card>
          </TouchableOpacity>
        ))}
      <Text style={s.heading}>Recent activity</Text>
      {state.queue.length === 0 ? (
        <Empty
          title="Ready for your first field visit"
          body="Saved surveys, decisions and reports will appear here."
        />
      ) : (
        state.queue.slice(0, 4).map(q => (
          <Card key={q.id}>
            <Text style={s.body}>{q.label}</Text>
            <Text style={s.muted}>
              {new Date(q.createdAt).toLocaleString('en-IN')} ·{' '}
              {q.syncedAt ? 'Synced to mock server' : 'Saved locally'}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
