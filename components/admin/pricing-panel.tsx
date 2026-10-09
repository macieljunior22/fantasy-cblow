"use client";

import { useState, useTransition } from "react";

import { recalculatePrices } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

interface PreviewRow {
  playerId: string;
  nick: string;
  rota: string;
  precoAtual: number;
  mediaJogador: number | null;
  mediaRota: number | null;
  precoNovo: number;
  partidas: number;
}

export function PricingPanel() {
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  function act(apply: boolean) {
    setErr(null);
    setApplied(null);
    startTransition(async () => {
      try {
        const preview = await recalculatePrices(apply);
        setRows(preview as PreviewRow[]);
        if (apply) {
          const n = preview.filter(
            (r) => r.precoNovo !== r.precoAtual && r.partidas > 0,
          ).length;
          setApplied("Precos aplicados em " + n + " jogador(es).");
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    });
  }

  const changed = (rows ?? []).filter((r) => r.precoNovo !== r.precoAtual);

  return (
    <section className="panel">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Precificacao flutuante</h2>
          <p className="text-sm text-muted">
            Simule com treinos (peso 0.5) + oficiais (peso 1) antes de aplicar.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={pending} onClick={() => act(false)} className="btn-ghost">
            Simular
          </button>
          <button
            type="button"
            disabled={pending || changed.length === 0}
            onClick={() => act(true)}
            className="btn-primary"
          >
            Aplicar precos
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}
      {applied && <p className="text-sm text-gold">{applied}</p>}
      {!rows && (
        <p className="text-sm text-muted">
          Nenhuma simulacao ainda. Treinos calibram o preco sem pontuar nas escalacoes.
        </p>
      )}

      {rows && (
        <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-2 text-muted">
              <tr>
                <th className="px-3 py-2">Jogador</th>
                <th className="px-3 py-2">Rota</th>
                <th className="px-3 py-2 text-right">Partidas</th>
                <th className="px-3 py-2 text-right">Media/min</th>
                <th className="px-3 py-2 text-right">Atual</th>
                <th className="px-3 py-2 text-right">Novo</th>
                <th className="px-3 py-2 text-right">Delta</th>
              </tr>
            </thead>
            <tbody>
              {changed.map((r) => {
                const delta = r.precoNovo - r.precoAtual;
                return (
                  <tr key={r.playerId} className="border-t border-line">
                    <td className="px-3 py-1.5 font-semibold">{r.nick}</td>
                    <td className="px-3 py-1.5 text-muted">{r.rota}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{r.partidas}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{r.mediaJogador ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{r.precoAtual.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{r.precoNovo.toFixed(2)}</td>
                    <td className={cn("px-3 py-1.5 text-right font-mono font-bold", delta > 0 ? "text-live" : "text-red-400")}>
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {changed.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-muted">
                    Sem mudancas — finalize partidas (TREINO ou OFICIAL) para calibrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
