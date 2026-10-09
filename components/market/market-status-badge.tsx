"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { MarketSettings } from "@/types/database";

/** Badge do estado do mercado, atualizada via Realtime. */
export function MarketStatusBadge({ initial }: { initial: MarketSettings | null }) {
  const [status, setStatus] = useState(initial?.market_status ?? "LOCKED");
  const [rodada, setRodada] = useState(initial?.rodada_atual ?? 1);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("market-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "market_settings" },
        (payload) => {
          const next = payload.new as MarketSettings;
          if (next.market_status) setStatus(next.market_status);
          if (next.rodada_atual) setRodada(next.rodada_atual);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isOpen = status === "OPEN";

  return (
    <span
      className={`tag ${isOpen ? "border-neon-green/50 text-neon-green" : "border-neon-yellow/50 text-neon-yellow"}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${isOpen ? "animate-pulse bg-neon-green" : "bg-neon-yellow"}`}
      />
      {isOpen ? "Mercado aberto" : "Mercado travado"} · Rodada {rodada}
    </span>
  );
}
