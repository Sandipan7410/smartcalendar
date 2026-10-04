import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

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
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google OAuth access token. Please check permissions.');
    }

    cachedAccessToken = credential.accessToken;

    const userProfile: ConnectedGoogleUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    };

    return { user: userProfile, accessToken: cachedAccessToken };
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
