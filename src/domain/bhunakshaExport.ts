import { z } from 'zod';
export const mapInfoSchema = z
  .object({
    crs: z.string(),
    gisCode: z.string().optional(),
    xmin: z.number().finite(),
    ymin: z.number().finite(),
    xmax: z.number().finite(),
    ymax: z.number().finite(),
  })
  .refine(v => v.xmax > v.xmin && v.ymax > v.ymin, 'Invalid map extent');
export type MapInfo = z.infer<typeof mapInfoSchema>;
const xml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[
        c
      ]!),
  );
// WGS84 northern UTM inverse; same CRS family supported by the reference.
export function utmToWgs84(x: number, y: number, zone: number) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    zone < 1 ||
    zone > 60 ||
    !Number.isInteger(zone)
  )
    throw Error('Invalid UTM coordinate');
  const a = 6378137,
    e2 = 0.00669438,
    k = 0.9996,
    ep = e2 / (1 - e2),
    mu = y / k / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256)),
    e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const sin = Math.sin(phi),
    cos = Math.cos(phi),
    tan = Math.tan(phi),
    n = a / Math.sqrt(1 - e2 * sin * sin),
    r = (a * (1 - e2)) / (1 - e2 * sin * sin) ** 1.5,
    t = tan * tan,
    c = ep * cos * cos,
    d = (x - 500000) / (n * k);
  const lat =
    phi -
    ((n * tan) / r) *
      ((d * d) / 2 -
        ((5 + 3 * t + 10 * c - 4 * c * c - 9 * ep) * d ** 4) / 24 +
        ((61 + 90 * t + 298 * c + 45 * t * t - 252 * ep - 3 * c * c) * d ** 6) /
          720);
  const lon =
    (d -
      ((1 + 2 * t + c) * d ** 3) / 6 +
      ((5 - 2 * c + 28 * t - 3 * c * c + 8 * ep + 24 * t * t) * d ** 5) / 120) /
    cos;
  return {
    lat: (lat * 180) / Math.PI,
    lng: (zone - 1) * 6 - 177 + (lon * 180) / Math.PI,
  };
}
export function mapImageUrl(info: MapInfo, code: string, tile = true) {
  mapInfoSchema.parse(info);
  const width = info.xmax - info.xmin,
    height = info.ymax - info.ymin,
    max = Math.max(width, height);
  const params: Record<string, string> = {
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    FORMAT: 'image/png',
    TRANSPARENT: String(tile),
    BGCOLOR: '0xFFFFFF',
    LAYERS: 'VILLAGE_MAP',
    gis_code: info.gisCode || code,
    STYLES: 'VILLAGE_MAP',
    CRS: info.crs,
    BBOX: [info.xmin, info.ymin, info.xmax, info.ymax]
      .map(v => v.toFixed(6))
      .join(','),
    WIDTH: String(
      tile ? Math.max(512, Math.round((width * 4096) / max)) : 4096,
    ),
    HEIGHT: String(
      tile ? Math.max(512, Math.round((height * 4096) / max)) : 4096,
    ),
  };
  if (tile) {
    params.overlay_codes = '';
    params.FORMAT_OPTIONS = 'dpi:180';
  }
  return (
    `https://upbhunaksha.gov.in/bhunakshaserver/WMS${tile ? '/tile' : ''}?` +
    Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
  );
}
export function mapKml(
  info: MapInfo,
  code: string,
  name: string,
  packaged = false,
) {
  mapInfoSchema.parse(info);
  const match = /^(?:EPSG:)?326(\d{2})$/i.exec(info.crs);
  if (!match)
    throw Error('This map coordinate system is not supported for KML export.');
  const zone = Number(match[1]);
  const corners = [
    [info.xmin, info.ymin],
    [info.xmax, info.ymin],
    [info.xmax, info.ymax],
    [info.xmin, info.ymax],
  ].map(([x, y]) => {
    const p = utmToWgs84(x, y, zone);
    return `${p.lng.toFixed(8)},${p.lat.toFixed(8)},0`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><Document><name>${xml(
    name,
  )}</name><description>Official UP Bhunaksha village map · ${xml(
    info.gisCode || code,
  )}</description><GroundOverlay><name>Cadastral map</name><color>99ffffff</color><Icon><href>${xml(
    packaged ? 'files/village_map.png' : mapImageUrl(info, code),
  )}</href></Icon><altitudeMode>clampToGround</altitudeMode><gx:LatLonQuad><coordinates>${corners.join(
    ' ',
  )}</coordinates></gx:LatLonQuad></GroundOverlay></Document></kml>`;
}

export function plotReportUrl(
  district: string,
  tehsil: string,
  village: string,
  plot: string,
) {
  if (
    !/^\d{3}$/.test(district) ||
    !/^\d{5}$/.test(tehsil) ||
    !/^\d{6}$/.test(village)
  )
    throw Error('Choose a valid official district, tehsil and village.');
  if (
    !plot.trim() ||
    plot.length > 80 ||
    !/^[\p{L}\p{N}./-]+$/u.test(plot.trim()) ||
    ['.', '..'].includes(plot.trim())
  )
    throw Error('Enter a valid plot number.');
  return `https://upbhunaksha.gov.in/plotreport/${district}${tehsil}${village}/${encodeURIComponent(
    plot.trim(),
  )}`;
}
