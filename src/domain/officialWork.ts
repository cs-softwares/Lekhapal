import { z } from 'zod';
import { URL } from 'react-native-url-polyfill';
export const OFFICIAL_WORK = {
  survey9: {
    en: 'Survey-9 Approval',
    hi: 'सर्वेक्षण-9 अनुमोदन',
    url: 'https://svamitva.up.gov.in/public/homePage_login.jsp',
    host: 'svamitva.up.gov.in',
  },
  inspector: {
    en: 'Revenue Inspector Approval',
    hi: 'राजस्व निरीक्षक अनुमोदन',
    url: 'https://ekhasra.up.gov.in/#/SelectLogin',
    host: 'ekhasra.up.gov.in',
  },
  'svamitva-pdf': {
    en: 'SVAMITVA / Tehsil Documents',
    hi: 'स्वामित्व / तहसील दस्तावेज',
    url: 'https://svamitva.up.gov.in/public/homePage_login.jsp',
    host: 'svamitva.up.gov.in',
  },
  registry: {
    en: 'Farmer Registry',
    hi: 'किसान रजिस्ट्री',
    url: 'https://upfr.agristack.gov.in/farmer-registry-up/#/',
    host: 'upfr.agristack.gov.in',
  },
  census: {
    en: 'Agricultural Census',
    hi: 'कृषि गणना',
    url: 'https://agcensus.gov.in/AgriCensus/Agri_2122.jsp',
    host: 'agcensus.gov.in',
  },
  echawadi: {
    en: 'Maharashtra e-Chawadi',
    hi: 'महाराष्ट्र ई-चावड़ी',
    url: 'https://echawadi.mahabhumi.gov.in/#/generate-revenue/demandGeneration',
    host: 'echawadi.mahabhumi.gov.in',
  },
} as const;
export type OfficialWorkModule = keyof typeof OFFICIAL_WORK;
export function isOfficialWorkUrl(module: OfficialWorkModule, value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.port &&
      (u.hostname === OFFICIAL_WORK[module].host ||
        (module === 'inspector' && u.hostname === 'rccms.up.gov.in'))
    );
  } catch {
    return false;
  }
}
const text = z.string().max(4000);
export const officialWorkSnapshotSchema = z.object({
  channel: z.literal('lekhpal-official-work-v1'),
  type: z.literal('snapshot'),
  documentId: text,
  revision: z.number().int(),
  url: text,
  stage: z.enum(['login', 'list', 'entry', 'document', 'other']),
  busy: z.boolean(),
  identity: text,
  context: text.default(''),
  censusOperatedArea: z
    .string()
    .regex(/^\d+(?:\.\d{1,4})?$/)
    .optional(),
  censusAreas: z
    .array(
      z.object({
        index: z.string().regex(/^\d+$/),
        area: z.string().regex(/^\d+(?:\.\d{1,4})?$/),
      }),
    )
    .max(500)
    .optional(),
  censusOperatedStatus: text.optional(),
  censusCalculated: z.boolean().optional(),
  censusPopup: z.enum(['serial', 'survey', 'crop']).optional(),
  censusChoices: z
    .array(
      z.object({ ref: text, code: text, label: text, checked: z.boolean() }),
    )
    .max(2000)
    .optional(),
  censusSurveyArea: z.string().optional(),
  censusCropCodes: z.array(text).max(20).optional(),
  fields: z
    .array(
      z.object({
        ref: text,
        key: text,
        label: text,
        value: text,
        kind: z.enum(['text', 'select', 'checkbox', 'radio', 'number']),
        options: z.array(z.object({ value: text, label: text })),
      }),
    )
    .max(500),
  actions: z
    .array(
      z.object({
        ref: text,
        label: text,
        kind: z.enum([
          'navigate',
          'save',
          'approve',
          'select-approval',
          'export',
        ]),
      }),
    )
    .max(500),
  entries: z.array(z.object({ ref: text, key: text, label: text })).max(1000),
  notice: text,
  success: z.boolean(),
  error: z.boolean(),
  nameMatch: z.number().optional(),
});
export type OfficialWorkSnapshot = z.infer<typeof officialWorkSnapshotSchema>;
export const officialWorkJournalSchema = z.object({
  id: text,
  record: text,
  at: text,
  action: text,
  state: z.enum(['pending', 'confirmed', 'uncertain', 'failed']),
  message: text,
});
export type OfficialWorkJournal = z.infer<typeof officialWorkJournalSchema>;
export const officialWorkScript = (command: object) =>
  `window.__lekhpalOfficialWork && window.__lekhpalOfficialWork.command(${JSON.stringify(
    command,
  ).replace(/</g, '\\u003c')}); true;`;

export function inspectorRange(
  page: OfficialWorkSnapshot,
  from: number,
  to: number,
) {
  const rows = page.fields.filter(f => f.kind === 'checkbox');
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 1 ||
    to < from ||
    to > rows.length
  )
    throw Error('Choose an approval range within the visible official rows.');
  if (new Set(rows.map(f => f.key)).size !== rows.length)
    throw Error('Approval rows are ambiguous. Review the official list.');
  return Object.fromEntries(
    rows.map((f, i) => [f.key, String(i >= from - 1 && i < to)]),
  );
}
