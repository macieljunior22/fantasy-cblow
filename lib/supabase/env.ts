/**
 * Leitura validada das variáveis de ambiente do Supabase.
 *
 * IMPORTANTE: os acessos a process.env PRECISAM ser LITERAIS
 * (`process.env.NEXT_PUBLIC_X`), nunca `process.env[nome]`. Só assim o
 * Turbopack consegue embutir o valor no bundle do navegador — com acesso
 * dinâmico o build passa (servidor tem o env real) mas o navegador lança
 * "Variável de ambiente ausente" na hidratação.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Variável de ambiente ausente: ${name}. ` +
        `Configure em .env.local (local) ou nas Environment Variables do Vercel.`,
    );
  }
  return value;
}

export const supabaseUrl = required(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);
export const supabaseAnonKey = required(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

export function getServiceRoleKey(): string {
  return required(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
}
