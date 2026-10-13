import { DeskState, MutationStatus, Point } from '../types';
export const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
export const money = (value: number) =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export function validPoint(p: Point) {
  return (
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  );
}
export function polygonArea(points: Point[]): number {
  if (points.length < 3 || points.some(p => !validPoint(p))) {
    return 0;
  }
  const rad = Math.PI / 180;
  const origin = points[0];
  const cos = Math.cos(
    (points.reduce((n, p) => n + p.latitude, 0) / points.length) * rad,
  );
  const xy = points.map(p => ({
    x: (p.longitude - origin.longitude) * rad * 6371008.8 * cos,
    y: (p.latitude - origin.latitude) * rad * 6371008.8,
  }));
  return (
    Math.abs(
      xy.reduce((sum, p, i) => {
        const q = xy[(i + 1) % xy.length];
        return sum + p.x * q.y - q.x * p.y;
      }, 0),
    ) / 2
  );
}
export function selfIntersects(points: Point[]) {
  const cross = (a: Point, b: Point, c: Point) =>
    (b.longitude - a.longitude) * (c.latitude - a.latitude) -
    (b.latitude - a.latitude) * (c.longitude - a.longitude);
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) {
        continue;
      }
      const a = points[i],
        b = points[(i + 1) % points.length],
        c = points[j],
        d = points[(j + 1) % points.length];
      if (
        cross(a, b, c) * cross(a, b, d) <= 0 &&
        cross(c, d, a) * cross(c, d, b) <= 0 &&
        Math.max(
          Math.min(a.longitude, b.longitude),
          Math.min(c.longitude, d.longitude),
        ) <=
          Math.min(
            Math.max(a.longitude, b.longitude),
            Math.max(c.longitude, d.longitude),
          ) &&
        Math.max(
          Math.min(a.latitude, b.latitude),
          Math.min(c.latitude, d.latitude),
        ) <=
          Math.min(
            Math.max(a.latitude, b.latitude),
            Math.max(c.latitude, d.latitude),
          )
      ) {
        return true;
      }
    }
  }
  return false;
}
export function reliefPayout(hectares: number, loss: number, rate: number) {
  if (
    ![hectares, loss, rate].every(Number.isFinite) ||
    hectares <= 0 ||
    loss < 0 ||
    loss > 100 ||
    rate < 0
  ) {
    throw new Error('Enter a positive area and a loss between 0 and 100%.');
  }
  return Math.round((hectares * rate * loss) / 100);
}
export function decideMutation(
  state: DeskState,
  id: string,
  status: MutationStatus,
  reason: string,
  now = Date.now(),
): DeskState {
  const record = state.mutations.find(m => m.id === id);
  if (!record || !['Pending', 'Objections'].includes(record.status)) {
    throw new Error('This application is already closed.');
  }
  if (status !== 'Approved' && status !== 'Rejected') {
    throw new Error('Select an approval or rejection decision.');
  }
  if (status === 'Rejected' && reason.trim().length < 10) {
    throw new Error('Enter a legal reason of at least 10 characters.');
  }
  let lands = state.lands;
  if (status === 'Approved') {
    if (record.status === 'Objections') {
      throw new Error('Resolve and document the objection before approval.');
    }
    if (!record.buyerVerified || !record.sellerVerified) {
      throw new Error('Both parties must have verified identity checks.');
    }
    if (!record.noticeAt || now - Date.parse(record.noticeAt) < 15 * 86400000) {
      throw new Error(
        'The full 15-day public notice period must finish first.',
      );
    }
    const land = lands.find(l => l.id === record.landId);
    const seller = land?.owners.find(o => o.name === record.seller);
    if (
      !seller ||
      seller.share < record.transferShare ||
      record.transferShare <= 0
    ) {
      throw new Error('Seller share changed. Re-verify the land record.');
    }
    lands = lands.map(l => {
      if (l.id !== record.landId) {
        return l;
      }
      const owners = l.owners
        .map(o => ({
          ...o,
          share:
            o.name === record.seller ? o.share - record.transferShare : o.share,
        }))
        .filter(o => o.share > 0);
      const buyer = owners.find(o => o.name === record.buyer);
      if (buyer) {
        buyer.share += record.transferShare;
      } else {
        owners.push({ name: record.buyer, share: record.transferShare });
      }
      return { ...l, owners, flagged: false };
    });
  }
  return {
    ...state,
    lands,
    mutations: state.mutations.map(m =>
      m.id === id ? { ...m, status, reason: reason.trim() } : m,
    ),
  };
}
