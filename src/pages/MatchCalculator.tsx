import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { utils, writeFile, read } from 'xlsx';
import ConfigLayout from '../components/layouts/ConfigLayout';
import { Save, ChevronRight, Download, Trash2, Plus, Edit2, Upload, X, Trophy } from 'lucide-react';

interface Player {
  name: string;
  uid: string;
  inGameName: string;
  kills: number | '';
}

interface TeamScore {
  teamName: string;
  players: Player[];
  position: number | '';
  points: number;
}

interface Match {
  type: 'semifinal' | 'final';
  matchNumber: number;
  teams: TeamScore[];
}

interface MVP {
  teamName: string;
  name: string;
  inGameName: string;
  kills: number;
  
}

const MatchCalculator: React.FC = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [gameConfig, setGameConfig] = useState<any>(null);
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [editMatchType, setEditMatchType] = useState<'semifinal' | 'final'>('final');
  const [editMatchNumber, setEditMatchNumber] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newMatchType, setNewMatchType] = useState<'semifinal' | 'final'>('final');
  const [newMatchNumber, setNewMatchNumber] = useState('');
  const [uploadedTeams, setUploadedTeams] = useState<TeamScore[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedTeamIndices, setSelectedTeamIndices] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    const loadSavedData = () => {
      const gameConf = JSON.parse(localStorage.getItem('globalGameConfig') || '{}');
      const savedMatches = localStorage.getItem('matchResults');
      
      setGameConfig(gameConf);

      if (savedMatches) {
        const parsedMatches = JSON.parse(savedMatches);
        const updatedMatches = parsedMatches.map((match: Match) => ({
          ...match,
          teams: match.teams.map((team: TeamScore) => ({
            ...team,
            points: calculatePointsForTeam(team, gameConf)
          }))
        }));
        setMatches(updatedMatches);
        localStorage.setItem('matchResults', JSON.stringify(updatedMatches));
      } else {
        setMatches([]);
      }
    };

    loadSavedData();
  }, []);

  const calculatePointsForTeam = (team: TeamScore, config: any) => {
    if (!config) return 0;
    
    // Calculate total kills - handle both number and string types
    const totalKills = team.players.reduce((sum, player) => {
      const killCount = typeof player.kills === 'string' 
        ? (player.kills === '' ? 0 : parseInt(player.kills) || 0)
        : (player.kills || 0);
      return sum + killCount;
    }, 0);
    
    const killPoints = totalKills * config.killPoints;
    const positionPoints = team.position && team.position > 0 ? config.positionPoints[team.position] || 0 : 0;
    
    return killPoints + positionPoints;
  };

  const getMVP = (match: Match): MVP[] => {
    let maxKills = -1;
    const mvpPlayers: MVP[] = [];

    match.teams.forEach(team => {
      team.players.forEach(player => {
        const playerKills = typeof player.kills === 'string' 
          ? (player.kills === '' ? 0 : parseInt(player.kills) || 0)
          : (player.kills || 0);

        if (playerKills > maxKills) {
          maxKills = playerKills;
          mvpPlayers.length = 0;
          mvpPlayers.push({
            name: player.name,
            inGameName: player.inGameName,
            kills: playerKills,
            teamName: team.teamName
          });
        } else if (playerKills === maxKills && playerKills > 0) {
          mvpPlayers.push({
            teamName: team.teamName,
            name: player.name,
            inGameName: player.inGameName,
            kills: playerKills
            
          });
        }
      });
    });

    return mvpPlayers;
  };

  const handleScoreChange = (matchIndex: number, teamIndex: number, playerIndex: number, kills: string) => {
    setMatches(prevMatches => {
      const newMatches = [...prevMatches];
      const match = { ...newMatches[matchIndex] };
      const team = { ...match.teams[teamIndex] };
      const player = { ...team.players[playerIndex] };

      // Allow empty string to clear the field, otherwise convert to number
      const killValue = kills === '' ? '' : Math.max(0, parseInt(kills) || 0);
      player.kills = killValue;
      team.players[playerIndex] = player;
      team.points = calculatePointsForTeam(team, gameConfig);

      match.teams[teamIndex] = team;
      newMatches[matchIndex] = match;
      
      localStorage.setItem('matchResults', JSON.stringify(newMatches));
      return newMatches;
    });
  };

  const handlePositionChange = (matchIndex: number, teamIndex: number, position: string) => {
    setMatches(prevMatches => {
      const newMatches = [...prevMatches];
      const match = { ...newMatches[matchIndex] };
      const team = { ...match.teams[teamIndex] };

      team.position = position === '' ? '' : Math.max(1, parseInt(position) || 0);
      team.points = calculatePointsForTeam(team, gameConfig);

      match.teams[teamIndex] = team;
      newMatches[matchIndex] = match;
      
      localStorage.setItem('matchResults', JSON.stringify(newMatches));
      return newMatches;
    });
  };

  const handleSave = () => {
    const finalMatches = matches.map(match => ({
      ...match,
      teams: match.teams.map(team => ({
        ...team,
        points: calculatePointsForTeam(team, gameConfig)
      }))
    }));
    
    localStorage.setItem('matchResults', JSON.stringify(finalMatches));
    setMatches(finalMatches);
    navigate('/final-result');
  };

  const handleDeleteMatch = (matchIndex: number) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      setMatches(prevMatches => {
        const newMatches = prevMatches.filter((_, index) => index !== matchIndex);
        localStorage.setItem('matchResults', JSON.stringify(newMatches));
        return newMatches;
      });
    }
  };

  const parseExcelFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Get all data from worksheet with headers
      const jsonData = utils.sheet_to_json(worksheet, { defval: '' });

      if (!jsonData || jsonData.length === 0) {
        alert('Excel file is empty. Please check the file and try again.');
        return;
      }

      const teamsMap: { [key: string]: TeamScore } = {};

      jsonData.forEach((row: any) => {
        // Get team name
        let teamName = (row['Team Name'] || '').toString().trim();
        
        if (!teamName) {
          return;
        }

        // Initialize team if not exists
        if (!teamsMap[teamName]) {
          teamsMap[teamName] = {
            teamName,
            players: [],
            position: '',
            points: 0
          };
        }

        // Extract player information (up to 4 players per team)
        for (let i = 1; i <= 4; i++) {
          const nameCol = `Player ${i} Name`;
          const uidCol = `Player ${i} - UID`;
          const inGameCol = `Player ${i} - In-Game Name`;

          const playerName = (row[nameCol] || '').toString().trim();
          const playerUID = (row[uidCol] || '').toString().trim();
          const playerInGame = (row[inGameCol] || '').toString().trim();

          // Only add player if all three fields exist
          if (playerName && playerUID && playerInGame) {
            teamsMap[teamName].players.push({
              name: playerName,
              uid: playerUID,
              inGameName: playerInGame,
              kills: ''
            });
          }
        }
      });

      const uploadedTeamsArray = Object.values(teamsMap);
      
      if (uploadedTeamsArray.length === 0) {
        alert('No valid teams found in the Excel file. Please check the format.');
        return;
      }

      const totalPlayers = uploadedTeamsArray.reduce((sum, team) => sum + team.players.length, 0);
      
      setUploadedTeams(uploadedTeamsArray);
      localStorage.setItem('uploadedTeamsData', JSON.stringify(uploadedTeamsArray));
      
      alert(`✓ Successfully loaded ${uploadedTeamsArray.length} teams with ${totalPlayers} players from Excel!`);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      alert('Failed to parse Excel file. Please check the format and try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExcelFile(file);
      await parseExcelFile(file);
    }
  };

  const handleRemoveTeam = (index: number) => {
    setUploadedTeams(prev => prev.filter((_, i) => i !== index));
  };;

  const downloadMatchResult = (match: Match) => {
    try {
      const workbook = utils.book_new();
      
      const matchData = [...match.teams]
        .sort((a, b) => b.points - a.points)
        .map((team, position) => {
          const totalKills = team.players.reduce((sum, p) => {
            const killCount = typeof p.kills === 'string' 
              ? (p.kills === '' ? 0 : parseInt(p.kills) || 0)
              : (p.kills || 0);
            return sum + killCount;
          }, 0);
          return {
            'Rank': position + 1,
            'Team': team.teamName,
            'Position': team.position || '-',
            'Total Kills': totalKills,
            
            'Kill Points': totalKills * gameConfig.killPoints,
            'Position Points': team.position ? gameConfig.positionPoints[team.position] || 0 : 0,
            'Total Points': team.points
          };
        });

      const matchType = match.type === 'semifinal' ? 'Semi-Final' : 'Final';
      const sheet = utils.json_to_sheet(matchData);
      utils.book_append_sheet(workbook, sheet, `${matchType} ${match.matchNumber}`);

      const fileName = `${matchType}_${match.matchNumber}_Results.xlsx`;
      writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error downloading match result:', error);
      alert('Failed to download match result');
    }
  };

  const downloadAllResults = () => {
    try {
      const workbook = utils.book_new();
      
      const summaryData = matches.flatMap(match => 
        match.teams.map(team => {
          const totalKills = team.players.reduce((sum, p) => {
            const killCount = typeof p.kills === 'string' 
              ? (p.kills === '' ? 0 : parseInt(p.kills) || 0)
              : (p.kills || 0);
            return sum + killCount;
          }, 0);
          return {
            'Match Type': match.type === 'semifinal' ? 'Semi-Final' : 'Final',
            'Match Number': match.matchNumber,
            'Team': team.teamName,
            'Position': team.position || '-',
            'Total Kills': totalKills,
            
            'Kill Points': totalKills * gameConfig.killPoints,
            'Position Points': team.position ? gameConfig.positionPoints[team.position] || 0 : 0,
            'Total Points': team.points
          };
        })
      );
      const summarySheet = utils.json_to_sheet(summaryData);
      utils.book_append_sheet(workbook, summarySheet, 'All Matches Summary');

      matches.forEach((match) => {
        const matchType = match.type === 'semifinal' ? 'Semi-Final' : 'Final';
        const sheetName = `${matchType} ${match.matchNumber}`;
        
        const matchData = [...match.teams]
          .sort((a, b) => b.points - a.points)
          .map((team, position) => {
            const totalKills = team.players.reduce((sum, p) => {
              const killCount = typeof p.kills === 'string' 
                ? (p.kills === '' ? 0 : parseInt(p.kills) || 0)
                : (p.kills || 0);
              return sum + killCount;
            }, 0);
            return {
              'Rank': position + 1,
              'Team': team.teamName,
              'Position': team.position || '-',
              'Total Kills': totalKills,
              
              'Kill Points': totalKills * gameConfig.killPoints,
              'Position Points': team.position ? gameConfig.positionPoints[team.position] || 0 : 0,
              'Total Points': team.points
            };
          });

        const matchSheet = utils.json_to_sheet(matchData);
        utils.book_append_sheet(workbook, matchSheet, sheetName);
      });

      const tournamentConfig = JSON.parse(localStorage.getItem('tournamentConfig') || '{}');
      const fileName = tournamentConfig.tournamentName 
        ? `${tournamentConfig.tournamentName}_All_Matches.xlsx`
        : 'Tournament_All_Matches.xlsx';

      writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error downloading results:', error);
      alert('Failed to download results');
    }
  };

  const handleRenameMatch = (matchIndex: number) => {
    const match = matches[matchIndex];
    setEditingMatch(matchIndex);
    setEditMatchType(match.type);
    setEditMatchNumber(match.matchNumber.toString());
  };

  const handleSaveRename = (matchIndex: number) => {
    if (!editMatchNumber.trim()) {
      alert('Please enter match number');
      return;
    }

    setMatches(prevMatches => {
      const newMatches = [...prevMatches];
      newMatches[matchIndex] = {
        ...newMatches[matchIndex],
        type: editMatchType,
        matchNumber: parseInt(editMatchNumber)
      };
      localStorage.setItem('matchResults', JSON.stringify(newMatches));
      return newMatches;
    });

    setEditingMatch(null);
  };

  const handleAddMatch = () => {
    if (!uploadedTeams.length) {
      alert('Please upload Excel file with team data first');
      return;
    }

    if (!newMatchNumber.trim()) {
      alert('Please enter match number');
      return;
    }

    const newMatch: Match = {
      type: newMatchType,
      matchNumber: parseInt(newMatchNumber),
      teams: uploadedTeams.map(team => ({
        ...team,
        position: '',
        points: 0
      }))
    };

    setMatches(prev => {
      const newMatches = [...prev, newMatch];
      localStorage.setItem('matchResults', JSON.stringify(newMatches));
      return newMatches;
    });

    setUploadedTeams([]);
    setExcelFile(null);
    setShowModal(false);
    setNewMatchNumber('');
    setNewMatchType('final');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <ConfigLayout title="Match Calculator">
      <div className="relative min-h-screen pb-20 sm:pb-0 px-2 sm:px-6">
        {/* Add Match Button - Hide on mobile */}
        <div className="hidden sm:block absolute top-[-60px] right-6">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white px-4 py-2 rounded-md"
          >
            <Plus size={18} className="mr-2" />
            Add Match
          </button>
        </div>

        {/* Existing matches */}
        <div className="mt-4">
          {matches.map((match, matchIndex) => (
            <div key={matchIndex} className="mb-8">
              {/* Match Header */}
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex justify-between items-center">
                  {editingMatch === matchIndex ? (
                    <div className="flex flex-col w-full gap-2">
                      <select
                        value={editMatchType}
                        onChange={(e) => setEditMatchType(e.target.value as 'semifinal' | 'final')}
                        className="bg-white/5 text-white p-2 rounded-md w-full"
                      >
                        <option value="semifinal">Semi-Final</option>
                        <option value="final">Final</option>
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editMatchNumber}
                          onChange={(e) => setEditMatchNumber(e.target.value)}
                          className="bg-white/5 text-white p-2 rounded flex-1"
                          min="1"
                          placeholder="Match #"
                        />
                        <button
                          onClick={() => handleSaveRename(matchIndex)}
                          className="bg-green-600 px-4 rounded-md text-white"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-2xl font-bold text-purple-400">
                        {match.type === 'semifinal' ? 'Semi-Final' : 'Final'} #{match.matchNumber}
                      </h2>
                      <button
                        onClick={() => handleRenameMatch(matchIndex)}
                        className="p-1.5 rounded-full bg-blue-600/20 text-blue-400"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteMatch(matchIndex)}
                    className="p-2 text-red-400 hover:bg-red-400/20 rounded-full"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Match Content */}
              <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-3 sm:p-6">
                {/* Team Selection Section */}
                <div className="mb-6">
                  <label className="block text-white font-semibold mb-3 text-sm sm:text-base">Select Team to Enter Data</label>
                  <select
                    value={selectedTeamIndices[matchIndex] ?? 0}
                    onChange={(e) => setSelectedTeamIndices(prev => ({ ...prev, [matchIndex]: parseInt(e.target.value) }))}
                    className="w-full bg-gray-800 text-white p-2 sm:p-3 rounded-md border border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                  >
                    {match.teams.map((team, idx) => (
                      <option key={idx} value={idx} className="bg-gray-800 text-white">
                        {team.teamName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Team Data Entry */}
                {match.teams.length > 0 && (
                  <div className="bg-black/30 rounded-lg p-4 border border-white/10 mb-6">
                    {(() => {
                      const selectedTeam = match.teams[selectedTeamIndices[matchIndex] ?? 0];
                      const totalKills = selectedTeam.players.reduce((sum, p) => {
                        const killCount = typeof p.kills === 'string' 
                          ? (p.kills === '' ? 0 : parseInt(p.kills) || 0)
                          : (p.kills || 0);
                        return sum + killCount;
                      }, 0);

                      return (
                        <div>
                          {/* Team Header with Position and Total Points */}
                          <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                            <div>
                              <h3 className="text-xl font-bold text-purple-400">{selectedTeam.teamName}</h3>
                              <p className="text-sm text-gray-400 mt-1">{selectedTeam.players.length} players</p>
                            </div>
                            <div className="flex gap-6">
                              <div className="text-right">
                                <div className="text-xs text-gray-400 mb-1">Team Position</div>
                                <input
                                  type="number"
                                  value={selectedTeam.position === '' ? '' : selectedTeam.position}
                                  onChange={(e) => handlePositionChange(matchIndex, selectedTeamIndices[matchIndex] ?? 0, e.target.value)}
                                  className="bg-white/5 text-white p-2 rounded w-24 text-center font-semibold"
                                  min="1"
                                  placeholder="Pos"
                                />
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-400 mb-1">Total Points</div>
                                <div className="text-2xl font-bold text-cyan-400">{selectedTeam.points}</div>
                              </div>
                            </div>
                          </div>

                          {/* Players Kill Entry */}
                          <div className="space-y-3">
                            {selectedTeam.players.map((player, playerIndex) => (
                              <div key={playerIndex} className="bg-white/5 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <div>
                                    <p className="text-white font-semibold">{player.inGameName}</p>
                                    <p className="text-xs text-gray-400">({player.name})</p>
                                  </div>
                                  <div className="text-right">
                                    <label className="text-xs text-gray-400 block mb-1">Kills</label>
                                    <input
                                      type="number"
                                      value={player.kills === '' ? '' : player.kills}
                                      onChange={(e) => handleScoreChange(matchIndex, selectedTeamIndices[matchIndex] ?? 0, playerIndex, e.target.value)}
                                      className="bg-white/5 text-white p-2 rounded w-20 text-center font-semibold text-lg border border-cyan-400/50"
                                      min="0"
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Team Total Kills */}
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="text-sm text-gray-400">
                              Total Team Kills: <span className="text-cyan-400 font-bold text-lg">{totalKills}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Match Results Section */}
                <div className="mt-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-purple-400">Match Rankings</h3>
                    <button
                      onClick={() => downloadMatchResult(match)}
                      className="flex items-center bg-gradient-to-r from-purple-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md w-full sm:w-auto justify-center"
                    >
                      <Download size={16} className="mr-1 sm:mr-2" />
                      Download Match Result
                    </button>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 overflow-x-auto mb-6">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="text-gray-300">
                          <th className="text-left py-2">Rank</th>
                          <th className="text-left py-2">Team Name</th>
                            <th className="text-left py-2">Position</th>
                            <th className="text-left py-2">Boyaah</th>
                          <th className="text-left py-2">Total Kills</th>
                        
                          <th className="text-left py-2">Pos Points</th>
                          <th className="text-left py-2">Total Points</th>
                          
                        </tr>
                      </thead>
                      <tbody>
                        {[...match.teams]
                          .sort((a, b) => b.points - a.points)
                          .map((team, index) => {
                            const totalKills = team.players.reduce((sum, p) => {
                              const killCount = typeof p.kills === 'string' 
                                ? (p.kills === '' ? 0 : parseInt(p.kills) || 0)
                                : (p.kills || 0);
                              return sum + killCount;
                            }, 0);
                            const positionPoints = team.position && team.position > 0 ? gameConfig.positionPoints[team.position] || 0 : 0;
                            const earnedBoyaah = positionPoints === 12;
                            return (
                              <tr key={index} className="text-white border-t border-white/10">
                                <td className="py-2">{index + 1}</td>
                                <td className="py-2">{team.teamName}</td>
                                <td className="py-2">{team.position || '-'}</td>
                                <td className="py-2 text-yellow-400 font-bold">{earnedBoyaah ? '🏆' : '—'}</td>
                                <td className="py-2">{totalKills}</td>
                                
                                <td className="py-2">{positionPoints}</td>
                                <td className="py-2 text-cyan-400 font-bold">{team.points}</td>
                                
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* MVP Section */}
                  {(() => {
                    const mvpPlayers = getMVP(match);
                    return mvpPlayers.length > 0 ? (
                      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Trophy size={20} className="text-yellow-400" />
                          <h4 className="text-lg font-bold text-yellow-400">MVP - Highest Kills</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {mvpPlayers.map((player, idx) => (
                            <div key={idx} className="bg-black/30 rounded-lg p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-white font-semibold">{player.inGameName}</p>
                                  <p className="text-xs text-gray-400">{player.name}</p>
                                  <p className="text-xs text-gray-500 mt-1">{player.teamName}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-yellow-400">{player.kills}</div>
                                  <p className="text-xs text-gray-400">Kills</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-gray-900 border-t border-white/10 p-4">
          <div className="flex justify-between gap-4">
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-md text-sm flex items-center justify-center"
            >
              <Plus size={16} className="mr-1" />
              Add Match
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-800 text-white px-4 py-3 rounded-md text-sm flex items-center justify-center"
            >
              Show Results
              <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-[600px] max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-purple-400 mb-4">Add New Match</h3>
              <div className="space-y-4">
                {/* Excel Upload Section */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">Step 1: Upload Teams Data (Excel)</label>
                  <div className="border-2 border-dashed border-purple-500 rounded-lg p-4 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-md"
                    >
                      <Upload size={20} />
                      Choose Excel File
                    </button>
                    {excelFile && (
                      <p className="text-sm text-green-400 mt-2">✓ {excelFile.name} loaded</p>
                    )}
                  </div>
                </div>

                {/* Uploaded Teams Preview */}
                {uploadedTeams.length > 0 && (
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">Teams Loaded: {uploadedTeams.length}</label>
                    <div className="max-h-48 overflow-y-auto bg-white/5 rounded-lg p-3 space-y-2">
                      {uploadedTeams.map((team, index) => (
                        <div key={index} className="flex justify-between items-start bg-black/30 p-2 rounded">
                          <div className="flex-1">
                            <p className="text-white font-medium">{team.teamName}</p>
                            <p className="text-xs text-gray-400">{team.players.length} players</p>
                            <div className="text-xs text-gray-500 mt-1">
                              {team.players.map(p => p.inGameName).join(', ')}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveTeam(index)}
                            className="text-red-400 hover:text-red-300 ml-2"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Match Type */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">Step 2: Match Type</label>
                  <select
                    value={newMatchType}
                    onChange={(e) => setNewMatchType(e.target.value as 'semifinal' | 'final')}
                    className="w-full bg-white/5 text-white p-2 rounded-md border border-white/20"
                  >
                    <option value="semifinal">Semi-Final</option>
                    <option value="final">Final</option>
                  </select>
                </div>

                {/* Match Number */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">Step 3: Match Number</label>
                  <input
                    type="number"
                    value={newMatchNumber}
                    onChange={(e) => setNewMatchNumber(e.target.value)}
                    className="w-full bg-white/5 text-white p-2 rounded-md border border-white/20"
                    placeholder="Enter match number"
                    min="1"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setUploadedTeams([]);
                      setExcelFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMatch}
                    disabled={uploadedTeams.length === 0 || !newMatchNumber.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md"
                  >
                    Add Match
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6 px-4 sm:px-6">
        <button
          onClick={downloadAllResults}
          className="flex items-center bg-cyan-600 hover:bg-cyan-700 text-white px-4 sm:px-6 py-3 rounded-md justify-center"
        >
          <Download size={16} className="mr-1 sm:mr-2" />
          Download All Matches
        </button>
        <button
          onClick={handleSave}
          className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white px-4 sm:px-6 py-3 rounded-md flex items-center justify-center"
        >
          <Save size={16} className="mr-1 sm:mr-2" />
          Show Final Result
          <ChevronRight size={16} className="ml-1 sm:ml-2" />
        </button>
      </div>
    </ConfigLayout>
  );
};

export default MatchCalculator;
