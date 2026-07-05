import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Eye } from 'lucide-react';
import ConfigLayout from '../components/layouts/ConfigLayout';
import { useAuth } from '../context/AuthContext';
import { ref, get, remove } from 'firebase/database';
import { db } from '../lib/firebase';

interface TeamStanding {
  teamName: string;
  slot?: number;
  matchesPlayed?: number;
  matches?: number;
  boyaahCount?: number;
  totalKills?: number;
  totalPositionPoints?: number;
  totalPoints?: number;
  total?: number; // Used in Total Score Mode
}

interface HistoryEntry {
  id: string; // Firebase IDs are strings
  date: string;
  tournamentName?: string; // Standardized for Firebase
  name?: string; // Legacy
  mode?: string; // Mode identifier (e.g. 'Total Score', 'Excel/Screenshot')
  type?: 'regular' | 'slotteam' | 'totalscore';
  pointsTable?: TeamStanding[]; // New standard
  standings?: TeamStanding[]; // Legacy
  matches?: any[];
  totalMatches?: number; // Total Score Mode saves totalMatches directly
  createdTime?: number;
}

const TournamentHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allHistory, setAllHistory] = useState<HistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'regular' | 'slotteam' | 'totalscore'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const historyRef = ref(db, `users/${user.uid}/history`);
      const snapshot = await get(historyRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const historyArray: HistoryEntry[] = Object.keys(data).map(key => {
          const entry = data[key];
          
          // Determine type based on mode or legacy properties
          let derivedType: 'regular' | 'slotteam' | 'totalscore' = 'regular';
          if (entry.mode === 'Total Score') derivedType = 'totalscore';
          else if (entry.mode === 'Slots & Teams' || entry.type === 'slotteam') derivedType = 'slotteam';
          
          return {
            ...entry,
            id: key,
            type: derivedType
          };
        });
        
        // Sort by createdTime descending (newest first)
        const sorted = historyArray.sort((a, b) => (b.createdTime || 0) - (a.createdTime || 0));
        setAllHistory(sorted);
      } else {
        setAllHistory([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this tournament record?')) {
      if (user) {
        try {
          await remove(ref(db, `users/${user.uid}/history/${id}`));
          loadHistory();
          setSelectedEntry(null);
        } catch (error) {
          console.error('Error deleting record:', error);
          alert('Failed to delete record.');
        }
      }
    }
  };

  const clearAllHistory = async () => {
    if (window.confirm('Are you sure you want to delete ALL tournament records? This cannot be undone.')) {
      if (user) {
        try {
          await remove(ref(db, `users/${user.uid}/history`));
          setAllHistory([]);
          setSelectedEntry(null);
        } catch (error) {
          console.error('Error clearing history:', error);
          alert('Failed to clear history.');
        }
      }
    }
  };

  const getFilteredHistory = () => {
    if (activeTab === 'all') return allHistory;
    return allHistory.filter(entry => entry.type === activeTab);
  };

  const filteredHistory = getFilteredHistory();

  if (loading) {
    return (
      <ConfigLayout title="Tournament History">
        <div className="flex justify-center items-center h-64 text-white">Loading history...</div>
      </ConfigLayout>
    );
  }

  return (
    <ConfigLayout title="Tournament History">
      <div className="space-y-6">
        {/* Header with Clear Button */}
        <div className="flex items-center justify-end mb-8">
          {allHistory.length > 0 && (
            <button
              onClick={clearAllHistory}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors flex items-center text-sm"
            >
              <Trash2 size={16} className="mr-2" />
              Clear All
            </button>
          )}
        </div>

        {/* Tabs */}
        {allHistory.length > 0 && (
          <div className="flex gap-2 border-b border-white/20 pb-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md transition-all ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              All Tournaments ({allHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('regular')}
              className={`px-4 py-2 rounded-md transition-all ${
                activeTab === 'regular'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Games ({allHistory.filter(e => e.type === 'regular').length})
            </button>
            <button
              onClick={() => setActiveTab('slotteam')}
              className={`px-4 py-2 rounded-md transition-all ${
                activeTab === 'slotteam'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Slots & Teams ({allHistory.filter(e => e.type === 'slotteam').length})
            </button>
            <button
              onClick={() => setActiveTab('totalscore')}
              className={`px-4 py-2 rounded-md transition-all ${
                activeTab === 'totalscore'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Total Score ({allHistory.filter(e => e.type === 'totalscore').length})
            </button>
          </div>
        )}

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">No tournament history yet</p>
            <p className="text-gray-500 text-sm">Complete a tournament and save it to see the history here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* History List */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">📋 Past Tournaments</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredHistory.map(entry => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`backdrop-blur-md border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedEntry?.id === entry.id
                        ? 'bg-white/20 border-purple-400'
                        : 'bg-white/10 border-white/20 hover:bg-white/15'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{entry.date}</p>
                        {(entry.tournamentName || entry.name) && <p className="text-purple-300 text-xs mt-1 font-semibold">{entry.tournamentName || entry.name}</p>}
                        <p className="text-gray-400 text-xs mt-1">
                          {entry.type === 'slotteam' 
                            ? `${(entry.standings || entry.pointsTable || []).length} Teams • ${entry.matches?.length || 0} Matches`
                            : `${(entry.standings || entry.pointsTable || []).length} Teams`}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        entry.type === 'slotteam'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : entry.type === 'totalscore'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {entry.type === 'slotteam' ? 'Slots' : entry.type === 'totalscore' ? 'Total Score' : 'Games'}
                      </span>
                    </div>
                    <div className="mt-2">
                      {((entry.standings && entry.standings.length > 0) || (entry.pointsTable && entry.pointsTable.length > 0)) && (
                        <p className="text-purple-400 font-bold text-sm">
                          🥇 {entry.standings?.[0]?.teamName || entry.pointsTable?.[0]?.teamName}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Details Panel */}
            <div className="lg:col-span-2">
              {selectedEntry ? (
                <div className="space-y-6">
                  {/* Tournament Header */}
                  <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-cyan-400">Tournament Details</h2>
                        <p className="text-gray-400 mt-1 text-sm">{selectedEntry.date}</p>
                        {selectedEntry.name && (
                          <p className="text-purple-300 mt-2 font-semibold">{selectedEntry.name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded ${
                          selectedEntry.type === 'slotteam'
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {selectedEntry.type === 'slotteam' ? 'Slots & Teams' : 'Games'}
                        </span>
                        <button
                          onClick={() => deleteEntry(selectedEntry.id)}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="bg-white/5 rounded p-3">
                        <p className="text-gray-400 text-sm">Total Teams</p>
                        <p className="text-2xl font-bold text-purple-400">{(selectedEntry.standings || selectedEntry.pointsTable || []).length}</p>
                      </div>
                      {(selectedEntry.matches || selectedEntry.totalMatches) && (
                        <div className="bg-white/5 rounded p-3">
                          <p className="text-gray-400 text-sm">Total Matches</p>
                          <p className="text-2xl font-bold text-purple-400">{selectedEntry.matches?.length || selectedEntry.totalMatches}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Podium */}
                  {(selectedEntry.standings || selectedEntry.pointsTable || []).length > 0 && (
                    <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-cyan-400 mb-6">🏆 Podium</h3>
                      <div className="space-y-3">
                        {(selectedEntry.standings || selectedEntry.pointsTable || []).slice(0, 3).map((team, idx) => {
                          const medals = ['🥇', '🥈', '🥉'];
                          return (
                            <div key={idx} className="bg-white/5 rounded-lg p-4 flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                <span className="text-3xl">{medals[idx]}</span>
                                <div>
                                  <p className="text-white font-semibold">{team.teamName}</p>
                                  {team.slot && <p className="text-gray-400 text-sm">Slot {team.slot}</p>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-purple-400">{team.totalPoints ?? team.total ?? 0}</p>
                                <p className="text-gray-400 text-xs">Points</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Full Standings Table */}
                  <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-cyan-400 mb-4">📊 Final Standings</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-gray-300">
                        <thead className="border-b-2 border-white/20">
                          <tr className="bg-white/5">
                            <th className="px-4 py-3 text-left font-semibold">Rank</th>
                            <th className="px-4 py-3 text-left font-semibold">Team</th>
                            {selectedEntry.type === 'slotteam' && (
                              <th className="px-4 py-3 text-center font-semibold">Matches</th>
                            )}
                            {selectedEntry.type !== 'totalscore' && (
                              <>
                                <th className="px-4 py-3 text-center font-semibold">Boyaah</th>
                                <th className="px-4 py-3 text-center font-semibold">Kills</th>
                              </>
                            )}
                            <th className="px-4 py-3 text-center font-semibold">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedEntry.standings || selectedEntry.pointsTable || []).map((team, idx) => (
                            <tr key={idx} className="border-b border-white/10 hover:bg-white/5">
                              <td className="px-4 py-3 font-bold text-purple-400">#{idx + 1}</td>
                              <td className="px-4 py-3 font-semibold text-white">{team.teamName}</td>
                              {selectedEntry.type === 'slotteam' && (
                                <td className="px-4 py-3 text-center text-gray-300">
                                  {team.matchesPlayed || team.matches || '—'}
                                </td>
                              )}
                              {selectedEntry.type !== 'totalscore' && (
                                <>
                                  <td className="px-4 py-3 text-center text-yellow-400 font-semibold">
                                    {team.boyaahCount || 0}
                                  </td>
                                  <td className="px-4 py-3 text-center text-cyan-400">{team.totalKills || 0}</td>
                                </>
                              )}
                              <td className="px-4 py-3 text-center font-bold text-purple-400">{team.totalPoints ?? team.total ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-12 flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <Eye size={48} className="mx-auto text-gray-500 mb-4" />
                    <p className="text-gray-400">Select a tournament from the list to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ConfigLayout>
  );
};

export default TournamentHistory;
