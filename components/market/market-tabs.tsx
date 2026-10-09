"use client";

import { useState } from "react";

import { CoachMarketCard, PlayerMarketCard } from "@/components/market/market-cards";
import { cn } from "@/lib/utils";
import type { Coach, PlayerCblow, Rota } from "@/types/database";

const ROTAS: { key: Rota; label: string }[] = [
  { key: "TOP", label: "Topo" },
  { key: "JG", label: "Caçador" },
  { key: "MID", label: "Meio" },
  { key: "ADC", label: "Atirador" },
  { key: "SUP", label: "Suporte" },
];

type Tab = Rota | "TEC";

export function MarketTabs({
  players,
  coaches,
  teamTagById,
}: {
  players: PlayerCblow[];
  coaches: Coach[];
  teamTagById: Record<string, string>;
}) {
  const [tab, setTab] = useState<Tab>("TOP");

  const tabs: { key: Tab; label: string; count: number }[] = [
    ...ROTAS.map((r) => ({
      key: r.key as Tab,
      label: r.label,
      count: players.filter((p) => p.rota === r.key).length,
    })),
    { key: "TEC", label: "Técnicos", count: coaches.length },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              tab === t.key
                ? "border-gold bg-gold/15 text-gold"
                : "border-line text-muted hover:border-gold/50",
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "TEC" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((c) => (
            <CoachMarketCard key={c.id} coach={c} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {players
            .filter((p) => p.rota === tab)
            .map((p) => (
              <PlayerMarketCard
                key={p.id}
                player={p}
                teamTag={p.team_id ? teamTagById[p.team_id] : undefined}
              />
            ))}
        </div>
      )}
    </div>
  );
}
