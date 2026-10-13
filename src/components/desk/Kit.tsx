import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions, useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, deskStyles as s } from '../../theme';
import { useDesk } from '../../context/DeskContext';
const c = theme.colors;
export function Button({
  title,
  onPress,
  icon,
  tone = 'primary',
  disabled = false,
}: {
  title: string;
  onPress: () => void | Promise<void>;
  icon?: string;
  tone?: 'primary' | 'soft' | 'danger';
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={async () => {
        if (pending.current) {
          return;
        }
        pending.current = true;
        setBusy(true);
        try {
          await onPress();
        } catch (e) {
          Alert.alert(
            'Unable to complete',
            e instanceof Error ? e.message : 'Please try again.',
          );
        } finally {
          pending.current = false;
          setBusy(false);
        }
      }}
      style={[
        styles.button,
        {
          backgroundColor:
            tone === 'soft'
              ? c.blueSoft
              : tone === 'danger'
              ? '#B91C1C'
              : c.primary,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={tone === 'soft' ? c.primary : '#FFF'} />
      ) : (
        <>
          {icon && (
            <Icon
              name={icon}
              size={18}
              color={tone === 'soft' ? c.primary : '#FFF'}
            />
          )}
          <Text
            style={[
              styles.buttonText,
              { color: tone === 'soft' ? c.primary : '#FFF' },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
export function Badge({
  text,
  tone = 'blue',
}: {
  text: string;
  tone?: 'blue' | 'green' | 'amber' | 'red';
}) {
  const colors = {
    blue: [c.blueSoft, c.active],
    green: [c.greenSoft, '#08734E'],
    amber: [c.amberSoft, '#8A5200'],
    red: [c.redSoft, '#B91C1C'],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors[0] }]}>
      <Text style={{ color: colors[1], fontSize: 11, fontWeight: '700' }}>
        {text}
      </Text>
    </View>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6, marginVertical: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.subtitle}
        {...props}
        style={[
          styles.input,
          props.multiline && { minHeight: 90, textAlignVertical: 'top' },
          props.style,
        ]}
      />
    </View>
  );
}
export function Choices<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly T[];
  value: string;
  onChange: (value: T) => void;
}) {
  return (
    <View style={s.wrap}>
      {items.map(item => (
        <TouchableOpacity
          key={item}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected: item === value }}
          onPress={() => onChange(item)}
          style={[
            styles.choice,
            item === value && {
              backgroundColor: c.primary,
              borderColor: c.primary,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: item === value ? '#FFF' : c.text,
            }}
          >
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: 120, gap: 4, marginVertical: 5 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.body}>{value}</Text>
    </View>
  );
}
export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <Icon name="check-circle-outline" size={30} color={c.primary} />
      <Text style={s.heading}>{title}</Text>
      <Text style={s.muted}>{body}</Text>
    </Card>
  );
}
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={s.grow}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Text style={[s.heading, s.grow]}>{title}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close detail"
              onPress={onClose}
              style={styles.icon}
            >
              <Icon name="close" size={24} color={c.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const navigation = useNavigation();
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
    }, []),
  );
  const { state, sync } = useDesk();
  const pending = state.queue.filter(q => !q.syncedAt).length;
  return (
    <SafeAreaView
      edges={
        navigation.getState()?.type === 'tab'
          ? ['top', 'left', 'right']
          : ['top', 'left', 'right', 'bottom']
      }
      style={styles.safe}
    >
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.icon}
        >
          <Icon name="menu" size={24} color={c.text} />
        </TouchableOpacity>
        <View style={s.grow}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: c.text }}>
            लेखपाल{' '}
            <Text style={{ fontWeight: '400', color: c.subtitle }}>
              {' '}
              / Mobile Desk
            </Text>
          </Text>
          <Text style={{ fontSize: 10, letterSpacing: 1.4, color: c.subtitle }}>
            REVENUE OFFICER FIELD SUITE
          </Text>
        </View>
        <View style={styles.avatar}>
          <Icon name="account-outline" size={22} color={c.primary} />
        </View>
      </View>
      <View style={styles.sync}>
        <Icon
          name={state.online ? 'cloud-check-outline' : 'cloud-off-outline'}
          size={15}
          color={state.online ? '#08734E' : '#8A5200'}
        />
        <Text style={[s.muted, { flex: 1, fontSize: 11 }]}>
          {state.online ? 'Online' : 'Offline'} ·{' '}
          {pending ? `${pending} pending` : 'All local changes synced'} · Demo
          workspace
        </Text>
        {pending > 0 && state.online && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Sync now"
            onPress={() =>
              sync().catch(e => Alert.alert('Sync failed', e.message))
            }
          >
            <Text style={{ color: c.primary, fontSize: 12, fontWeight: '700' }}>
              Sync now
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <KeyboardAvoidingView
        style={s.grow}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={{ gap: 5, marginBottom: 8 }}>
            <Text style={s.title}>{title}</Text>
            <Text style={s.muted}>{subtitle}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: c.surface,
    borderBottomColor: c.border,
    borderBottomWidth: 1,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.blueSoft,
  },
  sync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 9,
    backgroundColor: '#F0F7F4',
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  card: {
    padding: 18,
    gap: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    ...theme.shadow,
  },
  button: {
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 13,
    minHeight: 48,
    color: c.text,
    fontSize: 15,
  },
  choice: {
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
});
