import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, set, get, child } from 'firebase/database';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  role: string;
  isActive: boolean;
  createdAt: number;
  lastLogin: number;
}

export interface UserStats {
  tournamentCount: number;
  matchCount: number;
  historyCount: number;
  downloadCount: number;
  templateDownloadCount: number;
}

export interface UserSubscription {
  plan: string;
  planStart: number | null;
  planEnd: number | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  stats: UserStats | null;
  subscription: UserSubscription | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  stats: null,
  subscription: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Update lastLogin
        const dbRef = ref(db);
        const profileRef = ref(db, `users/${currentUser.uid}/profile`);
        const statsRef = ref(db, `users/${currentUser.uid}/stats`);
        const subRef = ref(db, `users/${currentUser.uid}/subscription`);

        try {
          const snapshot = await get(child(dbRef, `users/${currentUser.uid}/profile`));
          
          if (snapshot.exists()) {
            // Update last login
            set(child(profileRef, 'lastLogin'), Date.now());
          }
        } catch (e) {
          console.error("Error updating last login", e);
        }

        // Listen for profile changes
        const unsubsProfile = onValue(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.val());
          }
        });

        // Listen for stats changes
        const unsubsStats = onValue(statsRef, async (snapshot) => {
          if (snapshot.exists()) {
            const currentStats = snapshot.val();
            setStats(currentStats);
            
            // Self-heal: if validation fields are missing due to old schema, add them
            if (currentStats.totalMatches === undefined || currentStats.downloads === undefined || currentStats.tournamentCount === undefined) {
              try {
                await update(statsRef, {
                  totalMatches: currentStats.totalMatches || currentStats.matchCount || 0,
                  downloads: currentStats.downloads || currentStats.downloadCount || 0,
                  tournamentCount: currentStats.tournamentCount || 0,
                  matchCount: currentStats.matchCount || currentStats.totalMatches || 0,
                  downloadCount: currentStats.downloadCount || currentStats.downloads || 0,
                  historyCount: currentStats.historyCount || 0
                });
              } catch (err) {
                console.error("Failed to self-heal stats", err);
              }
            }
          } else {
             // Create stats node if completely missing
             try {
                await set(statsRef, {
                  totalMatches: 0,
                  downloads: 0,
                  tournamentCount: 0,
                  matchCount: 0,
                  downloadCount: 0,
                  historyCount: 0,
                  templateDownloadCount: 0
                });
             } catch (err) {}
          }
        });

        // Listen for subscription changes
        const unsubsSub = onValue(subRef, (snapshot) => {
          if (snapshot.exists()) {
            setSubscription(snapshot.val());
          }
        });

        setLoading(false);

        return () => {
          unsubsProfile();
          unsubsStats();
          unsubsSub();
        };
      } else {
        setProfile(null);
        setStats(null);
        setSubscription(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, stats, subscription, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
