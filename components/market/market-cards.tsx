"use client";

import { cn } from "@/lib/utils";
import type { Coach, PlayerCblow, Rota } from "@/types/database";

const ROTA_LABEL: Record<Rota, string> = {
  TOP: "Topo",
  JG: "Caçador",
  MID: "Meio",
  ADC: "Atirador",
  SUP: "Suporte",
};

/** Card de jogador no mercado (foto, nick/tag, time, preço em LOW Coins). */
export function PlayerMarketCard({
  player,
  teamTag,
  selected,
  disabled,
  onSelect,
}: {
  player: PlayerCblow;
  teamTag?: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: (p: PlayerCblow) => void;
}) {
  const interactive = Boolean(onSelect);
  return (
    <button
      type="button"
      disabled={disabled}
      draggable={interactive && !disabled}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/player-id", player.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={interactive ? () => onSelect?.(player) : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-surface-2 p-3 text-left transition-all",
        interactive && !disabled && "cursor-grab hover:border-gold/60 hover:bg-surface active:cursor-grabbing",
        selected && "border-gold ring-1 ring-gold",
        !selected && !disabled && "border-line",
        disabled && "cursor-not-allowed opacity-40",
        !interactive && "border-line",
      )}
    >
      {player.foto_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.foto_url}
          alt={player.nick}
          className="h-9 w-9 flex-shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-surface text-muted">
          ?
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {player.nick}
          <span className="ml-1 text-[11px] text-muted">#{player.tag_line}</span>
        </p>
        <p className="text-[11px] text-muted">
          {ROTA_LABEL[player.rota]}
          {teamTag ? ` · ${teamTag}` : ""}
        </p>
      </div>
      <span className="flex-shrink-0 font-mono text-xs font-bold text-gold">
        {player.preco}
      </span>
    </button>
  );
}

/** Card de técnico no mercado. */
export function CoachMarketCard({
  coach,
  selected,
  disabled,
  onSelect,
}: {
  coach: Coach;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: (c: Coach) => void;
}) {
  const interactive = Boolean(onSelect);
  return (
    <button
      type="button"
      disabled={disabled}
      draggable={interactive && !disabled}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/coach-id", coach.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={interactive ? () => onSelect?.(coach) : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-surface-2 p-3 text-left transition-all",
        interactive && !disabled && "cursor-grab hover:border-gold/60 hover:bg-surface active:cursor-grabbing",
        selected && "border-gold ring-1 ring-gold",
        !selected && !disabled && "border-line",
        disabled && "cursor-not-allowed opacity-40",
        !interactive && "border-line",
      )}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-gold/15 text-base">
        🧑‍✈️
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{coach.nome}</p>
        <p className="text-[11px] text-muted">Técnico / Presidente</p>
      </div>
      <span className="flex-shrink-0 font-mono text-xs font-bold text-gold">
        {coach.preco}
      </span>
    </button>
  );
}
