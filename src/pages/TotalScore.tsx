import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfigLayout from '../components/layouts/ConfigLayout';
import { Upload, Plus, Trash2, Edit2, Save, X, Download as DownloadIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAuth } from '../context/AuthContext';
import { saveTournamentToDb, saveHistoryToDb, incrementDownloadStat, updateTournamentInDb } from '../lib/db';

interface TournamentDetails {
  name: string;
  date: string;
  type: string;
}

interface TeamData {
  teamName: string;
  scores: Record<string, string>;
  total: number;
}

interface Match {
  id: string;
  name: string;
}

const TotalScore: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [tournamentDetails, setTournamentDetails] = useState<TournamentDetails>({ name: '', date: '', type: 'League Match' });
  const [isTournamentCreated, setIsTournamentCreated] = useState(false);
  const [teamsInput, setTeamsInput] = useState('');
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [matches, setMatches] = useState<Match[]>([{ id: 'match_1', name: 'Match 1' }]);
  const [newMatchName, setNewMatchName] = useState('');
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const { user } = useAuth();

  const tableRef = useRef<HTMLDivElement>(null);

  // Load from localStorage
  useEffect(() => {
    const savedDetails = localStorage.getItem('totalScoreTournamentDetails');
    const savedTeams = localStorage.getItem('totalScoreTeams');
    const savedMatches = localStorage.getItem('totalScoreMatches');

    if (savedDetails) {
      setTournamentDetails(JSON.parse(savedDetails));
      setIsTournamentCreated(true);
    }
    if (savedTeams) {
      setTeams(JSON.parse(savedTeams));
    }
    if (savedMatches) {
      setMatches(JSON.parse(savedMatches));
    }
  }, []);

  // Save to localStorage and sync to Firebase
  const saveToLocal = (details: TournamentDetails, t: TeamData[], m: Match[]) => {
    localStorage.setItem('totalScoreTournamentDetails', JSON.stringify(details));
    localStorage.setItem('totalScoreTeams', JSON.stringify(t));
    localStorage.setItem('totalScoreMatches', JSON.stringify(m));

    if (user) {
      const activeId = localStorage.getItem('currentActiveTournamentId');
      if (activeId) {
        updateTournamentInDb(user.uid, activeId, {
          name: details.name,
          date: details.date,
          type: details.type,
          mode: 'Total Score',
          teamsCount: t.length,
          teams: t,
          matches: m
        }).catch(err => console.error("Firebase sync error:", err));
      }
    }
  };

  const handleCreateTournament = async () => {
    if (!tournamentDetails.name || !tournamentDetails.date) {
      alert('Please fill all tournament details');
      return;
    }
    setIsTournamentCreated(true);
    
    let activeId = localStorage.getItem('currentActiveTournamentId');

    if (user && !activeId) {
      activeId = await saveTournamentToDb(user.uid, {
        name: tournamentDetails.name,
        date: tournamentDetails.date,
        type: tournamentDetails.type,
        mode: 'Total Score',
        status: 'active'
      });
      if (activeId) {
        localStorage.setItem('currentActiveTournamentId', activeId);
      }
    }
    
    saveToLocal(tournamentDetails, teams, matches);
  };

  const handleImportTeams = () => {
    const lines = teamsInput.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    const newTeams: TeamData[] = lines.map(line => ({
      teamName: line,
      scores: {},
      total: 0
    }));

    const combinedTeams = [...teams, ...newTeams];
    setTeams(combinedTeams);
    setTeamsInput('');
    saveToLocal(tournamentDetails, combinedTeams, matches);
  };

  const handleAddManualTeam = () => {
    const name = prompt('Enter team name:');
    if (name && name.trim()) {
      const newTeams = [...teams, { teamName: name.trim(), scores: {}, total: 0 }];
      setTeams(newTeams);
      saveToLocal(tournamentDetails, newTeams, matches);
    }
  };

  const handleRemoveTeam = (index: number) => {
    const newTeams = [...teams];
    newTeams.splice(index, 1);
    setTeams(newTeams);
    saveToLocal(tournamentDetails, newTeams, matches);
  };

  const handleAddMatch = () => {
    if (!newMatchName.trim()) {
      alert('Please enter a match name');
      return;
    }
    const newMatch = { id: Date.now().toString(), name: newMatchName.trim() };
    const newMatches = [...matches, newMatch];
    setMatches(newMatches);
    setNewMatchName('');
    setShowAddMatch(false);
    saveToLocal(tournamentDetails, teams, newMatches);
  };

  const handleRemoveMatch = (matchId: string) => {
    const newMatches = matches.filter(m => m.id !== matchId);
    setMatches(newMatches);
    
    // Also remove the scores for this match from all teams
    const newTeams = teams.map(team => {
      const newScores = { ...team.scores };
      delete newScores[matchId];
      
      // Recalculate total
      let total = 0;
      Object.values(newScores).forEach(scoreStr => {
        const score = parseInt(scoreStr);
        if (!isNaN(score)) {
          total += score;
        }
      });
      
      return {
        ...team,
        scores: newScores,
        total
      };
    });
    
    // Resort teams by total
    newTeams.sort((a, b) => b.total - a.total);
    
    setTeams(newTeams);
    saveToLocal(tournamentDetails, newTeams, newMatches);
  };

  const handleScoreChange = (teamIndex: number, matchId: string, val: string) => {
    const newTeams = [...teams];
    newTeams[teamIndex].scores[matchId] = val;
    
    // Recalculate total
    let total = 0;
    Object.values(newTeams[teamIndex].scores).forEach(scoreStr => {
      const score = parseInt(scoreStr);
      if (!isNaN(score)) {
        total += score;
      }
    });
    newTeams[teamIndex].total = total;

    // Sort teams by total descending
    newTeams.sort((a, b) => b.total - a.total);

    setTeams(newTeams);
    saveToLocal(tournamentDetails, newTeams, matches);
  };

  const downloadTable = async (type: 'current' | 'overall') => {
    if (!tableRef.current) return;
    
    const clone = tableRef.current.cloneNode(true) as HTMLElement;
    clone.style.width = '1200px';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    
    // Convert inputs to spans
    const inputs = clone.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
      const parent = input.parentElement;
      if (parent) {
        const val = (input as HTMLInputElement).value || '0';
        const span = document.createElement('span');
        span.className = 'text-white font-mono text-center block w-full';
        span.textContent = val;
        parent.replaceChild(span, input);
      }
    });

    // Show header for export
    const headerElement = clone.querySelector('.export-header');
    if (headerElement) {
      (headerElement as HTMLElement).style.display = 'block';
    }

    // Hide Actions column
    const actionsHeaders = clone.querySelectorAll('th[data-html2canvas-ignore]');
    actionsHeaders.forEach(el => el.remove());
    const actionsCells = clone.querySelectorAll('td[data-html2canvas-ignore]');
    actionsCells.forEach(el => el.remove());

    document.body.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        backgroundColor: '#0f172a', // dark background to match theme
        scale: 2,
        logging: false,
      });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Tournament_Result_${type}_${Date.now()}.png`;
      link.href = url;
      link.click();
      
      if (user) {
        incrementDownloadStat(user.uid, false);
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to generate image.');
    } finally {
      document.body.removeChild(clone);
    }
  };

  const downloadPointsTableTemplate = async (templateId: number) => {
    const date = new Date(tournamentDetails.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Dynamic match headers
    const matchHeaders = matches.map(m => `<th style="width: 100px; text-align: center;">${m.name.toUpperCase()}</th>`).join('');
    
    const rows = teams.map((team, index) => {
      let medalColor = '';
      if (index === 0) medalColor = '#FFD700';
      else if (index === 1) medalColor = '#C0C0C0';
      else if (index === 2) medalColor = '#CD7F32';

      const matchCells = matches.map(m => `<td style="text-align: center; font-weight: 500;">${team.scores[m.id] || 0}</td>`).join('');

      return `<tr style="${index < 3 ? `background-color: rgba(${index === 0 ? '255,215,0' : index === 1 ? '192,192,192' : '205,127,50'}, 0.15);` : ''}">
        <td style="font-weight: bold; color: ${medalColor || '#000000'};">${index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}</td>
        <td style="font-weight: 600;">${team.teamName}</td>
        ${matchCells}
        <td style="text-align: center; font-weight: bold; font-size: 16px;">${team.total}</td>
      </tr>`;
    }).join('');

    let htmlContent = '';

    if (templateId === 1) {
      // Template 1: Professional Corporate
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${tournamentDetails.name || 'Tournament'} - Points Table</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              font-family: 'Segoe UI', 'Arial', sans-serif;
              background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
              color: #222;
              padding: 40px 20px;
              min-height: 100vh;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              padding: 60px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 50px;
              padding-bottom: 30px;
              border-bottom: 3px solid #1f2937;
            }
            .tournament-title {
              font-size: 48px;
              font-weight: 800;
              color: #1f2937;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .tournament-date {
              font-size: 16px;
              color: #6b7280;
              font-weight: 500;
              margin-bottom: 5px;
            }
            .badge {
              display: inline-block;
              color: black;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 25px;
              font-weight: 800;
              margin-top: 15px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 30px;
            }
            th {
              background: #1f2937;
              color: white;
              padding: 16px;
              text-align: left;
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              border: none;
            }
            td {
              padding: 16px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 15px;
              color: #374151;
            }
            tr:last-child td {
              border-bottom: none;
            }
            tr:hover {
              background: #f9fafb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="tournament-title">${tournamentDetails.name}</div>
              <div class="tournament-date">${date} • ${tournamentDetails.type}</div>
              <div class="badge">OVERALL STANDINGS</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 70px;">RANK</th>
                  <th>TEAM</th>
                  ${matchHeaders}
                  <th style="width: 100px; text-align: center;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    } else if (templateId === 2) {
      // Template 2: Gaming Victory
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${tournamentDetails.name || 'Tournament'} - Points Table</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              font-family: 'Arial', sans-serif;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              color: #fff;
              padding: 40px 20px;
              min-height: 100vh;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: rgba(22, 33, 62, 0.95);
              border: 3px solid #00d4ff;
              border-radius: 8px;
              padding: 60px;
              box-shadow: 0 0 40px rgba(0, 212, 255, 0.3), inset 0 0 40px rgba(0, 212, 255, 0.05);
            }
            .header {
              text-align: center;
              margin-bottom: 50px;
              padding-bottom: 30px;
              border-bottom: 2px solid #00d4ff;
            }
            .tournament-title {
              font-size: 52px;
              font-weight: 900;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 3px;
            }
            .badge {
              display: inline-block;
              color: #ffffff;
              padding: 10px 20px;
              border-radius: 4px;
              font-size: 25px;
              font-weight: 900;
              margin-top: 15px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 30px;
            }
            th {
              background: linear-gradient(90deg, #00d4ff, #0099ff);
              color: #1a1a2e;
              padding: 16px;
              text-align: left;
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            td {
              padding: 16px;
              border-bottom: 1px solid rgba(0, 212, 255, 0.2);
              font-size: 15px;
            }
            tr:last-child td {
              border-bottom: none;
            }
            tr:hover {
              background: rgba(0, 212, 255, 0.1);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="tournament-title">${tournamentDetails.name}</div>
              <div class="tournament-date">${date} • ${tournamentDetails.type}</div>
              <div class="badge">OVERALL STANDINGS</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 70px;">RANK</th>
                  <th>TEAM</th>
                  ${matchHeaders}
                  <th style="width: 100px; text-align: center;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    } else if (templateId === 3) {
      // Template 3: Esports Championship
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${tournamentDetails.name || 'Tournament'} - Points Table</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              font-family: 'Arial Black', sans-serif;
              background: linear-gradient(135deg, #0a0e27 0%, #1a1a3e 100%);
              color: #fff;
              padding: 40px 20px;
              min-height: 100vh;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
              border: 2px solid #f97316;
              border-radius: 4px;
              padding: 60px;
              box-shadow: 0 0 60px rgba(249, 115, 22, 0.4);
            }
            .header {
              text-align: center;
              margin-bottom: 50px;
              padding-bottom: 30px;
              border-bottom: 3px solid #f97316;
            }
            .tournament-title {
              font-size: 56px;
              font-weight: 900;
              color: #f97316;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 3px;
              text-shadow: 0 0 20px rgba(249, 115, 22, 0.5);
            }
            .badge {
              display: inline-block;
              color: white;
              padding: 10px 24px;
              border-radius: 2px;
              font-size: 25px;
              font-weight: 900;
              margin-top: 15px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 30px;
            }
            th {
              background: #f97316;
              color: white;
              padding: 18px;
              text-align: left;
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            td {
              padding: 16px 18px;
              border-bottom: 1px solid #374151;
              font-size: 15px;
            }
            tr:last-child td {
              border-bottom: none;
            }
            tr:hover {
              background: rgba(249, 115, 22, 0.1);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="tournament-title">${tournamentDetails.name}</div>
              <div class="tournament-date">${date} • ${tournamentDetails.type}</div>
              <div class="badge">OVERALL STANDINGS</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 70px;">RANK</th>
                  <th>TEAM</th>
                  ${matchHeaders}
                  <th style="width: 100px; text-align: center;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    } else if (templateId === 4) {
      // Template 4: Elite Tournament
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${tournamentDetails.name || 'Tournament'} - Points Table</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              font-family: 'Georgia', serif;
              background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
              color: #fff;
              padding: 40px 20px;
              min-height: 100vh;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: #1f1f1f;
              border: 3px solid #d4af37;
              border-radius: 0px;
              padding: 60px;
              box-shadow: 0 0 50px rgba(212, 175, 55, 0.3), inset 0 0 30px rgba(212, 175, 55, 0.05);
            }
            .header {
              text-align: center;
              margin-bottom: 50px;
              padding-bottom: 40px;
              border-bottom: 3px solid #d4af37;
            }
            .tournament-title {
              font-size: 54px;
              font-weight: 900;
              color: #d4af37;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 4px;
              font-style: italic;
            }
            .badge {
              display: inline-block;
              color: #ffffff;
              padding: 12px 28px;
              border-radius: 0px;
              font-size: 25px;
              font-weight: 900;
              margin-top: 20px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 35px;
            }
            th {
              background: #d4af37;
              color: #1f1f1f;
              padding: 18px;
              text-align: left;
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            td {
              padding: 16px 18px;
              border-bottom: 2px solid #333;
              font-size: 15px;
            }
            tr:last-child td {
              border-bottom: none;
            }
            tr:hover {
              background: rgba(212, 175, 55, 0.08);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="tournament-title">${tournamentDetails.name}</div>
              <div class="tournament-date">${date} • ${tournamentDetails.type}</div>
              <div class="badge">OVERALL STANDINGS</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 70px;">RANK</th>
                  <th>TEAM</th>
                  ${matchHeaders}
                  <th style="width: 100px; text-align: center;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#fff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${tournamentDetails.name}-Overall-Table-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (user) {
        incrementDownloadStat(user.uid, true);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate template image');
    } finally {
      document.body.removeChild(tempDiv);
      setShowTemplateModal(false);
    }
  };

  const handleSaveAndExit = () => {
    saveToLocal(tournamentDetails, teams, matches);
    
    if (user) {
      saveHistoryToDb(user.uid, {
        tournamentName: tournamentDetails.name,
        date: tournamentDetails.date,
        mode: 'Total Score',
        totalMatches: matches.length,
        winner: teams[0]?.teamName || '',
        pointsTable: teams
      });
    }
    
    navigate('/dashboard');
  };

  return (
    <ConfigLayout title="Total Score Mode">
      {!isTournamentCreated ? (
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6 shadow-lg mb-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6 text-emerald-400 text-center">Create Tournament</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-1">Tournament Name</label>
              <input 
                type="text" 
                value={tournamentDetails.name}
                onChange={e => setTournamentDetails({...tournamentDetails, name: e.target.value})}
                className="w-full bg-black/30 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-emerald-500"
                placeholder="Enter tournament name"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Tournament Date</label>
              <input 
                type="date" 
                value={tournamentDetails.date}
                onChange={e => setTournamentDetails({...tournamentDetails, date: e.target.value})}
                className="w-full bg-black/30 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Tournament Type</label>
              <select 
                value={tournamentDetails.type}
                onChange={e => setTournamentDetails({...tournamentDetails, type: e.target.value})}
                className="w-full bg-black/30 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="League Match">League Match</option>
                <option value="Quarter Final">Quarter Final</option>
                <option value="Semi Final">Semi Final</option>
                <option value="Final">Final</option>
              </select>
            </div>
            <button 
              onClick={handleCreateTournament}
              className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white p-3 rounded font-bold transition-all"
            >
              Create Tournament
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-emerald-400">{tournamentDetails.name}</h2>
              <p className="text-gray-400 text-sm">{tournamentDetails.date} • {tournamentDetails.type}</p>
            </div>
            <button 
              onClick={handleSaveAndExit}
              className="flex items-center bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              <Save size={16} className="mr-2" /> Save & Exit
            </button>
          </div>

          {teams.length === 0 ? (
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Add Teams</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-gray-300 mb-2">Method 1: Paste Team Names (One per line)</label>
                  <textarea 
                    value={teamsInput}
                    onChange={e => setTeamsInput(e.target.value)}
                    className="w-full h-48 bg-black/30 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="TEAM ALPHA&#10;TEAM BRAVO&#10;TEAM LEGEND"
                  />
                  <button 
                    onClick={handleImportTeams}
                    className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded transition-colors"
                  >
                    Import Teams
                  </button>
                </div>
                
                <div className="flex flex-col justify-center items-center border-l border-white/10 pl-8">
                  <p className="text-gray-300 mb-4 text-center">Method 2: Add manually one by one</p>
                  <button 
                    onClick={handleAddManualTeam}
                    className="flex items-center bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    <Plus size={20} className="mr-2" /> Add Team Manually
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Score Entry</h3>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => setShowAddMatch(true)}
                    className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    <Plus size={16} className="mr-2" /> Add Match
                  </button>
                  <button 
                    onClick={() => downloadTable('current')}
                    className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    <DownloadIcon size={16} className="mr-2" /> Download Current Table
                  </button>
                  <button 
                    onClick={() => setShowTemplateModal(true)}
                    className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    <DownloadIcon size={16} className="mr-2" /> Download Overall Table
                  </button>
                </div>
              </div>

              {showAddMatch && (
                <div className="mb-6 p-4 bg-black/40 border border-emerald-500/30 rounded-lg flex items-end space-x-4">
                  <div className="flex-1">
                    <label className="block text-gray-300 mb-1 text-sm">Match Name</label>
                    <input 
                      type="text" 
                      value={newMatchName}
                      onChange={e => setNewMatchName(e.target.value)}
                      placeholder="e.g. Match 2, Semi Final"
                      className="w-full bg-black/30 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button 
                    onClick={handleAddMatch}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded transition-colors h-[42px]"
                  >
                    Add
                  </button>
                  <button 
                    onClick={() => setShowAddMatch(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors h-[42px]"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-white/10" ref={tableRef}>
                <div className="p-6 bg-[#0f172a]">
                  {/* Header for Download */}
                  <div className="export-header text-center mb-6" style={{ display: 'none' }}>
                    <h2 className="text-4xl font-bold text-white mb-2">{tournamentDetails.name}</h2>
                    <p className="text-emerald-400 text-xl font-semibold mb-4">{tournamentDetails.type} • {tournamentDetails.date}</p>
                    <div className="flex justify-center mb-6">
                      <img src="/logos.png" alt="Logo" className="h-20" />
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-gray-300">
                        <th className="p-3 w-16 text-center">Rank</th>
                        <th className="p-3">Team Name</th>
                        {matches.map(match => (
                          <th key={match.id} className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              {match.name}
                              <button 
                                onClick={() => handleRemoveMatch(match.id)}
                                className="text-red-400 hover:text-red-300 p-1 bg-red-900/20 rounded-full"
                                title="Remove Match"
                                data-html2canvas-ignore
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </th>
                        ))}
                        <th className="p-3 text-center font-bold text-emerald-400">Total Score</th>
                        <th className="p-3 text-center w-20" data-html2canvas-ignore>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team, index) => (
                        <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-3 text-center text-gray-400 font-mono">#{index + 1}</td>
                          <td className="p-3 font-semibold text-white">{team.teamName}</td>
                          {matches.map(match => (
                            <td key={match.id} className="p-2 text-center">
                              <input
                                type="number"
                                value={team.scores[match.id] || ''}
                                onChange={e => handleScoreChange(index, match.id, e.target.value)}
                                className="w-16 bg-black/40 border border-white/10 rounded p-1 text-center text-white focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                          ))}
                          <td className="p-3 text-center font-bold text-emerald-400 text-lg">
                            {team.total}
                          </td>
                          <td className="p-3 text-center" data-html2canvas-ignore>
                            <button 
                              onClick={() => handleRemoveTeam(index)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Remove Team"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mt-4 flex space-x-4">
                <button 
                  onClick={handleAddManualTeam}
                  className="flex items-center text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <Plus size={14} className="mr-1" /> Add Team
                </button>
              </div>

            </div>
          )}
        </div>
      )}
      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-900 to-purple-800 px-6 py-6 border-b border-white/10">
              <h2 className="text-3xl font-bold text-white">Choose Your Template</h2>
              <p className="text-purple-200 text-sm mt-1">Select and download your tournament standings in your preferred style</p>
            </div>

            {/* Templates Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Template 1: Professional Corporate */}
              <div 
                onClick={() => downloadPointsTableTemplate(1)}
                className="cursor-pointer group"
              >
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden border-2 border-gray-300 hover:border-gray-400 transition-all duration-300 hover:shadow-xl hover:scale-105">
                  {/* Preview */}
                  <div className="aspect-video bg-white p-4 flex flex-col justify-center items-center border-b border-gray-300">
                    <div className="text-center w-full">
                      <h3 className="text-gray-800 font-bold text-lg mb-1">Tournament Name</h3>
                      <div className="w-full h-12 bg-gray-700 rounded mb-2"></div>
                      <div className="grid grid-cols-4 gap-1 w-full">
                        <div className="h-6 bg-gray-200 rounded"></div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="p-4 bg-gray-50">
                    <h3 className="font-bold text-gray-800 mb-2">Professional Corporate</h3>
                    <button className="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 rounded font-semibold text-sm transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              </div>

              {/* Template 2: Gaming Victory */}
              <div 
                onClick={() => downloadPointsTableTemplate(2)}
                className="cursor-pointer group"
              >
                <div className="bg-gradient-to-br from-blue-950 to-blue-900 rounded-lg overflow-hidden border-2 border-cyan-400 hover:border-cyan-300 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-105">
                  {/* Preview */}
                  <div className="aspect-video bg-blue-900 bg-opacity-50 p-4 flex flex-col justify-center items-center border-b border-cyan-400">
                    <div className="text-center w-full">
                      <h3 className="text-cyan-400 font-bold text-lg mb-1"> Tournament Name</h3>
                      <div className="w-full h-1 bg-cyan-400 mb-3"></div>
                      <div className="grid grid-cols-4 gap-1 w-full">
                        <div className="h-6 bg-cyan-400/30 rounded"></div>
                        <div className="h-6 bg-cyan-400/30 rounded"></div>
                        <div className="h-6 bg-cyan-400/30 rounded"></div>
                        <div className="h-6 bg-cyan-400/30 rounded"></div>
                      </div>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="p-4 bg-blue-950">
                    <h3 className="font-bold text-cyan-400 mb-2">Gaming Victory</h3>
                    <button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded font-semibold text-sm transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              </div>

              {/* Template 3: Esports Championship */}
              <div 
                onClick={() => downloadPointsTableTemplate(3)}
                className="cursor-pointer group"
              >
                <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-lg overflow-hidden border-2 border-orange-500 hover:border-orange-400 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105">
                  {/* Preview */}
                  <div className="aspect-video bg-gray-800 p-4 flex flex-col justify-center items-center border-b border-orange-500">
                    <div className="text-center w-full">
                      <h3 className="text-orange-500 font-black text-lg mb-1"> TOURNAMENT NAME</h3>
                      <div className="w-full h-1 bg-orange-500 mb-3"></div>
                      <div className="grid grid-cols-4 gap-1 w-full">
                        <div className="h-6 bg-orange-500/30 rounded"></div>
                        <div className="h-6 bg-orange-500/30 rounded"></div>
                        <div className="h-6 bg-orange-500/30 rounded"></div>
                        <div className="h-6 bg-orange-500/30 rounded"></div>
                      </div>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="p-4 bg-gray-900">
                    <h3 className="font-bold text-orange-500 mb-2">Esports Championship</h3>
                    <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded font-semibold text-sm transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              </div>

              {/* Template 4: Elite Tournament */}
              <div 
                onClick={() => downloadPointsTableTemplate(4)}
                className="cursor-pointer group"
              >
                <div className="bg-gradient-to-br from-black to-gray-900 rounded-lg overflow-hidden border-2 border-yellow-600 hover:border-yellow-400 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/30 hover:scale-105">
                  {/* Preview */}
                  <div className="aspect-video bg-black p-4 flex flex-col justify-center items-center border-b border-yellow-600">
                    <div className="text-center w-full">
                      <h3 className="text-yellow-600 font-black italic text-lg mb-1"> TOURNAMENT NAME</h3>
                      <div className="w-full h-1 bg-yellow-600 mb-3"></div>
                      <div className="grid grid-cols-4 gap-1 w-full">
                        <div className="h-6 bg-yellow-600/30 rounded"></div>
                        <div className="h-6 bg-yellow-600/30 rounded"></div>
                        <div className="h-6 bg-yellow-600/30 rounded"></div>
                        <div className="h-6 bg-yellow-600/30 rounded"></div>
                      </div>
                    </div>
                  </div>
                  {/* Details */}
                  <div className="p-4 bg-black">
                    <h3 className="font-bold text-yellow-600 mb-2">Elite Tournament</h3>
                    <button className="w-full bg-yellow-700 hover:bg-yellow-800 text-white py-2 rounded font-semibold text-sm transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-950 border-t border-white/10 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfigLayout>
  );
};

export default TotalScore;
