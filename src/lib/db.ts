import { ref, set, get, update, child, increment, push } from 'firebase/database';
import { db } from './firebase';

export const createUserDocument = async (user: any, name: string) => {
  if (!user) return;

  const userRef = ref(db, `users/${user.uid}`);
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    const { email, uid, photoURL } = user;
    const createdAt = Date.now();

    try {
      await set(userRef, {
        profile: {
          uid,
          name: name || user.displayName || 'User',
          email,
          photoURL: photoURL || '',
          role: 'user',
          isActive: true,
          createdAt,
          lastLogin: createdAt,
        },
        stats: {
          tournamentCount: 0,
          matchCount: 0,
          totalMatches: 0,
          historyCount: 0,
          downloadCount: 0,
          downloads: 0,
          templateDownloadCount: 0,
        },
        subscription: {
          plan: 'free',
          planStart: createdAt,
          planEnd: null,
          status: 'active'
        },
        tournaments: {},
        history: {},
        downloads: {}
      });
    } catch (error) {
      console.error('Error creating user document', error);
    }
  }
};

export const saveTournamentToDb = async (uid: string, tournamentData: any) => {
  if (!uid) return null;
  const newTourneyRef = push(ref(db, `users/${uid}/tournaments`));
  await set(newTourneyRef, {
    ...tournamentData,
    createdTime: Date.now()
  });

  // Increment tournament count
  const statsRef = ref(db, `users/${uid}/stats`);
  await update(statsRef, {
    tournamentCount: increment(1)
  });
  
  return newTourneyRef.key;
};

export const updateTournamentInDb = async (uid: string, tournamentId: string, data: any) => {
  if (!uid || !tournamentId) return;
  const tourneyRef = ref(db, `users/${uid}/tournaments/${tournamentId}`);
  await update(tourneyRef, data);
};

export const saveMatchToDb = async (uid: string, tournamentId: string, matchData: any) => {
  if (!uid) return;
  const matchRef = push(ref(db, `users/${uid}/tournaments/${tournamentId}/matches`));
  await set(matchRef, {
    ...matchData,
    date: Date.now()
  });

  // Increment match count
  const statsRef = ref(db, `users/${uid}/stats`);
  await update(statsRef, {
    matchCount: increment(1)
  });
};

export const saveHistoryToDb = async (uid: string, historyData: any) => {
  if (!uid) return;
  const newHistoryRef = push(ref(db, `users/${uid}/history`));
  await set(newHistoryRef, {
    ...historyData,
    createdTime: Date.now()
  });

  // Increment history count and matches
  const matchNum = historyData.totalMatches || historyData.matches?.length || 0;
  const statsRef = ref(db, `users/${uid}/stats`);
  await update(statsRef, {
    historyCount: increment(1),
    matchCount: increment(matchNum),
    totalMatches: increment(matchNum)
  });
};

export const incrementDownloadStat = async (uid: string, isTemplate: boolean = false) => {
  if (!uid) return;
  const statsRef = ref(db, `users/${uid}/stats`);
  const updates: any = {
    downloadCount: increment(1),
    downloads: increment(1)
  };
  if (isTemplate) {
    updates.templateDownloadCount = increment(1);
  }
  await update(statsRef, updates);
};
