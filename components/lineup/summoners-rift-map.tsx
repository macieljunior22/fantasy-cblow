"use client";

import type { ReactNode } from "react";

import type { Rota } from "@/types/database";

/**
 * Posições (em % do container) de cada "bolinha" de lane sobre o mapa.
 * Vista no estilo Summoner's Rift: base azul (ORDER) no canto inferior
 * esquerdo, base vermelha (CHAOS) no canto superior direito.
 */
export const MAP_SLOTS: Record<Rota, { x: number; y: number }> = {
  TOP: { x: 15, y: 41 },
  JG: { x: 34, y: 58 },
  MID: { x: 50, y: 50 },
  ADC: { x: 57, y: 87 },
  SUP: { x: 85, y: 60 },
};

/**
 * Mapa estilizado do Summoner's Rift em SVG (tema escuro CBLOW).
 * Self-hosted e leve: nenhuma dependência externa, nenhuma arte da Riot
 * (hotlink é bloqueado). As lanes são desenhadas com coordenadas conhecidas
 * para que as bolinhas caiam exatamente sobre elas.
 */
export function SummonersRiftMap({ children }: { children?: ReactNode }) {
  return (
    <div className="relative aspect-square w-full select-none overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#0c1712] via-[#090f0d] to-[#140d07] shadow-[0_0_70px_-25px_rgba(216,189,142,0.28)]">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="rf-terrain" cx="50%" cy="50%" r="78%">
            <stop offset="0%" stopColor="#152119" />
            <stop offset="70%" stopColor="#0b120e" />
            <stop offset="100%" stopColor="#070b09" />
          </radialGradient>
          <linearGradient id="rf-river" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1b3f52" />
            <stop offset="50%" stopColor="#16414f" />
            <stop offset="100%" stopColor="#123243" />
          </linearGradient>
          <filter id="rf-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Terreno */}
        <rect x="0" y="0" width="100" height="100" fill="url(#rf-terrain)" />

        {/* Arbustos decorativos nas junglas */}
        <g fill="#1a2b1e" opacity="0.85">
          <ellipse cx="26" cy="20" rx="5" ry="3.4" />
          <ellipse cx="30" cy="72" rx="4.4" ry="3" />
          <ellipse cx="72" cy="26" rx="4.6" ry="3.2" />
          <ellipse cx="78" cy="78" rx="5" ry="3.4" />
          <ellipse cx="50" cy="24" rx="4" ry="2.6" />
          <ellipse cx="50" cy="76" rx="4" ry="2.6" />
        </g>

        {/* Rio */}
        <path
          d="M50 1 C 45 26 45 74 50 99"
          stroke="url(#rf-river)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Fossos: Barão (topo) e Dragão (fundo) */}
        <g>
          <circle cx="50" cy="11" r="5" fill="#14262f" stroke="#3a6f84" strokeWidth="0.6" />
          <circle cx="50" cy="11" r="2.4" fill="#2a5f74" opacity="0.8" />
          <circle cx="50" cy="89" r="5" fill="#14262f" stroke="#3a6f84" strokeWidth="0.6" />
          <circle cx="50" cy="89" r="2.4" fill="#2a5f74" opacity="0.8" />
        </g>

        {/* Lanes (cantos arredondados) */}
        <g
          fill="none"
          stroke="#31432f"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Top lane */}
          <path d="M20 80 L14 34 L36 14 L80 20" />
          {/* Mid lane */}
          <path d="M20 80 L80 20" />
          {/* Bot lane */}
          <path d="M20 80 L60 90 L86 58 L80 20" />
        </g>

        {/* Bases: azul (ORDER) inf-esq, vermelha (CHAOS) sup-dir */}
        <g>
          <circle cx="18" cy="82" r="11" fill="#0e2138" stroke="#3f7ad6" strokeWidth="0.8" filter="url(#rf-glow)" />
          <circle cx="18" cy="82" r="4.5" fill="#4a8ce6" opacity="0.95" />
          <circle cx="82" cy="18" r="11" fill="#3a1410" stroke="#d64f3f" strokeWidth="0.8" filter="url(#rf-glow)" />
          <circle cx="82" cy="18" r="4.5" fill="#e0574a" opacity="0.95" />
        </g>

        {/* Moldura neon fina */}
        <rect
          x="0.75"
          y="0.75"
          width="98.5"
          height="98.5"
          rx="5"
          fill="none"
          stroke="rgba(216,189,142,0.22)"
          strokeWidth="0.6"
        />
      </svg>

      {children}
    </div>
  );
}
