/**
 * Gera a migração de seed do CBLOW a partir da API oficial (api.cblow.xyz):
 *   1. Baixa as fotos dos jogadores (cdn.cblow.xyz) e faz upload para o
 *      Supabase Storage (bucket público "fotos").
 *   2. Gera supabase/migrations/0005_seed_cblow.sql (ids determinísticos,
 *      ON CONFLICT DO NOTHING — re-execuções seguras, preserva edições).
 *
 * Uso: npm run seed:gen   (requer .env.local preenchido)
 */
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[ERROR] NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios.");
  process.exit(1);
}

const ROLE_MAP = { top: "TOP", jungle: "JG", mid: "MID", adc: "ADC", support: "SUP" };
// Preço por posição (ajuste aqui se quiser rebalancear o mercado)
const ROLE_PRICE = { TOP: 10, JG: 11, MID: 12, ADC: 12, SUP: 9 };

const uid = (key) => {
  const hex = createHash("md5").update(key).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const esc = (s) => String(s ?? "").replaceAll("'", "''");

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function ensureBucket() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: "fotos", name: "fotos", public: true }),
  });
  if (res.ok) console.log("[INFO] Bucket 'fotos' criado.");
  else console.log(`[INFO] Bucket 'fotos' já existe ou respondeu ${res.status} (seguindo).`);
}

async function uploadPhoto(fileName, buffer) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/fotos/${fileName}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "image/webp",
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`upload ${fileName} -> ${res.status}: ${await res.text()}`);
}

function tagFromOpgg(opggUrl, fallback = "BR1") {
  const m = /-(\w+)$/.exec(opggUrl ?? "");
  return m ? m[1].toUpperCase() : fallback;
}

function teamTag(name) {
  const words = name.split(/\s+/);
  const tag =
    words.length > 1
      ? words.map((w) => w[0]).join("")
      : words[0].slice(0, 4);
  return tag.toUpperCase().slice(0, 5);
}

async function main() {
  console.log("[INFO] Buscando dados oficiais em api.cblow.xyz…");
  const [players, teams] = await Promise.all([
    getJson("https://api.cblow.xyz/players"),
    getJson("https://api.cblow.xyz/teams"),
  ]);
  console.log(`[INFO] ${players.length} jogadores, ${teams.length} times.`);

  await ensureBucket();

  // Times ---------------------------------------------------------------
  const teamRows = teams.map((t) => {
    const presidentes = (t.presidents ?? []).map((p) => p.name).join(" e ");
    return {
      id: uid(`team:${t.name}`),
      nome: t.name,
      tag: teamTag(t.name),
      presidente: presidentes || null,
      logo_url: t.logoUrl || null,
    };
  });
  const teamIdByName = new Map(teamRows.map((t) => [t.nome, t.id]));

  // Fotos + jogadores ----------------------------------------------------
  let uploaded = 0;
  let failed = 0;
  const playerRows = [];

  for (const p of players) {
    const rota = ROLE_MAP[p.role];
    if (!rota) {
      console.warn(`[WARN] Papel desconhecido '${p.role}' em ${p.nick} — usando SUP.`);
    }
    const teamName = p.team?.name;
    const teamId = teamIdByName.get(teamName);
    if (!teamId) throw new Error(`Time '${teamName}' de ${p.nick} não mapeado.`);

    let fotoUrl = p.avatarUrl ?? null;
    if (fotoUrl) {
      const fileName = `${p.slug}.webp`;
      try {
        const imgRes = await fetch(fotoUrl);
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          await uploadPhoto(fileName, buf);
          fotoUrl = `${SUPABASE_URL}/storage/v1/object/public/fotos/${fileName}`;
          uploaded++;
        } else {
          throw new Error(`cdn ${imgRes.status}`);
        }
      } catch (err) {
        failed++;
        console.warn(`[WARN] Falha na foto de ${p.nick}: ${err.message} — mantendo URL original.`);
        fotoUrl = p.avatarUrl ?? null;
      }
    }

    playerRows.push({
      id: uid(`player:${p.nick}`),
      nick: p.nick,
      tag_line: tagFromOpgg(p.opggUrl),
      rota: rota ?? "SUP",
      foto_url: fotoUrl,
      preco: ROLE_PRICE[rota] ?? 10,
      team_id: teamId,
    });
  }

  console.log(`[INFO] Fotos: ${uploaded} enviadas ao Storage, ${failed} mantidas no CDN.`);

  // SQL ------------------------------------------------------------------
  const now = new Date().toISOString();
  const teamsValues = teamRows
    .map(
      (t) =>
        `  ('${t.id}', '${esc(t.nome)}', '${esc(t.tag)}', ${t.presidente ? `'${esc(t.presidente)}'` : "NULL"}, ${t.logo_url ? `'${esc(t.logo_url)}'` : "NULL"})`,
    )
    .join(",\n");

  const playersValues = playerRows
    .map(
      (p) =>
        `  ('${p.id}', '${esc(p.nick)}', '${esc(p.tag_line)}', '${p.rota}', ${p.foto_url ? `'${esc(p.foto_url)}'` : "NULL"}, ${p.preco}.00, '${p.team_id}', true)`,
    )
    .join(",\n");

  const sql = `-- =============================================================================
-- CBLOW 0005: SEED (times + jogadores + fotos) — GERADO AUTOMATICAMENTE
-- Gerado por scripts/generate-seed.mjs a partir de https://api.cblow.xyz em ${now}
-- NÃO EDITE À MÃO: rode "npm run seed:gen" para regenerar.
-- Ids são determinísticos (md5) e o insert usa ON CONFLICT DO NOTHING,
-- então re-execuções são seguras e preservam edições manuais (preço etc.).
-- =============================================================================

insert into public.teams_cblow (id, nome, tag, presidente, preco_presidente, logo_url)
values
${teamsValues}
on conflict do nothing;

insert into public.players_cblow (id, nick, tag_line, rota, foto_url, preco, team_id, ativo)
values
${playersValues}
on conflict do nothing;
`;

  const out = new URL("../supabase/migrations/0005_seed_cblow.sql", import.meta.url);
  await writeFile(out, sql, "utf8");
  console.log(`[OK] ${teamRows.length} times e ${playerRows.length} jogadores em ${out.pathname}`);
}

await main();
