/**
 * Tipos das tabelas (espelham supabase/migrations/0001_init.sql).
 * Depois você pode gerar automaticamente com `supabase gen types typescript`.
 * Colunas numeric(…) chegam como number via PostgREST.
 */

export type MarketStatus = "OPEN" | "LOCKED";
export type Rota = "TOP" | "JG" | "MID" | "ADC" | "SUP";
export type MatchStatus = "NOT_STARTED" | "IN_PROGRESS" | "PAUSED" | "FINISHED";
export type MatchType = "TREINO" | "OFICIAL";
export type LineupStatus = "ACTIVE" | "LOCKED" | "FINISHED";
export type LogLevel = "INFO" | "WARN" | "ERROR";

export interface MarketSettings {
  id: number;
  market_status: MarketStatus;
  rodada_atual: number;
  updated_at: string;
}

export interface Profile {
  id: string;
  nickname: string;
  saldo_cartoletas: number;
  pontos_totais: number;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamCblow {
  id: string;
  nome: string;
  tag: string;
  logo_url: string | null;
  presidente: string | null;
  preco_presidente: number;
  created_at: string;
}

/** Técnico/Presidente individual (selecionável na escalação). */
export interface Coach {
  id: string;
  nome: string;
  team_id: string;
  foto_url: string | null;
  preco: number;
  ativo: boolean;
  created_at: string;
}

export interface PlayerCblow {
  id: string;
  nick: string;
  tag_line: string;
  puuid: string | null;
  rota: Rota;
  foto_url: string | null;
  preco: number;
  team_id: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  rodada: number;
  blue_team_id: string | null;
  red_team_id: string | null;
  status: MatchStatus;
  match_type: MatchType | null;
  winner_team_id: string | null;
  game_time_seconds: number;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchLiveStats {
  id: string;
  match_id: string;
  player_id: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  vision_score: number;
  gold: number | null;
  pontos: number;
  pontos_override: number | null;
  override_reason: string | null;
  raw: Record<string, unknown> | null;
  updated_at: string;
}

export interface MatchTeamStats {
  id: string;
  match_id: string;
  team_id: string;
  torres: number;
  dragoes: number;
  baroes: number;
  venceu: boolean;
  pontos: number;
  pontos_override: number | null;
  override_reason: string | null;
  updated_at: string;
}

export interface Lineup {
  id: string;
  user_id: string;
  rodada: number;
  top_id: string;
  jg_id: string;
  mid_id: string;
  adc_id: string;
  sup_id: string;
  coach_id: string;
  custo_total: number;
  pontos_rodada: number;
  status: LineupStatus;
  created_at: string;
  updated_at: string;
}

export interface PlayerPriceHistory {
  id: string;
  player_id: string;
  match_id: string | null;
  preco_antigo: number;
  preco_novo: number;
  motivo: string;
  created_at: string;
}

export interface SystemLog {
  id: number;
  level: LogLevel;
  source: string;
  message: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}
