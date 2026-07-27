export const formatNumber = (
  value: number,
  maximumFractionDigits = 2,
) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
};

export const formatFixed = (
  value: number,
  fractionDigits = 2,
) => {
  if (!Number.isFinite(value)) {
    return `0.${'0'.repeat(fractionDigits)}`;
  }

  return value.toFixed(fractionDigits);
};

export const formatCurrency = (value: number) =>
  `₹ ${formatNumber(value, 2)}`;

export const formatDateLabel = (isoValue: string) => {
  const parsedDate = new Date(isoValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return isoValue;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate);
};

export const sanitizeFileName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'smart-work-report';

export const hasAnyValue = (
  values: Record<string, string>,
) => Object.values(values).some(value => value.trim().length > 0);
