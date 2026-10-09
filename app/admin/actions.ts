"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  MATCH_TYPE_WEIGHT,
  PRICE_BASE,
  PRICE_K,
  PRICE_SCALE,
  PRICE_WINDOW,
} from "@/lib/scoring";
import type { LogLevel, MarketStatus, MatchStatus, MatchType } from "@/types/database";

async function writeLog(level: LogLevel, message: string, payload?: object) {
  // best-effort: falha de log não deve derrubar a ação do admin
  try {
    const supabase = await createClient();
    await supabase.from("system_logs").insert({
      level,
      source: "admin",
      message,
      payload: payload ?? null,
    });
  } catch {
    // ignora
  }
}

/** Trava/abre o mercado de escalações. */
export async function setMarketStatus(status: MarketStatus) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("market_settings")
    .update({ market_status: status })
    .eq("id", 1);
  if (error) throw new Error(`Falha ao alterar mercado: ${error.message}`);

  await writeLog(
    "INFO",
    status === "OPEN" ? "Mercado ABERTO pelo admin" : "Mercado TRAVADO pelo admin",
  );
  revalidatePath("/", "layout");
}

/** Muda o status de uma partida (override manual do fluxo do script). */
export async function setMatchStatus(matchId: string, status: MatchStatus) {
  await requireAdmin();
  const supabase = await createClient();

  const patch: Record<string, unknown> = { status };
  if (status === "IN_PROGRESS") patch.started_at = new Date().toISOString();
  if (status === "FINISHED") patch.finished_at = new Date().toISOString();

  const { error } = await supabase
    .from("matches")
    .update(patch)
    .eq("id", matchId);
  if (error) throw new Error(`Falha ao alterar partida: ${error.message}`);

  await writeLog("INFO", `Status da partida ${matchId} alterado para ${status}`, {
    matchId,
    status,
  });
  revalidatePath("/admin");
}

/**
 * Override manual de pontos de um jogador numa partida (remakes, falhas de API).
 * `points = null` limpa o override e volta ao cálculo automático.
 */
export async function overridePlayerPoints(input: {
  matchId: string;
  playerId: string;
  points: number | null;
  reason?: string;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("matches_live_stats")
    .update({
      pontos_override: input.points,
      override_reason: input.reason ?? null,
    })
    .eq("match_id", input.matchId)
    .eq("player_id", input.playerId);
  if (error) throw new Error(`Falha no override: ${error.message}`);

  await writeLog(
    "WARN",
    `Override manual de pontos: jogador ${input.playerId} = ${input.points ?? "auto"}`,
    input as unknown as object,
  );
  revalidatePath("/admin");
}

/** Avança a rodada atual do campeonato. */
export async function setRodada(rodada: number) {
  await requireAdmin();
  if (!Number.isInteger(rodada) || rodada < 1) {
    throw new Error("Rodada inválida.");
  }
  const supabase = await createClient();

  const { error } = await supabase
    .from("market_settings")
    .update({ rodada_atual: rodada })
    .eq("id", 1);
  if (error) throw new Error(`Falha ao mudar rodada: ${error.message}`);

  await writeLog("WARN", `Rodada atual alterada para ${rodada}`);
  revalidatePath("/", "layout");
  revalidatePath("/admin");
}

/** Define (ou limpa) o time vencedor de uma partida. */
export async function setMatchWinner(matchId: string, winnerTeamId: string | null) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("matches")
    .update({ winner_team_id: winnerTeamId })
    .eq("id", matchId);
  if (error) throw new Error(`Falha ao definir vencedor: ${error.message}`);

  await writeLog("INFO", `Vencedor da partida ${matchId} = ${winnerTeamId ?? "limpo"}`, {
    matchId,
    winnerTeamId,
  });
  revalidatePath("/admin");
}

