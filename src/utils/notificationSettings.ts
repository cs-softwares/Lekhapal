import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  NOTIFICATION_CATEGORY_CONFIGS,
  NOTIFICATION_CATEGORY_IDS,
  NOTIFICATION_CATEGORY_STORAGE_KEY,
  NOTIFICATION_MASTER_STORAGE_KEY,
  NOTIFICATION_TIME_STORAGE_KEY,
  NotificationCategoryId,
} from '../data/notificationCatalog';
import {
  UP_BHULEKH_HISTORY_STORAGE_KEY,
  UP_BHULEKH_PRESET_STORAGE_KEY,
} from '../data/homeQuickStats';
import {STATE_SELECTION_STORAGE_KEY} from '../data/stateDashboardCatalog';
import {smartWorkNotifications} from '../native/smartWorkNotifications';
import {LanguageCode} from '../types/tool';
import {loadWorkspaceRecords} from './workspaceStorage';

type NotificationPayload = {
  message: string;
  title: string;
};

export type NotificationCategoryPreferences = Record<
  NotificationCategoryId,
  boolean
>;

export type NotificationCategoryTime = {
  hour: number;
  minute: number;
};

export type NotificationCategoryTimePreferences = Record<
  NotificationCategoryId,
  NotificationCategoryTime
>;

export type NotificationSnapshot = {
  calculatorCount: number;
  hasSavedPortalPreset: boolean;
  hasSavedStateSelection: boolean;
  measurementCount: number;
  mutationTrackerCount: number;
  portalRecentSearchCount: number;
  totalSavedCount: number;
  villageDiaryCount: number;
};

const MEASUREMENT_STORAGE_TOOL_IDS = [
  'gps-land-measure',
  'field-area-workspace',
  'plot-boundary-guide',
  'area-converter',
  'map-scale-helper',
] as const;

const CALCULATOR_STORAGE_TOOL_IDS = [
  'registry-estimate',
  'share-calculator',
  'fraction-hissa-calculator',
  'rate-finder',
  'circle-rate-compare',
] as const;

const getNormalizedTime = (
  hour: number,
  minute: number,
  fallbackHour: number,
  fallbackMinute: number,
): NotificationCategoryTime => {
  const nextHour =
    Number.isInteger(hour) && hour >= 0 && hour <= 23
      ? hour
      : fallbackHour;
  const nextMinute =
    Number.isInteger(minute) && minute >= 0 && minute <= 59
      ? minute
      : fallbackMinute;

  return {
    hour: nextHour,
    minute: nextMinute,
  };
};

export const getDefaultNotificationCategoryPreferences =
  (): NotificationCategoryPreferences => ({
    'calculator-reports': true,
    'daily-summary': true,
    'measurement-records': true,
    'mutation-tracker': true,
    'portal-follow-up': true,
    'village-diary': true,
  });

export const getDefaultNotificationCategoryTimes =
  (): NotificationCategoryTimePreferences =>
    NOTIFICATION_CATEGORY_CONFIGS.reduce(
      (accumulator, config) => {
        accumulator[config.id] = {
          hour: config.defaultHour,
          minute: config.defaultMinute,
        };
        return accumulator;
      },
      {} as NotificationCategoryTimePreferences,
    );

export const loadNotificationMasterPreference =
  async (): Promise<boolean | null> => {
    const rawValue = await AsyncStorage.getItem(
      NOTIFICATION_MASTER_STORAGE_KEY,
    );

    if (rawValue === 'true') {
      return true;
    }

    if (rawValue === 'false') {
      return false;
    }

    return null;
  };

export const persistNotificationMasterPreference = async (
  value: boolean,
) => {
  await AsyncStorage.setItem(
    NOTIFICATION_MASTER_STORAGE_KEY,
    value ? 'true' : 'false',
  );
};

