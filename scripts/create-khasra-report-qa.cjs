// Synthetic test-APK asset. Does not touch any app database or government site.
const fs = require('fs');
const babel = require('@babel/core');
require.extensions['.ts'] = (module, path) => module._compile(babel.transformFileSync(path, { presets: ['module:@react-native/babel-preset'], babelrc: false, configFile: false }).code, path);
const { khasraReportHtml } = require('../src/domain/khasraBulk.ts');
const context = { year: '1433', season: 'kharif', village: 'परीक्षण गांव / TEST ONLY', villageCode: '999998' };
const items = Array.from({ length: 30 }, (_, i) => ({ gata: `${i + 1}/क`, status: ['reviewed', 'skipped', 'uncertain', 'queued'][i % 4], note: ['Portal reported lock success.', 'Already locked on the official list.', 'पुष्टि नहीं मिली। आधिकारिक रिकॉर्ड जांचें।', 'Awaiting work.'][i % 4], createdAt: '2026-10-12T10:00:00.000Z', updatedAt: '2026-10-12T11:00:00.000Z', ...(i % 4 === 0 ? { confirmation: { id: `SYNTHETIC-${i}`, at: '2026-10-12T11:00:00.000Z' } } : {}), plan: [{ crop: 'धान / Rice', area: '0.1234', irrigated: true, sourceRow: i + 1 }, { crop: 'गेहूँ / Wheat', area: '0.0766', irrigated: false, sourceRow: i + 2 }] }));
const dir = 'android/app/src/androidTest/assets/khasra-report-fixtures'; fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(`${dir}/report.html`, khasraReportHtml(context, items, '2026-10-12', 1));
console.log('Created one 30-plot bilingual report fixture.');
