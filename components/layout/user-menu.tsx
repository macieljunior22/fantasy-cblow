"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

/**
 * Menu do usuário logado: mostra LOW Coins e, ao clicar no nome, abre um dropdown
 * com atalhos (Minha escalação, Mercado, Configurações, Admin) e o botão Sair.
 */
export function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm transition-colors hover:border-gold/60"
      >
        <span className="max-w-28 truncate font-medium sm:max-w-40">
          {profile.nickname}
        </span>
        <span className="font-mono font-semibold text-gold">
          {profile.saldo_cartoletas}
        </span>
        <span className="text-xs text-muted">LOW</span>
        <svg
          viewBox="0 0 20 20"
          className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-xl shadow-black/50"
        >
          <div className="border-b border-line px-3 py-2">
            <p className="truncate text-sm font-semibold">{profile.nickname}</p>
            <p className="text-xs text-muted">
              {profile.pontos_totais} pts · {profile.saldo_cartoletas} LOW Coins
            </p>
          </div>

          <Link
            href="/escalar"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm transition-colors hover:bg-surface-2"
          >
            Minha escalação
          </Link>
          <Link
            href="/mercado"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm transition-colors hover:bg-surface-2"
          >
            Mercado de jogadores
          </Link>
          <Link
            href="/configuracoes"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm transition-colors hover:bg-surface-2"
          >
            Configurações
          </Link>
          {profile.is_admin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-gold transition-colors hover:bg-surface-2"
            >
              Painel admin
            </Link>
          )}

          <form action={signOut} className="border-t border-line">
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-surface-2"
            >
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
