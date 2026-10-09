/**
 * CBLOW Fantasy — Script local de captura ao vivo.
 *
 * Lê a Live Client Data API do LoL (modo espectador) e envia estatísticas +
 * pontuação calculada para o Supabase via SUPABASE_SERVICE_ROLE_KEY.
 *
 * Uso (com o LoL aberto e a partida em espectador): npm run capture
 *
 * Limitações conhecidas:
 *   - Contadores de objetivos são locais ao processo (reiniciar zera a contagem;
 *     use o override manual do painel admin).
 *   - Ouro dos demais jogadores não é exposto pela API (NULL).
 *   - Vitória (venceu) não é setada automaticamente — o admin define o vencedor.
 */

import https from "node:https";

import { createClient } from "@supabase/supabase-js";

import { scorePlayer, scoreTeam } from "../../lib/scoring.ts";

// -----------------------------------------------------------------------------
// Configuração
// -----------------------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const LIVE_API =
  process.env.LOL_API_URL ?? "https://127.0.0.1:2999/liveclientdata/allgamedata";
const POLL_MS = clamp(Number(process.env.POLL_INTERVAL_MS ?? 4000), 1000, 15000);
const LATENCY_WARN_MS = Number(process.env.LATENCY_WARN_MS ?? 1500);
const MATCH_ID = process.env.MATCH_ID?.trim() || null;
const LOG_THROTTLE_MS = 60_000; // evita inundar system_logs

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "[ERROR] NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios (.env.local).",
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// -----------------------------------------------------------------------------
// Tipos da Live Client Data API (parciais)
// -----------------------------------------------------------------------------
interface LivePlayerScore {
  assists?: number;
  creepScore?: number;
  deaths?: number;
  kills?: number;
  level?: number;
  visionScore?: number;
  totalGold?: number;
}

interface LivePlayer {
  championName?: string;
  riotIdGameName?: string;
  riotIdTagLine?: string;
  summonerName?: string;
  team?: "ORDER" | "CHAOS";
  scores?: LivePlayerScore;
}

interface LiveEvent {
  EventID?: number;
  EventType?: string;
  [key: string]: unknown;
}

interface LiveClientData {
  gameData?: { gameTime?: number; gameMode?: string; mapName?: string };
  players?: LivePlayer[];
  events?: { Events?: LiveEvent[] };
}

interface DbPlayer {
  id: string;
  nick: string;
  tag_line: string;
  rota: string;
  team_id: string | null;
}

interface DbMatch {
  id: string;
  rodada: number;
  status: string;
  blue_team_id: string | null; // ORDER
  red_team_id: string | null; // CHAOS
}

// -----------------------------------------------------------------------------
// Logs (com throttling por chave)
// -----------------------------------------------------------------------------
type Level = "INFO" | "WARN" | "ERROR";
const lastLoggedAt = new Map<string, number>();

async function log(level: Level, message: string, payload?: object) {
  console.log(`[${level}] ${message}`);
  const now = Date.now();
  const key = `${level}:${message.slice(0, 80)}`;
  const last = lastLoggedAt.get(key) ?? 0;
  if (now - last < LOG_THROTTLE_MS) return;
  lastLoggedAt.set(key, now);

  try {
    await db.from("system_logs").insert({
      level,
      source: "live-capture",
      message,
      payload: payload ?? null,
    });
  } catch (err) {
    console.error("[ERROR] Falha ao gravar system_logs:", err);
  }
}

// -----------------------------------------------------------------------------
// HTTP: Live Client Data API (certificado self-signed do client do LoL)
// -----------------------------------------------------------------------------
function fetchLiveClient(): Promise<{ data: LiveClientData; latencyMs: number }> {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const req = https.get(
      LIVE_API,
      { rejectUnauthorized: false, timeout: 4000 },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          const latencyMs = Date.now() - startedAt;
          try {
            resolve({ data: JSON.parse(body) as LiveClientData, latencyMs });
          } catch {
            reject(new Error("Resposta inválida da Live Client API"));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Timeout na Live Client API")));
    req.on("error", reject);
  });
}

// -----------------------------------------------------------------------------
// Estado
// -----------------------------------------------------------------------------
let dbPlayers: DbPlayer[] = [];
let playersByRiotId = new Map<string, DbPlayer>();
let currentMatch: DbMatch | null = null;
let lastEventId = 0;
let teamCounters: Record<string, { torres: number; dragoes: number; baroes: number }> =
  {};
let countersMatchId: string | null = null;
let wasConnected = false;
let refreshCounter = 0;

