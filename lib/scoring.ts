/**
 * Fórmula de pontuação do CBLOW Fantasy.
 *
 * Arquivo SEM imports e só com sintaxe "apagável" do TypeScript, para ser usado tanto
 * pelo Next.js quanto pelo script local (Node 24 executa .ts nativamente).
 * Ajuste os pesos aqui; os dois lados passam a usar a mesma fórmula.
 */

export const PLAYER_SCORING = {
  kill: 3,
  death: -1,
  assist: 2,
  cs: 0.02,
  visionScore: 0.05,
} as const;

export const TEAM_SCORING = {
  torre: 1.5,
  dragao: 2,
  barao: 4,
  vitoria: 5,
} as const;

export interface PlayerRawStats {
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  visionScore: number;
}

export interface TeamRawStats {
  torres: number;
  dragoes: number;
  baroes: number;
  venceu: boolean;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function scorePlayer(stats: PlayerRawStats): number {
  return round2(
    stats.kills * PLAYER_SCORING.kill +
      stats.deaths * PLAYER_SCORING.death +
      stats.assists * PLAYER_SCORING.assist +
      stats.cs * PLAYER_SCORING.cs +
      stats.visionScore * PLAYER_SCORING.visionScore,
  );
}

export function scoreTeam(stats: TeamRawStats): number {
  return round2(
    stats.torres * TEAM_SCORING.torre +
      stats.dragoes * TEAM_SCORING.dragao +
      stats.baroes * TEAM_SCORING.barao +
      (stats.venceu ? TEAM_SCORING.vitoria : 0),
  );
}
