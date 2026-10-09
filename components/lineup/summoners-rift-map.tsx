"use client";

import type { ReactNode } from "react";

import type { Rota } from "@/types/database";

/**
 * Posições (em % do container) de cada "bolinha" de lane sobre a foto do
 * Summoner's Rift (aspecto 4:3): TOP no canto superior esquerdo, JG no
 * quadrante superior-central, MID no centro, ADC/SUP na parte inferior.
 */
export const MAP_SLOTS: Record<Rota, { x: number; y: number }> = {
  TOP: { x: 18, y: 20 },
  JG: { x: 33, y: 40 },
  MID: { x: 50, y: 47 },
  ADC: { x: 76, y: 84 },
  SUP: { x: 86, y: 90 },
};

/** Posição da bolinha do TÉCNICO: base inferior (onde começam os jogadores). */
export const COACH_SLOT = { x: 14, y: 88 };

/**
 * Foto oficial do Summoner's Rift (baixada para `public/map/`) com as
 * bolinhas das lanes renderizadas por cima via `children`.
 */
export function SummonersRiftMap({ children }: { children?: ReactNode }) {
  return (
    <div className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-2xl border border-line shadow-[0_0_70px_-25px_rgba(216,189,142,0.28)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/map/summoners-rift.jpg"
        alt="Mapa Summoner's Rift"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/10" />

      {children}
    </div>
  );
}

