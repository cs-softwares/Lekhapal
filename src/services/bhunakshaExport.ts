import { z } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mapInfoSchema } from '../domain/bhunakshaExport';
const optionSchema = z.object({
  code: z.string().min(1),
  value: z.string().min(1),
  englishName: z.string().optional(),
  extraParams: z.object({ hasData: z.boolean() }).optional(),
});
export type MapOption = z.infer<typeof optionSchema>;
async function post(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `https://upbhunaksha.gov.in/bhunakshaserver/${path}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&'),
      signal,
    },
  );
  if (!response.ok)
    throw Error(`Bhunaksha request failed (${response.status}).`);
  return response.json();
}
export async function mapLocations(
  level: number,
  codes: string,
  signal?: AbortSignal,
): Promise<MapOption[]> {
  const key = `lekhpal-map-locations-${level}-${codes}`;
  try {
    const rows = optionSchema
      .array()
      .parse(
        await post(
          'masterdata/levelvalue',
          { level: String(level), codes },
          signal,
        ),
      )
      .filter(o => o.extraParams?.hasData !== false);
    await AsyncStorage.setItem(key, JSON.stringify(rows));
    return rows;
  } catch (e) {
    if (signal?.aborted) throw e;
    const cached = await AsyncStorage.getItem(key);
    if (cached) return optionSchema.array().parse(JSON.parse(cached));
    throw e;
  }
}
export const villageMapInfo = async (codes: string, signal?: AbortSignal) =>
  mapInfoSchema.parse(
    await post('MapInfo/getVVVVExtentGeoref', { gisLevels: codes }, signal),
  );
export async function mapPngBase64(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal });
  if (
    !response.ok ||
    !response.headers.get('content-type')?.toLowerCase().includes('image/png')
  )
    throw Error('The map service did not return a PNG image.');
  const blob = await response.blob();
  if (blob.size > 30000000)
    throw Error('Map image exceeds the export size limit.');
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(Error('Map image could not be read.'));
    reader.readAsDataURL(blob);
  });
}
