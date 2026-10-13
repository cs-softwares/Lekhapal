import { z } from 'zod';
import { URL } from 'react-native-url-polyfill';

export const FEEDING_URL = 'https://ekhasra.up.gov.in/#/SelectLogin';
// Kept separate from the approved Custom Tab login. Matches the reference's
// desktop browser presentation; live compatibility still needs device testing.
export const FEEDING_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';
export const feedingStages = [
  'list',
  'owner',
  'land',
  'fallow',
  'trees',
  'crop',
  'remarks',
  'login',
  'other',
] as const;
export type FeedingStage = (typeof feedingStages)[number];
export type FeedingContext = {
  year: string;
  season: 'kharif' | 'rabi' | 'zaid';
  village: string;
  villageCode: string;
};
export type FeedingMode = 'manual' | 'normal' | 'advanced';
const text = z.string().max(2000);
const fieldSchema = z.object({
  ref: text,
  key: text,
  label: text,
  kind: z.enum(['text', 'number', 'select', 'checkbox', 'radio', 'textarea']),
  value: text,
  required: z.boolean(),
  formRef: text.optional(),
  options: z.array(z.object({ value: text, label: text })).max(1000),
});
const actionSchema = z.object({
  ref: text,
  label: text,
  kind: z.enum(['save', 'lock', 'navigate', 'other']),
  formRef: text.optional(),
});
const plotSchema = z.object({
  ref: text,
  gata: z.string().min(1).max(80),
  status: z.enum(['available', 'locked', 'completed', 'unavailable']),
});
export const feedingSnapshotSchema = z.object({
  type: z.literal('snapshot'),
  channel: z.literal('lekhpal-feeding-v1'),
  documentId: text,
  revision: z.number().int().nonnegative(),
  url: text,
  stage: z.enum(feedingStages),
  busy: z.boolean(),
  unsupported: z.boolean(),
  fields: z.array(fieldSchema).max(150),
  actions: z.array(actionSchema).max(150),
  heading: text,
  message: text,
  plots: z.array(plotSchema).max(1000).optional(),
  listSearch: z.object({ ref: text, value: text }).optional(),
  listPagination: z.object({ key: text, nextRef: text.optional() }).optional(),
  plotIdentity: z.string().max(80).optional(),
  plotArea: z.string().max(80).optional(),
  remainingArea: z.string().max(80).optional(),
  treeRows: z
    .array(z.object({ type: text, count: z.string().regex(/^\d+$/) }))
    .max(100)
    .optional(),
  landRows: z
    .array(z.object({ type: text, area: text }))
    .max(100)
    .optional(),
  cropRows: z
    .array(
      z.object({
        crop: text,
        area: z.string().max(80),
        irrigated: z.boolean(),
      }),
    )
    .max(100)
    .optional(),
  governmentLandSignal: z.boolean().optional(),
  officialContext: z
    .object({
      year: text.optional(),
      season: z.enum(['kharif', 'rabi', 'zaid']).optional(),
      villageCode: text.optional(),
      village: text.optional(),
    })
    .optional(),
});
export type FeedingSnapshot = z.infer<typeof feedingSnapshotSchema>;
export type FeedingField = z.infer<typeof fieldSchema>;
export type FeedingAction = z.infer<typeof actionSchema>;
export type FeedingValues = Record<string, string>;
export const feedingPresetSchema = z.object({
  stage: z.enum(feedingStages),
  fields: z
    .array(fieldSchema.pick({ key: true, kind: true, value: true }))
    .max(150),
});
export const feedingPresetsSchema = z.record(z.string(), feedingPresetSchema);
export type FeedingPreset = z.infer<typeof feedingPresetSchema>;
export const feedingReceiptSchema = z.object({
  id: text,
  at: text,
  context: z.object({
    year: text,
    season: z.enum(['kharif', 'rabi', 'zaid']),
    village: text,
    villageCode: text,
  }),
  stage: z.enum(feedingStages),
  action: text,
  outcome: z.enum(['filled', 'portal-success', 'failed', 'uncertain']),
  message: text,
  gata: z.string().max(80).optional(),
  actionKind: z.enum(['save', 'lock', 'navigate', 'other']).optional(),
});
export type FeedingReceipt = z.infer<typeof feedingReceiptSchema>;
export const feedingResultSchema = z.object({
  type: z.literal('result'),
  channel: z.literal('lekhpal-feeding-v1'),
  id: text,
  outcome: z.enum([
    'filled',
    'clicked',
    'portal-success',
    'failed',
    'uncertain',
  ]),
  message: text,
});

function isOfficialUrl(value: string, hosts: readonly string[]): boolean {
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      hosts.includes(u.hostname) &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === '443')
    );
  } catch {
    return false;
  }
}
export const isFeedingUrl = (value: string): boolean =>
  isOfficialUrl(value, ['ekhasra.up.gov.in']);
