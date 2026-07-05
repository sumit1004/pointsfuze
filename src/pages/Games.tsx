import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad as GameplaySolid, Trophy, Users, Zap, History } from 'lucide-react';
import ConfigLayout from '../components/layouts/ConfigLayout';
import '../styles/typing.css';

const Games: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear all previous tournament progress to start a fresh one
    localStorage.removeItem('globalGameConfig');
    localStorage.removeItem('matchResults');
    localStorage.removeItem('finalResults');
    localStorage.removeItem('slotTeamGameConfig');
    localStorage.removeItem('slotTeamMatchResults');
    localStorage.removeItem('totalScoreTournamentDetails');
    localStorage.removeItem('totalScoreTeams');
    localStorage.removeItem('totalScoreMatches');
  }, []);

  return (
    <ConfigLayout title="Select Tournament Mode">
      <div className="flex justify-center mt-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center place-items-center">
            <button
              onClick={() => navigate('/all-games-config')}
              className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 animate-fadeIn w-[200px]"
              style={{
                animationDelay: `800ms`,
                animationFillMode: 'backwards'
              }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-lg mb-3 flex items-center justify-center bg-gradient-to-r from-purple-500 to-cyan-400">
                  <GameplaySolid className="h-8 w-8 text-white" />
                </div>
                <div className="w-12 h-12 flex items-center justify-center bg-black bg-opacity-30 rounded-full mb-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2"> Games</h3>
                <div className="flex space-x-2 text-xs opacity-80">
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    All Teams
                  </span>
                  <span className="flex items-center">
                    <Trophy className="h-4 w-4 mr-1" />
                    Overview
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/slot-team-config')}
              className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 animate-fadeIn w-[200px]"
              style={{
                animationDelay: `1000ms`,
                animationFillMode: 'backwards'
              }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-16 rounded-lg mb-3 flex items-center justify-center bg-gradient-to-r from-cyan-400 to-purple-500">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div className="w-12 h-12 flex items-center justify-center bg-black bg-opacity-30 rounded-full mb-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">Slots & Teams</h3>
                <div className="flex space-x-2 text-xs opacity-80">
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    By Slot
                  </span>
                  <span className="flex items-center">
                    <Trophy className="h-4 w-4 mr-1" />
                    Team Name
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/total-score')}
              className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 animate-fadeIn w-[200px]"
              style={{
                animationDelay: `1100ms`,
                animationFillMode: 'backwards'
              }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-16 rounded-lg mb-3 flex items-center justify-center bg-gradient-to-r from-emerald-400 to-teal-500">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <div className="w-12 h-12 flex items-center justify-center bg-black bg-opacity-30 rounded-full mb-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">Total Score</h3>
                <div className="flex space-x-2 text-xs opacity-80">
                  <span className="flex items-center">
                    <Trophy className="h-4 w-4 mr-1" />
                    Direct Score
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/tournament-history')}
              className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 animate-fadeIn w-[200px]"
              style={{
                animationDelay: `1200ms`,
                animationFillMode: 'backwards'
              }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-16 rounded-lg mb-3 flex items-center justify-center bg-gradient-to-r from-purple-500 to-cyan-400">
                  <History className="h-8 w-8 text-white" />
                </div>
                <div className="w-12 h-12 flex items-center justify-center bg-black bg-opacity-30 rounded-full mb-3">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">History</h3>
                <div className="flex space-x-2 text-xs opacity-80">
                  <span className="flex items-center">
                    <Trophy className="h-4 w-4 mr-1" />
                    Past Results
                  </span>
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    Statistics
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
    </ConfigLayout>
  );
};

export default Games;