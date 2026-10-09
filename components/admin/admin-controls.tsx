"use client";

import { useTransition } from "react";

import { setMarketStatus, setMatchStatus } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import type { MarketStatus, Match, MatchStatus } from "@/types/database";

const STATUS_LABEL: Record<MatchStatus, string> = {
  NOT_STARTED: "Não iniciada",
  IN_PROGRESS: "Em andamento",
  PAUSED: "Pausada",
  FINISHED: "Finalizada",
};

const STATUS_STYLE: Record<MatchStatus, string> = {
  NOT_STARTED: "text-muted",
  IN_PROGRESS: "text-live",
  PAUSED: "text-warn",
  FINISHED: "text-foreground",
};

export function AdminControls({
  marketStatus,
  rodada,
  matches,
}: {
  marketStatus: MarketStatus;
  rodada: number;
  matches: Match[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      {/* Mercado */}
      <section className="panel">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold">Mercado</h2>
            <p className="text-sm text-muted">
              Rodada atual: <strong className="text-foreground">{rodada}</strong>
            </p>
          </div>
          <span
            className={cn(
              "tag",
              marketStatus === "OPEN"
                ? "border-gold/50 text-gold"
                : "border-line text-muted",
            )}
          >
            {marketStatus === "OPEN" ? "ABERTO" : "TRAVADO"}
          </span>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() =>
              setMarketStatus(marketStatus === "OPEN" ? "LOCKED" : "OPEN"),
            )
          }
          className={marketStatus === "OPEN" ? "btn-ghost" : "btn-primary"}
        >
          {marketStatus === "OPEN" ? "Travar mercado" : "Abrir mercado"}
        </button>
      </section>

      {/* Partidas */}
      <section className="panel">
        <h2 className="mb-3 font-bold">Partidas da rodada</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhuma partida criada. Insira registros na tabela{" "}
            <code className="text-gold">matches</code>.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {matches.map((match) => (
              <li
                key={match.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2"
              >
                <div className="text-sm">
                  <span className="font-semibold">#{match.id.slice(0, 8)}</span>{" "}
                  <span className="text-muted">· rodada {match.rodada}</span>{" "}
                  <span className={cn("font-medium", STATUS_STYLE[match.status])}>
                    {STATUS_LABEL[match.status]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_LABEL) as MatchStatus[])
                    .filter((s) => s !== match.status)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={pending}
                        onClick={() => startTransition(() => setMatchStatus(match.id, s))}
                        className="btn-ghost !px-2.5 !py-1 !text-xs"
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
