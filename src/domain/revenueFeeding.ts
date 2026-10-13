import { z } from 'zod';
import { URL } from 'react-native-url-polyfill';

export const revenueModuleSchema = z.enum(['ansh', 'ansh-delete', 'prapatra5']);
export type RevenueModule = z.infer<typeof revenueModuleSchema>;
export const REVENUE_MODULES = {
  ansh: {
    en: 'Ansh Nirdharan',
    hi: 'अंश निर्धारण',
    url: 'https://upbhulekh.gov.in/bhulekh/',
  },
  'ansh-delete': {
    en: 'Remove Ansh Entry',
    hi: 'अंश प्रविष्टि हटाएं',
    url: 'https://upbhulekh.gov.in/bhulekh/',
  },
  prapatra5: {
    en: 'Prapatra-5 Feeding',
    hi: 'प्रपत्र-5 फीडिंग',
    url: 'https://svamitva.up.gov.in/public/homePage_login.jsp',
  },
} as const;
export function isRevenueUrl(module: RevenueModule, value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      url.hostname ===
        (module === 'prapatra5' ? 'svamitva.up.gov.in' : 'upbhulekh.gov.in')
    );
  } catch {
    return false;
  }
}
const text = z.string().max(2000);
export const revenueSnapshotSchema = z.object({
  channel: z.literal('lekhpal-revenue-v1'),
  type: z.literal('snapshot'),
  module: revenueModuleSchema,
  documentId: text,
  revision: z.number().int().nonnegative(),
  url: text,
  stage: z.enum([
    'login',
    'selection',
    'share',
    'delete',
    'property',
    'check',
    'boundaries',
    'owners',
    'remarks',
    'result',
    'other',
  ]),
  busy: z.boolean(),
  failed: z.boolean(),
  ownersReady: z.boolean(),
  fields: z
    .array(
      z.object({
        ref: text,
        key: text,
        label: text,
        kind: z.enum(['text', 'number', 'select', 'textarea']),
        value: text,
        readOnly: z.boolean(),
        required: z.boolean(),
        options: z.array(z.object({ value: text, label: text })).max(2000),
      }),
    )
    .max(120),
  actions: z
    .array(
      z.object({
        ref: text,
        label: text,
        kind: z.enum([
          'navigate',
          'save',
          'delete',
          'owner-save',
          'final-save',
        ]),
      }),
    )
    .max(30),
  context: text.optional(),
  selection: z.object({ gata: text, owner: text }),
  ownerProof: z
    .object({ key: text, count: z.number().int().nonnegative() })
    .optional(),
  ownerCounts: z.record(z.string(), z.number().int().nonnegative()),
  notice: text,
  result: z.enum(['saved', 'error', 'unconfirmed']),
});
export type RevenueSnapshot = z.infer<typeof revenueSnapshotSchema>;
export type RevenueField = RevenueSnapshot['fields'][number];
export type RevenueAction = RevenueSnapshot['actions'][number];
export const revenueResultSchema = z.object({
  channel: z.literal('lekhpal-revenue-v1'),
  type: z.literal('result'),
  id: text,
  outcome: z.enum(['filled', 'clicked', 'confirmed', 'failed', 'uncertain']),
  message: text,
});
export type RevenueCommand = {
  id: string;
  documentId: string;
  revision: number;
  url: string;
  type: 'fill' | 'action' | 'stop';
  values?: Record<string, string>;
  actionRef?: string;
};
export const revenueCommandScript = (command: RevenueCommand) =>
  `window.__lekhpalRevenue && window.__lekhpalRevenue.command(${JSON.stringify(
    command,
  ).replace(/</g, '\\u003c')}); true;`;

// The reference accepts 1/n and rounds area to four decimal places.
// Integer arithmetic keeps decimal rounding predictable, including .00005.
export function anshShare(
  area: string,
  share: string,
): { share: string; hissa: string } {
  const fraction = share.replace(/\s/g, '');
  if (
    !/^1\/[1-9]\d{0,8}$/.test(fraction) ||
    !/^\d{1,12}(?:\.\d{1,12})?$/.test(area.trim())
  )
    throw new Error('Enter a valid plot area and a share such as 1/2 or 1/5.');
  const [whole, decimals = ''] = area.trim().split('.');
  const scale = 10n ** BigInt(decimals.length);
  const numerator = BigInt(whole + decimals) * 10000n;
  const denominator = scale * BigInt(fraction.slice(2));
  const rounded = (numerator * 2n + denominator) / (denominator * 2n);
  return {
    share: fraction,
    hissa: `${rounded / 10000n}.${String(rounded % 10000n).padStart(4, '0')}`,
  };
}
export function validateRevenueValues(
  page: RevenueSnapshot,
  values: Record<string, string>,
) {
  for (const [ref, value] of Object.entries(values)) {
    const field = page.fields.find(f => f.ref === ref);
    if (!field || field.readOnly)
      return 'The field changed. Review the official page.';
    if (value.length > 2000 || (field.required && !value.trim()))
      return `Enter ${field.label}.`;
    if (field.kind === 'select' && !field.options.some(o => o.value === value))
      return `Choose a current ${field.label} option.`;
    if (
      (field.kind === 'number' || /^(?:hissa|area)$/.test(field.key)) &&
      value &&
      (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value)))
    )
      return `Enter a valid ${field.label}.`;
    if (
      /^(?:share|owner_hissa)$/.test(field.key) &&
      value &&
      (!/^\d+\/[1-9]\d*$/.test(value) ||
        Number(value.split('/')[0]) > Number(value.split('/')[1]))
    )
      return 'Enter a fraction from 0 to 1, such as 1/2.';
  }
  return null;
}
export const revenueJournalSchema = z.object({
  id: text,
  module: revenueModuleSchema,
  at: text,
  url: text,
  documentId: text,
  action: text,
  kind: z.enum(['navigate', 'save', 'delete', 'owner-save', 'final-save']),
  stage: revenueSnapshotSchema.shape.stage,
  gata: text,
  owner: text,
  ownerKey: text.optional(),
  baseline: z.number().int().nonnegative().optional(),
  property: z
    .object({ village: text, survey: text, gata: text, number: text })
    .optional(),
  outcome: z.enum(['pending', 'confirmed', 'failed', 'uncertain']),
  message: text,
});
export type RevenueJournal = z.infer<typeof revenueJournalSchema>;
