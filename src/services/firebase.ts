import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  getDocFromServer,
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
  Auth,
} from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { CalendarEvent, CalendarTask } from '../types/calendar';

// Support both firebase-applet-config.json and Vercel environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

// Initialize Firebase App
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// AI Studio created a *named* Firestore database for this app (not "(default)").
// Without this ID every read/write goes to a database that doesn't exist and fails silently.
const firestoreDatabaseId: string | undefined =
  import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId || undefined;

// Initialize Firestore with robust multi-tab offline persistence
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      // Events/tasks have optional fields (e.g. googleEventId) that can be undefined;
      // Firestore rejects the whole write for undefined values unless this is on.
      ignoreUndefinedProperties: true,
    },
    firestoreDatabaseId
  );
} catch (e) {
  // If already initialized
  firestoreDb = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
}

export const db = firestoreDb;
export const auth: Auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('https://www.googleapis.com/auth/calendar.events');

// Test connection on boot according to Firebase integration guidelines
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.info('Firestore is running in offline persistent mode.');
    }
  }
}

// Auto sign-in anonymously so every user has an instant private workspace without friction
export function initAuthListener(onUserChange: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      onUserChange(user);
    } else {
      try {
        const cred = await signInAnonymously(auth);
        onUserChange(cred.user);
      } catch (e) {
        console.warn('Anonymous auth unavailable, working in local mode:', e);
        onUserChange(null);
      }
    }
  });
}

// Sign in with Google via Firebase
export async function signInWithGoogleFirebase(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    return result.user;
  } catch (err: any) {
    console.error('Google Firebase sign-in failed:', err);
    throw err;
  }
}

// Sign out
export async function logOutFirebase() {
  await signOut(auth);
}

// Save event to Firestore (automatically persisted locally offline in IndexedDB)
export async function saveEventToFirestore(userId: string, event: CalendarEvent) {
  if (!userId) return;
  try {
    const eventRef = doc(db, 'users', userId, 'events', event.id);
    await setDoc(eventRef, { ...event, userId }, { merge: true });
  } catch (err) {
    console.warn('Error saving event to Firestore (cached locally):', err);
  }
}

// Delete event from Firestore
export async function deleteEventFromFirestore(userId: string, eventId: string) {
  if (!userId) return;
  try {
    const eventRef = doc(db, 'users', userId, 'events', eventId);
    await deleteDoc(eventRef);
  } catch (err) {
    console.warn('Error deleting event from Firestore:', err);
  }
}

// Save task to Firestore
export async function saveTaskToFirestore(userId: string, task: CalendarTask) {
  if (!userId) return;
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', task.id);
    await setDoc(taskRef, { ...task, userId }, { merge: true });
  } catch (err) {
    console.warn('Error saving task to Firestore (cached locally):', err);
  }
}

// Delete task from Firestore
export async function deleteTaskFromFirestore(userId: string, taskId: string) {
  if (!userId) return;
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (err) {
    console.warn('Error deleting task from Firestore:', err);
  }
}

// Real-time synchronization. Reports additions/edits AND deletions, so removing an
// event on one device (or deleting the last one) is reflected everywhere.
function subscribeToCollection<T>(
  userId: string,
  name: 'events' | 'tasks',
  onChanges: (upserts: T[], removedIds: string[]) => void
) {
  if (!userId) return () => {};

  return onSnapshot(
    collection(db, 'users', userId, name),
    (snapshot) => {
      const upserts: T[] = [];
      const removedIds: string[] = [];
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          removedIds.push(change.doc.id);
        } else {
          upserts.push(change.doc.data() as T);
        }
      });
      if (upserts.length || removedIds.length) onChanges(upserts, removedIds);
    },
    (err) => {
      console.warn(`${name} snapshot listener error (offline fallback active):`, err);
    }
  );
}

export function subscribeToUserEvents(
  userId: string,
  onChanges: (upserts: CalendarEvent[], removedIds: string[]) => void
) {
  return subscribeToCollection<CalendarEvent>(userId, 'events', onChanges);
}

export function subscribeToUserTasks(
  userId: string,
  onChanges: (upserts: CalendarTask[], removedIds: string[]) => void
) {
  return subscribeToCollection<CalendarTask>(userId, 'tasks', onChanges);
}
