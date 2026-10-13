import {
  eroListStep,
  eroPdfBase64,
  eroRange,
  isEroUrl,
  EroSnapshot,
} from '../src/domain/eroPdf';
const page: EroSnapshot = {
  channel: 'lekhpal-ero-v1',
  type: 'snapshot',
  documentId: 'd',
  revision: 1,
  url: 'https://officials.eci.gov.in/suomotoDSE',
  stage: 'list',
  busy: false,
  context: 'AC=20',
  page: 1,
  rows: [1, 2, 3, 4, 5].map(n => ({
    ref: 'r' + n,
    key: 'id' + n,
    serial: n,
    label: 'Record ' + n,
  })),
  next: 'next',
};
const batch = {
  id: 'b',
  from: 5,
  to: 6,
  next: 5,
  context: page.context,
  listUrl: page.url,
  done: [],
};
test('range boundaries are one-based, whole, ordered and capped at 500', () => {
  expect(eroRange('1', '500')).toEqual({ from: 1, to: 500 });
  for (const range of [
    ['0', '1'],
    ['1', '501'],
    ['2', '1'],
    ['1.5', '2'],
    ['-1', '2'],
    ['1e2', '200'],
  ])
    expect(() => eroRange(...(range as [string, string]))).toThrow();
});
test('record 5 opens before paging to record 6; previous pages can be recovered', () => {
  expect(eroListStep(page, batch)).toMatchObject({
    kind: 'open',
    row: { serial: 5 },
  });
  expect(eroListStep(page, { ...batch, next: 6 })).toEqual({
    kind: 'next',
    ref: 'next',
  });
  expect(
    eroListStep(
      {
        ...page,
        page: 2,
        previous: 'prev',
        rows: page.rows.map(r => ({ ...r, serial: r.serial + 5 })),
      },
      batch,
    ),
  ).toEqual({ kind: 'previous', ref: 'prev' });
});
test('changed filters, missing records, reordered or duplicate rows stop the batch', () => {
  for (const changed of [
    { ...page, context: 'AC=21' },
    { ...page, next: undefined, rows: page.rows.slice(0, 2) },
    { ...page, rows: [page.rows[1], page.rows[0]] },
    { ...page, rows: [page.rows[0], page.rows[0]] },
  ])
    expect(() => eroListStep(changed, batch)).toThrow();
});
test('only exact HTTPS official origin and PDF-shaped base64 are accepted', () => {
  expect(isEroUrl(page.url)).toBe(true);
  for (const url of [
    'http://officials.eci.gov.in',
    'https://officials.eci.gov.in.evil.test',
    'https://user@officials.eci.gov.in',
    'file:///pdf',
    'https://officials.eci.gov.in:444',
  ])
    expect(isEroUrl(url)).toBe(false);
  expect(eroPdfBase64('data:application/pdf;base64,JVBERi0xLjc=')).toBe(
    'JVBERi0xLjc=',
  );
  for (const value of [null, 'PGh0bWw+', 'JVBERi0!', 'a'.repeat(28000001)])
    expect(() => eroPdfBase64(value)).toThrow();
});
test('ECINet is permitted for official sign-in but never for PDF automation', () => {
  const { isEroBrowserUrl } = require('../src/domain/eroPdf');
  expect(isEroBrowserUrl('https://ecinet.eci.gov.in/login')).toBe(true);
  expect(isEroUrl('https://ecinet.eci.gov.in/login')).toBe(false);
  expect(isEroBrowserUrl('https://ecinet.eci.gov.in.evil.test/login')).toBe(
    false,
  );
});
test('official PDF filename metadata is retained without allowing filesystem paths', () => {
  const { eroPdfName } = require('../src/domain/eroPdf');
  expect(eroPdfName(5, 'id', 'DSE_C1_S24_AC20_PartNo1_TEST.pdf')).toBe(
    '5-DSE_C1_S24_AC20_PartNo1_TEST-id.pdf',
  );
  expect(eroPdfName(5, 'id', '../../private.pdf')).toBe(
    '5-Format-A-Lekhpal-id.pdf',
  );
});
