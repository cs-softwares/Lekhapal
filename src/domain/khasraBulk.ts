import { z } from 'zod';
import { CropPlanRow } from './cropPlan';
import { FeedingContext, FeedingSnapshot } from './khasraFeeding';
import {
  FeedingQueue,
  QueueItem,
  gataKey,
  importedCropSchema,
  isGataNumber,
} from './khasraQueue';

export type ImportedCrop = z.infer<typeof importedCropSchema>;
export type BulkReview = {
  plots: { gata: string; plan: ImportedCrop[] }[];
  errors: { row: number; message: string }[];
  rows: number;
};
const normal = (s: string) =>
  s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const digits = (s: string) =>
  s.replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)));

/** Deliberately one physical line per record. Quoted CSV cells may contain commas, not newlines. */
function cells(line: string, separator: string): string[] {
  const out: string[] = [];
  let value = '',
    quoted = false,
    closed = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        value += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
        closed = true;
      } else value += ch;
    } else if (ch === separator) {
      out.push(value.trim());
      value = '';
      closed = false;
    } else if (ch === '"' && !value.trim() && !closed) {
      value = '';
      quoted = true;
    } else if (ch === '"' || (closed && ch.trim()))
      throw Error('Invalid quoted cell. Keep each record on one line.');
    else value += ch;
  }
  if (quoted)
    throw Error('Close the quoted cell; keep each record on one line.');
  out.push(value.trim());
  return out;
}
export function parseKhasraBulk(text: string): BulkReview {
  const result: BulkReview = { plots: [], errors: [], rows: 0 };
  if (text.length > 600000)
    return {
      ...result,
      errors: [
        { row: 0, message: 'Paste at most 5,000 crop rows (500 plots).' },
      ],
    };
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const first = lines.find(l => l.trim()) || '';
  const separator = first.includes('\t')
    ? '\t'
    : first.includes('|')
    ? '|'
    : ',';
  const plots = new Map<string, { gata: string; plan: ImportedCrop[] }>();
  let sawHeader = false;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    try {
      const row = cells(lines[i], separator);
      if (!result.rows && !sawHeader && /^(gata|गाटा)$/i.test(row[0])) {
        sawHeader = true;
        if (
          row.length !== 4 ||
          !/^(crop|फसल)$/i.test(row[1]) ||
          !/^(area(?:_ha)?|क्षेत्रफल)$/i.test(row[2]) ||
          !/^(irrigation|irrigated|सिंचाई)$/i.test(row[3])
        )
          throw Error('Use headers: Gata, Crop, Area_ha, Irrigation.');
        continue;
      }
      result.rows++;
      if (result.rows > 5000) throw Error('Maximum 5,000 crop rows.');
      if (row.length !== 4)
        throw Error(
          'Use exactly four columns: Gata, Crop, Area_ha, Irrigation.',
        );
      const [gata, crop, rawArea, rawIrrigation] = row;
      if (!isGataNumber(gata) || gata.length > 80)
        throw Error('Enter a valid Gata number.');
      const irrigation = normal(rawIrrigation);
      const yes = ['yes', 'true', '1', 'irrigated', 'सिंचित', 'हाँ', 'हां'];
      const no = ['no', 'false', '0', 'unirrigated', 'असिंचित', 'नहीं'];
      if (![...yes, ...no].includes(irrigation))
        throw Error('Irrigation must be Yes / No or सिंचित / असिंचित.');
      const candidate = importedCropSchema.safeParse({
        crop,
        area: digits(rawArea),
        irrigated: yes.includes(irrigation),
        sourceRow: i + 1,
      });
      if (!candidate.success)
        throw Error(
          'Enter a crop name and positive hectare area, using at most 4 decimal places.',
        );
      const key = gataKey(gata),
        plot = plots.get(key) || { gata: gata.trim(), plan: [] };
      if (
        plot.plan.some(
          p =>
            normal(p.crop) === normal(crop) &&
            p.irrigated === candidate.data.irrigated,
        )
      )
        throw Error(
          `Duplicate crop and irrigation for Gata ${gata}. Combine its area into one row.`,
        );
      if (plot.plan.length >= 10)
        throw Error(`Gata ${gata} exceeds 10 crop rows.`);
      if (!plots.has(key) && plots.size >= 500)
        throw Error('Maximum 500 plots per queue.');
      plot.plan.push(candidate.data);
      plots.set(key, plot);
    } catch (e) {
      result.errors.push({ row: i + 1, message: (e as Error).message });
    }
    if (result.rows > 5000) break;
  }
  result.plots = [...plots.values()];
  if (!result.rows)
    result.errors.push({ row: 0, message: 'Paste at least one crop row.' });
  return result;
}
export function importKhasraBulk(
  queue: FeedingQueue,
  review: BulkReview,
): FeedingQueue {
  if (
    queue.running ||
    queue.items.some(i => ['active', 'opening', 'uncertain'].includes(i.status))
  )
    throw Error('Pause and review the current plot before importing.');
  if (review.errors.length || !review.plots.length)
    throw Error('Correct every row error before importing.');
  if (queue.items.length + review.plots.length > 500)
    throw Error(
      'A queue can contain at most 500 plots. Archive it before starting a new batch.',
    );
  const existing = new Set(queue.items.map(i => gataKey(i.gata)));
  const at = new Date().toISOString();
  const added = review.plots.map(p => {
    if (existing.has(gataKey(p.gata)))
      throw Error(
        `Gata ${p.gata} is already in this queue. No rows were imported.`,
      );
    existing.add(gataKey(p.gata));
    return {
      ...p,
      status: 'queued' as const,
      note: '',
      createdAt: at,
      updatedAt: at,
    };
  });
  return { ...queue, items: [...queue.items, ...added] };
}
export function resolveImportedCrops(
  plan: ImportedCrop[],
  page: FeedingSnapshot,
): CropPlanRow[] {
  const fields = page.fields.filter(
    f => f.kind === 'select' && /crop|fasal|फसल/i.test(f.key + ' ' + f.label),
  );
  if (fields.length !== 1)
    throw Error('The official crop selector is unavailable or ambiguous.');
  if (page.cropRows === undefined)
    throw Error(
      'A complete labelled official crop table is required for imported feeding.',
    );
  const irrigation = page.fields.filter(
    f =>
      f.kind === 'checkbox' &&
      /flexSwitchCheckDefault|irrigated|सिंचित/i.test(f.key + ' ' + f.label),
  );
  if (irrigation.length !== 1)
    throw Error(
      'The official irrigation control must be available for imported feeding.',
    );
  return plan.map(row => {
    const matches = fields[0].options.filter(
      o => o.value && normal(o.label) === normal(row.crop),
    );
    if (matches.length !== 1)
      throw Error(
        `Row ${row.sourceRow}: crop “${row.crop}” does not uniquely match this season's official choices. Review the crop name.`,
      );
    return {
      crop: matches[0].value,
      area: row.area,
      percent: '',
      irrigated: row.irrigated,
    };
  });
}
export const reportStatus = (item: QueueItem) =>
  item.status === 'reviewed' && item.confirmation
    ? 'Confirmed'
    : item.status === 'skipped'
    ? 'Skipped'
    : ['active', 'opening', 'uncertain', 'reviewed'].includes(item.status)
    ? 'Needs review'
    : 'Pending';
