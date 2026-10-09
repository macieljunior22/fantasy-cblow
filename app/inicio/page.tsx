import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { MarketStatusBadge } from "@/components/market/market-status-badge";
import { RankingLive } from "@/components/ranking/ranking-live";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Match, MarketSettings, PlayerCblow, TeamCblow } from "@/types/database";

export const metadata: Metadata = { title: "Início — CBLOW Fantasy" };

async function MarketBadge() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("market_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return <MarketStatusBadge initial={(data as MarketSettings | null) ?? null} />;
}

function statusLabel(status: Match["status"]): string {
  return {
    NOT_STARTED: "Não iniciada",
    IN_PROGRESS: "Em andamento",
    PAUSED: "Pausada",
    FINISHED: "Finalizada",
  }[status];
}

async function Dashboard() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login?next=/inicio");

  const supabase = await createClient();
  const [matchesRes, teamsRes, playersRes, coachesRes, lineupRes, rankRes] = await Promise.all([
    supabase.from("matches").select("*").order("rodada", { ascending: false }).limit(6),
    supabase.from("teams_cblow").select("*").order("nome"),
    supabase.from("players_cblow").select("*").order("preco", { ascending: false }).limit(5),
    supabase.from("coaches").select("*").order("nome"),
    supabase.from("lineups").select("*").eq("user_id", user.id).order("rodada", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("profiles").select("id, nickname, pontos_totais, saldo_cartoletas").order("pontos_totais", { ascending: false }).limit(10),
  ]);

  const matches = (matchesRes.data as Match[] | null) ?? [];
  const teams = (teamsRes.data as TeamCblow[] | null) ?? [];
  const topPlayers = (playersRes.data as PlayerCblow[] | null) ?? [];
  const coaches = (coachesRes.data as { id: string; nome: string }[] | null) ?? [];
  const myLineup = lineupRes.data;
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="mb-8 flex flex-col gap-4">
        <Suspense fallback={<span className="tag">Carregando mercado…</span>}>
          <MarketBadge />
        </Suspense>
        <h1 className="text-3xl font-extrabold tracking-tight">
          E aí, <span className="text-gold">{profile.nickname}</span>!
        </h1>
        <dl className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="panel py-3 text-center">
            <dt className="text-2xl font-extrabold text-gold">{profile.saldo_cartoletas}</dt>
            <dd className="text-xs text-muted">LOW Coins</dd>
          </div>
          <div className="panel py-3 text-center">
            <dt className="text-2xl font-extrabold">{profile.pontos_totais}</dt>
            <dd className="text-xs text-muted">Pontos totais</dd>
          </div>
          <div className="panel py-3 text-center">
            <dt className="text-2xl font-extrabold">{teams.length}</dt>
            <dd className="text-xs text-muted">Times</dd>
          </div>
          <div className="panel py-3 text-center">
            <dt className="text-2xl font-extrabold">{coaches.length}</dt>
            <dd className="text-xs text-muted">Técnicos</dd>
          </div>
        </dl>
      </section>

      <section className="panel mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Minha escalação</h2>
          <Link href="/escalar" className="btn-primary !py-1.5 !text-xs">
            {myLineup ? "Editar escalação" : "Montar time"}
          </Link>
        </div>
        {myLineup ? (
          <p className="text-sm text-muted">
            Rodada {myLineup.rodada} ·{" "}
            <strong className="text-gold">{myLineup.pontos_rodada} pts</strong>
          </p>
        ) : (
          <p className="text-sm text-muted">
            Você ainda não escalou nesta rodada.{" "}
            <Link href="/escalar" className="text-gold hover:underline">Monte seu time</Link>.
          </p>
        )}
      </section>
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="panel">
          <h2 className="mb-3 text-lg font-bold">Partidas</h2>
          {matches.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma partida cadastrada ainda.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {matches.map((m) => {
                const blue = m.blue_team_id ? teamById.get(m.blue_team_id) : null;
                const red = m.red_team_id ? teamById.get(m.red_team_id) : null;
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
                    <span className="font-medium">{blue?.tag ?? "?"} vs {red?.tag ?? "?"}</span>
                    <span className="text-xs text-muted">Rodada {m.rodada} · {statusLabel(m.status)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2 className="mb-3 text-lg font-bold">Times do CBLOW</h2>
          {teams.length === 0 ? (
            <p className="text-sm text-muted">Nenhum time cadastrado.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {teams.map((t) => (
                <li key={t.id} className="flex flex-col rounded-lg border border-line bg-surface-2 px-3 py-2">
                  <span className="truncate text-sm font-semibold">{t.nome}</span>
                  <span className="text-xs text-muted">{t.presidente}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2 className="mb-3 text-lg font-bold">Destaques do mercado</h2>
          <ul className="flex flex-col gap-2">
            {topPlayers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 border-b border-line pb-2 text-sm last:border-0">
                <span className="flex items-center gap-2 truncate">
                  <span className="text-gold">[{p.rota}]</span>
                  {p.nick}
                </span>
                <span className="font-mono text-gold">{p.preco} LOW</span>
              </li>
            ))}
          </ul>
          <Link href="/mercado" className="mt-3 inline-block text-sm text-gold hover:underline">Ver mercado completo →</Link>
        </section>

        <section>
          <RankingLive initial={rankRes.data ?? []} />
        </section>
      </div>
    </div>
  );
}

export default function InicioPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-6xl px-4 py-8"><div className="panel h-96 animate-pulse" /></div>}>
      <Dashboard />
    </Suspense>
  );
}
