/**
 * Cria usuários no Supabase com e-mail JÁ CONFIRMADO (bypass do e-mail de
 * verificação) e opcionalmente como admin.
 *
 * Uso:
 *   npm run user:create -- <email> <senha> <nickname> [--admin]
 *
 * Ex.:
 *   npm run user:create -- admin@cblow.app "Cblow#Admin2026" admin --admin
 */
import { createClient } from "@supabase/supabase-js";

const [, , email, password, nickname, flag] = process.argv;
const isAdmin = flag === "--admin";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password || !nickname || !url || !key) {
  console.error("Uso: npm run user:create -- <email> <senha> <nickname> [--admin]");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

// 1. Criar (ou localizar se já existir) --------------------------------
const createRes = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({
    email,
    password,
    email_confirm: true, // já entra confirmado: login imediato
    user_metadata: { nickname },
  }),
});

let userId;
if (createRes.ok) {
  const created = await createRes.json();
  userId = created.id;
  console.log(`[OK] Usuário criado: ${email} (id ${userId})`);
} else if (createRes.status === 422) {
  // Já existe — busca na lista paginada
  const listRes = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=100`, { headers: H });
  const users = (await listRes.json()).users ?? [];
  const found = users.find((u) => u.email === email);
  if (!found) throw new Error(`E-mail já existe mas não foi localizado: ${await createRes.text()}`);
  userId = found.id;
  console.log(`[INFO] Usuário já existia: ${email} (id ${userId})`);
} else {
  throw new Error(`Falha ao criar usuário: ${createRes.status} ${await createRes.text()}`);
}

// 2. Garantir o profile (trigger cria; mas evita corrida) ---------------
const check = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}&select=id`, { headers: H });
const rows = await check.json();
if (!Array.isArray(rows) || rows.length === 0) {
  await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({
      id: userId,
      nickname,
      saldo_cartoletas: 100,
      is_admin: isAdmin,
    }),
  });
  console.log("[INFO] Profile criado manualmente.");
}

// 3. Marcar/desmarcar admin --------------------------------------------
await fetch(`${url}/rest/v1/profiles?id=eq.${userId}`, {
  method: "PATCH",
  headers: { ...H, Prefer: "return=minimal" },
  body: JSON.stringify({ is_admin: isAdmin }),
});
console.log(`[OK] is_admin = ${isAdmin} para ${email}`);

// 4. Verificar login ------------------------------------------------------
const signIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({ email, password }),
});
console.log(
  signIn.ok
    ? `[OK] Login testado com sucesso para ${email}`
    : `[ERRO] Login falhou: ${signIn.status} ${await signIn.text()}`,
);
