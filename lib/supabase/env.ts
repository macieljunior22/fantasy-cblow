/**
 * Leitura validada das variáveis de ambiente do Supabase.
 * Falha cedo e com mensagem clara quando o .env.local não foi preenchido.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Copie .env.example para .env.local e preencha.`,
    );
  }
  return value;
}

export const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
export const supabaseAnonKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");

export function getServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY");
}
