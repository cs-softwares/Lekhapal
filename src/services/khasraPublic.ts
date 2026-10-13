import { z } from 'zod';

const BASE = 'https://ekhasra.up.gov.in/khasraApi';
const code = z.union([z.string(), z.number()]).transform(String);
const districtSchema = z.object({
  distCodeCensus: code,
  distNameHindi: z.string(),
  distNameEng: z.string().nullish(),
});
const tehsilSchema = z.object({
  tehsilCodeCensus: code,
  tname: z.string(),
  tnameEng: z.string().nullish(),
});
const villageSchema = z.object({
  villageCodeCensus: code,
  vname: z.string(),
  vname_eng: z.string().nullish(),
});
const resultSchema = z.object({
  gata_unique_code: code,
  khasra_no: code,
  fasal_year: code,
  area: z.union([z.string(), z.number()]).nullish(),
  name: z.string().nullish(),
  khataNumber: z.union([z.string(), z.number()]).nullish(),
});
export type KhasraPlace = {
  code: string;
  name: string;
  english?: string | null;
};
export type KhasraResult = z.infer<typeof resultSchema>;
export type KhasraSearchMode = 'K' | 'UC' | 'KH' | 'N';
// These are the years currently offered by the official public search form.
export const KHASRA_YEARS = ['1433', '1432', '1431'];

async function request(
  path: string,
  method: 'GET' | 'POST',
  signal: AbortSignal,
) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Khasra service unavailable');
  return response.json();
}

export async function getKhasraPlaces(
  district: string | undefined,
  tehsil: string | undefined,
  signal: AbortSignal,
): Promise<KhasraPlace[]> {
  if (!district) {
    const rows = districtSchema
      .array()
      .parse(await request('/dist', 'POST', signal));
    return rows.map(row => ({
      code: row.distCodeCensus,
      name: row.distNameHindi,
      english: row.distNameEng,
    }));
  }
  const params = `districtCodeCensus=${encodeURIComponent(district)}`;
  if (!tehsil) {
    const rows = tehsilSchema
      .array()
      .parse(await request(`/teh?${params}`, 'POST', signal));
    return rows.map(row => ({
      code: row.tehsilCodeCensus,
      name: row.tname,
      english: row.tnameEng,
    }));
  }
  const rows = villageSchema
    .array()
    .parse(
      await request(
        `/vill?${params}&tehsilCodeCensus=${encodeURIComponent(tehsil)}`,
        'POST',
        signal,
      ),
    );
  return rows.map(row => ({
    code: row.villageCodeCensus,
    name: row.vname,
    english: row.vname_eng,
  }));
}

export function normalizeKhasraQuery(mode: KhasraSearchMode, query: string) {
  const value = query
    .trim()
    .replace(/[०-९]/g, digit => String(digit.charCodeAt(0) - 0x0966));
  if (
    !value ||
    value.length > 100 ||
    Array.from(value).some(char => char.charCodeAt(0) < 32)
  )
    throw new Error('Invalid search');
  if (mode === 'UC' && !/^\d{16}$/.test(value))
    throw new Error('Enter a 16-digit unique code');
  if (mode === 'KH') {
    if (!/^\d{1,5}$/.test(value)) throw new Error('Enter a valid Khata number');
    return value.padStart(5, '0');
  }
  return value;
}

export async function searchKhasra(
  village: string,
  year: string,
  mode: KhasraSearchMode,
  query: string,
  signal: AbortSignal,
): Promise<KhasraResult[]> {
  const value = normalizeKhasraQuery(mode, query);
  const path = [year, village, value, mode].map(encodeURIComponent).join('/');
  return resultSchema
    .array()
    .parse(
      await request(`/api/khasradata/getSearchResult/${path}`, 'GET', signal),
    );
}
