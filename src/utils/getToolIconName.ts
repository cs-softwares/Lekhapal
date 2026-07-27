const getToolIconName = (toolId: string) => {
  switch (toolId) {
    case 'up-bhulekh':
      return 'file-document-outline';
    case 'up-bhunaksha':
      return 'map-outline';
    case 'edistrict-up':
      return 'office-building-outline';
    case 'igrs-registry':
      return 'stamp';
    case 'revenue-court':
      return 'scale-balance';
    case 'village-diary':
      return 'notebook-outline';
    case 'field-inspection':
      return 'clipboard-search-outline';
    case 'mutation-tracker':
      return 'file-sync-outline';
    case 'area-converter':
      return 'ruler-square';
    case 'plot-boundary-guide':
      return 'map-marker-path';
    case 'map-scale-helper':
      return 'map-legend';
    case 'registry-estimate':
      return 'calculator';
    case 'share-calculator':
      return 'percent-outline';
    case 'fraction-hissa-calculator':
      return 'division';
    case 'rate-finder':
      return 'currency-inr';
    case 'circle-rate-compare':
      return 'chart-line';
    case 'saved-record-locker':
      return 'lock-outline';
    default:
      return 'apps';
  }
};

export default getToolIconName;
