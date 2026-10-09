"use server";

import { revalidatePath } from "next/cache";

import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AccountResult = { ok: true } | { ok: false; error: string };

/** Atualiza o nickname exibido do usuário (coluna pública profiles.nickname). */
export async function updateNickname(nickname: string): Promise<AccountResult> {
  const clean = nickname.trim();
  if (clean.length < 1 || clean.length > 24) {
    return { ok: false, error: "O nickname deve ter entre 1 e 24 caracteres." };
  }

  const { user } = await getSessionProfile();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ nickname: clean })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Troca a senha do usuário logado.
 * O Supabase revalida a senha atual por baixo dos panos (updateUser exige sessão).
 */
export async function updatePassword(
  currentPassword: string,
  newPassword: string,
): Promise<AccountResult> {
  if (newPassword.length < 6) {
    return { ok: false, error: "A nova senha precisa de pelo menos 6 caracteres." };
  }

  const { user } = await getSessionProfile();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const supabase = await createClient();

  // Revalida a senha atual antes de permitir a troca.
  if (user.email) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) {
      return { ok: false, error: "Senha atual incorreta." };
    }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
