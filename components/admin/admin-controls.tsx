"use client";

import { useState, useTransition } from "react";

import {
  createMatch,
  deleteMatch,
  setMarketStatus,
  setMatchStatus,
  setMatchWinner,
  setRodada,
} from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import type { MarketStatus, Match, MatchStatus, TeamCblow } from "@/types/database";

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
  teams,
}: {
  marketStatus: MarketStatus;
  rodada: number;
  matches: Match[];
  teams: TeamCblow[];
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [rodadaInput, setRodadaInput] = useState(String(rodada));
  const [newRodada, setNewRodada] = useState(String(rodada));
  const [newBlue, setNewBlue] = useState<string>("");
  const [newRed, setNewRed] = useState<string>("");
  const [newType, setNewType] = useState<"TREINO" | "OFICIAL">("OFICIAL");

  const teamNameById = Object.fromEntries(teams.map((t) => [t.id, t.nome]));

  function act(fn: () => Promise<void>) {
    setErr(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {err && <p className="text-sm text-red-400">{err}</p>}

      {/* Mercado + rodada */}
      <section className="panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold">Mercado</h2>
            <p className="text-sm text-muted">Controle do campeonato.</p>
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

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as "TREINO" | "OFICIAL")}
            disabled={pending}
            className="input"
            title="TREINO calibra preco sem pontuar; OFICIAL pontua"
          >
            <option value="OFICIAL">OFICIAL</option>
            <option value="TREINO">TREINO</option>
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              act(() => setMarketStatus(marketStatus === "OPEN" ? "LOCKED" : "OPEN"))
            }
            className={marketStatus === "OPEN" ? "btn-ghost" : "btn-primary"}
          >
            {marketStatus === "OPEN" ? "Travar mercado" : "Abrir mercado"}
          </button>

          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">Rodada</label>
            <input
              type="number"
              min="1"
              value={rodadaInput}
              disabled={pending}
              onChange={(e) => setRodadaInput(e.target.value)}
              className="input w-20 !px-2 !py-1 text-center font-mono"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => setRodada(Number(rodadaInput)))}
              className="btn-ghost !px-3 !py-1.5 !text-xs"
            >
              Definir rodada
            </button>
          </div>
        </div>
      </section>

      {/* Criar confronto */}
      <section className="panel">
        <h2 className="mb-3 font-bold">Criar confronto</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Rodada</label>
            <input
              type="number"
              min="1"
              value={newRodada}
              onChange={(e) => setNewRodada(e.target.value)}
              className="input w-20 !px-2 !py-1 text-center font-mono"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Azul (ORDER)</label>
            <select
              value={newBlue}
              onChange={(e) => setNewBlue(e.target.value)}
              className="input max-w-[12rem]"
            >
              <option value="">— escolher —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Vermelho (CHAOS)</label>
            <select
              value={newRed}
              onChange={(e) => setNewRed(e.target.value)}
              className="input max-w-[12rem]"
            >
              <option value="">— escolher —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const r = Number(newRodada);
              if (!Number.isInteger(r) || r < 1) {
                setErr("Rodada inválida para a partida.");
                return;
              }
              act(async () => {
                await createMatch({
                  rodada: r,
                  blueTeamId: newBlue || null,
                  redTeamId: newRed || null,
                });
                setNewBlue("");
                setNewRed("");
              });
            }}
            className="btn-primary"
          >
            Criar partida
          </button>
        </div>
      </section>

      {/* Partidas */}
      <section className="panel">
        <h2 className="mb-3 font-bold">Partidas</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma partida criada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {matches.map((match) => (
              <li
                key={match.id}
                className="rounded-lg border border-line bg-surface-2 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <span className="text-muted">rodada {match.rodada} ·</span>{" "}
                    <span className="font-semibold">
                      {match.blue_team_id ? teamNameById[match.blue_team_id] : "?"}
                    </span>{" "}
                    <span className="text-muted">vs</span>{" "}
                    <span className="font-semibold">
                      {match.red_team_id ? teamNameById[match.red_team_id] : "?"}
                    </span>{" "}
                    <span className={cn("font-medium", STATUS_STYLE[match.status])}>
                      · {STATUS_LABEL[match.status]}
                    </span>
                    <span
                      className={cn(
                        "tag",
                        (match.match_type ?? "OFICIAL") === "TREINO"
                          ? "border-warn/50 text-warn"
                          : "border-gold/50 text-gold",
                      )}
                    >
                      {(match.match_type ?? "OFICIAL") === "TREINO" ? "TREINO" : "OFICIAL"}
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
                          onClick={() => act(() => setMatchStatus(match.id, s))}
                          className="btn-ghost !px-2.5 !py-1 !text-xs"
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => act(() => deleteMatch(match.id))}
                      className="btn-ghost !border-red-500/40 !px-2.5 !py-1 !text-xs !text-red-400"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                {/* Vencedor */}
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2 text-xs">
                  <span className="text-muted">Vencedor:</span>
                  {[match.blue_team_id, match.red_team_id]
                    .filter((id): id is string => Boolean(id))
                    .map((id) => (
                      <button
                        key={id}
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          act(() =>
                            setMatchWinner(match.id, match.winner_team_id === id ? null : id),
                          )
                        }
                        className={cn(
                          "tag",
                          match.winner_team_id === id
                            ? "border-gold/50 text-gold"
                            : "border-line text-muted hover:border-gold/40",
                        )}
                      >
                        {teamNameById[id]}
                      </button>
                    ))}
                  {match.winner_team_id && (
                    <span className="text-gold">
                      → {teamNameById[match.winner_team_id] ?? "—"}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

