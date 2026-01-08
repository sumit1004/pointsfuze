import { GameInfo } from '../types';

export const GAMES: GameInfo[] = [
  {
    id: 'free-fire',
    name: 'Free Fire',
    image: '/freefire.jpg',
    maxTeamSize: 4,
    isTeamGame: true
  },
  {
    id: 'bgmi',
    name: 'BGMI',
    image: '/bgmi.jpg',
    maxTeamSize: 4,
    isTeamGame: true
  },
  {
    id: 'valorant',
    name: 'Valorant',
    image: '/valorant.jpg',
    maxTeamSize: 5,
    isTeamGame: true
  },
  {
    id: 'call-of-duty',
    name: 'Call of Duty',
    image: '/cod.jpg',
    maxTeamSize: 4,
    isTeamGame: true
  }
];

export const DEFAULT_POSITION_POINTS = {
  1: 12,
  2: 9,
  3: 8,
  4: 7,
  5: 6,
  6: 5,
  7: 4,
  8: 3,
  9: 2,
  10: 1,
  11:0,
  12:0,
  
};

export const DEFAULT_GAME_CONFIG = {
  killPoints: 1,
  positionPoints: DEFAULT_POSITION_POINTS
};