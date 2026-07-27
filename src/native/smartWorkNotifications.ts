import {NativeModules} from 'react-native';

type SmartWorkNotificationsModule = {
  areNotificationsEnabled: () => Promise<boolean>;
  cancelReminder: (requestCode: number) => Promise<boolean>;
  cancelDailyReminder: () => Promise<boolean>;
  scheduleReminder: (
    requestCode: number,
    hour: number,
    minute: number,
    title: string,
    message: string,
  ) => Promise<boolean>;
  scheduleDailyReminder: (
    hour: number,
    minute: number,
    title: string,
    message: string,
  ) => Promise<boolean>;
  showInstantNotification: (
    title: string,
    message: string,
  ) => Promise<boolean>;
};

const nativeNotifications =
  NativeModules.SmartWorkNotifications as
    | SmartWorkNotificationsModule
    | undefined;

export const smartWorkNotifications = {
  areNotificationsEnabled: () =>
    nativeNotifications?.areNotificationsEnabled?.() ??
    Promise.resolve(false),
  cancelReminder: (requestCode: number) =>
    nativeNotifications?.cancelReminder?.(requestCode) ??
    Promise.resolve(false),
  cancelDailyReminder: () =>
    nativeNotifications?.cancelDailyReminder?.() ??
    Promise.resolve(false),
  isAvailable: Boolean(nativeNotifications),
  scheduleReminder: (
    requestCode: number,
    hour: number,
    minute: number,
    title: string,
    message: string,
  ) =>
    nativeNotifications?.scheduleReminder?.(
      requestCode,
      hour,
      minute,
      title,
      message,
    ) ?? Promise.resolve(false),
  scheduleDailyReminder: (
    hour: number,
    minute: number,
    title: string,
    message: string,
  ) =>
    nativeNotifications?.scheduleDailyReminder?.(
      hour,
      minute,
      title,
      message,
    ) ?? Promise.resolve(false),
  showInstantNotification: (
    title: string,
    message: string,
  ) =>
    nativeNotifications?.showInstantNotification?.(
      title,
      message,
    ) ?? Promise.resolve(false),
};