export const loadNotificationCategoryPreferences =
  async (): Promise<NotificationCategoryPreferences> => {
    const defaultValue =
      getDefaultNotificationCategoryPreferences();
    const rawValue = await AsyncStorage.getItem(
      NOTIFICATION_CATEGORY_STORAGE_KEY,
    );

    if (!rawValue) {
      return defaultValue;
    }

    try {
      const parsedValue = JSON.parse(rawValue);

      return NOTIFICATION_CATEGORY_IDS.reduce(
        (accumulator, id) => {
          accumulator[id] =
            typeof parsedValue?.[id] === 'boolean'
              ? parsedValue[id]
              : defaultValue[id];
          return accumulator;
        },
        {} as NotificationCategoryPreferences,
      );
    } catch {
      return defaultValue;
    }
  };

export const persistNotificationCategoryPreferences =
  async (value: NotificationCategoryPreferences) => {
    await AsyncStorage.setItem(
      NOTIFICATION_CATEGORY_STORAGE_KEY,
      JSON.stringify(value),
    );
  };

export const loadNotificationCategoryTimes =
  async (): Promise<NotificationCategoryTimePreferences> => {
    const defaultValue =
      getDefaultNotificationCategoryTimes();
    const rawValue = await AsyncStorage.getItem(
      NOTIFICATION_TIME_STORAGE_KEY,
    );

    if (!rawValue) {
      return defaultValue;
    }

    try {
      const parsedValue = JSON.parse(rawValue);

      return NOTIFICATION_CATEGORY_CONFIGS.reduce(
        (accumulator, config) => {
          const savedTime = parsedValue?.[config.id];
          accumulator[config.id] = getNormalizedTime(
            savedTime?.hour,
            savedTime?.minute,
            config.defaultHour,
            config.defaultMinute,
          );
          return accumulator;
        },
        {} as NotificationCategoryTimePreferences,
      );
    } catch {
      return defaultValue;
    }
  };

export const persistNotificationCategoryTimes = async (
  value: NotificationCategoryTimePreferences,
) => {
    await AsyncStorage.setItem(
      NOTIFICATION_TIME_STORAGE_KEY,
      JSON.stringify(value),
    );
  };

const loadPortalRecentSearchCount = async () => {
  const rawHistory = await AsyncStorage.getItem(
    UP_BHULEKH_HISTORY_STORAGE_KEY,
  );

  if (!rawHistory) {
    return 0;
  }

  try {
    const parsedValue = JSON.parse(rawHistory);
    return Array.isArray(parsedValue)
      ? parsedValue.length
      : 0;
  } catch {
    return 0;
  }
};

const loadTotalSavedCount = async (toolIds: readonly string[]) => {
  const records = await Promise.all(
    toolIds.map(toolId => loadWorkspaceRecords(toolId)),
  );

  return records.reduce(
    (accumulator, nextRecords) =>
      accumulator + nextRecords.length,
    0,
  );
};

export const buildNotificationSnapshot =
  async (): Promise<NotificationSnapshot> => {
    const [
      villageDiaryRecords,
      mutationTrackerRecords,
      measurementCount,
      calculatorCount,
      portalRecentSearchCount,
      savedPortalPreset,
      savedStateSelection,
    ] = await Promise.all([
      loadWorkspaceRecords('village-diary'),
      loadWorkspaceRecords('mutation-tracker'),
      loadTotalSavedCount(MEASUREMENT_STORAGE_TOOL_IDS),
      loadTotalSavedCount(CALCULATOR_STORAGE_TOOL_IDS),
      loadPortalRecentSearchCount(),
      AsyncStorage.getItem(UP_BHULEKH_PRESET_STORAGE_KEY),
      AsyncStorage.getItem(STATE_SELECTION_STORAGE_KEY),
    ]);

    const villageDiaryCount = villageDiaryRecords.length;
    const mutationTrackerCount = mutationTrackerRecords.length;
    const totalSavedCount =
      villageDiaryCount +
      mutationTrackerCount +
      measurementCount +
      calculatorCount;

    return {
      calculatorCount,
      hasSavedPortalPreset: savedPortalPreset !== null,
      hasSavedStateSelection: savedStateSelection !== null,
      measurementCount,
      mutationTrackerCount,
      portalRecentSearchCount,
      totalSavedCount,
      villageDiaryCount,
    };
  };

