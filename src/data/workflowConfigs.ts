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

const buildStructuredWorkflow = ({
  intro,
  title,
  fields,
  summaryFields,
}: {
  intro: LocalizedText;
  title: LocalizedText;
  fields: WorkflowFieldConfig[];
  summaryFields: Array<{key: string; label: LocalizedText}>;
}): WorkflowConfig => ({
  intro,
  fields,
  buildSummary: (values, language) =>
    summaryFields.map(field =>
      `${get(field.label, language)}: ${safeValue(values[field.key], get(text('Not added', 'नहीं जोड़ा'), language))}`,
    ),
  buildRecordTitle: (values, language) =>
    safeValue(values[summaryFields[0].key], get(title, language)),
  buildRecordSubtitle: (values, language) =>
    summaryFields
      .slice(1, 3)
      .map(field => safeValue(values[field.key], ''))
      .filter(Boolean)
      .join(' • ') || get(text('Follow-up pending', 'फॉलो-अप पेंडिंग'), language),
});

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
  'crop-girdawari': buildStructuredWorkflow({
    intro: text('Create a seasonal crop observation record for one plot. Keep the saved report with the official portal reference.', 'एक प्लॉट की मौसमी फसल निरीक्षण एंट्री बनाएं। सेव रिपोर्ट को आधिकारिक पोर्टल संदर्भ के साथ रखें।'),
    title: text('Crop Girdawari', 'फसल गिरदावरी'),
    fields: [
      {key: 'villageName', label: text('Village', 'गांव'), placeholder: text('Village name', 'गांव का नाम')},
      {key: 'plotNumber', label: text('Khasra / plot number', 'खसरा / प्लॉट संख्या'), placeholder: text('Example: 112/3', 'उदाहरण: 112/3')},
      {key: 'season', label: text('Season', 'सीजन'), placeholder: text('Rabi / Kharif / Zaid', 'रबी / खरीफ / जायद')},
      {key: 'cropName', label: text('Crop sown', 'बोई गई फसल'), placeholder: text('Crop name', 'फसल का नाम')},
      {key: 'area', label: text('Cultivated area', 'कृषित क्षेत्रफल'), keyboardType: 'numeric', placeholder: text('Area and unit', 'क्षेत्रफल और यूनिट')},
      {key: 'irrigation', label: text('Irrigation source', 'सिंचाई स्रोत'), placeholder: text('Canal / tubewell / rainfed', 'नहर / ट्यूबवेल / वर्षा')},
      {key: 'visitDate', label: text('Inspection date', 'निरीक्षण तिथि'), placeholder: text('DD/MM/YYYY', 'DD/MM/YYYY')},
      {key: 'observations', label: text('Field observations', 'फील्ड निरीक्षण'), multiline: true, placeholder: text('Crop condition, fallow land, remarks', 'फसल स्थिति, परती भूमि, टिप्पणी')},
      {key: 'verification', label: text('Verification / next action', 'सत्यापन / अगली कार्रवाई'), multiline: true, placeholder: text('Portal reference or action needed', 'पोर्टल संदर्भ या आवश्यक कार्रवाई')},
    ],
    summaryFields: [
      {key: 'villageName', label: text('Village', 'गांव')},
      {key: 'plotNumber', label: text('Plot', 'प्लॉट')},
      {key: 'season', label: text('Season', 'सीजन')},
      {key: 'cropName', label: text('Crop', 'फसल')},
      {key: 'verification', label: text('Action', 'कार्रवाई')},
    ],
  }),
  'government-land-inspection': buildStructuredWorkflow({
    intro: text('Record a village-wise inspection of government land, ponds, paths, grazing land, or other public property.', 'सरकारी भूमि, तालाब, रास्ता, चारागाह या अन्य सार्वजनिक संपत्ति का गांववार निरीक्षण दर्ज करें।'),
    title: text('Government Land Inspection', 'सरकारी भूमि निरीक्षण'),
    fields: [
      {key: 'villageName', label: text('Village', 'गांव'), placeholder: text('Village name', 'गांव का नाम')},
      {key: 'plotNumber', label: text('Khasra / plot number', 'खसरा / प्लॉट संख्या'), placeholder: text('Plot reference', 'प्लॉट संदर्भ')},
      {key: 'landType', label: text('Land type', 'भूमि प्रकार'), placeholder: text('Pond / pasture / road / government land', 'तालाब / चारागाह / रास्ता / सरकारी भूमि')},
      {key: 'visitDate', label: text('Visit date', 'भ्रमण तिथि'), placeholder: text('DD/MM/YYYY', 'DD/MM/YYYY')},
      {key: 'currentUse', label: text('Current use', 'वर्तमान उपयोग'), multiline: true, placeholder: text('How is the land being used?', 'भूमि का उपयोग कैसे हो रहा है?')},
      {key: 'boundaryCondition', label: text('Boundary condition', 'सीमा स्थिति'), multiline: true, placeholder: text('Markers, fencing, map mismatch', 'सीमा चिन्ह, बाड़, नक्शा अंतर')},
      {key: 'peoplePresent', label: text('People / evidence', 'उपस्थित लोग / साक्ष्य'), multiline: true, placeholder: text('People present and evidence reference', 'उपस्थित लोग और साक्ष्य संदर्भ')},
      {key: 'actionNeeded', label: text('Action required', 'आवश्यक कार्रवाई'), multiline: true, placeholder: text('Notice, measurement, escalation, or follow-up', 'नोटिस, माप, एस्केलेशन या फॉलो-अप')},
    ],
    summaryFields: [
      {key: 'villageName', label: text('Village', 'गांव')},
      {key: 'plotNumber', label: text('Plot', 'प्लॉट')},
      {key: 'landType', label: text('Land type', 'भूमि प्रकार')},
      {key: 'actionNeeded', label: text('Action', 'कार्रवाई')},
    ],
  }),
  'encroachment-report': buildStructuredWorkflow({
    intro: text('Prepare an evidence-ready encroachment report for departmental review. Save measurements and witness notes before forwarding it.', 'विभागीय समीक्षा के लिए साक्ष्य-तैयार अतिक्रमण रिपोर्ट बनाएं। आगे भेजने से पहले माप और गवाह नोट्स सेव करें।'),
    title: text('Encroachment Report', 'अतिक्रमण रिपोर्ट'),
    fields: [
      {key: 'villageName', label: text('Village', 'गांव'), placeholder: text('Village name', 'गांव का नाम')},
      {key: 'plotNumber', label: text('Khasra / plot number', 'खसरा / प्लॉट संख्या'), placeholder: text('Plot reference', 'प्लॉट संदर्भ')},
      {key: 'landOwnerOrClass', label: text('Recorded owner / land class', 'दर्ज स्वामी / भूमि वर्ग'), placeholder: text('Public / private / pond / road', 'सार्वजनिक / निजी / तालाब / रास्ता')},
      {key: 'inspectionDate', label: text('Inspection date', 'निरीक्षण तिथि'), placeholder: text('DD/MM/YYYY', 'DD/MM/YYYY')},
      {key: 'encroachmentType', label: text('Encroachment type', 'अतिक्रमण प्रकार'), multiline: true, placeholder: text('Construction, cultivation, fencing, dumping', 'निर्माण, खेती, बाड़, कचरा')},
      {key: 'measurements', label: text('Measured area / boundary', 'मापा गया क्षेत्र / सीमा'), placeholder: text('Length, width, area, GPS reference', 'लंबाई, चौड़ाई, क्षेत्रफल, GPS संदर्भ')},
      {key: 'witnesses', label: text('Witnesses / evidence', 'गवाह / साक्ष्य'), multiline: true, placeholder: text('Names, photos, map or document references', 'नाम, फोटो, नक्शा या दस्तावेज़ संदर्भ')},
      {key: 'actionNeeded', label: text('Recommended follow-up', 'सुझाई गई अगली कार्रवाई'), multiline: true, placeholder: text('Notice, demarcation, report to officer', 'नोटिस, सीमांकन, अधिकारी को रिपोर्ट')},
    ],
    summaryFields: [
      {key: 'villageName', label: text('Village', 'गांव')},
      {key: 'plotNumber', label: text('Plot', 'प्लॉट')},
      {key: 'encroachmentType', label: text('Issue', 'समस्या')},
      {key: 'actionNeeded', label: text('Action', 'कार्रवाई')},
    ],
  }),
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