function normalizeKey(name?: string, tag?: string): string {
  const base = (name ?? "").trim().toLowerCase();
  const suffix = (tag ?? "").trim().toLowerCase();
  return suffix ? `${base}#${suffix}` : base;
}

async function refreshPlayers() {
  const { data, error } = await db
    .from("players_cblow")
    .select("id, nick, tag_line, rota, team_id")
    .eq("ativo", true);
  if (error) {
    await log("ERROR", `Falha ao carregar players_cblow: ${error.message}`);
    return;
  }
  dbPlayers = (data as DbPlayer[]) ?? [];
  playersByRiotId = new Map();
  for (const p of dbPlayers) {
    playersByRiotId.set(normalizeKey(p.nick, p.tag_line), p);
    playersByRiotId.set(normalizeKey(p.nick), p); // fallback sem tag
  }
}

async function resolveMatch(): Promise<DbMatch | null> {
  if (MATCH_ID) {
    const { data } = await db
      .from("matches")
      .select("id, rodada, status, blue_team_id, red_team_id")
      .eq("id", MATCH_ID)
      .maybeSingle();
    return (data as DbMatch | null) ?? null;
  }

  const { data, error } = await db
    .from("matches")
    .select("id, rodada, status, blue_team_id, red_team_id")
    .eq("status", "IN_PROGRESS")
    .order("rodada", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    await log("ERROR", `Falha ao buscar partida em andamento: ${error.message}`);
    return null;
  }
  return (data as DbMatch | null) ?? null;
}

function matchLiveToDb(live: LivePlayer): DbPlayer | null {
  const byRiot = playersByRiotId.get(
    normalizeKey(live.riotIdGameName ?? live.summonerName, live.riotIdTagLine),
  );
  if (byRiot) return byRiot;
  return playersByRiotId.get(normalizeKey(live.summonerName)) ?? null;
}

function teamIdForSide(match: DbMatch, side?: string | null): string | null {
  if (side === "ORDER") return match.blue_team_id;
  if (side === "CHAOS") return match.red_team_id;
  return null;
}

// -----------------------------------------------------------------------------
// Eventos (objetivos) — contadores locais por partida
// -----------------------------------------------------------------------------
function bumpTeamCounter(teamId: string, field: "torres" | "dragoes" | "baroes") {
  const counter = (teamCounters[teamId] ??= { torres: 0, dragoes: 0, baroes: 0 });
  counter[field] += 1;
}

function findKillerTeamId(match: DbMatch, event: LiveEvent): string | null {
  const killerName = String(event.KillerName ?? event.Killer ?? "").trim();
  if (killerName) {
    const player =
      playersByRiotId.get(normalizeKey(killerName)) ??
      dbPlayers.find((p) => p.nick.toLowerCase() === killerName.toLowerCase());
    if (player?.team_id) return player.team_id;
  }
  // Fallback: lado informado no evento (100 = blue/ORDER, 200 = red/CHAOS)
  const side = String(event.Team ?? "");
  if (side === "100") return match.blue_team_id;
  if (side === "200") return match.red_team_id;
  return null;
}

async function processEvents(match: DbMatch, events: LiveEvent[]) {
  for (const event of events) {
    const id = event.EventID ?? 0;
    if (id <= lastEventId) continue;
    lastEventId = id;

    switch (event.EventType) {
      case "TurretKilled": {
        // TurretKiller = "Turret_T1_..." (torre do lado ORDER) ou T2 (CHAOS).
        // A torre destruída pertence ao lado atacado => ponto para o oponente.
        const turret = String(event.TurretKiller ?? event.TurretKillerName ?? "");
        const destroyedSide = turret.includes("_T1_")
          ? "ORDER"
          : turret.includes("_T2_")
            ? "CHAOS"
            : null;
        const scoringSide =
          destroyedSide === "ORDER"
            ? "CHAOS"
            : destroyedSide === "CHAOS"
              ? "ORDER"
              : null;
        const teamId = teamIdForSide(match, scoringSide);
        if (teamId) bumpTeamCounter(teamId, "torres");
        break;
      }
      case "DragonKill": {
        const teamId = findKillerTeamId(match, event);
        if (teamId) bumpTeamCounter(teamId, "dragoes");
        break;
      }
      case "BaronKill": {
        const teamId = findKillerTeamId(match, event);
        if (teamId) bumpTeamCounter(teamId, "baroes");
        break;
      }
      case "GameEnd":
        await log(
          "INFO",
          "Evento GameEnd recebido — finalize a partida e defina o vencedor no painel admin.",
          { eventType: "GameEnd" },
        );
        break;
      default:
        break;
    }
  }
}

