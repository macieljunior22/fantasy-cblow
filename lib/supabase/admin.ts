import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getServiceRoleKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Cliente com SUPABASE_SERVICE_ROLE_KEY — IGNORA TODAS AS RLS.
 *
 * Uso restrito:
 *  - script local de captura (scripts/live-capture);
 *  - rotas/server actions internas do admin após verificar `is_admin`.
 *
 * Nunca importe este arquivo em código de Componente de Cliente.
 */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl, getServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
