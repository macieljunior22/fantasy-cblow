import Link from "next/link";

import { getSessionProfile } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const linkClass =
  "text-sm text-muted transition-colors hover:text-gold";

/** Fallback do Suspense — shell estático do header. */
export function SiteHeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <span className="font-bold tracking-tight">
          CBLOW <span className="text-gold">Fantasy</span>
        </span>
        <div className="h-8 w-24 animate-pulse rounded bg-surface-2" />
      </div>
    </header>
  );
}

export async function SiteHeader() {
  const { user, profile } = await getSessionProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-bold tracking-tight">
          CBLOW <span className="text-gold">Fantasy</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/" className={linkClass}>
            Início
          </Link>
          {profile?.is_admin && (
            <Link href="/admin" className={cn(linkClass, "text-gold")}>
              Admin
            </Link>
          )}

          {user && profile ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm sm:inline">
                <span className="text-muted">{profile.nickname}</span>{" "}
                <span className="font-semibold text-gold">
                  {profile.saldo_cartoletas}¢
                </span>
              </span>
              <form action={signOut}>
                <button type="submit" className={linkClass}>
                  Sair
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="btn-ghost">
                Entrar
              </Link>
              <Link href="/cadastro" className="btn-primary">
                Criar conta
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
