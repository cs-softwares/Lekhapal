import {supabase} from './supabase';
import type {PremiumEntitlement} from '../domain/premium';

export type PremiumCatalog = {enabled: boolean; productId: string};
export type PremiumResponse = {
  entitlement: PremiumEntitlement;
  purchaseState?: string;
  acknowledged?: boolean;
  accountId?: string;
};

export async function premiumApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const {data, error} = await supabase.functions.invoke('premium', {
    body: {action, ...payload},
  });
  if (error || !data || data.error) {
    throw new Error(data?.error || 'Premium service is unavailable. Please retry.');
  }
  return data as T;
}
