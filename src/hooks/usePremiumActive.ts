import { useSyncExternalStore } from 'react';
import {
  hasPremiumAccess,
  subscribePremiumAccess,
} from '../services/premiumAccess';
const snapshot = () => hasPremiumAccess('gps_capture');
export const usePremiumActive = () =>
  useSyncExternalStore(subscribePremiumAccess, snapshot, () => false);
