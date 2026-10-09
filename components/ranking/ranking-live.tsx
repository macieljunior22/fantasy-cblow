"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

type Row = Pick<Profile, "id" | "nickname" | "pontos_totais" | "saldo_cartoletas">;

function sortRows(rows: Row[]): Row[] {
  return [...rows].sort(
    (a, b) =>
      b.pontos_totais - a.pontos_totais || a.nickname.localeCompare(b.nickname),
  );
}

/**
 * Ranking ao vivo: recebe o ranking inicial do server e assina mudanças em
 * `profiles` via Realtime (WebSocket) — placar atualiza sem F5.
 */
export function RankingLive({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(() => sortRows(initial));
  const [live, setLive] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("ranking-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          setRows((prev) => {
            const map = new Map(prev.map((r) => [r.id, r]));
            if (payload.eventType === "DELETE") {
              map.delete((payload.old as { id?: string }).id ?? "");
            } else {
              const next = payload.new as Row;
              map.set(next.id, next);
            }
            return sortRows([...map.values()]);
          });
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section id="ranking" className="panel">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Ranking geral</h2>
        <span className="tag">
          <span
            className={
              live
                ? "h-2 w-2 rounded-full bg-live"
                : "h-2 w-2 rounded-full bg-warn"
            }
          />
          {live ? "ao vivo" : "conectando…"}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Nenhum jogador cadastrado ainda. Seja o primeiro!
        </p>
      ) : (
        <ol className="divide-y divide-line">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-center gap-3 py-2.5">
              <span
                className={`w-8 text-center font-mono text-sm font-bold ${
                  index === 0
                    ? "text-gold"
                    : index < 3
                      ? "text-foreground/80"
                      : "text-muted"
                }`}
              >
                {index + 1}º
              </span>
              <span className="flex-1 truncate text-sm font-medium">
                {row.nickname}
              </span>
              <span className="font-mono text-sm font-bold text-gold">
                {row.pontos_totais} pts
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
