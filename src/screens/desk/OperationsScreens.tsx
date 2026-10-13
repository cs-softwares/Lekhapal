import React from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, Card, Badge, Button, Empty } from '../../components/desk/Kit';
import { useDesk } from '../../context/DeskContext';
import ProfileScreen from '../ProfileScreen';
import { deskStyles as s, theme } from '../../theme';
export function SyncCenterScreen() {
  const { state, commit, sync } = useDesk();
  const pending = state.queue.filter(q => !q.syncedAt);
  return (
    <Screen
      title="Offline sync center"
      subtitle="Your field work stays with you, wherever you go."
    >
      <Card>
        <View style={s.row}>
          <Icon
            name={state.online ? 'cloud-check-outline' : 'cloud-off-outline'}
            size={32}
            color={theme.colors.primary}
          />
          <View style={s.grow}>
            <Text style={s.heading}>
              {state.online ? 'Online State' : 'Simulate Offline Mode'}
            </Text>
            <Text style={s.muted}>Connection simulation</Text>
          </View>
          <Switch
            accessibilityLabel="Online State"
            value={state.online}
            onValueChange={value =>
              void commit('', st => ({ ...st, online: value })).catch(e =>
                Alert.alert('Setting not saved', e.message),
              )
            }
          />
        </View>
        <Text style={s.muted}>
          All work saves to this device first. Sync acknowledges queued changes
          in the local mock server; no government service is connected.
        </Text>
      </Card>
      <Card>
        <Text
          style={{
            fontSize: 44,
            fontWeight: '800',
            color: theme.colors.primary,
          }}
        >
          {pending.length.toString().padStart(2, '0')}
        </Text>
        <Text style={s.heading}>Pending local changes</Text>
        <Text style={s.muted}>
          Last sync:{' '}
          {state.lastSync
            ? new Date(state.lastSync).toLocaleString('en-IN')
            : 'Not yet synced'}
        </Text>
        <Button
          title="Sync now with central state server"
          icon="cloud-sync-outline"
          onPress={async () => {
            await sync();
            Alert.alert(
              'Mock sync complete',
              `${pending.length} local changes acknowledged.`,
            );
          }}
        />
      </Card>
      <Text style={s.heading}>Action queue</Text>
      {!pending.length && (
        <Empty
          title="Everything is up to date"
          body="New saves and decisions will appear here until the next manual sync."
        />
      )}
      {state.queue.slice(0, 50).map(q => (
        <Card key={q.id}>
          <Text style={s.body}>{q.label}</Text>
          <Text style={s.muted}>
            {new Date(q.createdAt).toLocaleString('en-IN')}
          </Text>
          <Badge
            text={
              q.syncedAt
                ? 'Acknowledged by mock server'
                : 'Saved locally · awaiting sync'
            }
            tone={q.syncedAt ? 'green' : 'amber'}
          />
        </Card>
      ))}
    </Screen>
  );
}
export { SimpleSettingsScreen as DeskSettingsScreen } from './AppUtilityScreens';
export function OfficerScreen() {
  return <ProfileScreen />;
}
