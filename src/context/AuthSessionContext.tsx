import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isSupabaseConfigured,
  supabase,
} from '../services/supabase';

export type AccountPlan = 'guest' | 'free' | 'premium';

export type AuthSession = {
  userId?: string;
  displayName: string;
  email: string | null;
  isGuest: boolean;
  phoneNumber: string | null;
  plan: AccountPlan;
};

type SignInInput = {
  displayName: string;
  email?: string;
  phoneNumber?: string;
};

type VerifyOtpInput = SignInInput & {
  otp: string;
};

type EmailPasswordInput = {
  displayName?: string;
  email: string;
  password: string;
};

type AuthSessionContextValue = {
  isHydrated: boolean;
  session: AuthSession | null;
  sendOtp: (input: SignInInput) => Promise<void>;
  signInWithEmail: (input: EmailPasswordInput) => Promise<void>;
  signUpWithEmail: (input: EmailPasswordInput) => Promise<void>;
  signOut: () => Promise<void>;
  verifyOtp: (input: VerifyOtpInput) => Promise<void>;
};

const STORAGE_KEY = 'lekhpal-smart-work-session';

const AuthSessionContext = createContext<
  AuthSessionContextValue | undefined
>(undefined);

const buildFreeSession = ({
  displayName,
  email,
  phoneNumber,
  userId,
}: SignInInput & {userId: string}): AuthSession => ({
  userId,
  displayName: displayName.trim(),
  email: email ?? null,
  isGuest: false,
  phoneNumber: phoneNumber ?? null,
  plan: 'free',
});

const requireSupabase = () => {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Add your Supabase URL and anon key in src/services/supabase.ts first.',
    );
  }
};

const persistSession = async (session: AuthSession | null) => {
  if (!session) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(session),
  );
};

export const AuthSessionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [session, setSession] = useState<AuthSession | null>(
    null,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const rawSession = await AsyncStorage.getItem(STORAGE_KEY);

        // Restore only authenticated sessions. Contact Supabase only
        // when a stored authenticated session needs to be restored.
        if (
          isSupabaseConfigured &&
          rawSession &&
          !rawSession.includes('"isGuest":true')
        ) {
          const {data, error} = await supabase.auth.getSession();
          if (error) {
            throw error;
          }

          if (!isMounted) {
            return;
          }

          if (
            data.session?.user.phone ||
            data.session?.user.email
          ) {
            const phoneNumber = data.session.user.phone?.replace(
              /^\+91/,
              '',
            );
            const displayName =
              data.session.user.user_metadata.display_name ||
              'Lekhpal User';
            setSession(
              buildFreeSession({
                displayName,
                userId: data.session.user.id,
                email: data.session.user.email,
                phoneNumber,
              }),
            );
            return;
          }
        }

        if (!isMounted) {
          return;
        }

        if (!rawSession) {
          setSession(null);
          return;
        }

        // Old guest/test sessions no longer bypass sign-in. Saved work stays intact.
        await persistSession(null);
        setSession(null);
      } catch {
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const sendOtp = async (input: SignInInput) => {
    requireSupabase();
    const options = {
      data: {display_name: input.displayName.trim()},
      shouldCreateUser: true,
    };
    const result = input.email
      ? await supabase.auth.signInWithOtp({
          email: input.email,
          options,
        })
      : await supabase.auth.signInWithOtp({
          phone: `+91${input.phoneNumber}`,
          options,
        });

    if (result.error) {
      throw result.error;
    }
  };

  const applySupabaseUser = async (user: {
    id: string;
    email?: string;
    phone?: string;
    user_metadata?: {display_name?: string};
  }) => {
    const authenticatedSession = buildFreeSession({
      userId: user.id,
      displayName: user.user_metadata?.display_name || 'Lekhpal User',
      email: user.email,
      phoneNumber: user.phone?.replace(/^\+91/, ''),
    });
    setSession(authenticatedSession);
    await persistSession(authenticatedSession);
  };

  const signInWithEmail = async (input: EmailPasswordInput) => {
    requireSupabase();
    const {data, error} = await supabase.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });

    if (error) {
      throw error;
    }
    if (!data.user) {
      throw new Error('Login could not be completed. Please try again.');
    }
    await applySupabaseUser(data.user);
  };

  const signUpWithEmail = async (input: EmailPasswordInput) => {
    requireSupabase();
    const {data, error} = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: {display_name: input.displayName?.trim()},
      },
    });

    if (error) {
      throw error;
    }
    if (!data.session || !data.user) {
      throw new Error(
        'Account created. Confirm your email, then return and sign in.',
      );
    }
    await applySupabaseUser(data.user);
  };

  const verifyOtp = async (input: VerifyOtpInput) => {
    requireSupabase();
    const result = input.email
      ? await supabase.auth.verifyOtp({
          email: input.email,
          token: input.otp,
          type: 'email',
        })
      : await supabase.auth.verifyOtp({
          phone: `+91${input.phoneNumber}`,
          token: input.otp,
          type: 'sms',
        });

    if (result.error) {
      throw result.error;
    }

    const {error: profileError} = await supabase.auth.updateUser({
      data: {display_name: input.displayName.trim()},
    });

    if (profileError) {
      throw profileError;
    }

    if (!result.data.user) throw new Error('Sign in could not be verified.');
    const premiumSession = buildFreeSession({...input, userId: result.data.user.id});
    setSession(premiumSession);

    try {
      await persistSession(premiumSession);
    } catch {
      // Keep the in-memory session even if storage fails.
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && session && !session.isGuest) {
      const {error} = await supabase.auth.signOut({scope: 'local'});
      if (error) {throw error;}
    }
    await persistSession(null);
    setSession(null);
  };

  return (
    <AuthSessionContext.Provider
      value={{
        isHydrated,
        session,
        sendOtp,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        verifyOtp,
      }}>
      {children}
    </AuthSessionContext.Provider>
  );
};

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error(
      'useAuthSession must be used within AuthSessionProvider',
    );
  }

  return context;
};
