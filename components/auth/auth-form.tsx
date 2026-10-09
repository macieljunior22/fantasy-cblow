"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "cadastro";

/**
 * Formulário de autenticação (e-mail/senha + Google).
 * `redirectTo` leva o usuário de volta para /auth/callback -> destino final.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isLogin = mode === "login";

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null);
      setInfo(null);
      const supabase = createClient();
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      const nickname = String(formData.get("nickname") ?? "").trim();

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message === "Invalid login credentials"
            ? "E-mail ou senha inválidos."
            : error.message);
          return;
        }
        router.push("/inicio");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        router.push("/inicio");
        router.refresh();
      } else {
        setInfo("Conta criada! Confirme seu e-mail para entrar.");
      }
    });
  }

  function handleGoogle() {
    startTransition(async () => {
      setError(null);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
    });
  }

  return (
    <div className="panel w-full max-w-sm">
      <h1 className="mb-1 text-xl font-bold">
        {isLogin ? "Entrar" : "Criar conta"}
      </h1>
      <p className="mb-4 text-sm text-muted">
        {isLogin
          ? "Acesse sua conta para montar o time."
          : "Cadastre-se e receba 150 LOW Coins para montar seu time."}
      </p>

      <form action={handleSubmit} className="flex flex-col gap-3">
        {!isLogin && (
          <label className="flex flex-col gap-1 text-sm">
            Nickname
            <input
              name="nickname"
              required
              maxLength={24}
              placeholder="Ex.: Bronziocre"
              className="rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-gold"
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-gold"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-gold"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {info && <p className="text-sm text-live">{info}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Aguarde…" : isLogin ? "Entrar" : "Cadastrar"}
        </button>
      </form>

      <div className="my-3 flex items-center gap-2 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
      </div>

      <button type="button" onClick={handleGoogle} disabled={pending} className="btn-ghost w-full">
        Continuar com Google
      </button>

      <p className="mt-4 text-center text-sm text-muted">
        {isLogin ? (
          <>
            Não tem conta?{" "}
            <Link href="/cadastro" className="text-gold hover:underline">
              Cadastre-se
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="text-gold hover:underline">
              Entrar
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
