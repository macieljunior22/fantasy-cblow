"use server";

import { revalidatePath } from "next/cache";

import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Lineup } from "@/types/database";

export interface LineupInput {
  top_id: string;
  jg_id: string;
  mid_id: string;
  adc_id: string;
  sup_id: string;
  coach_id: string;
}

export type SaveLineupResult =
  | { ok: true; lineup: Lineup }
  | { ok: false; error: string };

/**
 * Cria (ou atualiza) a escalação do usuário na rodada atual do mercado.
 *
 * A validação pesada (rota correta, sem repetidos, orçamento) é feita pelo
 * trigger `lineups_guard` no banco; aqui só garantimos sessão + mercado aberto
 * e traduzimos os erros do Postgres em mensagens amigáveis.
 */
export async function saveLineup(input: LineupInput): Promise<SaveLineupResult> {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) {
    return { ok: false, error: "Você precisa estar logado para escalar." };
  }

  const supabase = await createClient();

  const { data: market } = await supabase
    .from("market_settings")
    .select("market_status, rodada_atual")
    .eq("id", 1)
    .maybeSingle();

  if (!market || market.market_status !== "OPEN") {
    return { ok: false, error: "O mercado está fechado. Aguarde a abertura da rodada." };
  }

  const rodada = market.rodada_atual;

  const { data: existing } = await supabase
    .from("lineups")
    .select("id")
    .eq("user_id", user.id)
    .eq("rodada", rodada)
    .maybeSingle();

  const base = { ...input, rodada };

  const query = existing
    ? supabase.from("lineups").update(base).eq("id", existing.id).select("*").single()
    : supabase.from("lineups").insert({ ...base, user_id: user.id }).select("*").single();

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: friendlyLineupError(error.message) };
  }

  revalidatePath("/escalar");
  revalidatePath("/");
  return { ok: true, lineup: data as Lineup };
}

/** Remove a escalação da rodada atual (libera para montar de novo). */
export async function deleteLineup(): Promise<SaveLineupResult> {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) {
    return { ok: false, error: "Você precisa estar logado." };
  }

  const supabase = await createClient();
  const { data: market } = await supabase
    .from("market_settings")
    .select("market_status, rodada_atual")
    .eq("id", 1)
    .maybeSingle();

  if (!market || market.market_status !== "OPEN") {
    return { ok: false, error: "O mercado está fechado." };
  }

  const { error } = await supabase
    .from("lineups")
    .delete()
    .eq("user_id", user.id)
    .eq("rodada", market.rodada_atual);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/escalar");
  revalidatePath("/");
  return { ok: true, lineup: null as unknown as Lineup };
}

function friendlyLineupError(message: string): string {
  if (message.includes("jogadores repetidos")) {
    return "Você escalou o mesmo jogador em duas posições.";
  }
  if (message.includes("deve ocupar a sua rota")) {
    return "Cada jogador precisa estar na sua rota correta.";
  }
  if (message.includes("Orçamento insuficiente")) {
    return "Orçamento insuficiente: o time passa dos seus LOW Coins.";
  }
  if (message.includes("row-level security")) {
    return "Mercado fechado ou rodada inválida para escalar.";
  }
  return message;
}
