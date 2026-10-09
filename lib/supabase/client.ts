import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Cliente Supabase para Componentes de Cliente (browser).
 * Singleton por aba para não criar conexões desnecessárias.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