// The live SelectLogin page links its Lekhpal role to RCCMS (9 October 2026).
// RCCMS is allowed for authentication only; never run the survey bridge there.
export const isFeedingNavigationUrl = (value: string): boolean =>
  isOfficialUrl(value, ['ekhasra.up.gov.in', 'rccms.up.gov.in']);
export function validateFeedingContext(context: FeedingContext): string | null {
  if (!/^14\d{2}$/.test(context.year))
    return 'Enter the Fasli year shown on the portal (four digits).';
  if (!context.village.trim()) return 'Enter the village shown on the portal.';
  if (!/^\d{6}$/.test(context.villageCode))
    return 'Enter the six-digit village code shown on the portal.';
  return null;
}
export const feedingScopeKey = (context: FeedingContext) =>
  `lekhpal-feeding-UP-${context.year}-${context.season}-${encodeURIComponent(
    context.villageCode,
  )}`;

export function validateFeedingValues(
  snapshot: FeedingSnapshot,
  values: FeedingValues,
): string | null {
  if (!isFeedingUrl(snapshot.url) || snapshot.busy || snapshot.unsupported)
    return 'Wait for the official form to be ready.';
  if (['login', 'other', 'list', 'owner'].includes(snapshot.stage))
    return 'Open a supported survey entry form first.';
  if (!snapshot.fields.length) return 'No editable survey fields were found.';
  for (const field of snapshot.fields) {
    const value = values[field.ref] ?? field.value;
    if (field.required && !value.trim()) return `Enter ${field.label}.`;
    if (field.kind === 'checkbox' && field.required && value !== 'true')
      return `Confirm ${field.label}.`;
    if (field.kind === 'radio' && field.required) {
      const group = field.key.split('|')[2];
      if (
        !snapshot.fields.some(
          f =>
            f.kind === 'radio' &&
            f.key.split('|')[2] === group &&
            (values[f.ref] ?? f.value) === 'true',
        )
      )
        return `Choose ${field.label}.`;
    }
    if (
      (field.kind === 'number' || isPlotAreaField(field)) &&
      value &&
      (!Number.isFinite(Number(value)) || Number(value) < 0)
    )
      return `Enter a valid non-negative value for ${field.label}.`;
    if (
      field.kind === 'select' &&
      value &&
      !field.options.some(option => option.value === value)
    )
      return `Choose a current option for ${field.label}.`;
    if (
      ['radio', 'checkbox'].includes(field.kind) &&
      !['true', 'false'].includes(value)
    )
      return `Choose ${field.label}.`;
    if (value.length > 2000) return `${field.label} is too long.`;
  }
  return null;
}

export function createFeedingPreset(
  snapshot: FeedingSnapshot,
  values: FeedingValues,
): FeedingPreset {
  return {
    stage: snapshot.stage,
    fields: snapshot.fields.map(field => ({
      key: field.key,
      kind: field.kind,
      value: values[field.ref] ?? field.value,
    })),
  };
}
// Areas belong to a plot, never to a reusable village/season crop preset.
// Keep the current official value, including an empty value requiring review.
export function isPlotAreaField(field: FeedingField): boolean {
  return (
    ['text', 'number'].includes(field.kind) &&
    /(?:^|[|\s/_-])area(?:$|[|\s/_-])|क्षेत्रफल|रकबा/i.test(
      `${field.key} ${field.label}`,
    )
  );
}
export function applyFeedingPreset(
  snapshot: FeedingSnapshot,
  preset?: FeedingPreset,
): FeedingValues | null {
  if (
    !preset ||
    preset.stage !== snapshot.stage ||
    preset.fields.length !== snapshot.fields.length ||
    new Set(snapshot.fields.map(f => f.key)).size !== snapshot.fields.length
  )
    return null;
  const values: FeedingValues = {};
  for (const field of snapshot.fields) {
    const saved = preset.fields.find(
      item => item.key === field.key && item.kind === field.kind,
    );
    if (!saved) return null;
    values[field.ref] = isPlotAreaField(field) ? field.value : saved.value;
  }
  return validateFeedingValues(snapshot, values) ? null : values;
}

export type FeedingCommand = {
  id: string;
  documentId: string;
  revision: number;
  url: string;
  type: 'fill' | 'action' | 'stop' | 'plot' | 'search' | 'page';
  values?: FeedingValues;
  actionRef?: string;
  plotRef?: string;
  gata?: string;
  query?: string;
};
export const buildFeedingCommand = (command: FeedingCommand) =>
  `window.__lekhpalFeeding && window.__lekhpalFeeding.command(${JSON.stringify(
    command,
  ).replace(/</g, '\\u003c')}); true;`;
