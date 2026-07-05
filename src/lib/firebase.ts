import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAMgnaf3HqRqKQdFIy7wsV8CD6uDTz1wWQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pointfuze-54690.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://pointfuze-54690-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pointfuze-54690",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pointfuze-54690.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "706722756512",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:706722756512:web:992a0ffd16859c5c9056c5"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Set persistence to local (Remember Login)
setPersistence(auth, browserLocalPersistence);

// Initialize Realtime Database and get a reference to the service
export const db = getDatabase(app);

export default app;
