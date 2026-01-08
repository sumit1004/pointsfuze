import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { utils, read } from 'xlsx';
import ConfigLayout from '../components/layouts/ConfigLayout';
import { Save, ChevronRight, Trash2, Plus, Edit2, Upload, X } from 'lucide-react';

interface SlotTeam {
  slot: number;
  teamName: string;
}

interface SlotTeamMatchResult {
  slot: number;
  teamName: string;
  kills: number | '';
  position: number | '';
  points: number;
}

interface SlotTeamMatch {
  type: 'semifinal' | 'final';
  matchNumber: number;
  slotTeams: SlotTeamMatchResult[];
}

const SlotTeamMatch: React.FC = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<SlotTeamMatch[]>([]);
  const [gameConfig, setGameConfig] = useState<any>(null);
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [editMatchType, setEditMatchType] = useState<'semifinal' | 'final'>('final');
  const [editMatchNumber, setEditMatchNumber] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newMatchType, setNewMatchType] = useState<'semifinal' | 'final'>('final');
  const [newMatchNumber, setNewMatchNumber] = useState('');
  const [slotTeamInput, setSlotTeamInput] = useState('');
  const [slotTeams, setSlotTeams] = useState<SlotTeam[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSavedData = () => {
      const gameConf = JSON.parse(localStorage.getItem('slotTeamGameConfig') || '{}');
      const savedMatches = localStorage.getItem('slotTeamMatchResults');
      
      setGameConfig(gameConf);

      if (savedMatches) {
        const parsedMatches = JSON.parse(savedMatches);
        const updatedMatches = parsedMatches.map((match: SlotTeamMatch) => ({
          ...match,
          slotTeams: match.slotTeams.map((team: SlotTeamMatchResult) => ({
            ...team,
            points: calculatePointsForTeam(team, gameConf)
          }))
        }));
        setMatches(updatedMatches);
        localStorage.setItem('slotTeamMatchResults', JSON.stringify(updatedMatches));
      } else {
        setMatches([]);
      }
    };

    loadSavedData();
  }, []);

  const calculatePointsForTeam = (team: SlotTeamMatchResult, config: any) => {
    if (!config) return 0;
    
    const killCount = typeof team.kills === 'string' 
      ? (team.kills === '' ? 0 : parseInt(team.kills) || 0)
      : (team.kills || 0);
    
    const killPoints = killCount * config.killPoints;
    const positionPoints = team.position && team.position > 0 ? config.positionPoints[team.position] || 0 : 0;
    
    return killPoints + positionPoints;
  };

  const parseSlotTeamInput = (input: string): SlotTeam[] => {
    const teams: SlotTeam[] = [];
    const lines = input.trim().split('\n').filter(line => line.trim());
    
    lines.forEach((line, index) => {
      // Try to match format: "Slot-1	dryx" or "Slot-1  dryx" or "slot1-dryx"
      const slotMatch = line.match(/slot[\s-]?(\d+)[\s\t-]+(.+)/i);
      
      if (slotMatch) {
        // Format with explicit slot
        teams.push({
          slot: parseInt(slotMatch[1]),
          teamName: slotMatch[2].trim()
        });
      } else {
        // No slot format - just team name, auto-assign slot based on position
        const teamName = line.trim();
        if (teamName) {
          teams.push({
            slot: index + 1, // Auto-assign based on line position (1-indexed)
            teamName: teamName
          });
        }
      }
    });
    
    return teams;
  };

  const handleSlotTeamPaste = () => {
    const parsed = parseSlotTeamInput(slotTeamInput);
    if (parsed.length > 0) {
      setSlotTeams(parsed);
      setSlotTeamInput('');
    } else {
      alert('Invalid format. Use format like "slot1-Team Name\\nslot2-Team Name"');
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Read all rows as arrays to avoid missing the first data row
      const allRows = utils.sheet_to_json<any[]>(worksheet, { header: 1 });

      if (!allRows || allRows.length === 0) {
        alert('No data found in Excel file');
        return;
      }

      const teams: SlotTeam[] = [];
      let slotCounter = 1;
      let startRow = 0;

      // Detect if first row is a header row
      const firstRow = allRows[0] as any[];
      if (firstRow && firstRow.length > 0) {
        const headerKeywords = ['slot', 'team', 'name', 'no', 'sr', 'player', 'teamname'];
        const firstRowText = (firstRow[0]?.toString() || '').toLowerCase();
        const secondColText = (firstRow[1]?.toString() || '').toLowerCase();
        const isHeader = headerKeywords.some(kw => 
          firstRowText.includes(kw) || secondColText.includes(kw)
        );
        startRow = isHeader ? 1 : 0;
      }

      // Process all data rows starting from the correct index
      for (let i = startRow; i < allRows.length; i++) {
        const row = allRows[i] as any[];
        if (!row || row.length === 0) continue;

        let slotValue = row[0];
        let teamName = '';

        // Try to determine if first column is slot or team name
        const firstColStr = (slotValue || '').toString().trim();
        const secondColStr = (row[1] || '').toString().trim();

        // If we have 2+ columns
        if (row.length >= 2 && secondColStr) {
          // Format: Slot | Team Name
          teamName = secondColStr;
          const slotMatch = firstColStr.match(/\d+/);
          if (slotMatch) {
            slotValue = parseInt(slotMatch[0]);
          } else {
            slotValue = 0;
          }
        } else if (row.length === 1 || !secondColStr) {
          // Only one column or second column is empty - treat first column as team name
          teamName = firstColStr;
          slotValue = 0;
        }

        teamName = teamName.trim();
        if (!teamName) continue;

        // Parse slot number
        let parsedSlot = 0;
        if (slotValue && typeof slotValue === 'number') {
          parsedSlot = slotValue;
        } else if (slotValue && typeof slotValue === 'string') {
          const match = slotValue.match(/\d+/);
          if (match) {
            parsedSlot = parseInt(match[0]);
          }
        }

        // If no valid slot, auto-assign based on counter
        if (parsedSlot <= 0) {
          parsedSlot = slotCounter;
        }

        teams.push({
          slot: parsedSlot,
          teamName: teamName
        });

        slotCounter = Math.max(slotCounter + 1, parsedSlot + 1);
      }

      if (teams.length > 0) {
        setSlotTeams(teams);
        setExcelFile(file);
      } else {
        alert('No valid team data found in Excel file');
      }
    } catch (error) {
      alert('Error reading Excel file');
      console.error(error);
    }
  };

  const removeSlotTeam = (slot: number) => {
    setSlotTeams(slotTeams.filter(t => t.slot !== slot));
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
      localStorage.setItem('slotTeamMatchResults', JSON.stringify(newMatches));
      return newMatches;
    });

    setEditingMatch(null);
  };

  const createMatch = () => {
    if (slotTeams.length === 0) {
      alert('Please add slot and team names first');
      return;
    }

    if (!newMatchNumber) {
      alert('Please enter match number');
      return;
    }

    const newMatch: SlotTeamMatch = {
      type: newMatchType,
      matchNumber: parseInt(newMatchNumber),
      slotTeams: slotTeams.map(team => ({
        slot: team.slot,
        teamName: team.teamName,
        kills: '',
        position: '',
        points: 0
      }))
    };

    setMatches(prev => {
      const newMatches = [...prev, newMatch];
      localStorage.setItem('slotTeamMatchResults', JSON.stringify(newMatches));
      return newMatches;
    });

    // Clear inputs and close modal
    setNewMatchNumber('');
    setNewMatchType('final');
    setShowModal(false);
    // Keep slotTeams for next match
  };

  const deleteMatch = (matchIndex: number) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      setMatches(prevMatches => {
        const newMatches = prevMatches.filter((_, index) => index !== matchIndex);
        localStorage.setItem('slotTeamMatchResults', JSON.stringify(newMatches));
        return newMatches;
      });
    }
  };

  const handleSaveAndViewResults = () => {
    localStorage.setItem('slotTeamMatchResults', JSON.stringify(matches));
    navigate('/slot-team-final-result');
  };

  return (
    <ConfigLayout title="Slot & Team Match Points Calculator">
      <div className="relative min-h-screen pb-20 sm:pb-0 px-2 sm:px-6">
        {/* Add Match Button - Desktop */}
        <div className="hidden sm:block absolute top-[-60px] right-6">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white px-4 py-2 rounded-md"
          >
            <Plus size={18} className="mr-2" />
            Add Match
          </button>
        </div>

        {/* Matches Section - Slot Teams */}
        <div className="mt-4">
          {matches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-4">No matches added yet</p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-3 rounded-md flex items-center justify-center mx-auto"
              >
                <Plus size={18} className="mr-2" />
                Add First Match
              </button>
            </div>
          ) : (
            matches.map((match, matchIndex) => (
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
                          className="text-gray-400 hover:text-gray-200"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => deleteMatch(matchIndex)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Slot Teams Table */}
                <div className="bg-white/5 rounded-lg p-4 overflow-x-auto mb-6">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="text-gray-300 border-b border-white/20">
                        <th className="text-left py-2 px-2">Slot</th>
                        <th className="text-left py-2 px-2">Team Name</th>
                        <th className="text-center py-2 px-2">Kills</th>
                        <th className="text-center py-2 px-2">Position</th>
                        <th className="text-center py-2 px-2">Total Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.slotTeams
                        .sort((a, b) => a.slot - b.slot)
                        .map((team, teamIndex) => (
                          <tr key={teamIndex} className="text-white border-b border-white/10 hover:bg-white/5">
                            <td className="py-3 px-2 font-semibold text-cyan-400">#{team.slot}</td>
                            <td className="py-3 px-2 font-semibold">{team.teamName}</td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                value={team.kills}
                                onChange={(e) => {
                                  const newMatches = [...matches];
                                  const value = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                                  newMatches[matchIndex].slotTeams[teamIndex].kills = value;
                                  newMatches[matchIndex].slotTeams[teamIndex].points = calculatePointsForTeam(
                                    newMatches[matchIndex].slotTeams[teamIndex],
                                    gameConfig
                                  );
                                  setMatches(newMatches);
                                }}
                                className="w-20 bg-white/5 text-white text-center p-2 rounded border border-white/10 focus:outline-none focus:border-purple-500"
                                min="0"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                value={team.position}
                                onChange={(e) => {
                                  const newMatches = [...matches];
                                  const value = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                                  newMatches[matchIndex].slotTeams[teamIndex].position = value;
                                  newMatches[matchIndex].slotTeams[teamIndex].points = calculatePointsForTeam(
                                    newMatches[matchIndex].slotTeams[teamIndex],
                                    gameConfig
                                  );
                                  setMatches(newMatches);
                                }}
                                className="w-20 bg-white/5 text-white text-center p-2 rounded border border-white/10 focus:outline-none focus:border-purple-500"
                                min="0"
                              />
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-purple-400">{team.points}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Match Results Table - Like MatchCalculator.tsx */}
                <div className="mt-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-purple-400 mb-4">Match Rankings</h3>
                  <div className="bg-white/5 rounded-lg p-4 overflow-x-auto mb-6">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="text-gray-300 border-b border-white/20">
                          <th className="text-left py-2 px-2">Rank</th>
                          <th className="text-left py-2 px-2">Team Name</th>
                          <th className="text-center py-2 px-2">Kill Pts</th>
                          <th className="text-center py-2 px-2">Placement Pts</th>
                          <th className="text-center py-2 px-2">Total Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...match.slotTeams]
                          .sort((a, b) => b.points - a.points)
                          .map((team, index) => {
                            const killCount = typeof team.kills === 'string' 
                              ? (team.kills === '' ? 0 : parseInt(team.kills) || 0)
                              : (team.kills || 0);
                            const killPoints = killCount * gameConfig.killPoints;
                            const placementPoints = team.position && team.position > 0 ? gameConfig.positionPoints[team.position] || 0 : 0;
                            return (
                              <tr key={index} className="text-white border-b border-white/10 hover:bg-white/5">
                                <td className="py-3 px-2 font-semibold">#{index + 1}</td>
                                <td className="py-3 px-2">{team.teamName}</td>
                                <td className="py-3 px-2 text-center">{killPoints}</td>
                                <td className="py-3 px-2 text-center">{placementPoints}</td>
                                <td className="py-3 px-2 text-center font-bold text-cyan-400">{team.points}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          )}
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
              onClick={handleSaveAndViewResults}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-800 text-white px-4 py-3 rounded-md text-sm flex items-center justify-center"
            >
              Results
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
                {/* Step 1: Upload Teams Data */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">Step 1: Upload Teams Data (Excel/Paste)</label>
                  <div className="border-2 border-dashed border-purple-500 rounded-lg p-4 text-center mb-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-md"
                    >
                      <Upload size={20} />
                      Choose Excel File
                    </button>
                    {excelFile && <p className="text-sm text-green-400 mt-2">✓ {excelFile.name} loaded</p>}
                  </div>

                  <div className="relative mb-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-gray-800 text-gray-400">or paste data</span>
                    </div>
                  </div>

                  <textarea
                    value={slotTeamInput}
                    onChange={(e) => setSlotTeamInput(e.target.value)}
                    placeholder="Slot-1	dryx&#10;Slot-2	TEAM NOVAX&#10;Slot-3	All TIME LEGENDS"
                    className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:outline-none focus:border-purple-500 mb-2"
                    rows={5}
                  />
                  <button
                    onClick={handleSlotTeamPaste}
                    className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md"
                  >
                    <Plus size={18} />
                    Add from Paste
                  </button>
                </div>

                {/* Display Added Teams */}
                {slotTeams.length > 0 && (
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">
                      Teams Loaded ({slotTeams.length})
                    </label>
                    <div className="bg-gray-700 rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                      {slotTeams.map(team => (
                        <div key={team.slot} className="flex justify-between items-center bg-gray-800 p-2 rounded">
                          <span className="text-white">Slot {team.slot}: {team.teamName}</span>
                          <button
                            onClick={() => removeSlotTeam(team.slot)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Match Details */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">Step 2: Match Details</label>
                  <div className="space-y-3">
                    <select
                      value={newMatchType}
                      onChange={(e) => setNewMatchType(e.target.value as 'semifinal' | 'final')}
                      className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:outline-none focus:border-purple-500"
                    >
                      <option value="semifinal">Semi-Final</option>
                      <option value="final">Final</option>
                    </select>
                    <input
                      type="number"
                      value={newMatchNumber}
                      onChange={(e) => setNewMatchNumber(e.target.value)}
                      placeholder="Match Number"
                      className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:outline-none focus:border-purple-500"
                      min="1"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setNewMatchNumber('');
                      setNewMatchType('final');
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createMatch}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white px-4 py-2 rounded-md font-semibold flex items-center justify-center"
                  >
                    <Plus size={18} className="mr-2" />
                    Add Match
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation (Desktop) */}
        <div className="hidden sm:flex justify-between gap-4 mt-8 pt-8 border-t border-white/10">
          <button
            onClick={() => navigate('/games')}
            className="backdrop-blur-md bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-md transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSaveAndViewResults}
            className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white px-6 py-3 rounded-md flex items-center transition-all hover:shadow-lg"
          >
            <Save size={18} className="mr-2" />
            View Final Results
            <ChevronRight size={18} className="ml-2" />
          </button>
        </div>
      </div>
    </ConfigLayout>
  );
};

export default SlotTeamMatch;
