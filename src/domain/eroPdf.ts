import { z } from 'zod';
import { URL } from 'react-native-url-polyfill';

export const ERO_URL = 'https://officials.eci.gov.in/login';
export const ERO_STORAGE = 'lekhpal-ero-pdfs-v1';
export function isEroUrl(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      u.hostname === 'officials.eci.gov.in' &&
      !u.port &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}
/** Sign-in navigation only; PDF commands remain restricted to the ERO origin. */
export function isEroBrowserUrl(value: string) {
  if (isEroUrl(value)) return true;
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      u.hostname === 'ecinet.eci.gov.in' &&
      !u.port &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}
const text = z.string().max(4000);
export const eroSnapshotSchema = z.object({
  channel: z.literal('lekhpal-ero-v1'),
  type: z.literal('snapshot'),
  documentId: text,
  revision: z.number().int(),
  url: text,
  stage: z.enum(['login', 'list', 'record', 'other']),
  busy: z.boolean(),
  context: text,
  page: z.number().int().nonnegative(),
  rows: z
    .array(
      z.object({
        ref: text,
        key: text,
        serial: z.number().int().positive(),
        label: text,
      }),
    )
    .max(100),
  next: text.optional(),
  previous: text.optional(),
  download: text.optional(),
  back: text.optional(),
});
export type EroSnapshot = z.infer<typeof eroSnapshotSchema>;
export const eroFileSchema = z.object({
  id: text,
  name: text,
  path: text,
  at: text,
  serial: z.number().int().nonnegative(),
  record: text,
  sourceName: text.optional(),
  batchId: text,
});
export type EroFile = z.infer<typeof eroFileSchema>;
export const eroBatchSchema = z.object({
  id: text,
  from: z.number().int().positive(),
  to: z.number().int().positive(),
  next: z.number().int().positive(),
  context: text,
  listUrl: text,
  done: z.array(z.number().int().positive()).max(1000),
});
export type EroBatch = z.infer<typeof eroBatchSchema>;
export const eroStoreSchema = z.object({
  files: eroFileSchema.array().max(1000),
  batch: eroBatchSchema.nullable(),
});
export type EroStore = z.infer<typeof eroStoreSchema>;
export function eroRange(from: string, to: string) {
  if (!/^[1-9]\d{0,5}$/.test(from) || !/^[1-9]\d{0,5}$/.test(to))
    throw Error('Enter positive whole-number serials. The first record is 1.');
  const a = Number(from),
    b = Number(to);
  if (b < a || b - a >= 500)
    throw Error('Choose a range of up to 500 records.');
  return { from: a, to: b };
}
/** Pagination is driven by observed serials, never a burst of blind Next clicks. */
export function eroListStep(
  page: EroSnapshot,
  batch: EroBatch,
):
  | { kind: 'open'; ref: string; row: EroSnapshot['rows'][number] }
  | { kind: 'next' | 'previous'; ref: string } {
  if (page.stage !== 'list' || !page.rows.length)
    throw Error('Open the Suo Moto DSE list with visible records.');
  if (page.context !== batch.context || page.url !== batch.listUrl)
    throw Error('The ERO list or its filters changed. Review the saved range.');
  const serials = page.rows.map(r => r.serial);
  if (
    new Set(serials).size !== serials.length ||
    new Set(page.rows.map(r => r.key)).size !== page.rows.length
  )
    throw Error('The ERO rows are ambiguous.');
  if (serials.some((n, i) => i > 0 && n !== serials[i - 1] + 1))
    throw Error('The ERO serial order changed.');
  const row = page.rows.find(r => r.serial === batch.next);
  if (row) return { kind: 'open' as const, ref: row.ref, row };
  const kind = batch.next > Math.max(...serials) ? 'next' : 'previous';
  const ref = page[kind];
  if (!ref) throw Error('The requested serial is not available in this list.');
  return { kind, ref };
}
export const eroScript = (command: object) =>
  `window.__lekhpalEro&&window.__lekhpalEro.command(${JSON.stringify(
    command,
  ).replace(/</g, '\\u003c')});true;`;
export function eroPdfBase64(value: unknown): string {
  if (typeof value !== 'string' || value.length > 28_000_000)
    throw Error('The PDF is missing or exceeds the 20 MB limit.');
  const base64 = value
    .replace(/^data:application\/pdf;base64,/i, '')
    .replace(/\s/g, '');
  if (
    !base64.startsWith('JVBERi0') ||
    base64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  )
    throw Error('The portal did not return a valid PDF.');
  return base64;
}

/** Preserve official filename metadata, with a unique suffix and no filesystem paths. */
export function eroPdfName(serial: number, id: string, original?: unknown) {
  const base =
    typeof original === 'string' && /^[A-Za-z0-9_-]+\.pdf$/i.test(original)
      ? original.slice(0, -4).slice(0, 60)
      : 'Format-A-Lekhpal';
  return `${serial || 'ERO'}-${base}-${id}.pdf`;
}
