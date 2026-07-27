import {LanguageCode, LocalizedText} from '../types/tool';
import {WorkspaceValues} from '../types/workspace';

export type WorkflowFieldConfig = {
  compactMultiline?: boolean;
  key: string;
  keyboardType?: 'default' | 'numeric';
  label: LocalizedText;
  multiline?: boolean;
  placeholder?: LocalizedText;
};

export type WorkflowConfig = {
  intro: LocalizedText;
  fields: WorkflowFieldConfig[];
  buildSummary: (
    values: WorkspaceValues,
    language: LanguageCode,
  ) => string[];
  buildRecordTitle: (
    values: WorkspaceValues,
    language: LanguageCode,
  ) => string;
  buildRecordSubtitle: (
    values: WorkspaceValues,
    language: LanguageCode,
  ) => string | undefined;
};

const text = (en: string, hi: string): LocalizedText => ({
  en,
  hi,
});

const get = (
  value: LocalizedText,
  language: LanguageCode,
) => value[language];

const safeValue = (
  value: string | undefined,
  fallback: string,
) => value?.trim() || fallback;

export const WORKFLOW_CONFIGS: Record<
  string,
  WorkflowConfig
> = {
  'village-diary': {
    intro: text(
      'Village Diary stores your village visit notes, pending work, and next follow-up in one reusable record.',
      'ग्राम डायरी में गाँव की विजिट, पेंडिंग काम और अगली फॉलो-अप नोट एक ही रिकॉर्ड में सेव होती है।',
    ),
    fields: [
      {
        key: 'villageName',
        label: text('Village name', 'गाँव का नाम'),
        placeholder: text('Example: Rampur', 'उदाहरण: रामपुर'),
      },
      {
        key: 'tehsil',
        label: text('Tehsil', 'तहसील'),
        placeholder: text('Tehsil name', 'तहसील नाम'),
      },
      {
        key: 'district',
        label: text('District', 'जिला'),
        placeholder: text('District name', 'जिला नाम'),
      },
      {
        key: 'visitDate',
        label: text('Visit date', 'विजिट तिथि'),
        placeholder: text('DD/MM/YYYY', 'DD/MM/YYYY'),
      },
      {
        key: 'purpose',
        label: text('Visit purpose', 'विजिट उद्देश्य'),
        placeholder: text(
          'Why are you visiting the village?',
          'गाँव जाने का कारण लिखें',
        ),
      },
      {
        key: 'notes',
        label: text('Field notes', 'फील्ड नोट्स'),
        multiline: true,
        placeholder: text(
          'Write observations, people met, and important facts.',
          'अवलोकन, मिले लोग और जरूरी बातें लिखें।',
        ),
      },
      {
        key: 'pendingWork',
        label: text('Pending work', 'पेंडिंग वर्क'),
        multiline: true,
        placeholder: text(
          'What still needs to be done?',
          'क्या काम अभी बाकी है?',
        ),
      },
      {
        compactMultiline: true,
        key: 'nextStep',
        multiline: true,
        label: text('Next step', 'अगला स्टेप'),
        placeholder: text(
          'Next call, visit, or document action',
          'अगली कॉल, विजिट या दस्तावेज़ कार्य',
        ),
      },
    ],
    buildSummary: (values, language) => [
      `${get(text('Village', 'गाँव'), language)}: ${safeValue(
        values.villageName,
        get(text('Not added', 'नॉट ऐडेड'), language),
      )}`,
      `${get(text('Route', 'रूट'), language)}: ${safeValue(
        values.tehsil,
        '-',
      )} / ${safeValue(values.district, '-')}`,
      `${get(text('Visit date', 'विजिट तिथि'), language)}: ${safeValue(
        values.visitDate,
        get(text('Pending', 'पेंडिंग'), language),
      )}`,
      `${get(text('Purpose', 'उद्देश्य'), language)}: ${safeValue(
        values.purpose,
        get(text('Not added', 'नॉट ऐडेड'), language),
      )}`,
      `${get(text('Next step', 'अगला स्टेप'), language)}: ${safeValue(
        values.nextStep,
        get(text('Pending', 'पेंडिंग'), language),
      )}`,
    ],
    buildRecordTitle: (values, language) =>
      safeValue(
        values.villageName,
        get(text('Village diary', 'ग्राम डायरी'), language),
      ),
    buildRecordSubtitle: (values, language) =>
      [
        values.visitDate?.trim(),
        values.nextStep?.trim() ||
          get(text('Follow-up pending', 'फॉलो-अप पेंडिंग'), language),
      ]
        .filter(Boolean)
        .join(' • '),
  },
  'field-inspection': {
    intro: text(
      'Field Inspection keeps one clear inspection record for plot, spot notes, mismatch, and action point.',
      'फील्ड निरीक्षण मॉड्यूल में प्लॉट, स्थल नोट्स, मिसमैच और कार्रवाई बिंदु एक ही रिकॉर्ड में रखे जाते हैं।',
    ),
    fields: [
      {
        key: 'villageName',
        label: text('Village name', 'गाँव का नाम'),
        placeholder: text('Village', 'गाँव'),
      },
      {
        key: 'plotNumber',
        label: text('Plot / Khasra number', 'प्लॉट / खसरा संख्या'),
        placeholder: text('Example: 112/3', 'उदाहरण: 112/3'),
      },
      {
        key: 'inspectionDate',
        label: text('Inspection date', 'निरीक्षण तिथि'),
        placeholder: text('DD/MM/YYYY', 'DD/MM/YYYY'),
      },
      {
        key: 'peoplePresent',
        label: text('People present', 'उपस्थित व्यक्ति'),
        placeholder: text(
          'Team or local persons present',
          'टीम या स्थानीय व्यक्ति',
        ),
      },
      {
        key: 'inspectionNotes',
        label: text('Inspection notes', 'निरीक्षण नोट्स'),
        multiline: true,
        placeholder: text(
          'Mention boundaries, usage, encroachment, or remarks.',
          'सीमा, उपयोग, कब्जा या टिप्पणियाँ लिखें।',
        ),
      },
      {
        key: 'discrepancy',
        label: text('Mismatch / issue', 'मिसमैच / समस्या'),
        multiline: true,
        placeholder: text(
          'What did not match on the spot?',
          'स्थल पर क्या मेल नहीं खाया?',
        ),
      },
      {
        key: 'actionNeeded',
        label: text('Required action', 'आवश्यक कार्यवाही'),
        multiline: true,
        placeholder: text(
          'What should happen next?',
          'अगली कार्यवाही क्या होनी चाहिए?',
        ),
      },
    ],
    buildSummary: (values, language) => [
      `${get(text('Village', 'गाँव'), language)}: ${safeValue(
        values.villageName,
        get(text('Not added', 'नॉट ऐडेड'), language),
      )}`,
      `${get(text('Plot', 'प्लॉट'), language)}: ${safeValue(
        values.plotNumber,
        get(text('Pending', 'पेंडिंग'), language),
      )}`,
      `${get(text('Inspection date', 'निरीक्षण तिथि'), language)}: ${safeValue(
        values.inspectionDate,
        get(text('Pending', 'पेंडिंग'), language),
      )}`,
      `${get(text('Issue', 'समस्या'), language)}: ${safeValue(
        values.discrepancy,
        get(text('No issue added', 'कोई समस्या नहीं जोड़ी'), language),
      )}`,
      `${get(text('Action', 'कार्यवाही'), language)}: ${safeValue(
        values.actionNeeded,
        get(text('Pending', 'पेंडिंग'), language),
      )}`,
    ],
    buildRecordTitle: (values, language) =>
      safeValue(
        values.plotNumber,
        get(text('Field inspection', 'फील्ड निरीक्षण'), language),
      ),
    buildRecordSubtitle: values =>
      [values.villageName?.trim(), values.inspectionDate?.trim()]
        .filter(Boolean)
        .join(' • '),
  },
  'mutation-tracker': {
    intro: text(
      'Mutation Tracker helps you hold one mutation case with applicant details, khata reference, status, and next action.',
      'म्यूटेशन ट्रैकर में आवेदक विवरण, खाता संदर्भ, वर्तमान स्थिति और अगली कार्यवाही एक केस में रखी जाती है।',
    ),
    fields: [
      {
        key: 'applicantName',
        label: text('Applicant name', 'आवेदक का नाम'),
        placeholder: text('Applicant full name', 'आवेदक का पूरा नाम'),
      },
      {
        key: 'villageName',
        label: text('Village name', 'गाँव का नाम'),
        placeholder: text('Village', 'गाँव'),
      },
      {
        key: 'khataNumber',
        label: text('Khata / Khasra reference', 'खाता / खसरा संदर्भ'),
        placeholder: text('Example: Khata 48', 'उदाहरण: खाता 48'),
      },
      {
        key: 'caseNumber',
        label: text('Case / file number', 'केस / फाइल संख्या'),
        placeholder: text('Case reference', 'केस संदर्भ'),
      },
      {
        key: 'status',
        label: text('Current status', 'वर्तमान स्थिति'),
        placeholder: text('Pending / verified / hearing', 'पेंडिंग / वेरिफाइड / हियरिंग'),
      },
      {
        key: 'documentsPending',
        label: text('Documents pending', 'पेंडिंग डॉक्यूमेंट्स'),
        multiline: true,
        placeholder: text(
          'Mention missing or pending papers.',
          'पेंडिंग डॉक्यूमेंट्स लिखें।',
        ),
      },
      {
        key: 'nextAction',
        label: text('Next action', 'अगली कार्यवाही'),
        multiline: true,
        placeholder: text(
          'Next office or field action',
          'अगली कार्यालय या फील्ड कार्यवाही',
        ),
      },
      {
        key: 'remarks',
        label: text('Remarks', 'रिमार्क्स'),
        multiline: true,
        placeholder: text(
          'Extra context or note',
          'अतिरिक्त संदर्भ या नोट',
        ),
      },
    ],
    buildSummary: (values, language) => [
      `${get(text('Applicant', 'आवेदक'), language)}: ${safeValue(
        values.applicantName,
        get(text('Not added', 'नॉट ऐडेड'), language),
      )}`,
      `${get(text('Village', 'गाँव'), language)}: ${safeValue(
        values.villageName,
        get(text('Not added', 'नॉट ऐडेड'), language),
      )}`,
      `${get(text('Khata ref', 'खाता संदर्भ'), language)}: ${safeValue(
        values.khataNumber,
        get(text('Pending', 'पेंडिंग'), language),
      )}`,
      `${get(text('Status', 'स्थिति'), language)}: ${safeValue(
        values.status,
        get(text('Pending', 'पेंडिंग'), language),
      )}`,
      `${get(text('Next action', 'अगली कार्यवाही'), language)}: ${safeValue(
        values.nextAction,
        get(text('Pending', 'पेंडिंग'), language),
      )}`,
    ],
    buildRecordTitle: (values, language) =>
      safeValue(
        values.applicantName,
        get(text('Mutation tracker', 'म्यूटेशन ट्रैकर'), language),
      ),
    buildRecordSubtitle: values =>
      [values.khataNumber?.trim(), values.status?.trim()]
        .filter(Boolean)
        .join(' • '),
  },
};

export const getWorkflowConfig = (toolId: string) =>
  WORKFLOW_CONFIGS[toolId];

export const buildInitialWorkflowValues = (
  toolId: string,
) => {
  const config = getWorkflowConfig(toolId);

  if (!config) {
    return {};
  }

  return config.fields.reduce<Record<string, string>>(
    (accumulator, field) => {
      accumulator[field.key] = '';
      return accumulator;
    },
    {},
  );
};
