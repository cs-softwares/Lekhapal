import {
  DOCUMENT_TEMPLATES,
  DocDraft,
  DocFile,
  docStorageKey,
  documentErrors,
  duplicateDocumentDraft,
  todayForDocument,
  documentHtml,
  emptyDocStore,
  makeDocumentBatch,
  newDocDraft,
  parseDocumentRows,
  recordDocumentPdf,
  validDocDate,
} from '../src/domain/documentAutomation';
import { DocumentSession } from '../src/services/documentAutomation';
const draft = (): DocDraft => ({
  ...newDocDraft('application', 'en'),
  values: {
    office: 'Tehsil office',
    date: '12-10-2026',
    person: 'Applicant',
    subject: 'Record request',
    request: 'Please check the enclosed records.',
    village: 'Rampur',
    guardian: 'Do not inherit',
    plot: 'OLD',
    account: 'OLD',
  },
});
const file = (d: DocDraft): DocFile => ({
  id: d.id,
  draft: d,
  path: '/Documents/Lekhpal-' + d.id + '.pdf',
  name: d.id + '.pdf',
  at: '2026-10-12',
});
const rows = 'First ||| 101 | 1\nSecond | Parent | Village | 102 | 2';
function session(initial = emptyDocStore()) {
  let raw = JSON.stringify(initial);
  const write = jest.fn(async (value: string) => {
    raw = value;
  });
  const publish = jest.fn();
  const create = () => new DocumentSession(async () => raw, write, publish);
  return { create, write, publish, read: () => JSON.parse(raw) };
}
test('profile reuse does not copy person, reference, evidence or plot data', () => {
  const result = newDocDraft('inspection', 'hi', {
    ...draft().values,
    signer: 'Officer',
    reference: 'Previous',
    evidence: 'Old evidence',
  });
  expect(result.values).toMatchObject({
    office: 'Tehsil office',
    village: 'Rampur',
    signer: 'Officer',
  });
  for (const key of ['person', 'plot', 'guardian', 'reference', 'evidence'])
    expect(result.values[key]).toBeUndefined();
  expect(docStorageKey('UP')).not.toBe(docStorageKey('MH'));
});
test('batch replaces every per-person field, including empty cells', () => {
  const batch = makeDocumentBatch(draft(), rows);
  expect(batch.items[0].values).toMatchObject({
    person: 'First',
    guardian: '',
    address: '',
    plot: '101',
    account: '1',
  });
  expect(batch.items[1].values.person).toBe('Second');
  expect(new Set(batch.items.map(i => i.id)).size).toBe(2);
});
test.each([
  'Name|only two',
  '|||123|4',
  'A||||\nA||||',
  Array(51).fill('A||||').join('\n'),
])('rejects ambiguous or oversized batch %s', input =>
  expect(() => parseDocumentRows(input)).toThrow(),
);
test('batch validates shared content and required plot for each row', () => {
  const d = draft();
  d.template = 'demarcation';
  expect(() => makeDocumentBatch(d, 'First||||')).toThrow(/Plot/);
  d.values.request = '';
  expect(() => makeDocumentBatch(d, rows)).toThrow(/Requested/);
});
test.each(['31-02-2026', '29-02-2025', '2026-10-12', '12-13-2026'])(
  'rejects invalid dates %s',
  date => expect(validDocDate(date)).toBe(false),
);
test('accepts a leap date', () =>
  expect(validDocDate('29-02-2024')).toBe(true));
