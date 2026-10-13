import { z } from 'zod';
import { escapeReportHtml as escape } from '../utils/reportHtml';
export type DocLanguage = 'en' | 'hi';
const label = (en: string, hi: string) => ({ en, hi });
export const DOCUMENT_TEMPLATES = [
  {
    id: 'application',
    title: label('General application', 'सामान्य प्रार्थना पत्र'),
    description: label(
      'Turn a request and applicant details into a ready-to-review letter.',
      'आवेदक और अनुरोध से प्रार्थना पत्र तैयार करें।',
    ),
    fields: ['subject', 'facts', 'request'],
  },
  {
    id: 'correction',
    title: label('Record correction request', 'अभिलेख सुधार आवेदन'),
    description: label(
      'Show the existing entry, proposed correction and supporting records.',
      'वर्तमान प्रविष्टि, प्रस्तावित सुधार और साक्ष्य एक साथ रखें।',
    ),
    fields: ['existingEntry', 'correctEntry', 'evidence', 'request'],
  },
  {
    id: 'demarcation',
    title: label('Demarcation request', 'सीमांकन आवेदन'),
    description: label(
      'Prepare a plot-specific request with the reason and location.',
      'भूखंड और कारण के आधार पर सीमांकन आवेदन बनाएं।',
    ),
    fields: ['facts', 'request'],
  },
  {
    id: 'inspection',
    title: label('Field inspection report', 'स्थलीय निरीक्षण रिपोर्ट'),
    description: label(
      'Organise observations, evidence and recommended follow-up.',
      'निरीक्षण, साक्ष्य और अगली कार्रवाई को रिपोर्ट में व्यवस्थित करें।',
    ),
    fields: ['inspectionDate', 'findings', 'evidence', 'recommendation'],
  },
  {
    id: 'office-order',
    title: label('Office order draft', 'कार्यालय आदेश का मसौदा'),
    description: label(
      'Prepare an editable order for review and signature by the authorised officer.',
      'अधिकृत अधिकारी की समीक्षा और हस्ताक्षर के लिए आदेश तैयार करें।',
    ),
    fields: ['subject', 'facts', 'action', 'dueDate', 'copies'],
  },
  {
    id: 'forwarding',
    title: label('Forwarding letter', 'अग्रसारण पत्र'),
    description: label(
      'Forward a case summary and enclosure list with a clear requested action.',
      'प्रकरण सार, संलग्नक और अपेक्षित कार्रवाई का पत्र बनाएं।',
    ),
    fields: ['subject', 'facts', 'request', 'copies'],
  },
] as const;
export type TemplateId = (typeof DOCUMENT_TEMPLATES)[number]['id'];
export const FIELD_LABELS = {
  office: label('Office / recipient', 'कार्यालय / प्राप्तकर्ता'),
  district: label('District', 'जनपद'),
  tehsil: label('Tehsil / subdistrict', 'तहसील / उप-जिला'),
  village: label('Village / locality', 'ग्राम / क्षेत्र'),
  reference: label('Reference number (optional)', 'संदर्भ संख्या (वैकल्पिक)'),
  date: label('Document date (DD-MM-YYYY)', 'पत्र दिनांक (DD-MM-YYYY)'),
  person: label('Applicant / concerned person', 'आवेदक / संबंधित व्यक्ति'),
  guardian: label('Parent / spouse name', 'माता-पिता / जीवनसाथी का नाम'),
  address: label('Address', 'पता'),
  plot: label('Plot / Gata / survey number', 'भूखंड / गाटा / सर्वे संख्या'),
  account: label('Khata / account number', 'खाता संख्या'),
  subject: label('Subject', 'विषय'),
  facts: label('Background / facts', 'पृष्ठभूमि / तथ्य'),
  request: label('Requested action', 'अनुरोधित कार्रवाई'),
  existingEntry: label('Existing entry', 'वर्तमान प्रविष्टि'),
  correctEntry: label('Proposed correct entry', 'प्रस्तावित सही प्रविष्टि'),
  evidence: label('Evidence / records checked', 'साक्ष्य / जांचे गए अभिलेख'),
  inspectionDate: label(
    'Inspection date (DD-MM-YYYY)',
    'निरीक्षण दिनांक (DD-MM-YYYY)',
  ),
  findings: label('Inspection findings', 'निरीक्षण के तथ्य'),
  recommendation: label('Recommended follow-up', 'सुझाई गई अगली कार्रवाई'),
  action: label('Proposed directions', 'प्रस्तावित निर्देश'),
  dueDate: label(
    'Due date (optional, DD-MM-YYYY)',
    'नियत दिनांक (वैकल्पिक, DD-MM-YYYY)',
  ),
  copies: label('Copy to (one per line)', 'प्रतिलिपि (एक नाम प्रति पंक्ति)'),
  attachments: label('Enclosures (one per line)', 'संलग्नक (एक प्रति पंक्ति)'),
  signer: label('Prepared by / signatory', 'तैयारकर्ता / हस्ताक्षरकर्ता'),
  designation: label('Designation', 'पदनाम'),
} as const;
export type DocField = keyof typeof FIELD_LABELS;
export const PROFILE_FIELDS: DocField[] = [
  'office',
  'district',
  'tehsil',
  'village',
  'signer',
  'designation',
];
export const PERSON_FIELDS: DocField[] = [
  'person',
  'guardian',
  'address',
  'plot',
  'account',
];
export const COMMON_FIELDS: DocField[] = [
  'office',
  'district',
  'tehsil',
  'village',
  'reference',
  'date',
];
export const LONG_FIELDS: DocField[] = [
  'address',
  'facts',
  'request',
  'existingEntry',
  'correctEntry',
  'evidence',
  'findings',
  'recommendation',
  'action',
  'copies',
  'attachments',
];
const valuesSchema = z.record(z.string(), z.string().max(6000));
export const docDraftSchema = z.object({
  id: z.string().max(100),
  template: z.enum([
    'application',
    'correction',
    'demarcation',
    'inspection',
    'office-order',
    'forwarding',
  ]),
  language: z.enum(['en', 'hi']),
  values: valuesSchema,
  updatedAt: z.string(),
});
export type DocDraft = z.infer<typeof docDraftSchema>;
export const docFileSchema = z.object({
  id: z.string(),
  draft: docDraftSchema,
  path: z.string(),
  name: z.string(),
  at: z.string(),
  batchId: z.string().optional(),
});
export type DocFile = z.infer<typeof docFileSchema>;
export const docBatchSchema = z
  .object({
    id: z.string(),
    items: docDraftSchema.array().min(1).max(50),
    next: z.number().int().min(0).max(50),
  })
  .refine(b => b.next <= b.items.length);
