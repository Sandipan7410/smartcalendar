import {
  signInWithPopup,
  linkWithPopup,
  signInWithCredential,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
// Reuse the single Firebase app/auth instance (and its named Firestore DB config).
import { auth } from './firebase';
export { auth };

// Configure Google Auth Provider
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const provider = new GoogleAuthProvider();
provider.addScope(CALENDAR_SCOPE);
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

// In-memory token cache (never in localStorage per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface ConnectedGoogleUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Initializes auth listener. Calls onAuthChange when user state changes.
 */
export const initAuth = (
  onAuthSuccess?: (user: ConnectedGoogleUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) {
        onAuthSuccess(
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          },
          cachedAccessToken
        );
      }
    } else if (!user) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google using popup and request Calendar permissions.
 */
export const googleSignIn = async (): Promise<{
  user: ConnectedGoogleUser;
  accessToken: string;
  /** True when we moved from the anonymous account to an existing Google account (different uid). */
  switchedAccount: boolean;
} | null> => {
  try {
    isSigningIn = true;
    const current = auth.currentUser;
    let result: UserCredential;
    let accessToken: string | undefined;
    let switchedAccount = false;

    if (current?.isAnonymous) {
      // Upgrade the anonymous account in place so its saved events/tasks keep the same uid.
      try {
        result = await linkWithPopup(current, provider);
      } catch (err: any) {
        // This Google account already has its own Firebase user (e.g. used on another device).
        if (err?.code === 'auth/credential-already-in-use' || err?.code === 'auth/email-already-in-use') {
          const existing = GoogleAuthProvider.credentialFromError(err);
          if (!existing) throw err;
          accessToken = existing.accessToken;
          result = await signInWithCredential(auth, existing);
          switchedAccount = true;
        } else {
          throw err;
        }
      }
    } else {
      result = await signInWithPopup(auth, provider);
    }

    accessToken = GoogleAuthProvider.credentialFromResult(result)?.accessToken || accessToken;
    if (!accessToken) {
      throw new Error('Could not obtain Google OAuth access token. Please check permissions.');
    }

    cachedAccessToken = accessToken;

    const userProfile: ConnectedGoogleUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    };

    return { user: userProfile, accessToken, switchedAccount };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve cached in-memory access token.
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Set access token in memory (e.g. from state).
 */
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Disconnect Google Calendar and sign out.
 */
export const googleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Returns current Firebase Auth user if signed in.
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};
