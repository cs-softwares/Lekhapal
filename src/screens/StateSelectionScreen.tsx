import {
  RELEASE_FEATURES,
  isWorkspaceState,
  WORKSPACE_STATE_CODES,
} from '../config/releaseFeatures';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';
import { INDIA_STATE_OPTIONS } from '../data/stateDashboardCatalog';
import { useSelectedState } from '../context/SelectedStateContext';
import { useLanguage } from '../context/LanguageContext';
import { theme } from '../theme';
import { typography } from '../theme/typography';
function StatePicker({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'StateSelection'>) {
  const { stateCode, selectState } = useSelectedState();
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const options = INDIA_STATE_OPTIONS.filter(
    s =>
      isWorkspaceState(s.code) &&
      `${s.name.en} ${s.name.hi}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const choose = async (code: string) => {
    if (saving) {
      return;
    }
    setSaving(code);
    try {
      await selectState(code);
      navigation.reset({ index: 0, routes: [{ name: 'MainDrawer' }] });
    } catch (e) {
      Alert.alert(
        'State could not be saved',
        e instanceof Error ? e.message : 'Please try again.',
      );
      setSaving(null);
    }
  };
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {route.params?.change && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            style={styles.back}
          >
            <Icon name="arrow-left" size={24} color={theme.colors.text} />
          </Pressable>
        )}
        <Text style={styles.brand}>लेखपाल</Text>
      </View>
      <View style={styles.intro}>
        <Text style={styles.title}>
          {language === 'hi' ? 'अपना राज्य चुनें' : 'Choose your state'}
        </Text>
        <Text style={styles.subtitle}>
          {language === 'hi'
            ? 'आपके राज्य की सरकारी सेवाएं, एक जगह।'
            : "Your state's government services, in one place."}
        </Text>
        <View style={styles.search}>
          <Icon name="magnify" size={22} color={theme.colors.subtitle} />
          <TextInput
            accessibilityLabel="Search states"
            placeholder={language === 'hi' ? 'राज्य खोजें' : 'Search states'}
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            placeholderTextColor={theme.colors.subtitle}
          />
        </View>
        <Text style={styles.count}>
          {WORKSPACE_STATE_CODES.length}{' '}
          {language === 'hi' ? 'राज्य' : 'states'}
        </Text>
      </View>
      <FlatList
        data={options}
        keyExtractor={s => s.code}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.subtitle}>
            No matching state. Try another name.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.name.en}`}
            accessibilityState={{
              selected: stateCode === item.code,
              disabled: !!saving,
            }}
            disabled={!!saving}
            onPress={() => choose(item.code)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.name}>{item.name[language]}</Text>
            {saving === item.code ? (
              <ActivityIndicator />
            ) : (
              <Icon
                name={
                  stateCode === item.code ? 'check-circle' : 'chevron-right'
                }
                size={22}
                color={
                  stateCode === item.code
                    ? theme.colors.primary
                    : theme.colors.subtitle
                }
              />
            )}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  back: { width: 44, height: 44, justifyContent: 'center' },
  brand: { fontSize: 24, fontWeight: '700', color: theme.colors.primary },
  intro: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  title: { ...typography.heading, color: theme.colors.text },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.subtitle,
    marginTop: 8,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 24,
    gap: 10,
  },
  input: { flex: 1, minHeight: 48, fontSize: 14, color: theme.colors.text },
  count: { fontSize: 12, color: theme.colors.subtitle, marginTop: 16 },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  row: {
    minHeight: 58,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  name: { flex: 1, ...typography.title, color: theme.colors.text },
  pressed: { backgroundColor: theme.colors.blueSoft },
});

// Keep the complete picker available for the next rollout, but do not show it in UP-only builds.
export default function StateSelectionScreen(
  props: NativeStackScreenProps<RootStackParamList, 'StateSelection'>,
) {
  useEffect(() => {
    if (!RELEASE_FEATURES.multiState) props.navigation.replace('MainDrawer');
  }, [props.navigation]);
  return RELEASE_FEATURES.multiState ? <StatePicker {...props} /> : null;
}