export const getEnabledNotificationCategoryCount = (
  preferences: NotificationCategoryPreferences,
) =>
  Object.values(preferences).filter(Boolean).length;

const pluralize = (
  count: number,
  singular: string,
  plural: string,
) => (count === 1 ? singular : plural);

export const buildNotificationPayload = (
  categoryId: NotificationCategoryId,
  snapshot: NotificationSnapshot,
  language: LanguageCode,
): NotificationPayload => {
  if (categoryId === 'daily-summary') {
    if (language === 'hi') {
      return snapshot.totalSavedCount > 0
        ? {
            message: `${snapshot.totalSavedCount} saved work item review ke liye ready hain. Aaj ka follow-up aur field work check kar lein.`,
            title: 'Smart Work reminder',
          }
        : {
            message:
              'Aaj ke portals, measurement aur follow-up work ko ek baar check kar lein.',
            title: 'Smart Work reminder',
          };
    }

    return snapshot.totalSavedCount > 0
      ? {
          message: `You have ${snapshot.totalSavedCount} saved work ${pluralize(
            snapshot.totalSavedCount,
            'item',
            'items',
          )} ready for review across the app.`,
          title: 'Smart Work reminder',
        }
      : {
          message:
            'Review today\'s portals, measurements, and follow-up work once.',
          title: 'Smart Work reminder',
        };
  }

  if (categoryId === 'portal-follow-up') {
    if (language === 'hi') {
      return snapshot.portalRecentSearchCount > 0 ||
        snapshot.hasSavedPortalPreset ||
        snapshot.hasSavedStateSelection
        ? {
            message: `Portal work ready hai. ${snapshot.portalRecentSearchCount} recent search aur saved state ko reopen karke verify karein.`,
            title: 'Portal follow-up',
          }
        : {
            message:
              'Bhulekh, Khasra aur Bhu Naksha par aaj ka pending portal work check karein.',
            title: 'Portal follow-up',
          };
    }

    return snapshot.portalRecentSearchCount > 0 ||
      snapshot.hasSavedPortalPreset ||
      snapshot.hasSavedStateSelection
      ? {
          message: `Reopen portal work and verify ${snapshot.portalRecentSearchCount} recent Bhulekh ${pluralize(
            snapshot.portalRecentSearchCount,
            'search',
            'searches',
          )}.`,
          title: 'Portal follow-up',
        }
      : {
          message:
            'Check Bhulekh, Khasra, and Bhu Naksha if you have portal work pending today.',
          title: 'Portal follow-up',
        };
  }

  if (categoryId === 'village-diary') {
    if (language === 'hi') {
      return snapshot.villageDiaryCount > 0
        ? {
            message: `Village Diary me ${snapshot.villageDiaryCount} saved record hain. Pending work aur next step update karein.`,
            title: 'Village Diary reminder',
          }
        : {
            message:
              'Aaj ki village visit notes aur follow-up ko Village Diary me save karein.',
            title: 'Village Diary reminder',
          };
    }

    return snapshot.villageDiaryCount > 0
      ? {
          message: `Village Diary has ${snapshot.villageDiaryCount} saved ${pluralize(
            snapshot.villageDiaryCount,
            'record',
            'records',
          )} waiting for review.`,
          title: 'Village Diary reminder',
        }
      : {
          message:
            'Capture today\'s village visit notes and next-step follow-up in Village Diary.',
          title: 'Village Diary reminder',
        };
  }

  if (categoryId === 'mutation-tracker') {
    if (language === 'hi') {
      return snapshot.mutationTrackerCount > 0
        ? {
            message: `Mutation Tracker me ${snapshot.mutationTrackerCount} saved case hain. Status aur follow-up recheck karein.`,
            title: 'Mutation Tracker reminder',
          }
        : {
            message:
              'Pending mutation case ka status aur next update ek baar check karein.',
            title: 'Mutation Tracker reminder',
          };
    }

    return snapshot.mutationTrackerCount > 0
      ? {
          message: `Mutation Tracker has ${snapshot.mutationTrackerCount} saved ${pluralize(
            snapshot.mutationTrackerCount,
            'case',
            'cases',
          )} waiting for follow-up.`,
          title: 'Mutation Tracker reminder',
        }
      : {
          message:
            'Review pending mutation status and next follow-up once today.',
          title: 'Mutation Tracker reminder',
        };
  }

  if (categoryId === 'measurement-records') {
    if (language === 'hi') {
      return snapshot.measurementCount > 0
        ? {
            message: `${snapshot.measurementCount} saved measurement report ready hain. Boundary aur field sketch dobara check karein.`,
            title: 'Measurement reminder',
          }
        : {
            message:
              'Field measurement, boundary report ya area check ko review kar lein.',
            title: 'Measurement reminder',
          };
    }

    return snapshot.measurementCount > 0
      ? {
          message: `${snapshot.measurementCount} saved measurement ${pluralize(
            snapshot.measurementCount,
            'report is',
            'reports are',
          )} ready to review or export.`,
          title: 'Measurement reminder',
        }
      : {
          message:
            'Review field measurements, boundary checks, or plot sketches when needed.',
          title: 'Measurement reminder',
        };
  }

  if (language === 'hi') {
    return snapshot.calculatorCount > 0
      ? {
          message: `${snapshot.calculatorCount} saved calculator report ready hain. Share ya export se pehle compare karein.`,
          title: 'Calculator reminder',
        }
      : {
          message:
            'Registry, hissa aur rate calculation ko zarurat par dobara check karein.',
          title: 'Calculator reminder',
        };
  }

  return snapshot.calculatorCount > 0
    ? {
        message: `${snapshot.calculatorCount} saved calculator ${pluralize(
          snapshot.calculatorCount,
          'report is',
          'reports are',
        )} ready to compare or share.`,
        title: 'Calculator reminder',
      }
    : {
        message:
          'Recheck registry, hissa, and rate calculations before final use.',
        title: 'Calculator reminder',
      };
};

