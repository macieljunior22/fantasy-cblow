import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Entrar — CBLOW Fantasy" };

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <AuthForm mode="login" />
    </div>
  );
}
