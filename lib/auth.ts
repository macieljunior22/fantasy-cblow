import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Lê o usuário e o profile do request atual (Server Components / Actions).
 * Retorna null quando não há sessão — nunca lance erro por isso.
 */
export async function getSessionProfile(): Promise<{
  user: User | null;
  profile: Profile | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: (data as Profile | null) ?? null };
}

/** Verificação explícita de admin usada pelas Server Actions do painel. */
export async function requireAdmin(): Promise<{ userId: string }> {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile?.is_admin) {
    throw new Error("Acesso negado: apenas administradores.");
  }
  return { userId: user.id };
}
