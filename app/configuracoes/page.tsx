import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { SettingsForms } from "@/components/account/settings-forms";
import { getSessionProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Configurações — CBLOW Fantasy" };

async function SettingsContent() {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) redirect("/login?next=/configuracoes");
  return <SettingsForms nickname={profile.nickname} />;
}

export default function ConfiguracoesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">
        Configura<span className="text-gold">ções</span>
      </h1>
      <Suspense fallback={<div className="panel h-64 animate-pulse" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
