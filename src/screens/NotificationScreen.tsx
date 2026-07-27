import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import AppSectionTitle from '../components/AppSectionTitle';
import {useAppTheme} from '../context/ThemeContext';
import {useLanguage} from '../context/LanguageContext';
import {
  NOTIFICATION_CATEGORY_CONFIGS,
  NotificationCategoryConfig,
  NotificationCategoryId,
} from '../data/notificationCatalog';
import {selectDrawerSection} from '../navigation/drawerHelpers';
import {smartWorkNotifications} from '../native/smartWorkNotifications';
import {
  buildNotificationSnapshot,
  getDefaultNotificationCategoryPreferences,
  getDefaultNotificationCategoryTimes,
  getEnabledNotificationCategoryCount,
  loadNotificationCategoryPreferences,
  loadNotificationCategoryTimes,
  NotificationCategoryPreferences,
  NotificationCategoryTimePreferences,
  NotificationSnapshot,
  persistNotificationCategoryPreferences,
  persistNotificationCategoryTimes,
  sendNotificationTest,
  syncNotificationSchedules,
} from '../utils/notificationSettings';

type NotificationScreenProps = {
  masterEnabled: boolean;
  onMasterToggle: (
    nextValue: boolean,
  ) => void | Promise<void>;
};

type TimeDraft = {
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
};

const formatReminderTime = (
  hour: number,
  minute: number,
) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 || 12;

  return `${normalizedHour}:${String(minute).padStart(2, '0')} ${period}`;
};

const toTimeDraft = (
  hour: number,
  minute: number,
): TimeDraft => ({
  hour12: hour % 12 || 12,
  minute,
  period: hour >= 12 ? 'PM' : 'AM',
});

const to24Hour = (draft: TimeDraft) => {
  if (draft.period === 'AM') {
    return draft.hour12 === 12 ? 0 : draft.hour12;
  }

  return draft.hour12 === 12
    ? 12
    : draft.hour12 + 12;
};

const stepHour12 = (
  currentHour: number,
  direction: 1 | -1,
) => {
  if (direction === 1) {
    return currentHour === 12 ? 1 : currentHour + 1;
  }

  return currentHour === 1 ? 12 : currentHour - 1;
};

const stepMinute = (
  currentMinute: number,
  direction: 1 | -1,
) => {
  const nextMinute =
    direction === 1
      ? currentMinute + 5
      : currentMinute - 5;

  if (nextMinute > 55) {
    return 0;
  }

  if (nextMinute < 0) {
    return 55;
  }

  return nextMinute;
};

