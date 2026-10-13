import {
  getKhasraPlaces,
  normalizeKhasraQuery,
  searchKhasra,
} from '../src/services/khasraPublic';

const mockFetch = jest.fn();
const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = mockFetch;
  mockFetch.mockReset();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const signal = () => new AbortController().signal;
const responds = (rows: unknown) =>
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => rows });

test('location lookups retain census-code leading zeros and follow the chosen parent', async () => {
  responds([
    { distCodeCensus: '137', distNameHindi: 'जनपद', distNameEng: 'District' },
  ]);
  expect(await getKhasraPlaces(undefined, undefined, signal())).toEqual([
    { code: '137', name: 'जनपद', english: 'District' },
  ]);
  responds([{ tehsilCodeCensus: '00730', tname: 'तहसील', tnameEng: 'Tehsil' }]);
  expect((await getKhasraPlaces('137', undefined, signal()))[0].code).toBe(
    '00730',
  );
  responds([{ villageCodeCensus: 117944, vname: 'ग्राम' }]);
  expect((await getKhasraPlaces('137', '00730', signal()))[0].code).toBe(
    '117944',
  );
  expect(mockFetch).toHaveBeenLastCalledWith(
    'https://ekhasra.up.gov.in/khasraApi/vill?districtCodeCensus=137&tehsilCodeCensus=00730',
    expect.objectContaining({ method: 'POST' }),
  );
});
test('Khata queries match the official five-digit format and preserve unique codes', () => {
  expect(normalizeKhasraQuery('KH', '१२')).toBe('00012');
  expect(normalizeKhasraQuery('UC', '1179440001000012')).toBe(
    '1179440001000012',
  );
  expect(() => normalizeKhasraQuery('UC', '12')).toThrow();
  expect(() => normalizeKhasraQuery('KH', '123456')).toThrow();
  expect(() => normalizeKhasraQuery('K', ' ')).toThrow();
});
test.each(['K', 'UC', 'KH', 'N'] as const)(
  'search mode %s sends the exact year and village and parses genuine results',
  async mode => {
    const query =
      mode === 'UC' ? '1179440001000012' : mode === 'N' ? 'नाम' : '1';
    responds([
      {
        gata_unique_code: '1179440001000012',
        khasra_no: '1',
        fasal_year: '1433',
        area: '0.04',
        name: null,
        khataNumber: null,
      },
    ]);
    const abort = signal();
    const rows = await searchKhasra('117944', '1433', mode, query, abort);
    expect(rows[0].area).toBe('0.04');
    expect(mockFetch).toHaveBeenCalledWith(
      `https://ekhasra.up.gov.in/khasraApi/api/khasradata/getSearchResult/1433/117944/${encodeURIComponent(
        normalizeKhasraQuery(mode, query),
      )}/${mode}`,
      expect.objectContaining({ method: 'GET', signal: abort }),
    );
  },
);
test('empty results are distinct from HTTP errors and invalid server responses', async () => {
  responds([]);
  await expect(
    searchKhasra('117944', '1433', 'K', '1', signal()),
  ).resolves.toEqual([]);
  mockFetch.mockResolvedValueOnce({ ok: false });
  await expect(
    searchKhasra('117944', '1433', 'K', '1', signal()),
  ).rejects.toThrow();
  responds({ message: 'Unexpected error' });
  await expect(
    getKhasraPlaces(undefined, undefined, signal()),
  ).rejects.toThrow();
});
