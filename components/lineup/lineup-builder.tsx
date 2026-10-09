"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CoachMarketCard, PlayerMarketCard } from "@/components/market/market-cards";
import { deleteLineup, saveLineup } from "@/lib/actions/lineup";
import { cn } from "@/lib/utils";
import type { Coach, Lineup, PlayerCblow, Rota } from "@/types/database";

const SLOTS: { rota: Rota; label: string }[] = [
  { rota: "TOP", label: "Topo" },
  { rota: "JG", label: "Caçador" },
  { rota: "MID", label: "Meio" },
  { rota: "ADC", label: "Atirador" },
  { rota: "SUP", label: "Suporte" },
];

export function LineupBuilder({
  players,
  coaches,
  teamTagById,
  budget,
  marketOpen,
  existing,
}: {
  players: PlayerCblow[];
  coaches: Coach[];
  teamTagById: Record<string, string>;
  budget: number;
  marketOpen: boolean;
  existing: Lineup | null;
}) {
  const router = useRouter();
  const [active, setActive] = useState<Rota | "TEC">("TOP");
  const [picks, setPicks] = useState<Record<Rota, string | null>>({
    TOP: existing?.top_id ?? null,
    JG: existing?.jg_id ?? null,
    MID: existing?.mid_id ?? null,
    ADC: existing?.adc_id ?? null,
    SUP: existing?.sup_id ?? null,
  });
  const [coachId, setCoachId] = useState<string | null>(existing?.coach_id ?? null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const coachById = useMemo(() => new Map(coaches.map((c) => [c.id, c])), [coaches]);

  const spent = useMemo(() => {
    let sum = 0;
    for (const rota of SLOTS.map((s) => s.rota)) {
      const id = picks[rota];
      if (id) sum += playerById.get(id)?.preco ?? 0;
    }
    if (coachId) sum += coachById.get(coachId)?.preco ?? 0;
    return sum;
  }, [picks, coachId, playerById, coachById]);

  const remaining = budget - spent;
  const complete = SLOTS.every((s) => picks[s.rota]) && coachId;

  function pickPlayer(p: PlayerCblow) {
    setMessage(null);
    setPicks((prev) => ({ ...prev, [p.rota]: p.id }));
  }
  function pickCoach(c: Coach) {
    setMessage(null);
    setCoachId(c.id);
  }
  function clearSlot(rota: Rota) {
    setPicks((prev) => ({ ...prev, [rota]: null }));
  }

  async function onSave() {
    if (!complete) {
      setMessage({ ok: false, text: "Escolha as 5 rotas e um técnico." });
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await saveLineup({
      top_id: picks.TOP!,
      jg_id: picks.JG!,
      mid_id: picks.MID!,
      adc_id: picks.ADC!,
      sup_id: picks.SUP!,
      coach_id: coachId!,
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ ok: true, text: "Escalação salva com sucesso!" });
      router.refresh();
    } else {
      setMessage({ ok: false, text: res.error });
    }
  }

  async function onClear() {
    setSaving(true);
    await deleteLineup();
    setSaving(false);
    setPicks({ TOP: null, JG: null, MID: null, ADC: null, SUP: null });
    setCoachId(null);
    setMessage({ ok: true, text: "Escalação removida." });
    router.refresh();
  }

  const available = players.filter((p) =>
    active === "TEC"
      ? false
      : p.rota === active &&
        p.preco <= remaining + (picks[active] ? playerById.get(picks[active]!)?.preco ?? 0 : 0),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="flex flex-col gap-4">
        <div className="panel">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Seu time</h2>
            <span className={cn("font-mono font-bold", remaining < 0 ? "text-red-400" : "text-gold")}>
              {remaining} LOW
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {SLOTS.map(({ rota, label }) => {
              const id = picks[rota];
              const p = id ? playerById.get(id) : null;
              return (
                <li key={rota} className={cn("flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm", p ? "border-gold/40 bg-surface-2" : "border-line")}>
                  <span className="text-xs text-muted">{label}</span>
                  {p ? (
                    <button type="button" onClick={() => clearSlot(rota)} className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right" title="Remover">
                      <span className="truncate font-medium">{p.nick}</span>
                      <span className="font-mono text-xs text-gold">{p.preco}</span>
                      <span className="text-muted">×</span>
                    </button>
                  ) : (
                    <span className="text-xs text-muted">vazio</span>
                  )}
                </li>
              );
            })}
            <li className={cn("flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm", coachId ? "border-gold/40 bg-surface-2" : "border-line")}>
              <span className="text-xs text-muted">Técnico</span>
              {coachId ? (
                <button type="button" onClick={() => setCoachId(null)} className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right" title="Remover">
                  <span className="truncate font-medium">{coachById.get(coachId)?.nome}</span>
                  <span className="font-mono text-xs text-gold">{coachById.get(coachId)?.preco}</span>
                  <span className="text-muted">×</span>
                </button>
              ) : (
                <span className="text-xs text-muted">vazio</span>
              )}
            </li>
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <button type="button" disabled={!marketOpen || saving} onClick={onSave} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Salvando…" : "Salvar escalação"}
            </button>
            {existing && (
              <button type="button" disabled={!marketOpen || saving} onClick={onClear} className="btn-ghost disabled:opacity-50">
                Remover escalação
              </button>
            )}
            {!marketOpen && <p className="text-center text-xs text-warn">O mercado está fechado.</p>}
            {message && <p className={cn("text-center text-sm", message.ok ? "text-gold" : "text-red-400")}>{message.text}</p>}
          </div>
        </div>
      </aside>
      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          {SLOTS.map(({ rota, label }) => (
            <button
              key={rota}
              type="button"
              onClick={() => setActive(rota)}
              disabled={!marketOpen}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-50",
                active === rota
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-line text-muted hover:border-gold/50",
              )}
            >
              {label}
              {picks[rota] && <span className="ml-1.5 text-gold">●</span>}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActive("TEC")}
            disabled={!marketOpen}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-50",
              active === "TEC"
                ? "border-gold bg-gold/15 text-gold"
                : "border-line text-muted hover:border-gold/50",
            )}
          >
            Técnico
            {coachId && <span className="ml-1.5 text-gold">●</span>}
          </button>
        </div>

        {active === "TEC" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {coaches.map((c) => (
              <CoachMarketCard key={c.id} coach={c} selected={coachId === c.id} onSelect={pickCoach} />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {available.map((p) => (
              <PlayerMarketCard
                key={p.id}
                player={p}
                teamTag={p.team_id ? teamTagById[p.team_id] : undefined}
                selected={picks[p.rota] === p.id}
                onSelect={pickPlayer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
