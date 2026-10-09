import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Criar conta — CBLOW Fantasy" };

export default function CadastroPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <AuthForm mode="cadastro" />
    </div>
  );
}
