/* Creates synthetic fixtures for the Android test APK only. No production data. */
const fs = require('fs');
const babel = require('@babel/core');
require.extensions['.ts'] = (module, path) =>
  module._compile(
    babel.transformFileSync(path, {
      presets: ['module:@react-native/babel-preset'],
      babelrc: false,
      configFile: false,
    }).code,
    path,
  );
const domain = require('../src/domain/documentAutomation.ts');
const drafts = (() => {
  const drafts = [];
  for (const template of domain.DOCUMENT_TEMPLATES)
    for (const language of ['hi', 'en']) {
      const hi = language === 'hi';
      const draft = domain.newDocDraft(template.id, language);
      draft.id = 'DOC-QA-20261012-' + template.id + '-' + language;
      draft.values = {
        office: hi
          ? 'तहसील कार्यालय — परीक्षण मसौदा'
          : 'Tehsil office — synthetic QA draft',
        date: '12-10-2026',
        district: hi ? 'परीक्षण जनपद' : 'Test district',
        tehsil: hi ? 'सदर' : 'Sadar',
        village: hi ? 'रामपुर' : 'Rampur',
        person: hi ? 'राम कुमार (परीक्षण)' : 'Ram Kumar (TEST)',
        guardian: hi ? 'श्याम लाल' : 'Shyam Lal',
        address: hi ? 'ग्राम रामपुर, तहसील सदर' : 'Village Rampur, Sadar',
        plot: '125/2',
        account: '42',
        subject: hi
          ? 'अभिलेख सत्यापन हेतु निवेदन'
          : 'Request for record verification',
        facts: hi
          ? 'प्रकरण के उपलब्ध विवरण और अभिलेख समीक्षा हेतु प्रस्तुत हैं।'
          : 'Available case details and records are presented for review.',
        request: hi
          ? 'संलग्न अभिलेखों की जांच करके आवश्यक कार्रवाई करने का निवेदन है।'
          : 'Please examine the enclosed records and take the necessary action.',
        existingEntry: hi ? 'वर्तमान प्रविष्टि: राम' : 'Existing entry: Ram',
        correctEntry: hi
          ? 'प्रस्तावित प्रविष्टि: राम कुमार'
          : 'Proposed entry: Ram Kumar',
        evidence: hi
          ? 'संलग्न अभिलेख की प्रति और स्थल निरीक्षण टिप्पणी।'
          : 'Enclosed record copy and field inspection note.',
        inspectionDate: '11-10-2026',
        findings: hi
          ? 'स्थल पर उपस्थित पक्षों के विवरण और भूखंड की स्थिति दर्ज की गई।'
          : 'The plot condition and details of parties present were recorded.',
        recommendation: hi
          ? 'अभिलेखों से मिलान करके आगे की कार्रवाई हेतु प्रस्तुत करें।'
          : 'Compare with the records and submit for further action.',
        action: hi
          ? 'संबंधित अभिलेखों की जांच कर रिपोर्ट प्रस्तुत करने का प्रस्ताव है।'
          : 'It is proposed that the relevant records be checked and a report submitted.',
        dueDate: '20-10-2026',
        copies: hi
          ? 'संबंधित कार्यालय\nअभिलेख हेतु'
          : 'Concerned office\nFor records',
        attachments: hi
          ? 'अभिलेख की प्रति\nस्थल निरीक्षण टिप्पणी'
          : 'Record copy\nField inspection note',
        signer: hi ? 'परीक्षण लेखपाल' : 'Test Lekhpal',
        designation: hi ? 'लेखपाल' : 'Lekhpal',
      };
      if (template.id === 'inspection')
        draft.values.findings = Array.from(
          { length: 16 },
          (_, i) =>
            `${i + 1}. ${draft.values.findings} ${
              hi
                ? 'सीमा संबंधी विवरण की अभिलेखों से पुष्टि अपेक्षित है।'
                : 'Boundary details require comparison against the records.'
            }`,
        ).join('\n');
      drafts.push(draft);
    }
  return drafts;
})();
const dir = 'android/app/src/androidTest/assets/document-fixtures';
fs.mkdirSync(dir, { recursive: true });
for (const draft of drafts)
  fs.writeFileSync(
    `${dir}/${draft.id}.html`,
    domain.documentHtml(
      draft,
      draft.language === 'hi' ? 'महाराष्ट्र' : 'Maharashtra',
    ),
  );
fs.writeFileSync(`${dir}/drafts.json`, JSON.stringify(drafts));
console.log(`Created ${drafts.length} bilingual synthetic fixtures.`);
