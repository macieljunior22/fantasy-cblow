import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminControls } from "@/components/admin/admin-controls";
import { LogsConsole } from "@/components/admin/logs-console";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MarketSettings, Match, SystemLog } from "@/types/database";

export const metadata: Metadata = { title: "Admin — CBLOW Fantasy" };

async function AdminDashboard() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile?.is_admin) {
    redirect("/login?next=/admin");
  }

  const supabase = await createClient();

  const [marketRes, matchesRes, logsRes] = await Promise.all([
    supabase.from("market_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("matches").select("*").order("rodada", { ascending: false }).limit(20),
    supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(200),
  ]);

  const market = marketRes.data as MarketSettings | null;

  return (
    <div className="flex flex-col gap-6">
      <AdminControls
        marketStatus={market?.market_status ?? "LOCKED"}
        rodada={market?.rodada_atual ?? 1}
        matches={(matchesRes.data as Match[] | null) ?? []}
      />
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
