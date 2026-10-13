import type { ReportDetails } from '../services/reportEditor';
export const escapeReportHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
export function boundaryPreview(points?: { lat: number; lng: number }[]) {
  const valid =
    points
      ?.filter(
        p =>
          p != null &&
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng) &&
          Math.abs(p.lat) <= 90 &&
          Math.abs(p.lng) <= 180,
      )
      .slice(0, 2000) || [];
  if (valid.length < 3) return '';
  const meanLat = valid.reduce((a, p) => a + p.lat, 0) / valid.length;
  const xy = valid.map(p => ({
    x: p.lng * Math.cos((meanLat * Math.PI) / 180),
    y: -p.lat,
  }));
  const minX = Math.min(...xy.map(p => p.x)),
    minY = Math.min(...xy.map(p => p.y));
  const scale = Math.min(
    440 / (Math.max(...xy.map(p => p.x)) - minX || 1),
    280 / (Math.max(...xy.map(p => p.y)) - minY || 1),
  );
  const scaled = xy.map(p => ({
    x: 30 + (p.x - minX) * scale,
    y: 30 + (p.y - minY) * scale,
  }));
  return `<section><h2>Boundary preview / सीमा की रूपरेखा</h2><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340" role="img" aria-label="Boundary outline"><rect width="500" height="340" fill="#f1f5f9"/><polygon points="${scaled
    .map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ')}" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>${scaled
    .map(
      (p, i) =>
        `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#1d4ed8"/><text x="${
          p.x + 5
        }" y="${p.y - 5}" font-size="10">${i + 1}</text>`,
    )
    .join(
      '',
    )}<text x="468" y="20" font-size="14">N ↑</text></svg><p class="muted">Coordinate-based outline; not an official cadastral map. / निर्देशांकों पर आधारित रूपरेखा; आधिकारिक भू-नक्शा नहीं।</p></section>`;
}
export function buildReportHtml({
  title,
  summaryLines,
  details,
  points,
}: {
  title: string;
  summaryLines: string[];
  details?: Partial<ReportDetails>;
  points?: { lat: number; lng: number }[];
}) {
  const labels: Record<keyof ReportDetails, string> = {
    owner: 'Owner / स्वामी',
    village: 'Village / गांव',
    plot: 'Plot / Gata / भूखंड / गाटा',
    client: 'Client / ग्राहक',
    notes: 'Notes / टिप्पणी',
  };
  // The edited metadata is authoritative; do not repeat stale saved labels below it.
  const metadataLines: [keyof ReportDetails, RegExp][] = [
    ['village', /^(Village|गांव|गाँव)\s*:/i],
    ['plot', /^(Gata \/ Khasra|Plot(?: \/ Gata)?|गाटा \/ खसरा|भूखंड)\s*:/i],
    ['owner', /^(Owner(?: name)?|स्वामी(?: का नाम)?)\s*:/i],
    ['client', /^(Client|ग्राहक)\s*:/i],
    ['notes', /^(Notes?|टिप्पणी)\s*:/i],
  ];
  const results = summaryLines.filter(
    line =>
      !metadataLines.some(
        ([key, pattern]) => details?.[key]?.trim() && pattern.test(line),
      ),
  );
  return `<!doctype html><html lang="hi"><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>@page{margin:18mm}body{font-family:'Noto Sans Devanagari',sans-serif;color:#17233d;margin:20px;line-height:1.65}h1{font-size:23px;color:#1e40af}h2{font-size:16px}header{border-bottom:2px solid #1e40af}section{break-inside:avoid;margin:18px 0}p{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}td{padding:6px;border-bottom:1px solid #e2e8f0;font-size:13px}table{width:100%;border-collapse:collapse}svg{width:100%;max-height:300px}.muted{color:#64748b;font-size:11px}</style><header><p>LEKHPAL · FIELD REPORT / फील्ड रिपोर्ट</p><h1>${escapeReportHtml(
    title,
  )}</h1></header><section><table>${Object.entries(labels)
    .filter(([key]) => details?.[key as keyof ReportDetails]?.trim())
    .map(
      ([key, label]) =>
        `<tr><td>${label}</td><td>${escapeReportHtml(
          details![key as keyof ReportDetails]!,
        )}</td></tr>`,
    )
    .join('')}</table></section>${boundaryPreview(
    points,
  )}<section><h2>Results & details / परिणाम और विवरण</h2>${results
    .map(line => `<p>${escapeReportHtml(line)}</p>`)
    .join(
      '',
    )}</section><footer class="muted">Prepared with Lekhpal / लेखपाल से तैयार · ${new Date().toLocaleDateString(
    'en-IN',
  )}<br/>For fieldwork reference; verify measurements against official records. / फील्ड कार्य के संदर्भ हेतु; आधिकारिक अभिलेखों से सत्यापन करें।</footer></html>`;
}
