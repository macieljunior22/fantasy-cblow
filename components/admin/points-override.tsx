"use client";

import { useState, useTransition } from "react";

import { overridePlayerPoints, overrideTeamPoints } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import type { Match, MatchLiveStats, MatchTeamStats, PlayerCblow, TeamCblow } from "@/types/database";

export function PointsOverride({ matches, players, teams, playerStats, teamStats }: {
  matches: Match[]; players: PlayerCblow[]; teams: TeamCblow[];
  playerStats: MatchLiveStats[]; teamStats: MatchTeamStats[];
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const playerById = Object.fromEntries(players.map((p) => [p.id, p]));
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const thisPlayerStats = playerStats.filter((s) => s.match_id === matchId);
  const thisTeamStats = teamStats.filter((s) => s.match_id === matchId);

  function act(fn: () => Promise<void>) {
    setErr(null);
    startTransition(async () => {
      try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    });
  }

  return (
    <section className="panel">
      <h2 className="mb-3 font-bold">Override manual de pontos</h2>
      {matches.length === 0 ? (
        <p className="text-sm text-muted">Crie uma partida primeiro.</p>
      ) : (
        <>
          <div className="mb-4">
            <label className="mb-1 block text-xs text-muted">Partida</label>
            <select value={matchId} onChange={(e) => setMatchId(e.target.value)} className="input max-w-md">
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  Rodada {m.rodada} - {m.blue_team_id ? teamById[m.blue_team_id]?.tag ?? "?" : "?"} vs{" "}
                  {m.red_team_id ? teamById[m.red_team_id]?.tag ?? "?" : "?"}
                </option>
              ))}
            </select>
          </div>
          {err && <p className="mb-3 text-sm text-red-400">{err}</p>}
          {thisPlayerStats.length === 0 && thisTeamStats.length === 0 ? (
            <p className="text-sm text-muted">Sem estatisticas para esta partida ainda.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {thisPlayerStats.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-muted">Jogadores</h3>
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-2 text-xs uppercase text-muted">
                        <tr>
                          <th className="px-3 py-2">Jogador</th>
                          <th className="px-3 py-2">K/D/A</th>
                          <th className="px-3 py-2">Auto</th>
                          <th className="px-3 py-2">Override</th>
                          <th className="px-3 py-2">Efetivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {thisPlayerStats.map((s) => {
                          const p = playerById[s.player_id];
                          const eff = s.pontos_override ?? s.pontos;
                          return (
                            <tr key={s.id} className="border-t border-line">
                              <td className="px-3 py-2 font-medium">{p ? p.nick : s.player_id.slice(0, 8)}</td>
                              <td className="px-3 py-2 font-mono text-xs text-muted">{s.kills}/{s.deaths}/{s.assists}</td>
                              <td className="px-3 py-2 font-mono text-xs text-muted">{Number(s.pontos).toFixed(2)}</td>
                              <td className="px-3 py-2">
                                <input type="number" step="0.01" placeholder="auto" disabled={pending}
                                  defaultValue={s.pontos_override != null ? Number(s.pontos_override).toFixed(2) : ""}
                                  onBlur={(e) => {
                                    const raw = e.target.value.trim();
                                    const val = raw === "" ? null : Number(raw);
                                    if (val !== null && !Number.isFinite(val)) return;
                                    if (val === s.pontos_override) return;
                                    act(() => overridePlayerPoints({ matchId: s.match_id, playerId: s.player_id, points: val }));
                                  }}
                                  className={cn("input w-24 !px-2 !py-1 font-mono text-xs", s.pontos_override != null && "border-gold text-gold")}
                                />
                              </td>
                              <td className="px-3 py-2 font-mono text-xs font-bold text-gold">{Number(eff).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {thisTeamStats.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-muted">Times / Tecnicos</h3>
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-2 text-xs uppercase text-muted">
                        <tr>
                          <th className="px-3 py-2">Time</th>
                          <th className="px-3 py-2">Tor/Drg/Bar</th>
                          <th className="px-3 py-2">Auto</th>
                          <th className="px-3 py-2">Override</th>
                          <th className="px-3 py-2">Efetivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {thisTeamStats.map((s) => {
                          const t = teamById[s.team_id];
                          const eff = s.pontos_override ?? s.pontos;
                          return (
                            <tr key={s.id} className="border-t border-line">
                              <td className="px-3 py-2 font-medium">{t ? t.tag : s.team_id.slice(0, 8)}</td>
                              <td className="px-3 py-2 font-mono text-xs text-muted">{s.torres}/{s.dragoes}/{s.baroes}</td>
                              <td className="px-3 py-2 font-mono text-xs text-muted">{Number(s.pontos).toFixed(2)}</td>
                              <td className="px-3 py-2">
                                <input type="number" step="0.01" placeholder="auto" disabled={pending}
                                  defaultValue={s.pontos_override != null ? Number(s.pontos_override).toFixed(2) : ""}
                                  onBlur={(e) => {
                                    const raw = e.target.value.trim();
                                    const val = raw === "" ? null : Number(raw);
                                    if (val !== null && !Number.isFinite(val)) return;
                                    if (val === s.pontos_override) return;
                                    act(() => overrideTeamPoints({ matchId: s.match_id, teamId: s.team_id, points: val }));
                                  }}
                                  className={cn("input w-24 !px-2 !py-1 font-mono text-xs", s.pontos_override != null && "border-gold text-gold")}
                                />
                              </td>
                              <td className="px-3 py-2 font-mono text-xs font-bold text-gold">{Number(eff).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
