import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LineupBuilder } from "@/components/lineup/lineup-builder";
import { MarketStatusBadge } from "@/components/market/market-status-badge";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Coach, Lineup, PlayerCblow, TeamCblow } from "@/types/database";

export const metadata: Metadata = { title: "Escalação — CBLOW Fantasy" };

async function EscalarContent() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login?next=/escalar");

  const supabase = await createClient();
  const [playersRes, coachesRes, teamsRes, marketRes] = await Promise.all([
    supabase.from("players_cblow").select("*").order("preco", { ascending: false }),
    supabase.from("coaches").select("*").order("nome"),
    supabase.from("teams_cblow").select("id, tag"),
    supabase.from("market_settings").select("market_status, rodada_atual").eq("id", 1).maybeSingle(),
  ]);

  const rodada = marketRes.data?.rodada_atual ?? 1;
  const lineupRes = await supabase
    .from("lineups")
    .select("*")
    .eq("user_id", user.id)
    .eq("rodada", rodada)
    .maybeSingle();

  const players = (playersRes.data as PlayerCblow[] | null) ?? [];
  const coaches = (coachesRes.data as Coach[] | null) ?? [];
  const teamTagById = Object.fromEntries(
    ((teamsRes.data as Pick<TeamCblow, "id" | "tag">[] | null) ?? []).map((t) => [t.id, t.tag]),
  );
  const marketOpen = marketRes.data?.market_status === "OPEN";

  return (
    <LineupBuilder
      players={players}
      coaches={coaches}
      teamTagById={teamTagById}
      budget={profile.saldo_cartoletas}
      marketOpen={marketOpen}
      existing={(lineupRes.data as Lineup | null) ?? null}
    />
  );
}

export default function EscalarPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Minha <span className="text-gold">escalação</span>
          </h1>
          <p className="mt-1 text-sm text-muted">Monte seu time com até 150 LOW Coins.</p>
        </div>
        <MarketStatusBadge initial={null} />
      </header>
      <Suspense fallback={<div className="panel h-96 animate-pulse" />}>
        <EscalarContent />
      </Suspense>
    </div>
  );
}

