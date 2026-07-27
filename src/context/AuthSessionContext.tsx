import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AccountPlan = 'guest' | 'premium';

export type AuthSession = {
  displayName: string;
  isGuest: boolean;
  phoneNumber: string | null;
  plan: AccountPlan;
};

type SignInInput = {
  displayName: string;
  phoneNumber: string;
};

type AuthSessionContextValue = {
  continueAsGuest: () => Promise<void>;
  isHydrated: boolean;
  session: AuthSession | null;
  signInWithOtp: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const STORAGE_KEY = 'lekhpal-smart-work-session';

const AuthSessionContext = createContext<
  AuthSessionContextValue | undefined
>(undefined);

const buildGuestSession = (): AuthSession => ({
  displayName: 'Guest User',
  isGuest: true,
  phoneNumber: null,
  plan: 'guest',
});

const buildPremiumSession = ({
  displayName,
  phoneNumber,
}: SignInInput): AuthSession => ({
  displayName: displayName.trim(),
  isGuest: false,
  phoneNumber,
  plan: 'premium',
});

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
        const rawSession = await AsyncStorage.getItem(
          STORAGE_KEY,
        );

        if (!isMounted) {
          return;
        }

        if (!rawSession) {
          setSession(null);
          return;
        }

        const parsedSession = JSON.parse(
          rawSession,
        ) as Partial<AuthSession>;

        if (
          typeof parsedSession.displayName === 'string' &&
          typeof parsedSession.isGuest === 'boolean' &&
          (parsedSession.phoneNumber === null ||
            typeof parsedSession.phoneNumber === 'string') &&
          (parsedSession.plan === 'guest' ||
            parsedSession.plan === 'premium')
        ) {
          setSession(parsedSession as AuthSession);
          return;
        }

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

  const continueAsGuest = async () => {
    const guestSession = buildGuestSession();
    setSession(guestSession);

    try {
      await persistSession(guestSession);
    } catch {
      // Keep the in-memory session even if storage fails.
    }
  };

  const signInWithOtp = async (input: SignInInput) => {
    const premiumSession = buildPremiumSession(input);
    setSession(premiumSession);

    try {
      await persistSession(premiumSession);
    } catch {
      // Keep the in-memory session even if storage fails.
    }
  };

  const signOut = async () => {
    setSession(null);

    try {
      await persistSession(null);
    } catch {
      // Keep the in-memory state even if storage clear fails.
    }
  };

  return (
    <AuthSessionContext.Provider
      value={{
        continueAsGuest,
        isHydrated,
        session,
        signInWithOtp,
        signOut,
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
