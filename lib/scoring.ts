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
  /** Bônus / penalidades aplicados no cálculo (antes do arredondamento). */
  winBonus: 2, // soma quando o time do jogador venceu (aplicado via SQL ao final)
  flawlessBonus: 2, // soma quando termina sem morrer (k>=1 ou a>=1, d=0)
  feedingPenalty: -3, // soma quando d >= 8 e K+A <= 2 (int deliberado)
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

/**
 * Precificação flutuante do CBLOW Fantasy (LOW Coins).
 *
 * Arquivo SEM imports (mesma regra de lib/scoring.ts): usável pelo Next.js
 * e pelos scripts Node (.mts). Toda a lógica aqui é função pura.
 *
 * Ideia central
 * ------------
 * Cada jogador tem um PREÇO-BASE por rota. Após cada partida FINALIZADA, o
 * preço se move em direção à performance recente do jogador comparada à
 * média global da rota dele:
 *
 *   media_jogador  = média ponderada (TREINO peso 0.5, OFICIAL peso 1)
 *                    da performance/min das últimas 5 partidas
 *   desvio         = (media_jogador - media_global_rota) / escala
 *   novo_preco     = clamp(preco_base_rota + K * desvio, piso_rota, teto_rota)
 *
 * A performance/min usa a MESMA fórmula de pontos (scorePlayer), dividida
 * pelos minutos da partida — assim jogo de 45min não vale mais que de 25min.
 */

export type MatchType = "TREINO" | "OFICIAL";

/** Peso de cada tipo de partida na média do jogador. */
export const MATCH_TYPE_WEIGHT: Record<MatchType, number> = {
  TREINO: 0.5,
  OFICIAL: 1,
};

/** Preço-base, piso e teto por rota (LOW Coins). Soma dos 6 ≈ 60-70. */
export const PRICE_BASE: Record<string, { base: number; min: number; max: number }> = {
  TOP: { base: 10, min: 6, max: 16 },
  JG: { base: 11, min: 6, max: 17 },
  MID: { base: 12, min: 7, max: 18 },
  ADC: { base: 12, min: 7, max: 18 },
  SUP: { base: 9, min: 5, max: 15 },
};

/** Sensibilidade: quantos LOW Coins cada ponto de desvio move o preço. */
export const PRICE_K = 0.8;

/** Escala do desvio (pontos/min típicos variam ~±1.5 ao redor da média). */
export const PRICE_SCALE = 1.5;

/** Janela: últimas N partidas com peso contam para a média. */
export const PRICE_WINDOW = 5;

export interface PriceSample {
  pontos: number; // pontos totais da partida (scorePlayer)
  minutos: number; // duração em minutos (>= 1)
  tipo: MatchType; // TREINO pesa metade
}

export function performancePerMinute(sample: PriceSample): number {
  const minutos = Math.max(1, sample.minutos);
  return sample.pontos / minutos;
}

/**
 * Média ponderada da performance/min nas últimas PRICE_WINDOW partidas
 * (mais recentes por último no array). Retorna null se não há amostras.
 */
export function playerAverage(samples: PriceSample[]): number | null {
  const window = samples.slice(-PRICE_WINDOW);
  let num = 0;
  let den = 0;
  for (const s of window) {
    const w = MATCH_TYPE_WEIGHT[s.tipo] ?? 1;
    num += performancePerMinute(s) * w;
    den += w;
  }
  return den > 0 ? num / den : null;
}

/**
 * Calcula o novo preço. `mediaRota` = média global da rota (performance/min
 * de TODAS as partidas oficiais da rota). Sem histórico (null) → preço-base.
 */
export function pricePlayer(
  rota: string,
  samples: PriceSample[],
  mediaRota: number | null,
): number {
  const cfg = PRICE_BASE[rota] ?? { base: 10, min: 5, max: 16 };
  const media = playerAverage(samples);
  if (media === null || mediaRota === null) return cfg.base;
  const desvio = (media - mediaRota) / PRICE_SCALE;
  const novo = cfg.base + PRICE_K * desvio;
  return round2(Math.min(cfg.max, Math.max(cfg.min, novo)));
}

/**
 * Totais brutos vindos da Live Client API (NÃO normalizados por minuto).
 * Mantido simples: pontos acumulam ao longo da partida; a normalização
 * por minuto acontece apenas no módulo de preços (performance/min).
 */
export function scorePlayer(stats: PlayerRawStats): number {
  let total =
    stats.kills * PLAYER_SCORING.kill +
    stats.deaths * PLAYER_SCORING.death +
    stats.assists * PLAYER_SCORING.assist +
    stats.cs * PLAYER_SCORING.cs +
    stats.visionScore * PLAYER_SCORING.visionScore;

  // Flawless: participou de abates e não morreu nenhuma vez.
  if (stats.deaths === 0 && stats.kills + stats.assists > 0) {
    total += PLAYER_SCORING.flawlessBonus;
  }
  // Feeding: morreu muito e quase não participou (anti-farm de pontos).
  if (stats.deaths >= 8 && stats.kills + stats.assists <= 2) {
    total += PLAYER_SCORING.feedingPenalty;
  }
  // NOTA: o bônus de vitória (+2) é aplicado via SQL em
  // refresh_round_points, porque o vencedor só é conhecido quando o
  // admin marca — o script ao vivo não sabe quem venceu ainda.
  return round2(total);
}

export function scoreTeam(stats: TeamRawStats): number {
  return round2(
    stats.torres * TEAM_SCORING.torre +
      stats.dragoes * TEAM_SCORING.dragao +
      stats.baroes * TEAM_SCORING.barao +
      (stats.venceu ? TEAM_SCORING.vitoria : 0),
  );
}
