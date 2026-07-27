import {ToolItem} from '../types/tool';

const text = (en: string, hi: string) => ({en, hi});

export const TOOL_CATALOG: ToolItem[] = [
  {
    id: 'up-bhulekh',
    shortCode: 'BL',
    category: 'official',
    title: text('UP Bhulekh', 'यूपी भूलेख'),
    subtitle: text(
      'Check khatauni, khasra, and ownership record details.',
      'खतौनी, खसरा और स्वामित्व रिकॉर्ड विवरण देखें।',
    ),
    description: text(
      'Quick access to the UP Bhulekh public portal for land record search and verification work.',
      'भूमि रिकॉर्ड खोज और सत्यापन के लिए यूपी भूलेख पब्लिक पोर्टल का तेज़ एक्सेस।',
    ),
    badge: text('Official', 'आधिकारिक'),
    highlights: [
      text('Useful for khatauni and khasra checking', 'खतौनी और खसरा जांच के लिए उपयोगी'),
      text('Opens a public department website', 'सार्वजनिक विभाग की वेबसाइट खोलता है'),
      text('Fast route from one dashboard', 'एक डैशबोर्ड से तेज़ एक्सेस'),
    ],
    steps: [
      text('Open the portal from the app.', 'ऐप से पोर्टल खोलें।'),
      text('Choose district, tehsil, and village.', 'जिला, तहसील और गांव चुनें।'),
      text('Search record by account or plot details.', 'खाता या प्लॉट विवरण से रिकॉर्ड खोजें।'),
    ],
    accentColor: '#1E40AF',
    url: 'https://upbhulekh.gov.in',
  },
  {
    id: 'up-bhunaksha',
    shortCode: 'NM',
    category: 'official',
    title: text('UP BhuNaksha', 'यूपी भू-नक्शा'),
    subtitle: text(
      'Open village map and plot boundaries from the public map portal.',
      'पब्लिक मैप पोर्टल से ग्राम नक्शा और प्लॉट सीमाएं देखें।',
    ),
    description: text(
      'Useful for map view, plot identification, and quick visual reference while working on field notes.',
      'मैप व्यू, प्लॉट पहचान और फील्ड नोट्स के दौरान त्वरित दृश्य संदर्भ के लिए उपयोगी।',
    ),
    badge: text('Map', 'नक्शा'),
    highlights: [
      text('Map-focused public portal', 'मैप आधारित सार्वजनिक पोर्टल'),
      text('Useful for boundary reference', 'सीमा संदर्भ के लिए उपयोगी'),
      text('Supports village map checking', 'ग्राम नक्शा देखने में सहायक'),
    ],
    steps: [
      text('Open the map portal.', 'मैप पोर्टल खोलें।'),
      text('Select district and village.', 'जिला और गांव चुनें।'),
      text('Use map layers to inspect plot references.', 'प्लॉट संदर्भ देखने के लिए मैप लेयर का उपयोग करें।'),
    ],
    accentColor: '#2563EB',
    url: 'https://upbhunaksha.gov.in',
  },
  {
    id: 'edistrict-up',
    shortCode: 'ED',
    category: 'official',
    title: text('eDistrict UP', 'ई-डिस्ट्रिक्ट यूपी'),
    subtitle: text(
      'Open service requests, certificates, and citizen applications.',
      'सेवा अनुरोध, प्रमाणपत्र और नागरिक आवेदन खोलें।',
    ),
    description: text(
      'Useful for support work related to online certificates and department-facing service applications.',
      'ऑनलाइन प्रमाणपत्र और विभागीय आवेदन संबंधी कार्यों के लिए उपयोगी।',
    ),
    badge: text('Citizen', 'नागरिक'),
    highlights: [
      text('Certificate and service application access', 'प्रमाणपत्र और सेवा आवेदन एक्सेस'),
      text('Good for mixed office workflows', 'मिश्रित ऑफिस कार्यों के लिए अच्छा'),
      text('Public department source', 'सार्वजनिक विभाग स्रोत'),
    ],
    steps: [
      text('Open eDistrict from the app.', 'ऐप से ई-डिस्ट्रिक्ट खोलें।'),
      text('Choose the relevant service area.', 'संबंधित सेवा क्षेत्र चुनें।'),
      text('Continue with the official process.', 'आधिकारिक प्रक्रिया के साथ आगे बढ़ें।'),
    ],
    accentColor: '#0F766E',
    url: 'https://edistrict.up.gov.in',
  },
  {
    id: 'igrs-registry',
    shortCode: 'RG',
    category: 'official',
    title: text('IGRS Registry', 'आईजीआरएस रजिस्ट्री'),
    subtitle: text(
      'Check registry support, valuation, and property registration links.',
      'रजिस्ट्री सहायता, मूल्यांकन और प्रॉपर्टी रजिस्ट्रेशन लिंक देखें।',
    ),
    description: text(
      'A useful starting point for valuation, registry reference, and property document support work.',
      'वैल्यूएशन, रजिस्ट्री संदर्भ और प्रॉपर्टी दस्तावेज़ कार्य के लिए उपयोगी प्रारंभिक बिंदु।',
    ),
    badge: text('Registry', 'रजिस्ट्री'),
    highlights: [
      text('Property registration support', 'प्रॉपर्टी रजिस्ट्रेशन सहायता'),
      text('Useful for rate and value checking', 'रेट और वैल्यू जांच में उपयोगी'),
      text('Official public source', 'आधिकारिक सार्वजनिक स्रोत'),
    ],
    steps: [
      text('Open the IGRS portal.', 'आईजीआरएस पोर्टल खोलें।'),
      text('Select the registry or valuation area.', 'रजिस्ट्री या मूल्यांकन सेक्शन चुनें।'),
      text('Continue with the relevant official service.', 'संबंधित आधिकारिक सेवा के साथ आगे बढ़ें।'),
    ],
    accentColor: '#EA580C',
    url: 'https://igrsup.gov.in',
  },
  {
    id: 'revenue-court',
    shortCode: 'RC',
    category: 'official',
    title: text('Revenue Court', 'राजस्व न्यायालय'),
    subtitle: text(
      'Track case-related public information and reference pages.',
      'केस संबंधी सार्वजनिक जानकारी और संदर्भ पेज देखें।',
    ),
    description: text(
      'Helpful when you need a quick route to public court status and related department pages.',
      'जब सार्वजनिक कोर्ट स्टेटस और संबंधित विभागीय पेज की ज़रूरत हो तब उपयोगी।',
    ),
    badge: text('Case', 'मामला'),
    highlights: [
      text('Useful for case tracking references', 'केस ट्रैकिंग संदर्भ के लिए उपयोगी'),
      text('Public department portal route', 'सार्वजनिक विभाग पोर्टल मार्ग'),
      text('Fits daily office follow-up work', 'दैनिक ऑफिस फॉलो-अप में सहायक'),
    ],
    steps: [
      text('Open the portal from the app.', 'ऐप से पोर्टल खोलें।'),
      text('Choose the case search or status area.', 'केस सर्च या स्टेटस सेक्शन चुनें।'),
      text('Use the public records available there.', 'उपलब्ध सार्वजनिक रिकॉर्ड्स का उपयोग करें।'),
    ],
    accentColor: '#7C3AED',
    url: 'https://vaad.up.nic.in',
  },
  {
    id: 'village-diary',
    shortCode: 'VD',
    category: 'workflow',
    title: text('Village Diary', 'ग्राम डायरी'),
    subtitle: text(
      'Keep a structured note flow for village visits and pending follow-ups.',
      'ग्राम भ्रमण और पेंडिंग फॉलो-अप के लिए व्यवस्थित नोट फ्लो रखें।',
    ),
    description: text(
      'A workflow section for planning field work, noting follow-up items, and keeping village-wise work visible.',
      'फील्ड वर्क की योजना, फॉलो-अप बिंदु और गांववार काम को स्पष्ट रखने वाला वर्कफ्लो सेक्शन।',
    ),
    badge: text('Workflow', 'वर्कफ्लो'),
    highlights: [
      text('Good for daily visit notes', 'दैनिक भ्रमण नोट्स के लिए अच्छा'),
      text('Keeps pending tasks visible', 'पेंडिंग काम स्पष्ट रखता है'),
      text('Fits drawer-based daily work navigation', 'ड्रॉअर आधारित दैनिक कार्य नेविगेशन में फिट'),
    ],
    steps: [
      text('Start with the village name and date.', 'गांव का नाम और तारीख से शुरू करें।'),
      text('Add important field observations.', 'महत्वपूर्ण फील्ड टिप्पणियां जोड़ें।'),
      text('Mark pending follow-up items clearly.', 'पेंडिंग फॉलो-अप बिंदु स्पष्ट लिखें।'),
    ],
    accentColor: '#0891B2',
  },
  {
    id: 'field-inspection',
    shortCode: 'FI',
    category: 'workflow',
    title: text('Field Inspection Notes', 'फील्ड निरीक्षण नोट्स'),
    subtitle: text(
      'Prepare a cleaner structure for field observations and inspection points.',
      'फील्ड टिप्पणियों और निरीक्षण बिंदुओं के लिए साफ संरचना तैयार करें।',
    ),
    description: text(
      'A compact note workflow that supports inspection work and helps you remember critical verification points.',
      'निरीक्षण कार्य के लिए कॉम्पैक्ट नोट वर्कफ्लो जो महत्वपूर्ण सत्यापन बिंदुओं को याद रखने में मदद करता है।',
    ),
    badge: text('Field', 'फील्ड'),
    highlights: [
      text('Built for visit notes', 'भ्रमण नोट्स के लिए उपयुक्त'),
      text('Helps maintain a checklist mindset', 'चेकलिस्ट सोच बनाए रखता है'),
      text('Useful for daily record quality', 'दैनिक रिकॉर्ड गुणवत्ता में सहायक'),
    ],
    steps: [
      text('Record the visit context first.', 'पहले भ्रमण का संदर्भ लिखें।'),
      text('List observed issues or confirmations.', 'देखी गई समस्याएं या पुष्टि बिंदु लिखें।'),
      text('Note the next required action.', 'अगली आवश्यक कार्रवाई लिखें।'),
    ],
    accentColor: '#0F766E',
  },
  {
    id: 'mutation-tracker',
    shortCode: 'MT',
    category: 'workflow',
    title: text('Mutation Tracker', 'नामांतरण ट्रैकर'),
    subtitle: text(
      'Track pending mutation-related work and document status clearly.',
      'पेंडिंग नामांतरण कार्य और दस्तावेज़ स्थिति को स्पष्ट रखें।',
    ),
    description: text(
      'Useful for following up status, missing document notes, and pending work points inside one workflow.',
      'एक ही वर्कफ्लो में स्टेटस, कमी वाले दस्तावेज़ और पेंडिंग कार्य बिंदुओं को रखने में उपयोगी।',
    ),
    badge: text('Track', 'ट्रैक'),
    highlights: [
      text('Status-based follow-up support', 'स्थिति आधारित फॉलो-अप सहायता'),
      text('Clear pending work view', 'पेंडिंग काम का स्पष्ट दृश्य'),
      text('Structured for office handling', 'ऑफिस कार्य के लिए संरचित'),
    ],
    steps: [
      text('Create a case entry.', 'एक केस एंट्री बनाएं।'),
      text('List received and pending documents.', 'मिले और पेंडिंग डॉक्यूमेंट्स लिखें।'),
      text('Update status after each follow-up.', 'हर फॉलो-अप के बाद स्थिति अपडेट करें।'),
    ],
    accentColor: '#DC2626',
  },
  {
    id: 'area-converter',
    shortCode: 'AC',
    category: 'measurement',
    title: text('Area Converter', 'एरिया कन्वर्टर'),
    subtitle: text(
      'Convert between standard area units for quick practical use.',
      'मानक क्षेत्रफल यूनिट्स के बीच त्वरित रूपांतरण करें।',
    ),
    description: text(
      'A stable unit converter for square meter, square feet, acre, hectare, and square yard values.',
      'वर्ग मीटर, वर्ग फुट, एकड़, हेक्टेयर और वर्ग गज के लिए भरोसेमंद यूनिट कन्वर्टर।',
    ),
    badge: text('Measure', 'नाप'),
    highlights: [
      text('Useful for standard units', 'मानक यूनिट्स के लिए उपयोगी'),
      text('Fast field-side conversion', 'फील्ड में तेज़ रूपांतरण'),
      text('Avoids rough manual conversion', 'अनुमानित मैनुअल रूपांतरण से बचाता है'),
    ],
    steps: [
      text('Enter the source value.', 'मूल वैल्यू दर्ज करें।'),
      text('Choose from and to units.', 'कौन सी यूनिट से और किस यूनिट में चुनें।'),
      text('Read the converted result instantly.', 'तुरंत परिवर्तित परिणाम देखें।'),
    ],
    accentColor: '#0284C7',
  },
  {
    id: 'plot-boundary-guide',
    shortCode: 'PB',
    category: 'measurement',
    title: text('Plot Boundary Guide', 'प्लॉट सीमा गाइड'),
    subtitle: text(
      'Keep boundary-related checks visible during field verification.',
      'फील्ड सत्यापन के दौरान सीमा संबंधी जांच स्पष्ट रखें।',
    ),
    description: text(
      'A measurement support module for plotting your checks and staying consistent during on-site work.',
      'ऑन-साइट कार्य के दौरान जांच बिंदुओं को व्यवस्थित रखने वाला मापन सहयोग मॉड्यूल।',
    ),
    badge: text('Guide', 'गाइड'),
    highlights: [
      text('Works as a field reminder', 'फील्ड रिमाइंडर की तरह काम करता है'),
      text('Supports boundary verification flow', 'सीमा सत्यापन में सहायक'),
      text('Pairs well with map tools', 'मैप टूल्स के साथ अच्छा मेल'),
    ],
    steps: [
      text('Note the plot reference first.', 'पहले प्लॉट संदर्भ लिखें।'),
      text('Check visible boundary markers.', 'दिखने वाले सीमा चिन्ह देखें।'),
      text('Record mismatches for follow-up.', 'अंतर मिलने पर फॉलो-अप के लिए लिखें।'),
    ],
    accentColor: '#0369A1',
  },
  {
    id: 'map-scale-helper',
    shortCode: 'MS',
    category: 'measurement',
    title: text('Map Scale Helper', 'मैप स्केल हेल्पर'),
    subtitle: text(
      'Use a compact reminder flow when reading scaled map references.',
      'स्केल वाले मैप संदर्भ पढ़ते समय संक्षिप्त सहायता फ्लो का उपयोग करें।',
    ),
    description: text(
      'A support module to keep scale reading and note comparison structured while working across maps.',
      'मैप्स पर काम करते समय स्केल पढ़ने और नोट तुलना को व्यवस्थित रखने वाला सहायक मॉड्यूल।',
    ),
    badge: text('Scale', 'स्केल'),
    highlights: [
      text('Helpful for map reading discipline', 'मैप पढ़ने की अनुशासन में सहायक'),
      text('Good with BhuNaksha work', 'भू-नक्शा कार्य के साथ उपयोगी'),
      text('Fits quick reference usage', 'त्वरित संदर्भ उपयोग के लिए उपयुक्त'),
    ],
    steps: [
      text('Keep the map scale visible.', 'मैप स्केल स्पष्ट रखें।'),
      text('Compare notes with the map reference.', 'नोट्स को मैप संदर्भ से मिलाएं।'),
      text('Use standard measurements for conversions.', 'रूपांतरण के लिए मानक मापों का उपयोग करें।'),
    ],
    accentColor: '#0EA5E9',
  },
  {
    id: 'registry-estimate',
    shortCode: 'RE',
    category: 'calculator',
    title: text('Registry Estimate', 'रजिस्ट्री अनुमान'),
    subtitle: text(
      'Estimate registry-related totals using your own entered values.',
      'अपनी दर्ज की गई वैल्यू से रजिस्ट्री संबंधित कुल अनुमान निकालें।',
    ),
    description: text(
      'A flexible calculator to estimate market value, stamp duty, registration fee, and total cost.',
      'मार्केट वैल्यू, स्टाम्प ड्यूटी, रजिस्ट्रेशन शुल्क और कुल लागत का अनुमान देने वाला लचीला कैलकुलेटर।',
    ),
    badge: text('Calc', 'कैल्क'),
    highlights: [
      text('No fixed legal assumption inside the app', 'ऐप के अंदर कोई तय कानूनी मान नहीं'),
      text('You control the rates and percentages', 'रेट और प्रतिशत आप तय करते हैं'),
      text('Useful for practical estimation', 'व्यावहारिक अनुमान में उपयोगी'),
    ],
    steps: [
      text('Enter area and rate values.', 'क्षेत्रफल और रेट दर्ज करें।'),
      text('Add stamp and registration percentages.', 'स्टाम्प और रजिस्ट्रेशन प्रतिशत जोड़ें।'),
      text('Review market value and total estimate.', 'मार्केट वैल्यू और कुल अनुमान देखें।'),
    ],
    accentColor: '#EA580C',
  },
  {
    id: 'share-calculator',
    shortCode: 'HS',
    category: 'calculator',
    title: text('Hissa Calculator', 'हिस्सा कैलकुलेटर'),
    subtitle: text(
      'Split any total by percentage for a quick share estimate.',
      'किसी भी कुल राशि को प्रतिशत के आधार पर बांटें।',
    ),
    description: text(
      'A simple share calculator for ownership split, produce share, or any similar two-part estimate.',
      'स्वामित्व बंटवारा, उत्पादन हिस्सा या समान दो-भाग अनुमान के लिए सरल कैलकुलेटर।',
    ),
    badge: text('Share', 'हिस्सा'),
    highlights: [
      text('Useful for quick split checks', 'त्वरित बंटवारा जांच के लिए उपयोगी'),
      text('Works with any numeric total', 'किसी भी संख्यात्मक कुल के साथ काम करता है'),
      text('Easy for daily rough planning', 'दैनिक प्रारंभिक योजना के लिए आसान'),
    ],
    steps: [
      text('Enter the total amount.', 'कुल राशि दर्ज करें।'),
      text('Enter the owner share percentage.', 'मालिक का प्रतिशत दर्ज करें।'),
      text('Review both split values.', 'दोनों हिस्सों की वैल्यू देखें।'),
    ],
    accentColor: '#7C3AED',
  },
  {
    id: 'fraction-hissa-calculator',
    shortCode: 'FH',
    category: 'calculator',
    title: text('Fraction Hissa', 'फ्रैक्शन हिस्सा'),
    subtitle: text(
      'Convert a land-share fraction like 1/3 or 7/12 into area and percentage.',
      '1/3 या 7/12 जैसे हिस्से को क्षेत्रफल और प्रतिशत में बदलें।',
    ),
    description: text(
      'A practical calculator for fraction-based ownership or partition work where the share is written as numerator and denominator.',
      'अंश और हर के रूप में लिखे गए हिस्से को क्षेत्रफल और प्रतिशत में बदलने वाला व्यावहारिक कैलकुलेटर।',
    ),
    badge: text('Fraction', 'फ्रैक्शन'),
    highlights: [
      text('Useful for land-share entries', 'भूमि हिस्सेदारी प्रविष्टियों के लिए उपयोगी'),
      text('Shows both area and percentage', 'क्षेत्रफल और प्रतिशत दोनों दिखाता है'),
      text('Helps avoid manual fraction mistakes', 'मैन्युअल फ्रैक्शन गलती से बचाता है'),
    ],
    steps: [
      text('Enter total area first.', 'पहले कुल क्षेत्रफल दर्ज करें।'),
      text('Enter numerator and denominator of the share.', 'हिस्से का अंश और हर दर्ज करें।'),
      text('Review share area, remaining area, and percentage.', 'हिस्से का क्षेत्रफल, शेष क्षेत्रफल और प्रतिशत देखें।'),
    ],
    accentColor: '#C026D3',
  },
  {
    id: 'rate-finder',
    shortCode: 'RF',
    category: 'calculator',
    title: text('Rate Finder', 'रेट फाइंडर'),
    subtitle: text(
      'Find per-unit rate from total area and total value.',
      'कुल क्षेत्रफल और कुल मूल्य से प्रति यूनिट रेट निकालें।',
    ),
    description: text(
      'A reverse calculator for working back from total amount to gross rate, net rate, and charge per unit.',
      'कुल राशि से ग्रॉस रेट, नेट रेट और प्रति यूनिट चार्ज निकालने वाला रिवर्स कैलकुलेटर।',
    ),
    badge: text('Rate', 'रेट'),
    highlights: [
      text('Useful when total value is already known', 'जब कुल मूल्य पहले से पता हो तब उपयोगी'),
      text('Shows gross and net rate separately', 'ग्रॉस और नेट रेट अलग-अलग दिखाता है'),
      text('Helps cross-check manual estimates', 'मैन्युअल अनुमान की जांच में मदद करता है'),
    ],
    steps: [
      text('Enter total area first.', 'पहले कुल क्षेत्रफल दर्ज करें।'),
      text('Enter total value and any charge part.', 'कुल मूल्य और चार्ज हिस्सा दर्ज करें।'),
      text('Review gross rate, net rate, and charge per unit.', 'ग्रॉस रेट, नेट रेट और प्रति यूनिट चार्ज देखें।'),
    ],
    accentColor: '#0F766E',
  },
  {
    id: 'circle-rate-compare',
    shortCode: 'CR',
    category: 'calculator',
    title: text('Circle Rate Comparison', 'सर्किल रेट तुलना'),
    subtitle: text(
      'Keep a structured comparison mindset when reviewing value scenarios.',
      'वैल्यू परिदृश्यों की समीक्षा करते समय तुलना को व्यवस्थित रखें।',
    ),
    description: text(
      'A guidance module for comparing rates, assumptions, and possible value differences before final reference work.',
      'अंतिम संदर्भ कार्य से पहले रेट, मान्यताओं और संभावित अंतर की तुलना के लिए मार्गदर्शक मॉड्यूल।',
    ),
    badge: text('Rate', 'रेट'),
    highlights: [
      text('Supports estimate comparison', 'अनुमान तुलना में सहायक'),
      text('Useful before formal reference work', 'औपचारिक संदर्भ कार्य से पहले उपयोगी'),
      text('Keeps the process structured', 'प्रक्रिया को व्यवस्थित रखता है'),
    ],
    steps: [
      text('Collect the rate points to compare.', 'तुलना के लिए रेट बिंदु इकट्ठा करें।'),
      text('Check the difference in assumptions.', 'मान्यताओं का अंतर देखें।'),
      text('Keep notes before final action.', 'अंतिम कार्रवाई से पहले नोट्स रखें।'),
    ],
    accentColor: '#9333EA',
  },
  {
    id: 'saved-record-locker',
    shortCode: 'SR',
    category: 'premium',
    title: text('Saved Record Locker', 'सेव्ड रिकॉर्ड लॉकर'),
    subtitle: text(
      'Keep frequent references, recent portals, and follow-up points together.',
      'अक्सर उपयोग होने वाले संदर्भ, हाल के पोर्टल और फॉलो-अप बिंदु एक साथ रखें।',
    ),
    description: text(
      'A premium productivity section designed for frequently used records and repeated daily work items.',
      'बार-बार उपयोग होने वाले रिकॉर्ड्स और दैनिक कार्य बिंदुओं के लिए बनाया गया प्रीमियम उत्पादकता सेक्शन।',
    ),
    badge: text('Premium', 'प्रीमियम'),
    highlights: [
      text('For repeated daily access', 'बार-बार दैनिक उपयोग के लिए'),
      text('Keeps work grouped together', 'काम को एक साथ रखता है'),
      text('Designed for faster navigation', 'तेज़ नेविगेशन के लिए डिज़ाइन किया गया'),
    ],
    steps: [
      text('Select your frequent tools.', 'अपने नियमित टूल्स चुनें।'),
      text('Pin record references for quick reuse.', 'त्वरित उपयोग के लिए रिकॉर्ड्स पिन करें।'),
      text('Open everything from one premium space.', 'सब कुछ एक प्रीमियम स्पेस से खोलें।'),
    ],
    accentColor: '#F59E0B',
    premium: true,
  },
];

export const WORKFLOW_TOOL_IDS = [
  'village-diary',
  'field-inspection',
  'mutation-tracker',
];

export const FEATURED_TOOL_IDS = [
  'up-bhulekh',
  'up-bhunaksha',
  'igrs-registry',
  'area-converter',
];

export const OFFICIAL_TOOL_IDS = [
  'up-bhulekh',
  'up-bhunaksha',
  'edistrict-up',
  'igrs-registry',
  'revenue-court',
];

export const MEASUREMENT_TOOL_IDS = [
  'area-converter',
  'plot-boundary-guide',
  'map-scale-helper',
];

export const CALCULATOR_TOOL_IDS = [
  'registry-estimate',
  'share-calculator',
  'fraction-hissa-calculator',
  'rate-finder',
  'circle-rate-compare',
];

export const PREMIUM_TOOL_IDS = ['saved-record-locker'];

export const getToolById = (toolId: string) =>
  TOOL_CATALOG.find(tool => tool.id === toolId);
