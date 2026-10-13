import { z } from 'zod';
import { isOfficialWorkUrl } from './officialWork';

export const ECHAWADI_PAGES = {
  demand: {
    en: 'Demand generation',
    hi: 'मांग तैयार करें',
    path: '/generate-revenue/demandGeneration',
  },
  form8b: { en: 'Form 8B', hi: 'प्रपत्र 8बी', path: '/reports/Form8B' },
  receipts: {
    en: 'Receive payment',
    hi: 'भुगतान प्राप्त करें',
    path: '/transactions/receive-money',
  },
} as const;
export type EchawadiMode = keyof typeof ECHAWADI_PAGES;
export const demandRecordSchema = z.object({
  page: z.number().int().positive(),
  key: z.string().min(1).max(4000),
  amount: z.number().finite().nonnegative(),
});
export type DemandRecord = z.infer<typeof demandRecordSchema>;
export const echawadiUrl = (mode: EchawadiMode) =>
  `https://echawadi.mahabhumi.gov.in/#${ECHAWADI_PAGES[mode].path}`;
export function echawadiMode(url: string): EchawadiMode | undefined {
  if (!isOfficialWorkUrl('echawadi', url)) return undefined;
  return (Object.keys(ECHAWADI_PAGES) as EchawadiMode[]).find(
    mode => url.split('?')[0].toLowerCase() === echawadiUrl(mode).toLowerCase(),
  );
}
export const echawadiSnapshotSchema = z.object({
  channel: z.literal('lekhpal-echawadi-v1'),
  type: z.literal('snapshot'),
  documentId: z.string().max(100),
  revision: z.number().int().positive(),
  url: z.string().max(2000),
  mode: z.enum(['demand', 'form8b', 'receipts', 'other']),
  busy: z.boolean(),
  page: z.number().int().nonnegative(),
  next: z.boolean(),
  context: z.string().max(8000),
  payment: z
    .object({
      account: z.string().max(80),
      method: z.string().max(120),
      amount: z.number().finite().nullable(),
    })
    .optional(),
  canSubmit: z.boolean().optional(),
  selectedDemand: z.array(demandRecordSchema).max(10000).optional(),
  reportAccounts: z.array(z.string().max(80)).max(1000).optional(),
  headers: z.array(z.string().max(1000)).max(50),
  rows: z
    .array(
      z.object({
        key: z.string().max(4000),
        cells: z.array(z.string().max(4000)).max(50),
        amount: z.number().finite().nullable(),
        selectable: z.boolean(),
        checked: z.boolean(),
      }),
    )
    .max(1000),
});
export type EchawadiSnapshot = z.infer<typeof echawadiSnapshotSchema>;
export function receiptAccounts(text: string): string[] {
  const values = text
    .split(/[\n,;]+/)
    .map(s => s.trim().replace(/[०-९]/g, c => String(c.charCodeAt(0) - 2406)))
    .filter(Boolean);
  if (
    !values.length ||
    values.length > 1000 ||
    values.some(s => !/^[\d०-९][\d०-९/ -]{0,49}$/.test(s))
  ) {
    throw Error('Enter up to 1,000 account numbers, one per line.');
  }
  return [...new Set(values)];
}
export function demandThreshold(text: string): number {
  if (
    !/^\d+(?:\.\d{1,2})?$/.test(text.trim()) ||
    !Number.isFinite(Number(text))
  )
    throw Error('Enter a valid minimum amount, with up to two decimal places.');
  return Number(text);
}
export const echawadiScript = (
  page: EchawadiSnapshot,
  action: 'select' | 'next' | 'search' | 'cash' | 'submit' | 'export',
  value?:
    | string
    | number
    | {
        id: string;
        account: string;
        context: string;
        amount: number | null;
        demand?: DemandRecord[];
        confirmDemand?: boolean;
      },
) =>
  `window.__lekhpalEchawadi && window.__lekhpalEchawadi.command(${JSON.stringify(
    {
      documentId: page.documentId,
      revision: page.revision,
      url: page.url,
      action,
      value,
    },
  ).replace(/</g, '\\u003c')}); true;`;
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[
        c
      ]!),
  );
export function form8bHtml(pages: EchawadiSnapshot[]): string {
  if (
    !pages.length ||
    pages.some(p => p.mode !== 'form8b' || p.busy || !p.rows.length)
  )
    throw Error('Open the official Form 8B report before exporting.');
  return (
    '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:11px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #777;padding:4px}section{page-break-after:always}</style></head><body>' +
    pages
      .map(
        p =>
          `<section><h2>Form 8B · Page ${p.page || 1}</h2><p>${escape(
            p.context,
          )}</p><table><thead><tr>${p.headers
            .map(h => '<th>' + escape(h) + '</th>')
            .join('')}</tr></thead><tbody>${p.rows
            .map(
              r =>
                '<tr>' +
                r.cells.map(c => '<td>' + escape(c) + '</td>').join('') +
                '</tr>',
            )
            .join(
              '',
            )}</tbody></table><p>Copy of the displayed official report · ${escape(
            p.url,
          )}</p></section>`,
      )
      .join('') +
    '</body></html>'
  );
}
