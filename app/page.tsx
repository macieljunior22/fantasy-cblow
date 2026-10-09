import Link from "next/link";
import { Suspense } from "react";

import { MarketStatusBadge } from "@/components/market/market-status-badge";
import { Ranking } from "@/components/ranking/ranking";
import { createClient } from "@/lib/supabase/server";
import type { MarketSettings } from "@/types/database";

async function MarketBadge() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("market_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return <MarketStatusBadge initial={(data as MarketSettings | null) ?? null} />;
}

function BadgeFallback() {
  return <span className="tag">Carregando mercado…</span>;
}

function RankingFallback() {
  return (
    <section className="panel">
      <div className="mb-3 h-6 w-40 animate-pulse rounded bg-surface-2" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-surface-2" />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Hero */}
      <section className="flex flex-col items-start gap-6 py-10 md:py-16">
        <Suspense fallback={<BadgeFallback />}>
          <MarketBadge />
        </Suspense>

        <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Monte seu time do{" "}
          <span className="text-gold [text-shadow:0_0_24px_rgb(216_189_142/0.45)]">
            CBLOW
          </span>{" "}
          e pontue com a performance real.
        </h1>

        <p className="max-w-xl text-lg text-muted">
          150 LOW Coins, 5 jogadores (Top, Jungle, Mid, ADC, Support) + um
          Técnico. Kills, assists, objetivos e vitórias viram pontos — em tempo
          real, direto do client do LoL.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/cadastro" className="btn-primary">
            Começar agora
          </Link>
          <Link href="#ranking" className="btn-ghost">
            Ver ranking
          </Link>
        </div>

        <dl className="mt-4 grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["100¢", "Cartoletas iniciais"],
            ["6", "Jogadores no time"],
            ["5", "Posições"],
            ["∞", "Diversão"],
          ].map(([value, label]) => (
            <div key={label} className="panel py-3 text-center">
              <dt className="text-2xl font-extrabold text-gold">{value}</dt>
              <dd className="text-xs text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Ranking ao vivo */}
      <div className="mx-auto w-full max-w-2xl">
        <Suspense fallback={<RankingFallback />}>
          <Ranking />
        </Suspense>
      </div>
    </div>
  );
}
