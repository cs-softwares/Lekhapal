import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { installedAppDetails } from '../native/appDetails';
export const recoveryRedirect = () =>
  `${installedAppDetails().packageId}://auth/reset-password`;
// Recovery must never replace the current app login or its purchase identity.
let client: ReturnType<typeof createClient> | null = null;
const recovery = () =>
  client ||
  (client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'lekhpal-recovery-only',
      flowType: 'implicit',
    },
  }));
let verifiedAt = 0;
let verifiedUser: string | null = null;
let show: ((email?: string) => void) | null = null;
export const registerPasswordRecovery = (handler: typeof show) => {
  show = handler;
};
export const openPasswordRecovery = (email?: string) => show?.(email);
export const isRecoveryUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      `${url.protocol}//${url.host}${url.pathname}` === recoveryRedirect() &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};
export async function requestRecoveryEmail(email: string) {
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
    throw new Error('Enter a valid email address.');
  const { error } = await recovery().auth.resetPasswordForEmail(address, {
    redirectTo: recoveryRedirect(),
  });
  if (error) throw error;
}
export async function discardRecovery() {
  verifiedAt = 0;
  verifiedUser = null;
  if (client) await client.auth.signOut({ scope: 'local' }).catch(() => {});
}
export async function acceptRecoveryUrl(value: string) {
  if (!isRecoveryUrl(value)) throw new Error('Invalid recovery link.');
  const url = new URL(value);
  const params = new URLSearchParams(url.hash.slice(1));
  if (params.has('error') || url.searchParams.has('error'))
    throw new Error('This reset link has expired. Request a new email.');
  if (
    params.get('type') !== 'recovery' ||
    !params.get('access_token') ||
    !params.get('refresh_token')
  )
    throw new Error(
      'This reset link is invalid or incomplete. Request a new email.',
    );
  verifiedAt = 0;
  verifiedUser = null;
  const { data, error } = await recovery().auth.setSession({
    access_token: params.get('access_token')!,
    refresh_token: params.get('refresh_token')!,
  });
  if (error || !data.session)
    throw new Error('This reset link has expired. Request a new email.');
  const result = await recovery().auth.getUser();
  if (result.error || !result.data.user?.email) {
    await discardRecovery();
    throw new Error('Could not verify this reset link. Request a new email.');
  }
  verifiedAt = Date.now();
  verifiedUser = result.data.user.id;
  return result.data.user.email;
}
export async function updateRecoveredPassword(password: string) {
  if (
    !verifiedUser ||
    Date.now() - verifiedAt > 10 * 60 * 1000 ||
    Date.now() < verifiedAt
  )
    throw new Error('Your reset session has expired. Request a new email.');
  if (password.length < 8) throw new Error('Use at least 8 characters.');
  const { data, error } = await recovery().auth.getUser();
  if (error || data.user?.id !== verifiedUser) {
    await discardRecovery();
    throw new Error('Your reset session has expired. Request a new email.');
  }
  const updated = await recovery().auth.updateUser({ password });
  if (updated.error) throw updated.error;
  await discardRecovery();
}