test.each(DOCUMENT_TEMPLATES.map(t => t.id))(
  'generates escaped original bilingual template %s',
  template => {
    for (const language of ['hi', 'en'] as const) {
      const d = draft();
      d.template = template;
      d.language = language;
      d.values = {
        ...d.values,
        person: '<script>alert(1)</script>',
        existingEntry: 'Old',
        correctEntry: 'Correct',
        evidence: 'Record',
        inspectionDate: '12-10-2026',
        findings: 'Observed',
        recommendation: 'Check',
        action: 'Review',
        signer: 'Officer',
        designation: 'Officer',
        attachments: 'Record 1\nRecord 2',
      };
      expect(documentErrors(d)).toEqual([]);
      const html = documentHtml(d, 'उत्तर प्रदेश');
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>');
      expect(html).toContain('Record 1');
      expect(html).toContain(
        DOCUMENT_TEMPLATES.find(t => t.id === template)!.title[language],
      );
      if (language === 'en') expect(html).toContain('Signature');
      if (language === 'hi') expect(html).toContain('हस्ताक्षर');
    }
  },
);
test('refuses out-of-order progress', () => {
  const batch = makeDocumentBatch(draft(), rows);
  expect(() =>
    recordDocumentPdf(
      { ...emptyDocStore(), batch },
      { ...file(batch.items[1]), batchId: batch.id },
    ),
  ).toThrow(/batch changed/);
});
test('journals the batch before generating and saves each success before advancing', async () => {
  const mem = session(),
    s = mem.create();
  await s.load();
  const b = makeDocumentBatch(draft(), rows);
  const generate = jest.fn(async (d: DocDraft) => {
    expect(mem.read().batch.next).toBe(generate.mock.calls.length - 1);
    return file(d);
  });
  await s.generate(generate, b);
  expect(mem.read().batch.next).toBe(2);
  expect(mem.read().files.map((f: DocFile) => f.draft.values.person)).toEqual([
    'Second',
    'First',
  ]);
});
test('Stop saves in-flight PDF and restart resumes only remaining work', async () => {
  const mem = session(),
    s = mem.create();
  await s.load();
  const b = makeDocumentBatch(draft(), rows);
  await s.generate(async d => {
    s.stop();
    return file(d);
  }, b);
  expect(mem.read().batch.next).toBe(1);
  const restarted = mem.create();
  await restarted.load();
  expect(restarted.store.batch?.next).toBe(1);
  const generate = jest.fn(async d => file(d));
  await restarted.generate(generate);
  expect(generate).toHaveBeenCalledTimes(1);
  expect(generate.mock.calls[0][0].values.person).toBe('Second');
  expect(mem.read().batch.next).toBe(2);
});
test('generation failure does not advance and existing pending work cannot be replaced', async () => {
  const mem = session(),
    s = mem.create();
  await s.load();
  const b = makeDocumentBatch(draft(), rows);
  await expect(
    s.generate(async () => {
      throw Error('PDF failed');
    }, b),
  ).rejects.toThrow('PDF failed');
  expect(mem.read().batch.next).toBe(0);
  await expect(
    s.generate(async d => file(d), makeDocumentBatch(draft(), rows)),
  ).rejects.toThrow('unfinished');
});
test('storage failure prevents next document and duplicate concurrent run is rejected', async () => {
  const mem = session(),
    s = mem.create();
  await s.load();
  const b = makeDocumentBatch(draft(), rows);
  mem.write
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(Error('Disk full'));
  const generate = jest.fn(async d => {
    await expect(s.generate(async x => file(x))).rejects.toThrow('wait');
    return file(d);
  });
  await expect(s.generate(generate, b)).rejects.toThrow('Disk full');
  expect(generate).toHaveBeenCalledTimes(1);
  expect(s.store.batch?.next).toBe(0);
  expect(s.store.files).toHaveLength(0);
});
test('corrupt stored data is preserved and mutation is blocked', async () => {
  const write = jest.fn();
  const s = new DocumentSession(async () => '{bad', write, jest.fn());
  await expect(s.load()).rejects.toThrow();
  await expect(s.change(x => x)).rejects.toThrow();
  expect(write).not.toHaveBeenCalled();
});

test('reusing a document refreshes its date and clears old reference and inspection/deadline dates', () => {
  const d = draft();
  d.values = {
    ...d.values,
    date: '01-01-2020',
    reference: 'OLD-123',
    inspectionDate: '01-01-2020',
    dueDate: '02-01-2020',
  };
  const copy = duplicateDocumentDraft(d);
  expect(copy.id).not.toBe(d.id);
  expect(copy.values).toMatchObject({
    date: todayForDocument(),
    reference: '',
    inspectionDate: '',
    dueDate: '',
    person: d.values.person,
    request: d.values.request,
  });
});

test('application signature belongs to applicant, even when an office profile supplies a preparer', () => {
  const d = draft();
  d.values.signer = 'Office worker';
  d.values.designation = 'Lekhpal';
  const html = documentHtml(d, 'UP');
  const signature = html.split('<div class="signature">')[1].split('</div>')[0];
  expect(signature).toContain('Applicant');
  expect(signature).not.toContain('Office worker');
  expect(html).toContain('Prepared by: Office worker');
  d.template = 'office-order';
  expect(
    documentHtml(d, 'UP')
      .split('<div class="signature">')[1]
      .split('</div>')[0],
  ).toContain('Office worker');
});