// -----------------------------------------------------------------------------
// Push para o Supabase
// -----------------------------------------------------------------------------
async function pushStats(match: DbMatch, live: LiveClientData) {
  const rows: Record<string, unknown>[] = [];

  for (const lp of live.players ?? []) {
    const dbp = matchLiveToDb(lp);
    if (!dbp) {
      await log(
        "WARN",
        `Jogador da Live API sem correspondência em players_cblow: ${
          lp.riotIdGameName ?? lp.summonerName ?? "?"
        }`,
      );
      continue;
    }
    const s = lp.scores ?? {};
    const raw = {
      kills: s.kills ?? 0,
      deaths: s.deaths ?? 0,
      assists: s.assists ?? 0,
      cs: s.creepScore ?? 0,
      visionScore: s.visionScore ?? 0,
    };
    rows.push({
      match_id: match.id,
      player_id: dbp.id,
      kills: raw.kills,
      deaths: raw.deaths,
      assists: raw.assists,
      cs: raw.cs,
      vision_score: raw.visionScore,
      gold: s.totalGold ?? null,
      pontos: scorePlayer(raw),
      raw: lp as unknown as Record<string, unknown>,
    });
  }

  if (rows.length > 0) {
    const { error } = await db
      .from("matches_live_stats")
      .upsert(rows, { onConflict: "match_id,player_id" });
    if (error) {
      await log("ERROR", `Falha ao enviar stats de jogadores: ${error.message}`);
    }
  }

  // Stats de times (Técnico/Presidente) — vitória fica para o admin
  const teamRows: Record<string, unknown>[] = [];
  for (const [teamId, c] of Object.entries(teamCounters)) {
    teamRows.push({
      match_id: match.id,
      team_id: teamId,
      torres: c.torres,
      dragoes: c.dragoes,
      baroes: c.baroes,
      venceu: false,
      pontos: scoreTeam({ ...c, venceu: false }),
    });
  }
  if (teamRows.length > 0) {
    const { error } = await db
      .from("matches_team_stats")
      .upsert(teamRows, { onConflict: "match_id,team_id" });
    if (error) {
      await log("ERROR", `Falha ao enviar stats de times: ${error.message}`);
    }
  }
}

// -----------------------------------------------------------------------------
// Loop principal
// -----------------------------------------------------------------------------
async function tick() {
  try {
    // Recarrega cadastros e resolve a partida a cada 15 ciclos
    if (refreshCounter % 15 === 0) {
      await refreshPlayers();
      currentMatch = await resolveMatch();
      if (!currentMatch) {
        await log(
          "WARN",
          "Nenhuma partida IN_PROGRESS. Inicie a partida no painel admin (ou defina MATCH_ID).",
        );
        return;
      }
      if (currentMatch.status !== "IN_PROGRESS") {
        await log(
          "WARN",
          `Partida ${currentMatch.id.slice(0, 8)} com status ${currentMatch.status} — envio pausado.`,
        );
        return;
      }
      // Zera contadores ao trocar de partida
      if (countersMatchId !== currentMatch.id) {
        countersMatchId = currentMatch.id;
        teamCounters = {};
        lastEventId = 0;
      }
    }
    refreshCounter++;

    if (!currentMatch) return;

    const { data, latencyMs } = await fetchLiveClient();

    if (!wasConnected) {
      wasConnected = true;
      await log("INFO", `Conectado à Live Client API (${LIVE_API}).`);
    }
    if (latencyMs > LATENCY_WARN_MS) {
      await log("WARN", `Alta latência na Live Client API: ${latencyMs}ms`);
    }

    await processEvents(currentMatch, data.events?.Events ?? []);
    await pushStats(currentMatch, data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (wasConnected) {
      wasConnected = false;
      await log("ERROR", "Conexão com o client do LoL perdida (127.0.0.1:2999).", {
        error: message,
      });
    } else {
      await log("ERROR", "Live Client API indisponível — abra o LoL em modo espectador.", {
        error: message,
      });
    }
  }
}

async function main() {
  await log("INFO", `CBLOW live-capture iniciado (poll=${POLL_MS}ms, api=${LIVE_API}).`);
  await refreshPlayers();
  currentMatch = await resolveMatch();

  if (!currentMatch) {
    await log(
      "WARN",
      "Nenhuma partida IN_PROGRESS. O script re-tenta a cada 15 ciclos. Defina MATCH_ID no .env.local para fixar uma partida.",
    );
  }

  // Loop com setTimeout encadeado (evita sobreposição de requisições)
  const loop = async () => {
    await tick();
    setTimeout(loop, POLL_MS);
  };
  void loop();
}

process.on("SIGINT", () => {
  console.log("[INFO] live-capture encerrado (SIGINT).");
  process.exit(0);
});

void main();