/** Cria uma nova partida (confronto) numa rodada. */
export async function createMatch(input: {
  rodada: number;
  matchType?: MatchType;
  blueTeamId: string | null;
  redTeamId: string | null;
  scheduledAt?: string | null;
}) {
  await requireAdmin();
  if (!Number.isInteger(input.rodada) || input.rodada < 1) {
    throw new Error("Rodada inválida.");
  }
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matches")
    .insert({
      rodada: input.rodada,
      blue_team_id: input.blueTeamId,
      red_team_id: input.redTeamId,
    match_type: input.matchType ?? "OFICIAL",
      scheduled_at: input.scheduledAt ?? null,
      status: "NOT_STARTED",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar partida: ${error.message}`);

  await writeLog("INFO", `Partida criada (rodada ${input.rodada})`, {
    matchId: data.id,
    blue: input.blueTeamId,
    red: input.redTeamId,
  });
  revalidatePath("/admin");
  return data.id as string;
}

/** Exclui uma partida (e, em cascata, suas estatísticas). */
export async function deleteMatch(matchId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) throw new Error(`Falha ao excluir partida: ${error.message}`);

  await writeLog("WARN", `Partida ${matchId} excluída pelo admin`);
  revalidatePath("/admin");
}

/**
 * Override manual de pontos de um TIME (técnico) numa partida.
 * `points = null` limpa o override e volta ao cálculo automático.
 */
export async function overrideTeamPoints(input: {
  matchId: string;
  teamId: string;
  points: number | null;
  reason?: string;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("matches_team_stats")
    .update({
      pontos_override: input.points,
      override_reason: input.reason ?? null,
    })
    .eq("match_id", input.matchId)
    .eq("team_id", input.teamId);
  if (error) throw new Error(`Falha no override de time: ${error.message}`);

  await writeLog(
    "WARN",
    `Override manual de pontos: time ${input.teamId} = ${input.points ?? "auto"}`,
    input as unknown as object,
  );
  revalidatePath("/admin");
}

/** Promove ou rebaixa um usuário a administrador. */
export async function setUserAdmin(userId: string, isAdmin: boolean) {
  const { userId: actorId } = await requireAdmin();
  if (actorId === userId && !isAdmin) {
    throw new Error("Você não pode remover o seu próprio admin.");
  }
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId);
  if (error) throw new Error(`Falha ao alterar admin: ${error.message}`);

  await writeLog("WARN", `is_admin = ${isAdmin} para o usuário ${userId}`);
  revalidatePath("/admin");
}

/** Ajusta o saldo de LOW Coins de um usuário (bonificação ou correção). */
export async function setUserBalance(userId: string, saldo: number) {
  await requireAdmin();
  if (!Number.isFinite(saldo) || saldo < 0) {
    throw new Error("Saldo inválido.");
  }
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ saldo_cartoletas: saldo })
    .eq("id", userId);
  if (error) throw new Error(`Falha ao ajustar saldo: ${error.message}`);

  await writeLog("WARN", `Saldo do usuário ${userId} ajustado para ${saldo}`);
  revalidatePath("/admin");
}

/**
 * Escala um time para QUALQUER usuário (ignora as travas de mercado do trigger,
 * pois roda com service_role). Usado para correções e para escalar a pedido.
 */
export async function adminSaveLineupForUser(input: {
  userId: string;
  topId: string;
  jgId: string;
  midId: string;
  adcId: string;
  supId: string;
  coachId: string;
}) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: market } = await supabase
    .from("market_settings")
    .select("rodada_atual")
    .eq("id", 1)
    .maybeSingle();
  const rodada = market?.rodada_atual ?? 1;

  const base = {
    top_id: input.topId,
    jg_id: input.jgId,
    mid_id: input.midId,
    adc_id: input.adcId,
    sup_id: input.supId,
    coach_id: input.coachId,
    rodada,
  };

  const { data: existing } = await supabase
    .from("lineups")
    .select("id")
    .eq("user_id", input.userId)
    .eq("rodada", rodada)
    .maybeSingle();

  const query = existing
    ? supabase.from("lineups").update(base).eq("id", existing.id)
    : supabase.from("lineups").insert({ ...base, user_id: input.userId });

  const { error } = await query;
  if (error) throw new Error(`Falha ao escalar pelo admin: ${error.message}`);

  await writeLog("WARN", `Escalação do usuário ${input.userId} alterada pelo admin`, {
    userId: input.userId,
    rodada,
  });
  revalidatePath("/admin");
}

export interface PricePreviewRow {
  playerId: string;
  nick: string;
  rota: string;
  precoAtual: number;
  mediaJogador: number | null;
  mediaRota: number | null;
  precoNovo: number;
  partidas: number;
}

function perMinute(pontos: number, minutos: number): number {
  return pontos / Math.max(1, minutos);
}

/**
 * Recalcula os precos a partir das partidas FINALIZADAS.
 * TREINO pesa 0.5 e calibra sem pontuar; OFICIAL pesa 1.
 * apply=false: so simula. apply=true: grava preco + historico.
 */
export async function recalculatePrices(apply: boolean): Promise<PricePreviewRow[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: players }, { data: matches }, { data: stats }] = await Promise.all([
    supabase.from("players_cblow").select("id, nick, rota, preco"),
    supabase.from("matches").select("id, status, match_type, game_time_seconds").eq("status", "FINISHED"),
    supabase.from("matches_live_stats").select("match_id, player_id, pontos"),
  ]);
  if (!players) throw new Error("Falha ao ler jogadores.");

  const matchById = new Map(
    ((matches ?? []) as { id: string; match_type: MatchType | null; game_time_seconds: number }[]).map((m) => [m.id, m]),
  );

  const samples = new Map<string, { pontos: number; minutos: number; tipo: MatchType }[]>();
  for (const s of (stats ?? []) as { match_id: string; player_id: string; pontos: number }[]) {
    const m = matchById.get(s.match_id);
    if (!m) continue;
    const tipo: MatchType = m.match_type === "TREINO" ? "TREINO" : "OFICIAL";
    const arr = samples.get(s.player_id) ?? [];
    arr.push({ pontos: Number(s.pontos), minutos: Math.max(1, Math.round(m.game_time_seconds / 60)), tipo });
    samples.set(s.player_id, arr);
  }

  const rotaSum = new Map<string, number>();
  const rotaCount = new Map<string, number>();
  const playerById = new Map(players.map((p) => [p.id, p]));
  for (const [playerId, arr] of samples) {
    const pl = playerById.get(playerId) as { rota: string } | undefined;
    if (!pl) continue;
    for (const s of arr) {
      if (s.tipo !== "OFICIAL") continue;
      rotaSum.set(pl.rota, (rotaSum.get(pl.rota) ?? 0) + perMinute(s.pontos, s.minutos));
      rotaCount.set(pl.rota, (rotaCount.get(pl.rota) ?? 0) + 1);
    }
  }
  const mediaRota = new Map<string, number>();
  for (const [rota, sum] of rotaSum) {
    mediaRota.set(rota, sum / Math.max(1, rotaCount.get(rota) ?? 1));
  }

  const rows: PricePreviewRow[] = [];
  for (const p of players as { id: string; nick: string; rota: string; preco: number }[]) {
    const arr = (samples.get(p.id) ?? []).slice(-PRICE_WINDOW);
    let media: number | null = null;
    if (arr.length > 0) {
      let num = 0;
      let den = 0;
      for (const s of arr) {
        const w = MATCH_TYPE_WEIGHT[s.tipo] ?? 1;
        num += perMinute(s.pontos, s.minutos) * w;
        den += w;
      }
      media = num / Math.max(1e-9, den);
    }
    const mRota = mediaRota.get(p.rota) ?? null;
    const cfg = PRICE_BASE[p.rota] ?? { base: 10, min: 5, max: 16 };
    let novo = cfg.base;
    if (media !== null && mRota !== null) {
      novo = Math.round(Math.min(cfg.max, Math.max(cfg.min, cfg.base + PRICE_K * ((media - mRota) / PRICE_SCALE))) * 100) / 100;
    }
    rows.push({
      playerId: p.id,
      nick: p.nick,
      rota: p.rota,
      precoAtual: Number(p.preco),
      mediaJogador: media === null ? null : Math.round(media * 100) / 100,
      mediaRota: mRota === null ? null : Math.round(mRota * 100) / 100,
      precoNovo: novo,
      partidas: arr.length,
    });
  }

  rows.sort((a, b) => b.precoNovo - b.precoAtual - (a.precoNovo - a.precoAtual));

  if (apply) {
    const changed = rows.filter((r) => r.precoNovo !== r.precoAtual && r.partidas > 0);
    for (const r of changed) {
      const { error } = await supabase.from("players_cblow").update({ preco: r.precoNovo }).eq("id", r.playerId);
      if (error) throw new Error("Falha ao aplicar preco de " + r.nick + ": " + error.message);
      await supabase.from("player_price_history").insert({
        player_id: r.playerId,
        preco_antigo: r.precoAtual,
        preco_novo: r.precoNovo,
        motivo: "recalculo",
      });
    }
    await writeLog("WARN", "Precos recalculados e aplicados (" + changed.length + " jogadores)");
    revalidatePath("/admin");
    revalidatePath("/mercado");
    revalidatePath("/escalar");
  }

  return rows;
}

/** Exclui um usuário (conta de auth + profile em cascata) pela Admin API. */
export async function deleteUser(userId: string) {
  const { userId: actorId } = await requireAdmin();
  if (actorId === userId) {
    throw new Error("Você não pode excluir a sua própria conta.");
  }
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Falha ao excluir usuário: ${error.message}`);

  await writeLog("WARN", `Usuário ${userId} excluído pelo admin`);
  revalidatePath("/admin");
}
