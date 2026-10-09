"use client";

import type { ReactNode } from "react";

import type { Rota } from "@/types/database";

/**
 * Posições (em % do container) de cada "bolinha" de lane sobre a foto do
 * Summoner's Rift (aspecto 4:3): TOP no canto superior esquerdo, JG no
 * quadrante superior-central, MID no centro, ADC/SUP na parte inferior.
 */
export const MAP_SLOTS: Record<Rota, { x: number; y: number }> = {
  TOP: { x: 18, y: 18 },
  JG: { x: 34, y: 34 },
  MID: { x: 52, y: 48 },
  ADC: { x: 62, y: 78 },
  SUP: { x: 78, y: 68 },
};

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

