-- =============================================================================
-- CBLOW Fantasy — 0001: TABELAS (parte 1/2)
-- Execute os arquivos 0001 -> 0004 em ordem no Supabase > SQL Editor.
-- Depois de criar sua conta pelo site, promova-se a admin:
--   update public.profiles set is_admin = true where id = '<SEU_AUTH_USER_ID>';
-- =============================================================================

-- Estado global do mercado (linha única).
create table if not exists public.market_settings (
  id            smallint primary key default 1 check (id = 1),
  market_status text not null default 'LOCKED' check (market_status in ('OPEN', 'LOCKED')),
  rodada_atual  integer not null default 1 check (rodada_atual >= 1),
  updated_at    timestamptz not null default now()
);
insert into public.market_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  nickname         text not null check (char_length(nickname) between 1 and 24),
  saldo_cartoletas numeric(8, 2) not null default 100.00 check (saldo_cartoletas >= 0),
  pontos_totais    numeric(8, 2) not null default 0,
  is_admin         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists profiles_pontos_idx on public.profiles (pontos_totais desc);

create table if not exists public.teams_cblow (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  tag              text not null unique,
  logo_url         text,
  presidente       text,
  preco_presidente numeric(6, 2) not null default 5.00 check (preco_presidente >= 0),
  created_at       timestamptz not null default now()
);

create table if not exists public.players_cblow (
  id         uuid primary key default gen_random_uuid(),
  nick       text not null,
  tag_line   text not null,
  puuid      text unique,
  rota       text not null check (rota in ('TOP', 'JG', 'MID', 'ADC', 'SUP')),
  foto_url   text,
  preco      numeric(6, 2) not null default 5.00 check (preco >= 0),
  team_id    uuid references public.teams_cblow (id) on delete set null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  unique (nick, tag_line)
);
create index if not exists players_team_idx on public.players_cblow (team_id);

create table if not exists public.matches (
  id                uuid primary key default gen_random_uuid(),
  rodada            integer not null check (rodada >= 1),
  blue_team_id      uuid references public.teams_cblow (id) on delete set null, -- lado ORDER
  red_team_id       uuid references public.teams_cblow (id) on delete set null, -- lado CHAOS
  status            text not null default 'NOT_STARTED'
                    check (status in ('NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'FINISHED')),
  winner_team_id    uuid references public.teams_cblow (id) on delete set null,
  game_time_seconds integer not null default 0,
  scheduled_at      timestamptz,
  started_at        timestamptz,
  finished_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists matches_rodada_idx on public.matches (rodada);

-- Estatísticas por jogador/partida (enviadas pelo script local).
create table if not exists public.matches_live_stats (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references public.matches (id) on delete cascade,
  player_id       uuid not null references public.players_cblow (id) on delete cascade,
  kills           integer not null default 0,
  deaths          integer not null default 0,
  assists         integer not null default 0,
  cs              integer not null default 0,
  vision_score    numeric(6, 1) not null default 0,
  gold            integer, -- a Live Client API não expõe o ouro dos demais jogadores
  pontos          numeric(8, 2) not null default 0,
  pontos_override numeric(8, 2), -- override manual do admin (tem prioridade)
  override_reason text,
  raw             jsonb,
  updated_at      timestamptz not null default now(),
  unique (match_id, player_id)
);
create index if not exists live_stats_player_idx on public.matches_live_stats (player_id);

-- Estatísticas por time/partida (pontuação do Técnico/Presidente).
create table if not exists public.matches_team_stats (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references public.matches (id) on delete cascade,
  team_id         uuid not null references public.teams_cblow (id) on delete cascade,
  torres          integer not null default 0,
  dragoes         integer not null default 0,
  baroes          integer not null default 0,
  venceu          boolean not null default false,
  pontos          numeric(8, 2) not null default 0,
  pontos_override numeric(8, 2),
  override_reason text,
  updated_at      timestamptz not null default now(),
  unique (match_id, team_id)
);

create table if not exists public.lineups (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  rodada        integer not null check (rodada >= 1),
  top_id        uuid not null references public.players_cblow (id),
  jg_id         uuid not null references public.players_cblow (id),
  mid_id        uuid not null references public.players_cblow (id),
  adc_id        uuid not null references public.players_cblow (id),
  sup_id        uuid not null references public.players_cblow (id),
  coach_id      uuid not null references public.teams_cblow (id),
  custo_total   numeric(8, 2) not null default 0,
  pontos_rodada numeric(8, 2) not null default 0,
  status        text not null default 'ACTIVE' check (status in ('ACTIVE', 'LOCKED', 'FINISHED')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, rodada)
);
create index if not exists lineups_rodada_idx on public.lineups (rodada);

create table if not exists public.system_logs (
  id         bigint generated always as identity primary key,
  level      text not null check (level in ('INFO', 'WARN', 'ERROR')),
  source     text not null,
  message    text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists system_logs_created_idx on public.system_logs (created_at desc);
