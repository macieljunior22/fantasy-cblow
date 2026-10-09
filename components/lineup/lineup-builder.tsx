"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Coins,
  Crosshair,
  Crown,
  ShieldPlus,
  Sparkles,
  Swords,
  Trees,
  Zap,
} from "lucide-react";

import { CoachMarketCard, PlayerMarketCard } from "@/components/market/market-cards";
import { COACH_SLOT, MAP_SLOTS, SummonersRiftMap } from "@/components/lineup/summoners-rift-map";
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

const ROTA_ICON: Record<Rota, typeof Swords> = {
  TOP: Swords,
  JG: Trees,
  MID: Zap,
  ADC: Crosshair,
  SUP: ShieldPlus,
};

type Active = Rota | "TEC";

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
  const [active, setActive] = useState<Active>("TOP");
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
  const [dragOver, setDragOver] = useState<Rota | null>(null);

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

  // Jogadores da rota ativa que ainda cabem no orçamento (considerando quem já
  // está na própria lane, para poder trocar sem travar no preço).
  const activeSlotBudget =
    active === "TEC"
      ? remaining
      : remaining + (picks[active] ? playerById.get(picks[active]!)?.preco ?? 0 : 0);
  const available = players.filter(
    (p) => active !== "TEC" && p.rota === active && p.preco <= activeSlotBudget,
  );

  const activeCoach = coachId ? coachById.get(coachId) : undefined;
  const activeLabel = SLOTS.find((s) => s.rota === active)?.label;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      {/* ===================== MAPA ===================== */}
      <div className="order-1">
        <SummonersRiftMap>
          {SLOTS.map(({ rota }) => {
            const pos = MAP_SLOTS[rota];
            const pickedId = picks[rota];
            const picked = pickedId ? playerById.get(pickedId) : undefined;
            const Icon = ROTA_ICON[rota];
            const isActive = active === rota;
            return (
              <button
                key={rota}
                type="button"
                disabled={!marketOpen}
                onClick={() => setActive(rota)}
                onDragOver={(e) => {
                  if (!marketOpen) return;
                  e.preventDefault();
                  setDragOver(rota);
                }}
                onDragLeave={() => setDragOver((cur) => (cur === rota ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  if (!marketOpen) return;
                  const id = e.dataTransfer.getData("text/player-id");
                  const p = id ? playerById.get(id) : undefined;
                  if (p && p.rota === rota) pickPlayer(p);
                }}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center disabled:cursor-not-allowed"
                title={picked ? `${picked.nick} — clique para trocar` : `Escolher ${rota}`}
              >
                <span
                  className={cn(
                    "relative flex h-16 w-16 items-center justify-center rounded-full border-[3px] backdrop-blur-sm transition-all sm:h-[4.5rem] sm:w-[4.5rem]",
                    isActive
                      ? "border-gold bg-gold/25 shadow-[0_0_22px_-2px_rgba(216,189,142,0.85)]"
                      : "border-foreground/70 bg-black/60 group-hover:border-gold/60",
                    dragOver === rota && "scale-110 border-live bg-live/20",
                    !picked && !isActive && "opacity-80",
                  )}
                >
                  {picked?.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={picked.foto_url}
                      alt={picked.nick}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : picked ? (
                    <span className="text-sm font-bold text-gold">
                      {picked.nick.slice(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <Icon className="h-7 w-7 text-gold" />
                  )}
                </span>
                <span
                  className={cn(
                    "mt-1 max-w-[5.5rem] truncate rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold",
                    isActive ? "text-gold" : "text-foreground/80",
                  )}
                >
                  {picked ? picked.nick : rota}
                </span>
              </button>
            );
          })}

          {/* Técnico na base (onde começam os jogadores) */}
          <button
            type="button"
            disabled={!marketOpen}
            onClick={() => setActive("TEC")}
            onDrop={(e) => {
              e.preventDefault();
              if (!marketOpen) return;
              const id = e.dataTransfer.getData("text/coach-id");
              const c = id ? coachById.get(id) : undefined;
              if (c) pickCoach(c);
            }}
            onDragOver={(e) => {
              if (marketOpen) e.preventDefault();
            }}
            style={{ left: `${COACH_SLOT.x}%`, top: `${COACH_SLOT.y}%` }}
            className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center disabled:cursor-not-allowed"
            title={activeCoach ? `${activeCoach.nome} — clique para trocar` : "Escolher Técnico"}
          >
            <span
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-full border-2 backdrop-blur-sm transition-all sm:h-16 sm:w-16",
                active === "TEC"
                  ? "border-gold bg-gold/25 shadow-[0_0_18px_-2px_rgba(216,189,142,0.75)]"
                  : "border-line bg-black/50 group-hover:border-gold/60",
              )}
            >
              <Crown className="h-6 w-6 text-gold/80" />
            </span>
            <span
              className={cn(
                "mt-1 max-w-[6rem] truncate rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold",
                active === "TEC" ? "text-gold" : "text-foreground/80",
              )}
            >
              {activeCoach ? activeCoach.nome : "Técnico"}
            </span>
          </button>
        </SummonersRiftMap>

        <p className="mt-3 text-center text-xs text-muted">
          {marketOpen
            ? "Toque numa lane no mapa para escolher, ou arraste um card da lista até a lane."
            : "O mercado está fechado — escalações bloqueadas."}
        </p>
      </div>

      {/* ========== PAINEL LATERAL: SEU TIME + OPÇÕES DA ROTA ATIVA ========== */}
      <aside className="panel order-2 flex flex-col lg:order-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Seu time</h2>
          <span
            className={cn(
              "flex items-center gap-1 font-mono text-sm font-bold",
              remaining < 0 ? "text-red-400" : "text-gold",
            )}
          >
            <Coins className="h-4 w-4" />
            {remaining.toFixed(2)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted">Restante de {budget.toFixed(2)} LOW Coins</p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={!marketOpen || saving}
            onClick={onSave}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar escalação"}
          </button>
          {existing && (
            <button
              type="button"
              disabled={!marketOpen || saving}
              onClick={onClear}
              className="btn-ghost disabled:opacity-50"
            >
              Remover escalação
            </button>
          )}
          {message && (
            <p
              className={cn(
                "text-center text-sm",
                message.ok ? "text-gold" : "text-red-400",
              )}
            >
              {message.text}
            </p>
          )}
        </div>

        {/* ---- Opções da bolinha ativa (rota clicada no mapa) ---- */}
        <div className="mt-4 border-t border-line pt-3">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-muted">
            <Sparkles className="h-4 w-4 text-gold" />
            {active === "TEC" ? "Escolha um Técnico" : `Escolha o ${activeLabel}`}
          </span>

          <div className="mt-2 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
            {active === "TEC" ? (
              coaches.map((c) => (
                <CoachMarketCard
                  key={c.id}
                  coach={c}
                  selected={coachId === c.id}
                  onSelect={marketOpen ? pickCoach : undefined}
                />
              ))
            ) : (
              <>
                {available.map((p) => (
                  <PlayerMarketCard
                    key={p.id}
                    player={p}
                    teamTag={p.team_id ? teamTagById[p.team_id] : undefined}
                    selected={picks[p.rota] === p.id}
                    disabled={!marketOpen}
                    onSelect={marketOpen ? pickPlayer : undefined}
                  />
                ))}
                {available.length === 0 && (
                  <p className="text-sm text-muted">
                    Nenhum jogador desta rota cabe no orçamento restante.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
