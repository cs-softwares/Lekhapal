import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient} from '@supabase/supabase-js';

// The anon/publishable key is safe to ship in a mobile app. Never put the
// Supabase service-role key here.
export const SUPABASE_URL = 'https://edzpqmcjsweddavklitb.supabase.co';
export const SUPABASE_ANON_KEY =
  'sb_publishable_46-1B3b33Y26fKONMHBD1g_HuwZadmD';

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR_') &&
  !SUPABASE_ANON_KEY.includes('YOUR_');

export const supabase = createClient(
  isSupabaseConfigured
    ? SUPABASE_URL
    : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? SUPABASE_ANON_KEY : 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: AsyncStorage,
    },
  },
);