export const localDay = (at: string) => {
  const d = new Date(at);
  return Number.isNaN(d.getTime())
    ? ''
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;
};
export function filterReport(
  items: QueueItem[],
  day: string,
  search: string,
  status: string,
) {
  return items.filter(
    i =>
      (!day || localDay(i.updatedAt || i.createdAt || '') === day) &&
      (!search ||
        normal(
          `${i.gata} ${i.note} ${i.plan?.map(p => p.crop).join(' ') || ''}`,
        ).includes(normal(search))) &&
      (!status || reportStatus(i) === status),
  );
}
const csvCell = (value: string) =>
  '"' +
  (/^[\s]*[=+@\-\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""') +
  '"';
export function khasraReportCsv(context: FeedingContext, items: QueueItem[]) {
  const rows = [
    [
      'State',
      'Village',
      'Village code',
      'Fasli year',
      'Season',
      'Gata',
      'Status',
      'Crop',
      'Area (ha)',
      'Irrigation',
      'Updated at',
      'Confirmation ID',
      'Reason',
    ],
  ];
  items.forEach(item =>
    (item.plan?.length ? item.plan : [undefined]).forEach(crop =>
      rows.push([
        'UP',
        context.village,
        context.villageCode,
        context.year,
        context.season,
        item.gata,
        reportStatus(item),
        crop?.crop || '',
        crop?.area || '',
        crop ? (crop.irrigated ? 'Yes' : 'No') : '',
        item.updatedAt || item.createdAt || '',
        item.confirmation?.id || '',
        item.note,
      ]),
    ),
  );
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[
        c
      ]!),
  );
export function khasraReportHtml(
  context: FeedingContext,
  items: QueueItem[],
  day: string,
  part: number,
) {
  return `<!doctype html><html lang="hi"><head><meta charset="utf-8"><style>@page{size:A4;margin:14mm}body{font:12px sans-serif;color:#17324d}h1{font-size:22px;color:#1565c0}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #cad5e2;padding:7px;vertical-align:top;overflow-wrap:anywhere}th{background:#eaf2fc}thead{display:table-header-group}tr{break-inside:avoid}p{line-height:1.6}.note{font-size:10px;color:#526478}</style></head><body><h1>Lekhpal · Khasra work report</h1><p>${escape(
    context.village,
  )} (${escape(context.villageCode)}) · UP<br>Fasli ${escape(
    context.year,
  )} · ${escape(context.season)} · ${escape(
    day || 'All dates',
  )} · Part ${part}</p><p class="note">Local activity report, not an official government receipt. Confirmed means the portal reported final lock success. Manually reviewed and uncertain records still need official verification. Crop areas below are the imported plan, not certified land records.</p><table><thead><tr><th style="width:12%">Gata</th><th style="width:17%">Status</th><th style="width:33%">Planned crops · hectare · irrigation</th><th>Evidence / reason</th></tr></thead><tbody>${items
    .map(
      i =>
        `<tr><td>${escape(i.gata)}</td><td>${reportStatus(i)}</td><td>${
          i.plan
            ?.map(
              p =>
                `${escape(p.crop)} · ${escape(p.area)} · ${
                  p.irrigated ? 'सिंचित' : 'असिंचित'
                }`,
            )
            .join('<br>') || '—'
        }</td><td>${escape(i.note || 'Awaiting work')}<br>${escape(
          i.updatedAt || i.createdAt || 'Date unavailable',
        )}${
          i.confirmation ? '<br>ID: ' + escape(i.confirmation.id) : ''
        }</td></tr>`,
    )
    .join('')}</tbody></table><p class="note">${
    items.length
  } plots in this part. Generated ${escape(
    new Date().toISOString(),
  )}.</p></body></html>`;
}

/** Bound both row count and escaped HTML size for the native PDF renderer. */
export function khasraReportParts(
  context: FeedingContext,
  items: QueueItem[],
  day: string,
): QueueItem[][] {
  const parts: QueueItem[][] = [];
  let part: QueueItem[] = [];
  for (const item of items) {
    const candidate = [...part, item];
    if (
      part.length &&
      (candidate.length > 30 ||
        khasraReportHtml(context, candidate, day, parts.length + 1).length >
          180000)
    ) {
      parts.push(part);
      part = [item];
    } else part = candidate;
  }
  if (part.length) parts.push(part);
  return parts;
}
