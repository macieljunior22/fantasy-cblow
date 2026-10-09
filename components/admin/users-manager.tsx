"use client";

import { useState, useTransition } from "react";

import { deleteUser, setUserAdmin, setUserBalance } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

export function UsersManager({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = users.filter((u) =>
    u.nickname.toLowerCase().includes(query.trim().toLowerCase()),
  );

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
    <section className="panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">
          Usuários <span className="text-muted">({users.length})</span>
        </h2>
        <input
          className="input w-full max-w-xs text-sm"
          placeholder="Buscar por nickname…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {err && <p className="mb-3 text-sm text-red-400">{err}</p>}

      <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-line">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface-2 text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Nickname</th>
              <th className="px-3 py-2">Saldo</th>
              <th className="px-3 py-2">Pontos</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <span className="font-medium">{u.nickname}</span>
                  {u.id === currentUserId && (
                    <span className="ml-1.5 text-xs text-gold">(você)</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={Number(u.saldo_cartoletas).toFixed(2)}
                    disabled={pending}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (Number.isFinite(val) && val >= 0 && val !== Number(u.saldo_cartoletas)) {
                        act(() => setUserBalance(u.id, val));
                      }
                    }}
                    className="input w-24 !px-2 !py-1 font-mono text-xs"
                  />
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted">
                  {Number(u.pontos_totais).toFixed(2)}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={pending || u.id === currentUserId}
                    onClick={() => act(() => setUserAdmin(u.id, !u.is_admin))}
                    className={cn(
                      "tag disabled:opacity-40",
                      u.is_admin ? "border-gold/50 text-gold" : "border-line text-muted",
                    )}
                    title={
                      u.id === currentUserId
                        ? "Você não pode alterar seu próprio admin"
                        : "Alternar admin"
                    }
                  >
                    {u.is_admin ? "admin" : "usuário"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={pending || u.id === currentUserId}
                    onClick={() => {
                      if (confirm(`Excluir "${u.nickname}"? Esta ação é permanente.`)) {
                        act(() => deleteUser(u.id));
                      }
                    }}
                    className="btn-ghost !border-red-500/40 !px-2.5 !py-1 !text-xs !text-red-400 disabled:opacity-40"
                    title={u.id === currentUserId ? "Você não pode se excluir" : "Excluir usuário"}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        Para <strong className="text-foreground">criar</strong> usuários com e-mail já
        confirmado, use o script:{" "}
        <code className="text-gold">npm run user:create -- email senha nick [--admin]</code>.
      </p>
    </section>
  );
}
