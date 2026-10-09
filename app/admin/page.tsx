import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminControls } from "@/components/admin/admin-controls";
import { EscalateForUser } from "@/components/admin/escalate-for-user";
import { LogsConsole } from "@/components/admin/logs-console";
import { PointsOverride } from "@/components/admin/points-override";
import { UsersManager } from "@/components/admin/users-manager";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  Coach,
  Lineup,
  MarketSettings,
  Match,
  MatchLiveStats,
  MatchTeamStats,
  PlayerCblow,
  Profile,
  SystemLog,
  TeamCblow,
} from "@/types/database";

export const metadata: Metadata = { title: "Admin — CBLOW Fantasy" };

async function AdminDashboard() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile?.is_admin) {
    redirect("/login?next=/admin");
  }

  const supabase = await createClient();

  const [
    marketRes,
    matchesRes,
    logsRes,
    teamsRes,
    playersRes,
    coachesRes,
    profilesRes,
    lineupsRes,
    playerStatsRes,
    teamStatsRes,
  ] = await Promise.all([
    supabase.from("market_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("matches").select("*").order("rodada", { ascending: false }).limit(30),
    supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("teams_cblow").select("*").order("nome"),
    supabase.from("players_cblow").select("*").order("nick"),
    supabase.from("coaches").select("*").order("nome"),
    supabase.from("profiles").select("*").order("nickname"),
    supabase.from("lineups").select("*").order("updated_at", { ascending: false }).limit(200),
    supabase.from("matches_live_stats").select("*").limit(500),
    supabase.from("matches_team_stats").select("*").limit(500),
  ]);

  const market = marketRes.data as MarketSettings | null;
  const matches = (matchesRes.data as Match[] | null) ?? [];
  const teams = (teamsRes.data as TeamCblow[] | null) ?? [];
  const players = (playersRes.data as PlayerCblow[] | null) ?? [];
  const coaches = (coachesRes.data as Coach[] | null) ?? [];
  const profiles = (profilesRes.data as Profile[] | null) ?? [];
  const lineups = (lineupsRes.data as Lineup[] | null) ?? [];
  const playerStats = (playerStatsRes.data as MatchLiveStats[] | null) ?? [];
  const teamStats = (teamStatsRes.data as MatchTeamStats[] | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <AdminControls
        marketStatus={market?.market_status ?? "LOCKED"}
        rodada={market?.rodada_atual ?? 1}
        matches={matches}
        teams={teams}
      />

      <PointsOverride
        matches={matches}
        players={players}
        teams={teams}
        playerStats={playerStats}
        teamStats={teamStats}
      />

      <EscalateForUser
        users={profiles}
        players={players}
        coaches={coaches}
        lineups={lineups}
        currentRodada={market?.rodada_atual ?? 1}
      />

      <UsersManager users={profiles} currentUserId={user.id} />

      <LogsConsole initial={(logsRes.data as SystemLog[] | null) ?? []} />
    </div>
  );
}


function DashboardFallback() {
  return (
    <div className="flex flex-col gap-6">
      <div className="panel h-40 animate-pulse" />
      <div className="panel h-72 animate-pulse" />
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-extrabold">
        Painel <span className="text-gold">Admin</span>
      </h1>
      <Suspense fallback={<DashboardFallback />}>
        <AdminDashboard />
      </Suspense>
    </div>
  );
}
