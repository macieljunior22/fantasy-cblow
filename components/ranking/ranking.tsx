import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

import { RankingLive } from "./ranking-live";

/**
 * Ranking inicial (server) + atualização por Supabase Realtime (client).
 * Fica atrás de <Suspense> na página — lê dados dinâmicos.
 */
export async function Ranking() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, nickname, pontos_totais, saldo_cartoletas")
    .order("pontos_totais", { ascending: false })
    .order("nickname", { ascending: true })
    .limit(50);

  return <RankingLive initial={(data as Pick<Profile, "id" | "nickname" | "pontos_totais" | "saldo_cartoletas">[]) ?? []} />;
}
