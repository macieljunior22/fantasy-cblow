import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { MarketTabs } from "@/components/market/market-tabs";
import { createClient } from "@/lib/supabase/server";
import type { Coach, PlayerCblow, TeamCblow } from "@/types/database";

export const metadata: Metadata = { title: "Mercado — CBLOW Fantasy" };

async function MarketContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mercado");

  const [playersRes, coachesRes, teamsRes] = await Promise.all([
    supabase.from("players_cblow").select("*").order("preco", { ascending: false }),
    supabase.from("coaches").select("*").order("nome"),
    supabase.from("teams_cblow").select("id, tag"),
  ]);

  const players = (playersRes.data as PlayerCblow[] | null) ?? [];
  const coaches = (coachesRes.data as Coach[] | null) ?? [];
  const teamTagById = Object.fromEntries(
    ((teamsRes.data as Pick<TeamCblow, "id" | "tag">[] | null) ?? []).map((t) => [t.id, t.tag]),
  );

  return <MarketTabs players={players} coaches={coaches} teamTagById={teamTagById} />;
}

export default function MercadoPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Mercado de <span className="text-gold">jogadores</span>
        </h1>
        <p className="mt-1 text-sm text-muted">Confira preços e escalações.</p>
      </header>
      <Suspense fallback={<div className="panel h-96 animate-pulse" />}>
        <MarketContent />
      </Suspense>
    </div>
  );
}

