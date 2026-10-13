export type PremiumFeature = 'gps_capture' | 'pdf_reports';
export type PremiumEntitlement = {
  userId: string;
  active: boolean;
  expiresAt: string | null;
  verifiedAt: string | null;
  serverTime: string;
  validUntil: string | null;
  features: PremiumFeature[];
};

// An entitlement lives only in memory. A stored login or device clock cannot
// turn a previous purchase into permanent access. Supabase issues the lease.
export function entitlementAllows(
  entitlement: PremiumEntitlement | null,
  userId: string | null,
  feature: PremiumFeature,
  serverNow: number,
) {
  if (!entitlement || !userId || entitlement.userId !== userId || !entitlement.active)
    return false;
  return (
    entitlement.features.includes(feature) &&
    Number.isFinite(serverNow) &&
    serverNow >= Date.parse(entitlement.serverTime) &&
    serverNow < Date.parse(entitlement.expiresAt || '') &&
    serverNow < Date.parse(entitlement.validUntil || '')
  );
}

export function formatPlanPeriod(period: string, hi = false) {
  const match = /^P(\d+)([DWMY])$/.exec(period);
  if (!match) return period;
  const count = Number(match[1]);
  const units: Record<string, [string, string]> = {
    D: ['day', 'दिन'], W: ['week', 'सप्ताह'],
    M: ['month', 'महीने'], Y: ['year', 'वर्ष'],
  };
  return `${count} ${hi ? units[match[2]][1] : units[match[2]][0] + (count === 1 ? '' : 's')}`;
}