const NotificationScreen = ({
  masterEnabled,
  onMasterToggle,
}: NotificationScreenProps) => {
  const {language} = useLanguage();
  const {colors} = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        actionButton: {
          alignItems: 'center',
          borderRadius: 16,
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          minHeight: 48,
          paddingHorizontal: 14,
        },
        actionButtonPrimary: {
          backgroundColor: colors.primary,
        },
        actionButtonPrimaryText: {
          color: colors.white,
          fontSize: 13,
          fontWeight: '800',
          marginLeft: 8,
        },
        actionButtonSecondary: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
        },
        actionButtonSecondaryText: {
          color: colors.primary,
          fontSize: 13,
          fontWeight: '800',
          marginLeft: 8,
        },
        actionRow: {
          flexDirection: 'row',
          gap: 10,
          marginBottom: 16,
        },
        adjustButton: {
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 12,
          borderWidth: 1,
          height: 32,
          justifyContent: 'center',
          width: 32,
        },
        categoryBody: {
          color: colors.textMuted,
          fontSize: 13,
          lineHeight: 18,
          marginTop: 4,
        },
        categoryCard: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftWidth: 3,
          borderRadius: 20,
          borderWidth: 1,
          marginBottom: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
        },
        categoryCardMuted: {
          opacity: 0.72,
        },
        categoryIconWrap: {
          alignItems: 'center',
          borderRadius: 14,
          height: 42,
          justifyContent: 'center',
          width: 42,
        },
        categoryRightColumn: {
          alignItems: 'flex-end',
          justifyContent: 'center',
        },
        categoryStateText: {
          color: colors.textSoft,
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 4,
          textTransform: 'uppercase',
        },
        categoryTextBlock: {
          flex: 1,
          marginHorizontal: 12,
        },
        categoryTitle: {
          color: colors.text,
          fontSize: 15,
          fontWeight: '800',
        },
        categoryTopRow: {
          alignItems: 'center',
          flexDirection: 'row',
        },
        closeEditorButton: {
          alignItems: 'center',
          borderRadius: 12,
          height: 28,
          justifyContent: 'center',
          marginLeft: 8,
          width: 28,
        },
        countBadge: {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderRadius: 999,
          borderWidth: 1,
          marginBottom: 8,
          marginRight: 8,
          paddingHorizontal: 10,
          paddingVertical: 7,
        },
        countBadgeText: {
          color: colors.textMuted,
          fontSize: 12,
          fontWeight: '700',
        },
        editorActionButton: {
          alignItems: 'center',
          borderRadius: 14,
          flex: 1,
          justifyContent: 'center',
          minHeight: 42,
          paddingHorizontal: 14,
        },
        editorActionRow: {
          flexDirection: 'row',
          gap: 10,
          marginTop: 14,
        },
        editorPrimaryButton: {
          backgroundColor: colors.primary,
        },
        editorPrimaryButtonText: {
          color: colors.white,
          fontSize: 13,
          fontWeight: '800',
        },
        editorSecondaryButton: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
        },
        editorSecondaryButtonText: {
          color: colors.primary,
          fontSize: 13,
          fontWeight: '800',
        },
        footerNote: {
          color: colors.textSoft,
          fontSize: 12,
          lineHeight: 18,
          marginBottom: 24,
          marginTop: 4,
        },
        masterBody: {
          color: colors.textMuted,
          fontSize: 13,
          lineHeight: 19,
          marginTop: 4,
        },
        masterCard: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 20,
          borderWidth: 1,
          marginBottom: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
        },
        masterIconWrap: {
          alignItems: 'center',
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderRadius: 16,
          borderWidth: 1,
          height: 48,
          justifyContent: 'center',
          width: 48,
        },
        masterTextBlock: {
          flex: 1,
          marginHorizontal: 12,
        },
        masterTitle: {
          color: colors.text,
          fontSize: 16,
          fontWeight: '800',
        },
        masterTopRow: {
          alignItems: 'center',
          flexDirection: 'row',
        },
        metaRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginLeft: 54,
          marginTop: 12,
        },
        moduleNote: {
          color: colors.secondary,
          flex: 1,
          fontSize: 12,
          lineHeight: 18,
          marginLeft: 8,
        },
        moduleNoteRow: {
          alignItems: 'center',
          backgroundColor: colors.secondarySoft,
          borderRadius: 16,
          flexDirection: 'row',
          marginBottom: 16,
          paddingHorizontal: 12,
          paddingVertical: 10,
        },
        overviewChip: {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 16,
          marginBottom: 10,
          marginRight: 10,
          minWidth: '47%',
          paddingHorizontal: 12,
          paddingVertical: 10,
        },
        overviewChipLabel: {
          color: colors.textSoft,
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 5,
          textTransform: 'uppercase',
        },
        overviewChipRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginTop: 14,
        },
        overviewChipValue: {
          color: colors.text,
          fontSize: 13,
          fontWeight: '800',
        },
        periodButton: {
          alignItems: 'center',
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderRadius: 12,
          borderWidth: 1,
          flex: 1,
          justifyContent: 'center',
          minHeight: 38,
          paddingHorizontal: 14,
        },
        periodButtonActive: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        periodButtonText: {
          color: colors.text,
          fontSize: 12,
          fontWeight: '800',
        },
        periodButtonTextActive: {
          color: colors.white,
        },
        periodColumn: {
          flexDirection: 'row',
          gap: 8,
          width: '100%',
        },
        scrollContent: {
          paddingBottom: 28,
          paddingHorizontal: 16,
          paddingTop: 18,
        },
        successBanner: {
          alignItems: 'center',
          backgroundColor: colors.successSoft,
          borderColor:
            colors.successSoft === '#D1FAE5'
              ? '#A7F3D0'
              : colors.success,
          borderRadius: 14,
          borderWidth: 1,
          flexDirection: 'row',
          marginBottom: 16,
          paddingHorizontal: 12,
          paddingVertical: 10,
        },
        successBannerText: {
          color:
            colors.successSoft === '#D1FAE5'
              ? '#065F46'
              : colors.text,
          flex: 1,
          fontSize: 13,
          fontWeight: '700',
          marginLeft: 8,
        },
        timeAdjustRow: {
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 10,
        },
        timeBadge: {
          alignItems: 'center',
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderRadius: 999,
          borderWidth: 1,
          flexDirection: 'row',
          marginBottom: 8,
          marginRight: 8,
          paddingHorizontal: 10,
          paddingVertical: 7,
        },
        timeBadgeText: {
          color: colors.text,
          fontSize: 12,
          fontWeight: '700',
          marginLeft: 6,
        },
        timeControlRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 12,
        },
        timeEditorCard: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 18,
          borderWidth: 1,
          marginTop: 12,
          paddingHorizontal: 12,
          paddingVertical: 12,
        },
        timeEditorHeader: {
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
        timeEditorTitle: {
          color: colors.text,
          flex: 1,
          fontSize: 14,
          fontWeight: '800',
        },
        timeUnitCard: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 16,
          borderWidth: 1,
          flexGrow: 1,
          paddingHorizontal: 10,
          paddingVertical: 10,
          width: '48%',
        },
        timeUnitLabel: {
          color: colors.textSoft,
          fontSize: 11,
          fontWeight: '700',
          textTransform: 'uppercase',
        },
        timeUnitValue: {
          color: colors.text,
          fontSize: 18,
          fontWeight: '800',
        },
      }),
    [colors],
  );
  const [categoryPreferences, setCategoryPreferences] =
    useState<NotificationCategoryPreferences>(
      getDefaultNotificationCategoryPreferences(),
    );
  const [categoryTimes, setCategoryTimes] =
    useState<NotificationCategoryTimePreferences>(
      getDefaultNotificationCategoryTimes(),
    );
  const [snapshot, setSnapshot] =
    useState<NotificationSnapshot | null>(null);
  const [systemNotificationsEnabled, setSystemNotificationsEnabled] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [editingCategoryId, setEditingCategoryId] =
    useState<NotificationCategoryId | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);
  const [timeDraft, setTimeDraft] = useState<TimeDraft>({
    hour12: 8,
    minute: 0,
    period: 'PM',
  });

  const copy = useMemo(
    () => ({
      active:
        language === 'hi' ? 'Active' : 'Active',
      activeBody:
        language === 'hi'
          ? 'Reminders आपके phone पर रोज़ तय time से आएंगे।'
          : 'Reminders will be scheduled on the phone every day.',
      categoryOff:
        language === 'hi' ? 'Off' : 'Off',
      categoryOn:
        language === 'hi' ? 'On' : 'On',
      disabled:
        language === 'hi' ? 'Off' : 'Off',
      disabledBody:
        language === 'hi'
          ? 'Master switch Off है। Settings save रहेंगी, but alerts नहीं आएंगे।'
          : 'The master switch is off. Settings stay saved, but alerts will not be delivered.',
      footerNote:
        language === 'hi'
          ? 'ये local phone notifications हैं। Reliable reminders के लिए full rebuild, phone permission और कम से कम एक बार app open करना जरूरी है।'
          : 'These are local phone notifications. A full rebuild, phone permission, and at least one app open are needed for reliable reminders.',
      hour:
        language === 'hi' ? 'Hour' : 'Hour',
      masterTitle:
        language === 'hi'
          ? 'Notification control'
          : 'Notification control',
      minute:
        language === 'hi' ? 'Minute' : 'Minute',
      moduleMissing:
        language === 'hi'
          ? 'Native notifications शुरू होने से पहले app को एक full rebuild चाहिए।'
          : 'The app needs one full rebuild before native notifications can start.',
      permissionOff:
        language === 'hi'
          ? 'Phone permission off'
          : 'Phone permission off',
      permissionOn:
        language === 'hi'
          ? 'Phone permission ready'
          : 'Phone permission ready',
      refresh:
        language === 'hi' ? 'Refresh' : 'Refresh',
      refreshFailed:
        language === 'hi'
          ? 'Saved notification state refresh नहीं हो सकी।'
          : 'Saved notification state could not be refreshed.',
      reminderEditor:
        language === 'hi' ? 'Reminder time' : 'Reminder time',
      reminderSubtitle:
        language === 'hi'
          ? 'Each reminder type अपना अलग time रख सकता है।'
          : 'Each reminder type can keep its own time.',
      reminderTypes:
        language === 'hi'
          ? 'Reminder types'
          : 'Reminder types',
      resetDefault:
        language === 'hi' ? 'Default' : 'Default',
      save:
        language === 'hi' ? 'Save' : 'Save',
      savedWork:
        language === 'hi'
          ? 'Saved work'
          : 'Saved work',
      screenTitle:
        language === 'hi'
          ? 'Notifications'
          : 'Notifications',
      sendTest:
        language === 'hi'
          ? 'Send test'
          : 'Send test',
      sendTestDisabled:
        language === 'hi'
          ? 'पहले notifications On करें।'
          : 'Turn notifications on first.',
      sendTestFailed:
        language === 'hi'
          ? 'Test notification नहीं भेजा जा सका।'
          : 'Test notification could not be sent.',
      status:
        language === 'hi' ? 'Status' : 'Status',
      system:
        language === 'hi' ? 'System' : 'System',
      testReady:
        language === 'hi'
          ? 'Test reminder आपके phone पर भेज दिया गया है।'
          : 'Test reminder sent to your phone.',
      testing:
        language === 'hi'
          ? 'Sending...'
          : 'Sending...',
      timeSaved:
        language === 'hi'
          ? 'Reminder time updated.'
          : 'Reminder time updated.',
      totalReminders:
        language === 'hi'
          ? 'Active reminders'
          : 'Active reminders',
      typeCount:
        language === 'hi' ? 'Types' : 'Types',
    }),
    [language],
  );

  const loadScreenState = useCallback(async () => {
    setLoading(true);

    try {
      const [
        nextPreferences,
        nextTimes,
        nextSnapshot,
        notificationsReady,
      ] = await Promise.all([
        loadNotificationCategoryPreferences(),
        loadNotificationCategoryTimes(),
        buildNotificationSnapshot(),
        smartWorkNotifications.isAvailable
          ? smartWorkNotifications.areNotificationsEnabled()
          : Promise.resolve(false),
      ]);

      setCategoryPreferences(nextPreferences);
      setCategoryTimes(nextTimes);
      setSnapshot(nextSnapshot);
      setSystemNotificationsEnabled(notificationsReady);
    } catch {
      Alert.alert(copy.refreshFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.refreshFailed]);

  useEffect(() => {
    void loadScreenState();
  }, [loadScreenState, masterEnabled]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setSuccessMessage(null);
    }, 2200);

    return () => clearTimeout(timeoutId);
  }, [successMessage]);

  const activeReminderCount = useMemo(
    () =>
      getEnabledNotificationCategoryCount(
        categoryPreferences,
      ),
    [categoryPreferences],
  );

  const totalSavedWorkCount =
    snapshot?.totalSavedCount ?? 0;

  const getCountBadge = (
    categoryId: NotificationCategoryId,
  ) => {
    if (!snapshot) {
      return null;
    }

    if (categoryId === 'daily-summary') {
      return totalSavedWorkCount > 0
        ? `${totalSavedWorkCount} saved`
        : null;
    }

    if (categoryId === 'portal-follow-up') {
      return snapshot.portalRecentSearchCount > 0
        ? `${snapshot.portalRecentSearchCount} recent`
        : snapshot.hasSavedPortalPreset ||
            snapshot.hasSavedStateSelection
          ? 'saved state'
          : null;
    }

    if (categoryId === 'village-diary') {
      return snapshot.villageDiaryCount > 0
        ? `${snapshot.villageDiaryCount} saved`
        : null;
    }

    if (categoryId === 'mutation-tracker') {
      return snapshot.mutationTrackerCount > 0
        ? `${snapshot.mutationTrackerCount} saved`
        : null;
    }

    if (categoryId === 'measurement-records') {
      return snapshot.measurementCount > 0
        ? `${snapshot.measurementCount} saved`
        : null;
    }

    return snapshot.calculatorCount > 0
      ? `${snapshot.calculatorCount} saved`
      : null;
  };

  const handleCategoryToggle = async (
    categoryId: NotificationCategoryId,
    nextValue: boolean,
  ) => {
    const nextPreferences = {
      ...categoryPreferences,
      [categoryId]: nextValue,
    };

    setCategoryPreferences(nextPreferences);
    await persistNotificationCategoryPreferences(
      nextPreferences,
    );
    await syncNotificationSchedules(masterEnabled, language);
  };

  const handleMasterChange = async (nextValue: boolean) => {
    await onMasterToggle(nextValue);
    await loadScreenState();
  };

  const handleSendTest = async () => {
    if (!masterEnabled) {
      Alert.alert(copy.sendTestDisabled);
      return;
    }

    if (!smartWorkNotifications.isAvailable) {
      Alert.alert(copy.moduleMissing);
      return;
    }

    setTesting(true);

    try {
      await sendNotificationTest(language);
      Alert.alert(copy.testReady);
    } catch {
      Alert.alert(copy.sendTestFailed);
    } finally {
      setTesting(false);
    }
  };

  const openTimeEditor = (
    categoryId: NotificationCategoryId,
  ) => {
    const currentTime = categoryTimes[categoryId];
    setEditingCategoryId(categoryId);
    setTimeDraft(
      toTimeDraft(currentTime.hour, currentTime.minute),
    );
  };

  const closeTimeEditor = () => {
    setEditingCategoryId(null);
  };

  const saveTimeEditor = async (
    category: NotificationCategoryConfig,
  ) => {
    const nextTimes = {
      ...categoryTimes,
      [category.id]: {
        hour: to24Hour(timeDraft),
        minute: timeDraft.minute,
      },
    };

    setCategoryTimes(nextTimes);
    await persistNotificationCategoryTimes(nextTimes);
    await syncNotificationSchedules(masterEnabled, language);
    setEditingCategoryId(null);
    setSuccessMessage(copy.timeSaved);
  };

  const resetTimeEditor = (
    category: NotificationCategoryConfig,
  ) => {
    setTimeDraft(
      toTimeDraft(
        category.defaultHour,
        category.defaultMinute,
      ),
    );
  };

  const renderTimeEditor = (
    category: NotificationCategoryConfig,
  ) => {
    if (editingCategoryId !== category.id) {
      return null;
    }

    return (
      <View style={styles.timeEditorCard}>
        <View style={styles.timeEditorHeader}>
          <Text style={styles.timeEditorTitle}>
            {copy.reminderEditor}
          </Text>
          <AppPressable
            onPress={closeTimeEditor}
            style={styles.closeEditorButton}>
            <Icon
              color={colors.textMuted}
              name="close"
              size={18}
            />
          </AppPressable>
        </View>

        <View style={styles.timeControlRow}>
          <View style={styles.timeUnitCard}>
            <Text style={styles.timeUnitLabel}>
              {copy.hour}
            </Text>
            <View style={styles.timeAdjustRow}>
              <AppPressable
                onPress={() =>
                  setTimeDraft(previous => ({
                    ...previous,
                    hour12: stepHour12(
                      previous.hour12,
                      -1,
                    ),
                  }))
                }
                style={styles.adjustButton}>
                <Icon
                  color={colors.primary}
                  name="minus"
                  size={16}
                />
              </AppPressable>

              <Text style={styles.timeUnitValue}>
                {String(timeDraft.hour12).padStart(2, '0')}
              </Text>

              <AppPressable
                onPress={() =>
                  setTimeDraft(previous => ({
                    ...previous,
                    hour12: stepHour12(
                      previous.hour12,
                      1,
                    ),
                  }))
                }
                style={styles.adjustButton}>
                <Icon
                  color={colors.primary}
                  name="plus"
                  size={16}
                />
              </AppPressable>
            </View>
          </View>

          <View style={styles.timeUnitCard}>
            <Text style={styles.timeUnitLabel}>
              {copy.minute}
            </Text>
            <View style={styles.timeAdjustRow}>
              <AppPressable
                onPress={() =>
                  setTimeDraft(previous => ({
                    ...previous,
                    minute: stepMinute(
                      previous.minute,
                      -1,
                    ),
                  }))
                }
                style={styles.adjustButton}>
                <Icon
                  color={colors.primary}
                  name="minus"
                  size={16}
                />
              </AppPressable>

              <Text style={styles.timeUnitValue}>
                {String(timeDraft.minute).padStart(2, '0')}
              </Text>

              <AppPressable
                onPress={() =>
                  setTimeDraft(previous => ({
                    ...previous,
                    minute: stepMinute(
                      previous.minute,
                      1,
                    ),
                  }))
                }
                style={styles.adjustButton}>
                <Icon
                  color={colors.primary}
                  name="plus"
                  size={16}
                />
              </AppPressable>
            </View>
          </View>

          <View style={styles.periodColumn}>
            {(['AM', 'PM'] as const).map(period => {
              const active = timeDraft.period === period;

              return (
                <AppPressable
                  key={period}
                  onPress={() =>
                    setTimeDraft(previous => ({
                      ...previous,
                      period,
                    }))
                  }
                  style={[
                    styles.periodButton,
                    active && styles.periodButtonActive,
                  ]}>
                  <Text
                    style={[
                      styles.periodButtonText,
                      active &&
                        styles.periodButtonTextActive,
                    ]}>
                    {period}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
        </View>

        <View style={styles.editorActionRow}>
          <AppPressable
            onPress={() => resetTimeEditor(category)}
            style={[
              styles.editorActionButton,
              styles.editorSecondaryButton,
            ]}>
            <Text
              style={styles.editorSecondaryButtonText}>
              {copy.resetDefault}
            </Text>
          </AppPressable>

          <AppPressable
            onPress={() => {
              void saveTimeEditor(category);
            }}
            style={[
              styles.editorActionButton,
              styles.editorPrimaryButton,
            ]}>
            <Text style={styles.editorPrimaryButtonText}>
              {copy.save}
            </Text>
          </AppPressable>
        </View>
      </View>
    );
  };

  const renderCategoryRow = (
    category: NotificationCategoryConfig,
  ) => {
    const enabled = categoryPreferences[category.id];
    const countBadge = getCountBadge(category.id);
    const scheduledTime = categoryTimes[category.id];

    return (
      <View
        key={category.id}
        style={[
          styles.categoryCard,
          {borderLeftColor: category.accentColor},
          !masterEnabled && styles.categoryCardMuted,
        ]}>
        <View style={styles.categoryTopRow}>
          <View
            style={[
              styles.categoryIconWrap,
              {
                backgroundColor: `${category.accentColor}18`,
              },
            ]}>
            <Icon
              color={category.accentColor}
              name={category.iconName}
              size={20}
            />
          </View>

          <View style={styles.categoryTextBlock}>
            <Text style={styles.categoryTitle}>
              {category.title[language]}
            </Text>
            <Text style={styles.categoryBody}>
              {category.description[language]}
            </Text>
          </View>

          <View style={styles.categoryRightColumn}>
            <Text
              style={[
                styles.categoryStateText,
                {
                  color: enabled
                    ? category.accentColor
                    : colors.textSoft,
                },
              ]}>
              {enabled
                ? copy.categoryOn
                : copy.categoryOff}
            </Text>
            <Switch
              onValueChange={value => {
                void handleCategoryToggle(category.id, value);
              }}
              thumbColor={enabled ? colors.primary : '#F8FAFC'}
              trackColor={{
                false: '#CBD5E1',
                true: colors.primarySoft,
              }}
              value={enabled}
            />
          </View>
        </View>

        <View style={styles.metaRow}>
          <AppPressable
            onPress={() => openTimeEditor(category.id)}
            style={styles.timeBadge}>
            <Icon
              color={colors.primary}
              name="clock-outline"
              size={14}
            />
            <Text style={styles.timeBadgeText}>
              {formatReminderTime(
                scheduledTime.hour,
                scheduledTime.minute,
              )}
            </Text>
          </AppPressable>

          {countBadge ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {countBadge}
              </Text>
            </View>
          ) : null}
        </View>

        {renderTimeEditor(category)}
      </View>
    );
  };

  return (
    <AppScreen scroll={false}>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => selectDrawerSection('Workspace')}
        title={copy.screenTitle}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.masterCard}>
          <View style={styles.masterTopRow}>
            <View style={styles.masterIconWrap}>
              <Icon
                color={colors.primary}
                name="bell-ring-outline"
                size={22}
              />
            </View>

            <View style={styles.masterTextBlock}>
              <Text style={styles.masterTitle}>
                {copy.masterTitle}
              </Text>
              <Text style={styles.masterBody}>
                {masterEnabled
                  ? copy.activeBody
                  : copy.disabledBody}
              </Text>
            </View>

            <Switch
              onValueChange={value => {
                void handleMasterChange(value);
              }}
              thumbColor={masterEnabled ? colors.primary : '#F8FAFC'}
              trackColor={{
                false: '#CBD5E1',
                true: colors.primarySoft,
              }}
              value={masterEnabled}
            />
          </View>

          <View style={styles.overviewChipRow}>
            <View style={styles.overviewChip}>
              <Text style={styles.overviewChipLabel}>
                {copy.status}
              </Text>
              <Text style={styles.overviewChipValue}>
                {masterEnabled
                  ? copy.active
                  : copy.disabled}
              </Text>
            </View>

            <View style={styles.overviewChip}>
              <Text style={styles.overviewChipLabel}>
                {copy.system}
              </Text>
              <Text style={styles.overviewChipValue}>
                {systemNotificationsEnabled
                  ? copy.permissionOn
                  : copy.permissionOff}
              </Text>
            </View>

            <View style={styles.overviewChip}>
              <Text style={styles.overviewChipLabel}>
                {copy.typeCount}
              </Text>
              <Text style={styles.overviewChipValue}>
                {activeReminderCount}
              </Text>
            </View>

            <View style={styles.overviewChip}>
              <Text style={styles.overviewChipLabel}>
                {copy.savedWork}
              </Text>
              <Text style={styles.overviewChipValue}>
                {loading ? '...' : totalSavedWorkCount}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <AppPressable
            onPress={() => {
              void handleSendTest();
            }}
            style={[
              styles.actionButton,
              styles.actionButtonPrimary,
            ]}>
            <Icon
              color={colors.white}
              name="bell-badge-outline"
              size={18}
            />
            <Text style={styles.actionButtonPrimaryText}>
              {testing ? copy.testing : copy.sendTest}
            </Text>
          </AppPressable>

          <AppPressable
            onPress={() => {
              void loadScreenState();
            }}
            style={[
              styles.actionButton,
              styles.actionButtonSecondary,
            ]}>
            <Icon
              color={colors.primary}
              name="refresh"
              size={18}
            />
            <Text style={styles.actionButtonSecondaryText}>
              {copy.refresh}
            </Text>
          </AppPressable>
        </View>

        {successMessage ? (
          <View style={styles.successBanner}>
            <Icon
              color={colors.success}
              name="check-circle-outline"
              size={18}
            />
            <Text style={styles.successBannerText}>
              {successMessage}
            </Text>
          </View>
        ) : null}

        {!smartWorkNotifications.isAvailable ? (
          <View style={styles.moduleNoteRow}>
            <Icon
              color={colors.secondary}
              name="alert-circle-outline"
              size={18}
            />
            <Text style={styles.moduleNote}>
              {copy.moduleMissing}
            </Text>
          </View>
        ) : null}

        <AppSectionTitle
          subtitle={copy.reminderSubtitle}
          title={copy.reminderTypes}
        />

        {NOTIFICATION_CATEGORY_CONFIGS.map(
          renderCategoryRow,
        )}

        <Text style={styles.footerNote}>
          {copy.footerNote}
        </Text>
      </ScrollView>
    </AppScreen>
  );
};

export default NotificationScreen;
