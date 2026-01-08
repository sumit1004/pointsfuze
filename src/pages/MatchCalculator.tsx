import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { utils, writeFile, read } from 'xlsx';
import ConfigLayout from '../components/layouts/ConfigLayout';
import { Save, ChevronRight, Download, Trash2, Plus, Edit2, Upload, X, Trophy } from 'lucide-react';
import html2canvas from 'html2canvas';

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
  tournamentName?: string;
  tournamentDate?: string;
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
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentDate, setTournamentDate] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [currentMatchForTemplate, setCurrentMatchForTemplate] = useState<Match | null>(null);

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

  const downloadPointsTableTemplate = async (templateId: number) => {
    if (!currentMatchForTemplate) return;

    const match = currentMatchForTemplate;
    const rows = [...match.teams]
      .sort((a, b) => b.points - a.points)
      .map((team, index) => {
        const totalKills = team.players.reduce((sum, p) => {
          const killCount = typeof p.kills === 'string' 
            ? (p.kills === '' ? 0 : parseInt(p.kills) || 0)
            : (p.kills || 0);
          return sum + killCount;
        }, 0);

        let medalColor = '';
        if (index === 0) medalColor = '#FFD700';
        else if (index === 1) medalColor = '#C0C0C0';
        else if (index === 2) medalColor = '#CD7F32';

        return `
      <tr style="${index < 3 ? `background-color: rgba(${index === 0 ? '255,215,0' : index === 1 ? '192,192,192' : '205,127,50'}, 0.15);` : ''}">
        <td style="font-weight: bold; color: ${medalColor || '#000000ff'};">${index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}</td>
        <td style="font-weight: 600;">${team.teamName}</td>
        <td style="text-align: center;">${team.position || '—'}</td>
        <td style="text-align: center;">${totalKills}</td>
        <td style="text-align: center; font-weight: 500;">${gameConfig.positionPoints[team.position] || 0}</td>
        <td style="text-align: center; font-weight: bold; font-size: 16px;">${team.points}</td>    
      </tr>
    `}).join('');

    const matchType = match.type === 'semifinal' ? 'Semi-Final' : 'Final';
    const formattedDate = new Date(match.tournamentDate || new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let htmlContent = '';

    if (templateId === 1) {
      htmlContent = `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><title>${tournamentName} - ${matchType} ${match.matchNumber}</title><style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { font-family: 'Segoe UI', 'Arial', sans-serif; background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%); color: #222; padding: 40px 20px; min-height: 100vh; }
          .container { max-width: 1200px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 60px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 3px solid #1f2937; }
          .tournament-title { font-size: 48px; font-weight: 800; color: #1f2937; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px; }
          .match-label { font-size: 24px; color: #6b7280; font-weight: 500; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th { background: #1f2937; color: white; padding: 16px; text-align: left; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
          td { padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 15px; color: #374151; }
          tr:last-child td { border-bottom: none; }
          tr:hover { background: #f9fafb; }
        </style></head><body><div class="container"><div class="header"><div class="tournament-title">${tournamentName}</div><div class="match-label">${matchType} Match ${match.matchNumber}</div></div>
        <table><thead><tr><th>RANK</th><th>TEAM</th><th>POS</th><th>KILLS</th><th>POS PTS</th><th>TOTAL PTS</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>
      `;
    } else if (templateId === 2) {
      htmlContent = `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><title>${tournamentName} - ${matchType} ${match.matchNumber}</title><style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { font-family: 'Arial', sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 40px 20px; min-height: 100vh; }
          .container { max-width: 1200px; margin: 0 auto; background: rgba(22, 33, 62, 0.95); border: 3px solid #00d4ff; border-radius: 8px; padding: 60px; box-shadow: 0 0 40px rgba(0, 212, 255, 0.3), inset 0 0 40px rgba(0, 212, 255, 0.05); }
          .header { text-align: center; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 2px solid #00d4ff; }
          .tournament-title { font-size: 52px; font-weight: 900; color: #00d4ff; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 3px; }
          .match-label { font-size: 18px; color: #00d4ff; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th { background: linear-gradient(90deg, #00d4ff, #0099ff); color: #1a1a2e; padding: 16px; text-align: left; font-size: 13px; font-weight: 700; text-transform: uppercase; }
          td { padding: 16px; border-bottom: 1px solid rgba(0, 212, 255, 0.2); font-size: 15px; }
          tr:last-child td { border-bottom: none; }
          tr:hover { background: rgba(0, 212, 255, 0.1); }
        </style></head><body><div class="container"><div class="header"><div class="tournament-title">${tournamentName}</div><div class="match-label">${matchType} Match ${match.matchNumber}</div></div>
        <table><thead><tr><th>RANK</th><th>TEAM</th><th>POS</th><th>KILLS</th><th>POS PTS</th><th>TOTAL</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>
      `;
    } else if (templateId === 3) {
      htmlContent = `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><title>${tournamentName} - ${matchType} ${match.matchNumber}</title><style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { font-family: 'Arial Black', sans-serif; background: linear-gradient(135deg, #0a0e27 0%, #1a1a3e 100%); color: #fff; padding: 40px 20px; min-height: 100vh; }
          .container { max-width: 1200px; margin: 0 auto; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border: 2px solid #f97316; border-radius: 4px; padding: 60px; box-shadow: 0 0 60px rgba(249, 115, 22, 0.4); }
          .header { text-align: center; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 3px solid #f97316; }
          .tournament-title { font-size: 56px; font-weight: 900; color: #f97316; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 3px; text-shadow: 0 0 20px rgba(249, 115, 22, 0.5); }
          .match-label { font-size: 18px; color: #fbbf24; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th { background: #f97316; color: white; padding: 18px; text-align: left; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
          td { padding: 16px 18px; border-bottom: 1px solid #374151; font-size: 15px; }
          tr:last-child td { border-bottom: none; }
          tr:hover { background: rgba(249, 115, 22, 0.1); }
        </style></head><body><div class="container"><div class="header"><div class="tournament-title">${tournamentName}</div><div class="match-label">${matchType} Match ${match.matchNumber}</div></div>
        <table><thead><tr><th>RANK</th><th>TEAM</th><th>POS</th><th>KILLS</th><th>POS PTS</th><th>TOTAL</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>
      `;
    } else if (templateId === 4) {
      htmlContent = `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><title>${tournamentName} - ${matchType} ${match.matchNumber}</title><style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { font-family: 'Georgia', serif; background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%); color: #fff; padding: 40px 20px; min-height: 100vh; }
          .container { max-width: 1200px; margin: 0 auto; background: #1f1f1f; border: 3px solid #d4af37; border-radius: 0px; padding: 60px; box-shadow: 0 0 50px rgba(212, 175, 55, 0.3), inset 0 0 30px rgba(212, 175, 55, 0.05); }
          .header { text-align: center; margin-bottom: 50px; padding-bottom: 40px; border-bottom: 3px solid #d4af37; }
          .tournament-title { font-size: 54px; font-weight: 900; color: #d4af37; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 4px; font-style: italic; }
          .match-label { font-size: 18px; color: #d4af37; font-weight: 500; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; margin-top: 35px; }
          th { background: #d4af37; color: #1f1f1f; padding: 18px; text-align: left; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
          td { padding: 16px 18px; border-bottom: 2px solid #333; font-size: 15px; }
          tr:last-child td { border-bottom: none; }
          tr:hover { background: rgba(212, 175, 55, 0.08); }
        </style></head><body><div class="container"><div class="header"><div class="tournament-title">${tournamentName}</div><div class="match-label">${matchType} Match ${match.matchNumber}</div></div>
        <table><thead><tr><th>RANK</th><th>TEAM</th><th>POS</th><th>KILLS</th><th>POS PTS</th><th>TOTAL</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>
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
      const fileName = `${tournamentName}-${matchType}-${match.matchNumber}-${new Date().toISOString().split('T')[0]}.png`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate template image');
    } finally {
      document.body.removeChild(tempDiv);
      setShowTemplateModal(false);
    }
  };
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
      })),
      tournamentName: tournamentName || '',
      tournamentDate: tournamentDate || ''
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
    setTournamentName('');
    setTournamentDate('');
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
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => downloadMatchResult(match)}
                        className="flex-1 sm:flex-initial flex items-center bg-gradient-to-r from-purple-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md justify-center text-sm"
                      >
                        <Download size={16} className="mr-1 sm:mr-2" />
                        Excel
                      </button>
                      <button
                        onClick={() => {
                          setCurrentMatchForTemplate(match);
                          setShowTemplateModal(true);
                        }}
                        className="flex-1 sm:flex-initial flex items-center bg-gradient-to-r from-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md justify-center text-sm"
                      >
                        <Download size={16} className="mr-1 sm:mr-2" />
                        Template
                      </button>
                    </div>
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

                {/* Tournament Details */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">Step 4: Tournament Details</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={tournamentName}
                      onChange={(e) => setTournamentName(e.target.value)}
                      placeholder="Tournament Name (e.g., BGMI Championship)"
                      className="w-full bg-white/5 text-white p-2 rounded-md border border-white/20"
                    />
                    <input
                      type="date"
                      value={tournamentDate}
                      onChange={(e) => setTournamentDate(e.target.value)}
                      className="w-full bg-white/5 text-white p-2 rounded-md border border-white/20"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setUploadedTeams([]);
                      setExcelFile(null);
                      setTournamentName('');
                      setTournamentDate('');
                      setNewMatchNumber('');
                      setNewMatchType('final');
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

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-6 border-b border-white/10">
              <h2 className="text-3xl font-bold text-white">Match Template Styles</h2>
            </div>

            {/* Templates Grid - Simplified with exact previews */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Template 1: Professional Corporate - White Background */}
              <div onClick={() => downloadPointsTableTemplate(1)} className="cursor-pointer group">
                <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-400 hover:border-gray-600 transition-all duration-300 hover:shadow-xl hover:scale-105 h-80">
                  <div className="p-6 h-full bg-white text-gray-900 flex flex-col">
                    <div className="text-center mb-4 pb-4 border-b-2 border-gray-800">
                      <h3 className="text-2xl font-bold">Tournament</h3>
                      <p className="text-sm text-gray-600">Match Result</p>
                    </div>
                    <table className="w-full text-xs flex-1">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="px-2 py-1">RANK</th>
                          <th className="px-2 py-1">TEAM</th>
                          <th className="px-2 py-1">POINTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-300 bg-yellow-50"><td className="px-2 py-1">🥇</td><td>Team A</td><td>100</td></tr>
                        <tr className="border-b border-gray-300 bg-gray-50"><td className="px-2 py-1">🥈</td><td>Team B</td><td>80</td></tr>
                        <tr className="bg-orange-50"><td className="px-2 py-1">🥉</td><td>Team C</td><td>60</td></tr>
                      </tbody>
                    </table>
                    <div className="text-center mt-auto pt-3 text-xs text-gray-600 font-semibold">PROFESSIONAL CORPORATE</div>
                  </div>
                </div>
              </div>

              {/* Template 2: Gaming Victory - Blue/Cyan */}
              <div onClick={() => downloadPointsTableTemplate(2)} className="cursor-pointer group">
                <div className="rounded-lg overflow-hidden border-2 border-cyan-400 hover:border-cyan-300 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-105 h-80 bg-blue-950 bg-opacity-50">
                  <div className="p-6 h-full flex flex-col text-cyan-400">
                    <div className="text-center mb-4 pb-4 border-b-2 border-cyan-400">
                      <h3 className="text-2xl font-bold">🎮 Tournament</h3>
                      <p className="text-sm text-cyan-300">Match Result</p>
                    </div>
                    <table className="w-full text-xs flex-1">
                      <thead>
                        <tr className="bg-cyan-400 bg-opacity-30 text-cyan-400">
                          <th className="px-2 py-1">RANK</th>
                          <th className="px-2 py-1">TEAM</th>
                          <th className="px-2 py-1">POINTS</th>
                        </tr>
                      </thead>
                      <tbody className="text-cyan-300">
                        <tr className="border-b border-cyan-400 border-opacity-30"><td className="px-2 py-1">🥇</td><td>Team A</td><td>100</td></tr>
                        <tr className="border-b border-cyan-400 border-opacity-30"><td className="px-2 py-1">🥈</td><td>Team B</td><td>80</td></tr>
                        <tr><td className="px-2 py-1">🥉</td><td>Team C</td><td>60</td></tr>
                      </tbody>
                    </table>
                    <div className="text-center mt-auto pt-3 text-xs text-cyan-300 font-semibold">GAMING VICTORY</div>
                  </div>
                </div>
              </div>

              {/* Template 3: Esports Championship - Orange */}
              <div onClick={() => downloadPointsTableTemplate(3)} className="cursor-pointer group">
                <div className="rounded-lg overflow-hidden border-2 border-orange-500 hover:border-orange-400 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105 h-80 bg-gray-900">
                  <div className="p-6 h-full flex flex-col text-orange-500">
                    <div className="text-center mb-4 pb-4 border-b-2 border-orange-500">
                      <h3 className="text-2xl font-bold">🏆 TOURNAMENT</h3>
                      <p className="text-sm text-orange-400">MATCH RESULT</p>
                    </div>
                    <table className="w-full text-xs flex-1">
                      <thead>
                        <tr className="bg-orange-500 text-white">
                          <th className="px-2 py-1">RANK</th>
                          <th className="px-2 py-1">TEAM</th>
                          <th className="px-2 py-1">POINTS</th>
                        </tr>
                      </thead>
                      <tbody className="text-orange-400">
                        <tr className="border-b border-orange-500 border-opacity-30"><td className="px-2 py-1">🥇</td><td>Team A</td><td>100</td></tr>
                        <tr className="border-b border-orange-500 border-opacity-30"><td className="px-2 py-1">🥈</td><td>Team B</td><td>80</td></tr>
                        <tr><td className="px-2 py-1">🥉</td><td>Team C</td><td>60</td></tr>
                      </tbody>
                    </table>
                    <div className="text-center mt-auto pt-3 text-xs text-orange-400 font-semibold">ESPORTS CHAMPIONSHIP</div>
                  </div>
                </div>
              </div>

              {/* Template 4: Elite Tournament - Gold */}
              <div onClick={() => downloadPointsTableTemplate(4)} className="cursor-pointer group">
                <div className="rounded-lg overflow-hidden border-2 border-yellow-600 hover:border-yellow-400 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/30 hover:scale-105 h-80 bg-black">
                  <div className="p-6 h-full flex flex-col text-yellow-600">
                    <div className="text-center mb-4 pb-4 border-b-2 border-yellow-600">
                      <h3 className="text-2xl font-bold italic">⭐ TOURNAMENT</h3>
                      <p className="text-sm text-yellow-500">MATCH RESULT</p>
                    </div>
                    <table className="w-full text-xs flex-1">
                      <thead>
                        <tr className="bg-yellow-600 text-black">
                          <th className="px-2 py-1">RANK</th>
                          <th className="px-2 py-1">TEAM</th>
                          <th className="px-2 py-1">POINTS</th>
                        </tr>
                      </thead>
                      <tbody className="text-yellow-500">
                        <tr className="border-b border-yellow-600 border-opacity-30"><td className="px-2 py-1">🥇</td><td>Team A</td><td>100</td></tr>
                        <tr className="border-b border-yellow-600 border-opacity-30"><td className="px-2 py-1">🥈</td><td>Team B</td><td>80</td></tr>
                        <tr><td className="px-2 py-1">🥉</td><td>Team C</td><td>60</td></tr>
                      </tbody>
                    </table>
                    <div className="text-center mt-auto pt-3 text-xs text-yellow-600 font-semibold">ELITE TOURNAMENT</div>
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

export default MatchCalculator;