export type DocBatch = z.infer<typeof docBatchSchema>;
export const docStoreSchema = z.object({
  drafts: docDraftSchema.array().max(200),
  files: docFileSchema.array().max(500),
  profiles: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(160),
        values: valuesSchema,
      }),
    )
    .max(20),
  batch: docBatchSchema.nullable(),
});
export type DocStore = z.infer<typeof docStoreSchema>;
export const emptyDocStore = (): DocStore => ({
  drafts: [],
  files: [],
  profiles: [],
  batch: null,
});
export const docStorageKey = (state: string) =>
  'lekhpal-document-automation-v1-' + state;
export const docId = () =>
  Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
export const docTemplate = (id: TemplateId) =>
  DOCUMENT_TEMPLATES.find(t => t.id === id)!;
export function todayForDocument(now = new Date()) {
  return `${String(now.getDate()).padStart(2, '0')}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}-${now.getFullYear()}`;
}
export function validDocDate(value: string) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return false;
  const d = Number(match[1]),
    m = Number(match[2]),
    y = Number(match[3]);
  const date = new Date(y, m - 1, d);
  return (
    y >= 1900 &&
    y <= 2200 &&
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}
export function newDocDraft(
  template: TemplateId,
  language: DocLanguage,
  profile: Record<string, string> = {},
): DocDraft {
  return {
    id: docId(),
    template,
    language,
    values: {
      ...Object.fromEntries(
        PROFILE_FIELDS.filter(k => profile[k]).map(k => [k, profile[k]]),
      ),
      date: todayForDocument(),
    },
    updatedAt: new Date().toISOString(),
  };
}
export function documentFields(template: TemplateId): DocField[] {
  return [
    ...COMMON_FIELDS,
    ...PERSON_FIELDS,
    ...docTemplate(template).fields,
    'attachments',
    'signer',
    'designation',
  ];
}
export function documentErrors(draft: DocDraft): string[] {
  const v = draft.values,
    l = draft.language,
    required: DocField[] = ['office', 'date', 'person'];
  if (['correction', 'demarcation', 'inspection'].includes(draft.template))
    required.push('village', 'plot');
  if (['application', 'office-order', 'forwarding'].includes(draft.template))
    required.push('subject');
  if (['application', 'demarcation', 'forwarding'].includes(draft.template))
    required.push('request');
  if (draft.template === 'correction')
    required.push('existingEntry', 'correctEntry', 'evidence');
  if (draft.template === 'inspection')
    required.push('inspectionDate', 'findings', 'recommendation');
  if (draft.template === 'office-order')
    required.push('action', 'signer', 'designation');
  const errors = required
    .filter(k => !v[k]?.trim())
    .map(k => FIELD_LABELS[k][l] + (l === 'hi' ? ' भरें।' : ' is required.'));
  for (const k of ['date', 'inspectionDate', 'dueDate'] as DocField[])
    if (v[k]?.trim() && !validDocDate(v[k].trim()))
      errors.push(
        FIELD_LABELS[k][l] +
          (l === 'hi'
            ? ' सही दिनांक लिखें।'
            : ' must be a valid DD-MM-YYYY date.'),
      );
  return errors;
}
/** Name | parent/spouse | address | plot | khata. Blank per-row cells stay blank, never borrow another person's details. */
export function parseDocumentRows(input: string) {
  const lines = input
    .trim()
    .split(/\r?\n/)
    .filter(line => line.trim());
  if (!input.trim() || lines.length > 50)
    throw Error('Paste 1–50 rows. / 1–50 पंक्तियां पेस्ट करें।');
  const seen = new Set<string>();
  return lines.map((line, i) => {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length !== 5 || !parts[0] || parts.some(p => p.length > 400))
      throw Error(
        `Row ${
          i + 1
        }: use Name | Parent/spouse | Address | Plot | Khata (5 columns).`,
      );
    const key = parts.join('|');
    if (seen.has(key))
      throw Error(`Row ${i + 1} is duplicated. Remove it before generating.`);
    seen.add(key);
    return Object.fromEntries(PERSON_FIELDS.map((k, n) => [k, parts[n]]));
  });
}
export function makeDocumentBatch(draft: DocDraft, input: string): DocBatch {
  const rows = parseDocumentRows(input),
    id = docId();
  const items = rows.map((row, i) => {
    const item = {
      ...draft,
      id: id + '-' + (i + 1),
      values: { ...draft.values, ...row },
      updatedAt: new Date().toISOString(),
    };
    const errors = documentErrors(item);
    if (errors.length) throw Error(`Row ${i + 1}: ${errors[0]}`);
    return item;
  });
  return { id, items, next: 0 };
}
export function saveDocumentDraft(store: DocStore, draft: DocDraft): DocStore {
  if (store.drafts.length >= 200 && !store.drafts.some(d => d.id === draft.id))
    throw Error(
      'The draft library is full (200). Remove an older draft first.',
    );
  return docStoreSchema.parse({
    ...store,
    drafts: [draft, ...store.drafts.filter(d => d.id !== draft.id)],
  });
}
export function recordDocumentPdf(store: DocStore, file: DocFile): DocStore {
  if (store.files.some(f => f.id === file.id)) return store;
  let batch = store.batch;
  if (file.batchId) {
    if (
      !batch ||
      batch.id !== file.batchId ||
      batch.items[batch.next]?.id !== file.draft.id
    )
      throw Error('The batch changed. Resume from saved progress.');
    batch = { ...batch, next: batch.next + 1 };
  }
  return docStoreSchema.parse({
    ...store,
    files: [file, ...store.files],
    batch,
  });
}
function sentence(d: DocDraft) {
  const { values: v, language: l, template } = d;
  const name = v.person || '—',
    place = [v.village, v.tehsil, v.district].filter(Boolean).join(', ');
  if (l === 'hi')
    return template === 'inspection'
      ? `${name} से संबंधित भूखंड ${v.plot || '—'}, ${
          place || '—'
        } के निरीक्षण का विवरण नीचे दर्ज है।`
      : template === 'office-order'
      ? `${name} के संबंध में समीक्षा हेतु प्रस्तावित निर्देश नीचे दिए गए हैं।`
      : template === 'forwarding'
      ? `${name} से संबंधित प्रकरण आपके विचार और आवश्यक कार्रवाई हेतु अग्रसारित करने का मसौदा प्रस्तुत है।`
      : `मैं, ${name}, ${
          place ? place + ' से संबंधित ' : ''
        }निम्न विवरण के अनुसार अपना आवेदन प्रस्तुत करता / करती हूं।`;
  return template === 'inspection'
    ? `Inspection details concerning ${name}, plot ${v.plot || '—'}${
        place ? ' at ' + place : ''
      }, are recorded below.`
    : template === 'office-order'
    ? `The following proposed directions concerning ${name} are prepared for review.`
    : template === 'forwarding'
    ? `The case concerning ${name} is prepared for forwarding for your consideration and necessary action.`
    : `I, ${name}, submit this application${
        place ? ' concerning ' + place : ''
      } with the following details.`;
}
export function documentHtml(draft: DocDraft, stateName: string) {
  const l = draft.language,
    v = draft.values,
    t = (en: string, hi: string) => (l === 'hi' ? hi : en);
  const rows = (keys: DocField[]) => {
    const cells = keys.filter(k => v[k]?.trim());
    const result: string[] = [];
    for (let i = 0; i < cells.length; i += 2) {
      result.push(
        '<tr>' +
          cells
            .slice(i, i + 2)
            .map(
              k =>
                `<th>${escape(
                  FIELD_LABELS[k][l].replace(/ \(.*\)$/, ''),
                )}</th><td>${escape(v[k])}</td>`,
            )
            .join('') +
          (i + 1 === cells.length ? '<td colspan="2"></td>' : '') +
          '</tr>',
      );
    }
    return result.join('');
  };
  const content = docTemplate(draft.template)
    .fields.filter(k => v[k]?.trim())
    .map(
      k =>
        `<section><h2>${escape(
          FIELD_LABELS[k][l].replace(/ \(.*\)$/, ''),
        )}</h2><p>${escape(v[k])}</p></section>`,
    )
    .join('');
  const attachments = (v.attachments || '')
    .split(/\r?\n/)
    .filter(x => x.trim());
  return `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
 @page{size:A4;margin:16mm 16mm 18mm}*{box-sizing:border-box}body{font-family:'Noto Sans Devanagari','Noto Sans',Arial,sans-serif;color:#17233d;margin:0;line-height:1.5;font-size:11pt}header{border-top:5px solid #2449ad;border-bottom:1px solid #cbd5e1;padding:10px 0 8px;margin-bottom:12px}.brand{color:#2449ad;font-size:10pt;font-weight:700;letter-spacing:.6px}.badge{float:right;font-size:9pt;color:#475569}h1{font-size:19pt;line-height:1.4;margin:10px 0 4px;color:#173783}h2{font-size:11pt;line-height:1.5;color:#2449ad;margin:10px 0 4px;break-after:avoid}p{margin:5px 0 8px;white-space:pre-wrap;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin:8px 0 12px;table-layout:fixed}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #e2e8f0;padding:5px 7px;white-space:pre-wrap;overflow-wrap:anywhere}td{width:32%}th{width:18%;font-weight:500;color:#475569;background:#f5f8ff}tr{break-inside:avoid}section{orphans:3;widows:3}li{white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0}.closing{break-inside:avoid}.signature{margin-top:20px;break-inside:avoid;border-top:1px solid #cbd5e1;padding-top:10px;width:60%;margin-left:auto}footer{margin-top:12px;border-top:1px solid #cbd5e1;padding-top:8px;color:#64748b;font-size:8pt}.muted{color:#64748b;font-size:10pt}@media screen{body{padding:20px;max-width:794px;margin:auto;background:white}tr{display:grid;grid-template-columns:40% 60%}th,td{width:auto}td[colspan]{display:none}}
 </style></head><body><header><span class="brand">LEKHPAL</span><span class="badge">${t(
   'DRAFT · FOR REVIEW',
   'मसौदा · समीक्षा हेतु',
 )}</span><h1>${escape(
    docTemplate(draft.template).title[l],
  )}</h1><p class="muted">${escape(stateName)} · ${escape(
    v.date || '—',
  )}</p></header><p><strong>${escape(v.office || '—')}</strong></p>${
    v.reference
      ? `<p class="muted">${t('Reference', 'संदर्भ')}: ${escape(
          v.reference,
        )}</p>`
      : ''
  }<table>${rows([
    'person',
    'guardian',
    'address',
    'village',
    'tehsil',
    'district',
    'plot',
    'account',
  ])}</table><p>${escape(sentence(draft))}</p>${content}${
    attachments.length
      ? `<section><h2>${t('Enclosures', 'संलग्नक')}</h2><ol>${attachments
          .map(a => `<li>${escape(a)}</li>`)
          .join('')}</ol></section>`
      : ''
  }<div class="closing"><div class="signature"><p>${t(
    'Signature',
    'हस्ताक्षर',
  )}: ____________________</p><p>${escape(
    (['application', 'correction', 'demarcation'].includes(draft.template)
      ? v.person
      : v.signer) || '____________________',
  )}${
    !['application', 'correction', 'demarcation'].includes(draft.template) &&
    v.designation
      ? '<br>' + escape(v.designation)
      : ''
  }</p></div><footer>${
    ['application', 'correction', 'demarcation'].includes(draft.template) &&
    v.signer
      ? t('Prepared by: ', 'तैयारकर्ता: ') +
        escape([v.signer, v.designation].filter(Boolean).join(', ')) +
        '<br>'
      : ''
  }${t(
    'Prepared with Lekhpal. Draft for review and signature; not an issued order or certificate.',
    'लेखपाल से तैयार। समीक्षा और हस्ताक्षर हेतु मसौदा; जारी आदेश या प्रमाणपत्र नहीं।',
  )}</footer></div></body></html>`;
}

/** Reuse the content, but never reissue an old reference number or document date. */
export function duplicateDocumentDraft(draft: DocDraft): DocDraft {
  return {
    ...draft,
    id: docId(),
    updatedAt: new Date().toISOString(),
    values: {
      ...draft.values,
      date: todayForDocument(),
      reference: '',
      inspectionDate: '',
      dueDate: '',
    },
  };
}
