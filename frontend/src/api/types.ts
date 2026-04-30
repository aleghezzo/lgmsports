export type GenderId = 1 | 2;

export interface CurrentUser {
  id: number;
  username: string;
  roleId: number;
  playerId: number;
}

export interface Player {
  id: number;
  nickName: string;
  genderId: GenderId | null;
  hasInmunity: 0 | 1;
  levelId: number | null;
}

export interface GameType {
  id: number;
  name: string;
  teamsAmount: number;
  amountByGender: Record<string, number>;
}

export interface Team {
  id: number;
  name: string;
  players: Player[];
}

export type GameStatus = 0 | 1 | 3;

export interface Game {
  id: number;
  date: string;
  type: GameType;
  status: GameStatus;
  teams: Team[];
  teamless: Player[];
}

export interface AdminQueryResult {
  status: "success";
  message: unknown;
}

export interface GenderOption {
  id: GenderId;
  name: string;
  pluralName: string;
}

export const GENDERS: readonly GenderOption[] = [
  { id: 2, name: "Hombre", pluralName: "Hombres" },
  { id: 1, name: "Mujer", pluralName: "Mujeres" },
] as const;

export const GAME_TYPE_OPTIONS = [
  { id: 10, name: "Fútbol 5 vs 5 (3 canchas)" },
  { id: 2, name: "Fútbol 5 vs 5 (2 canchas)" },
  { id: 1, name: "Fútbol 5 vs 5 (1 cancha)" },
  { id: 3, name: "Tenis 1 vs 1" },
  { id: 4, name: "Tenis 2 vs 2" },
] as const;

export const SKILL_OPTIONS = [
  { id: 1, name: "Crack" },
  { id: 2, name: "Juego" },
  { id: 3, name: "Hasta ahí" },
  { id: 4, name: "NS/NC" },
] as const;


