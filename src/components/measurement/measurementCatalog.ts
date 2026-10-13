import { LIGHT_COLORS } from '../../theme/palette';

export const MEASUREMENT_TOOLS = [
  {
    id: 'field-area',
    storageToolId: 'field-area-workspace',
    icon: 'vector-square',
    color: LIGHT_COLORS.primary,
    soft: LIGHT_COLORS.primarySoft,
    title: ['Field area', 'खेत का क्षेत्रफल'],
    description: ['Rectangle, triangle & trapezoid', 'आयत, त्रिभुज और समलंब'],
    tag: ['DIMENSIONS', 'माप से गणना'],
  },
  {
    id: 'plot-boundary-guide',
    storageToolId: 'plot-boundary-guide',
    icon: 'vector-polygon',
    color: LIGHT_COLORS.primary,
    soft: LIGHT_COLORS.primarySoft,
    title: ['Irregular plot', 'अनियमित भूखंड'],
    description: [
      'Four sides + an inside diagonal',
      'चार भुजाएं और अंदर का विकर्ण',
    ],
    tag: ['DIAGONAL METHOD', 'विकर्ण विधि'],
  },
  {
    id: 'area-converter',
    storageToolId: 'area-converter',
    icon: 'swap-horizontal',
    color: LIGHT_COLORS.primary,
    soft: LIGHT_COLORS.primarySoft,
    title: ['Convert units', 'इकाई बदलें'],
    description: [
      'm², hectare, acre & local units',
      'वर्ग मीटर, हेक्टेयर व स्थानीय इकाई',
    ],
    tag: ['UNIT CONVERSION', 'इकाई परिवर्तन'],
  },
  {
    id: 'map-scale-helper',
    storageToolId: 'map-scale-helper',
    icon: 'ruler',
    color: LIGHT_COLORS.primary,
    soft: LIGHT_COLORS.primarySoft,
    title: ['Map scale', 'नक्शे का पैमाना'],
    description: ['Paper distance → ground distance', 'नक्शे से जमीन की दूरी'],
    tag: ['MAP TO GROUND', 'नक्शे से जमीन'],
  },
  {
    id: 'gps-land-measure',
    storageToolId: 'gps-land-measure',
    icon: 'crosshairs-gps',
    color: LIGHT_COLORS.primary,
    soft: LIGHT_COLORS.primarySoft,
    title: ['GPS boundary', 'GPS से सीमा मापें'],
    description: [
      'Mark corners or walk the boundary',
      'कोने चुनें या सीमा पर चलकर मापें',
    ],
    tag: ['FIELD CAPTURE', 'मैदानी माप'],
  },
] as const;
export type MeasurementModuleId = (typeof MEASUREMENT_TOOLS)[number]['id'];
export type OfflineModuleId = Exclude<MeasurementModuleId, 'gps-land-measure'>;
export const isMeasurementModule = (id: unknown): id is MeasurementModuleId =>
  MEASUREMENT_TOOLS.some(tool => tool.id === id);
