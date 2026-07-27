import {LocalizedText} from '../types/tool';

export type NotificationCategoryId =
  | 'daily-summary'
  | 'portal-follow-up'
  | 'village-diary'
  | 'mutation-tracker'
  | 'measurement-records'
  | 'calculator-reports';

export type NotificationCategoryConfig = {
  accentColor: string;
  defaultHour: number;
  defaultMinute: number;
  description: LocalizedText;
  iconName: string;
  id: NotificationCategoryId;
  requestCode: number;
  title: LocalizedText;
};

const text = (en: string, hi: string): LocalizedText => ({
  en,
  hi,
});

export const NOTIFICATION_MASTER_STORAGE_KEY =
  'lekhpal-smart-work-notifications-enabled';
export const NOTIFICATION_CATEGORY_STORAGE_KEY =
  'lekhpal-smart-work-notification-categories-v1';
export const NOTIFICATION_TIME_STORAGE_KEY =
  'lekhpal-smart-work-notification-times-v1';

export const NOTIFICATION_CATEGORY_CONFIGS: NotificationCategoryConfig[] =
  [
    {
      accentColor: '#1D4ED8',
      defaultHour: 20,
      defaultMinute: 0,
      description: text(
        'One combined reminder for saved work across the app.',
        'App ke saved work ka ek combined reminder.',
      ),
      iconName: 'bell-badge-outline',
      id: 'daily-summary',
      requestCode: 9200,
      title: text('Daily summary', 'Daily summary'),
    },
    {
      accentColor: '#0F766E',
      defaultHour: 9,
      defaultMinute: 15,
      description: text(
        'Reminder to reopen Bhulekh, Khasra, and portal follow-up.',
        'Bhulekh, Khasra aur portal follow-up dobara dekhne ka reminder.',
      ),
      iconName: 'domain',
      id: 'portal-follow-up',
      requestCode: 9201,
      title: text('Portal follow-up', 'Portal follow-up'),
    },
    {
      accentColor: '#0284C7',
      defaultHour: 10,
      defaultMinute: 0,
      description: text(
        'Review village visit notes, pending work, and next step.',
        'Village visit notes, pending work aur next step review karein.',
      ),
      iconName: 'notebook-outline',
      id: 'village-diary',
      requestCode: 9202,
      title: text('Village Diary', 'Village Diary'),
    },
    {
      accentColor: '#F97316',
      defaultHour: 13,
      defaultMinute: 0,
      description: text(
        'Check saved mutation cases and follow-up status.',
        'Saved mutation cases aur follow-up status check karein.',
      ),
      iconName: 'source-merge',
      id: 'mutation-tracker',
      requestCode: 9203,
      title: text('Mutation Tracker', 'Mutation Tracker'),
    },
    {
      accentColor: '#7C3AED',
      defaultHour: 18,
      defaultMinute: 30,
      description: text(
        'Review saved field measurements and boundary reports.',
        'Saved field measurements aur boundary reports review karein.',
      ),
      iconName: 'ruler-square',
      id: 'measurement-records',
      requestCode: 9204,
      title: text('Measurement reports', 'Measurement reports'),
    },
    {
      accentColor: '#BE123C',
      defaultHour: 19,
      defaultMinute: 15,
      description: text(
        'Recheck saved calculator reports before sharing or export.',
        'Saved calculator reports share ya export se pehle dobara check karein.',
      ),
      iconName: 'calculator-variant-outline',
      id: 'calculator-reports',
      requestCode: 9205,
      title: text('Calculator reports', 'Calculator reports'),
    },
  ];

export const NOTIFICATION_CATEGORY_IDS =
  NOTIFICATION_CATEGORY_CONFIGS.map(config => config.id);
