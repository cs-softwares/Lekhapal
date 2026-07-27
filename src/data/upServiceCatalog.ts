import {
  OTHER_UP_PORTAL_ENTRIES,
  TOP_UP_ACCESS_ENTRIES,
  UP_BHULEKH_SERVICE_ENTRIES,
  UpHomeEntry,
  UpHomeSection,
} from './upHomeCatalog';
import {LocalizedText} from '../types/tool';

const text = (en: string, hi: string): LocalizedText => ({
  en,
  hi,
});

export const UP_HOME_TOP_SECTION: UpHomeSection = {
  entries: TOP_UP_ACCESS_ENTRIES,
  id: 'top-access',
  subtitle: text(
    'Most-used direct routes for UP lekhpal work.',
    'UP लेखपाल कार्य के सबसे अधिक उपयोग होने वाले सीधे रूट।',
  ),
  title: text('Top Access', 'मुख्य पहुंच'),
};

export const UP_SERVICE_DIRECTORY_SECTIONS: UpHomeSection[] = [
  {
    entries: UP_BHULEKH_SERVICE_ENTRIES.slice(0, 5),
    id: 'record-flows',
    subtitle: text(
      'Direct khatauni, payment, bhukhand, and code routes.',
      'खतौनी, पेमेंट, भूखंड और कोड वाले सीधे रूट।',
    ),
    title: text(
      'Record and Copy Flows',
      'रिकॉर्ड और प्रति फ्लो',
    ),
  },
  {
    entries: UP_BHULEKH_SERVICE_ENTRIES.slice(5),
    id: 'directory-reference',
    subtitle: text(
      'District, tehsil, land type, and official reference routes.',
      'जिला, तहसील, भूमि प्रकार और आधिकारिक संदर्भ रूट।',
    ),
    title: text(
      'Directories and Reference',
      'डायरेक्टरी और संदर्भ',
    ),
  },
  {
    entries: OTHER_UP_PORTAL_ENTRIES,
    id: 'other-up-portals',
    subtitle: text(
      'Support portals often used with revenue work.',
      'राजस्व कार्य के साथ उपयोग होने वाले सपोर्ट पोर्टल।',
    ),
    title: text(
      'Other Official Portals',
      'अन्य आधिकारिक पोर्टल',
    ),
  },
];

export const UP_SERVICE_DIRECTORY_ENTRIES: UpHomeEntry[] =
  UP_SERVICE_DIRECTORY_SECTIONS.flatMap(
    section => section.entries,
  );

