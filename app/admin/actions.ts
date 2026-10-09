"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LogLevel, MarketStatus, MatchStatus } from "@/types/database";

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