export const cancelAllNotificationSchedules = async () => {
  if (!smartWorkNotifications.isAvailable) {
    return false;
  }

  await Promise.all(
    NOTIFICATION_CATEGORY_CONFIGS.map(config =>
      smartWorkNotifications.cancelReminder(
        config.requestCode,
      ),
    ),
  );

  return true;
};

export const syncNotificationSchedules = async (
  masterEnabled: boolean,
  language: LanguageCode,
) => {
  if (!smartWorkNotifications.isAvailable) {
    return false;
  }

  const [preferences, times] = await Promise.all([
    loadNotificationCategoryPreferences(),
    loadNotificationCategoryTimes(),
  ]);

  if (!masterEnabled) {
    await cancelAllNotificationSchedules();
    return true;
  }

  const snapshot = await buildNotificationSnapshot();

  await Promise.all(
    NOTIFICATION_CATEGORY_CONFIGS.map(config => {
      if (!preferences[config.id]) {
        return smartWorkNotifications.cancelReminder(
          config.requestCode,
        );
      }

      const payload = buildNotificationPayload(
        config.id,
        snapshot,
        language,
      );
      const scheduledTime = times[config.id];

      return smartWorkNotifications.scheduleReminder(
        config.requestCode,
        scheduledTime.hour,
        scheduledTime.minute,
        payload.title,
        payload.message,
      );
    }),
  );

  return true;
};

export const sendNotificationTest = async (
  language: LanguageCode,
) => {
  if (!smartWorkNotifications.isAvailable) {
    return false;
  }

  const snapshot = await buildNotificationSnapshot();
  const payload = buildNotificationPayload(
    'daily-summary',
    snapshot,
    language,
  );

  await smartWorkNotifications.showInstantNotification(
    payload.title,
    payload.message,
  );

  return true;
};
