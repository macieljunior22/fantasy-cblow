import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Sempre crie um novo por request — nunca compartilhe entre requisições.
 *
 * Com `cacheComponents` habilitado, qualquer página que chame `cookies()`
 * precisa ler a sessão dentro de um limite `<Suspense>`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado a partir de um Server Component: o refresh de sessão é
          // tratado pelo proxy.ts, que roda antes da resposta ser gerada.
        }
      },
    },
  });
}
