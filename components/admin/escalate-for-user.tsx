"use client";

import { useMemo, useState, useTransition } from "react";

import { adminSaveLineupForUser } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import type { Coach, Lineup, PlayerCblow, Profile, Rota } from "@/types/database";

const SLOTS: { rota: Rota; label: string }[] = [
  { rota: "TOP", label: "Topo" },
  { rota: "JG", label: "Caçador" },
  { rota: "MID", label: "Meio" },
  { rota: "ADC", label: "Atirador" },
  { rota: "SUP", label: "Suporte" },
];

/** Escala um time para qualquer usuário (bypass de mercado via service_role). */
export function EscalateForUser({
  users,
  players,
  coaches,
  lineups,
  currentRodada,
}: {
  users: Profile[];
  players: PlayerCblow[];
  coaches: Coach[];
  lineups: Lineup[];
  currentRodada: number;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [picks, setPicks] = useState<Record<Rota, string>>({
    TOP: "",
    JG: "",
    MID: "",
    ADC: "",
    SUP: "",
  });
  const [coachId, setCoachId] = useState("");

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const byRota = useMemo(
    () => ({
      TOP: players.filter((p) => p.rota === "TOP"),
      JG: players.filter((p) => p.rota === "JG"),
      MID: players.filter((p) => p.rota === "MID"),
      ADC: players.filter((p) => p.rota === "ADC"),
      SUP: players.filter((p) => p.rota === "SUP"),
    }),
    [players],
  );

  // Ao trocar de usuário, carrega a escalação existente dele na rodada atual.
  function onUserChange(id: string) {
    setUserId(id);
    setOk(false);
    setErr(null);
    const lu = lineups.find((l) => l.user_id === id && l.rodada === currentRodada);
    setPicks({
      TOP: lu?.top_id ?? "",
      JG: lu?.jg_id ?? "",
      MID: lu?.mid_id ?? "",
      ADC: lu?.adc_id ?? "",
      SUP: lu?.sup_id ?? "",
    });
    setCoachId(lu?.coach_id ?? "");
  }

  const complete =
    SLOTS.every((s) => picks[s.rota]) && coachId;

  function onSave() {
    if (!complete) {
      setErr("Preencha as 5 rotas e o técnico.");
      return;
    }
    setErr(null);
    setOk(false);
    startTransition(async () => {
      try {
        await adminSaveLineupForUser({
          userId,
          topId: picks.TOP,
          jgId: picks.JG,
          midId: picks.MID,
          adcId: picks.ADC,
          supId: picks.SUP,
          coachId,
        });
        setOk(true);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <section className="panel">
      <h2 className="mb-1 font-bold">Escalar por um usuário</h2>
      <p className="mb-4 text-sm text-muted">
        Monta (ou corrige) o time de qualquer conta na rodada {currentRodada}. Ignora as
        travas de mercado.
      </p>

      <div className="mb-4">
        <label className="mb-1 block text-xs text-muted">Usuário</label>
        <select
          value={userId}
          onChange={(e) => onUserChange(e.target.value)}
          className="input max-w-xs"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nickname}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SLOTS.map(({ rota, label }) => (
          <div key={rota}>
            <label className="mb-1 block text-xs text-muted">{label}</label>
            <select
              value={picks[rota]}
              onChange={(e) =>
                setPicks((prev) => ({ ...prev, [rota]: e.target.value }))
              }
              className="input w-full"
            >
              <option value="">— vazio —</option>
              {byRota[rota].map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nick} · {p.preco}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs text-muted">Técnico</label>
          <select
            value={coachId}
            onChange={(e) => setCoachId(e.target.value)}
            className="input w-full"
          >
            <option value="">— vazio —</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} · {c.preco}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !userId}
          onClick={onSave}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar escalação do usuário"}
        </button>
        {ok && <span className="text-sm text-gold">Escalação salva!</span>}
        {err && <span className="text-sm text-red-400">{err}</span>}
      </div>

      <p className="mt-3 text-xs text-muted">
        Custo atual:{" "}
        <span className={cn("font-mono font-bold text-gold")}>
          {(
            SLOTS.reduce((sum, s) => sum + (playerById.get(picks[s.rota])?.preco ?? 0), 0) +
            (coaches.find((c) => c.id === coachId)?.preco ?? 0)
          ).toFixed(2)}
        </span>{" "}
        LOW Coins.
      </p>
    </section>
  );
}
