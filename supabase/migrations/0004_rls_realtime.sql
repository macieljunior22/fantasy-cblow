-- =============================================================================
-- CBLOW Fantasy — 0004: ROW LEVEL SECURITY + REALTIME (parte 1/2)
-- A SUPABASE_SERVICE_ROLE_KEY ignora RLS (usada só no servidor e no script local).
-- =============================================================================

alter table public.market_settings    enable row level security;
alter table public.profiles           enable row level security;
alter table public.teams_cblow        enable row level security;
alter table public.players_cblow      enable row level security;
alter table public.matches            enable row level security;
alter table public.matches_live_stats enable row level security;
alter table public.matches_team_stats enable row level security;
alter table public.lineups            enable row level security;
alter table public.system_logs        enable row level security;

-- ---- Leitura pública: mercado, perfis/ranking, times, jogadores, partidas e stats
drop policy if exists "market_select_public" on public.market_settings;
create policy "market_select_public" on public.market_settings for select using (true);

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles for select using (true);

drop policy if exists "teams_select_public" on public.teams_cblow;
create policy "teams_select_public" on public.teams_cblow for select using (true);

drop policy if exists "players_select_public" on public.players_cblow;
create policy "players_select_public" on public.players_cblow for select using (true);

drop policy if exists "matches_select_public" on public.matches;
create policy "matches_select_public" on public.matches for select using (true);

drop policy if exists "live_stats_select_public" on public.matches_live_stats;
create policy "live_stats_select_public" on public.matches_live_stats for select using (true);

drop policy if exists "team_stats_select_public" on public.matches_team_stats;
create policy "team_stats_select_public" on public.matches_team_stats for select using (true);

-- ---- Perfis: o usuário edita só o próprio (campos sensíveis protegidos por trigger)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- Escalações
-- O dono sempre vê a sua; a dos outros só aparece com o mercado travado
-- (evita copiar escalações enquanto o mercado está aberto).
drop policy if exists "lineups_select" on public.lineups;
create policy "lineups_select" on public.lineups
  for select
  using (
    (select auth.uid()) = user_id
    or not public.market_is_open()
    or public.is_admin()
  );

-- Só o próprio usuário cria/edita/remove, SOMENTE com market_status = 'OPEN' e na rodada atual.
drop policy if exists "lineups_insert_own" on public.lineups;
create policy "lineups_insert_own" on public.lineups
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.market_is_open()
    and rodada = public.current_rodada()
  );

drop policy if exists "lineups_update_own" on public.lineups;
create policy "lineups_update_own" on public.lineups
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    and public.market_is_open()
    and rodada = public.current_rodada()
  )
  with check (
    (select auth.uid()) = user_id
    and public.market_is_open()
    and rodada = public.current_rodada()
  );

drop policy if exists "lineups_delete_own" on public.lineups;
create policy "lineups_delete_own" on public.lineups
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and public.market_is_open()
    and rodada = public.current_rodada()
  );

drop policy if exists "lineups_admin_all" on public.lineups;
create policy "lineups_admin_all" on public.lineups
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- Escrita administrativa (admin autenticado; service_role ignora RLS)
drop policy if exists "market_admin_write" on public.market_settings;
create policy "market_admin_write" on public.market_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "teams_admin_write" on public.teams_cblow;
create policy "teams_admin_write" on public.teams_cblow
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "players_admin_write" on public.players_cblow;
create policy "players_admin_write" on public.players_cblow
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "matches_admin_write" on public.matches;
create policy "matches_admin_write" on public.matches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "live_stats_admin_write" on public.matches_live_stats;
create policy "live_stats_admin_write" on public.matches_live_stats
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "team_stats_admin_write" on public.matches_team_stats;
create policy "team_stats_admin_write" on public.matches_team_stats
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- Logs: somente admin lê/escreve (payload pode conter dados internos)
drop policy if exists "logs_admin_all" on public.system_logs;
create policy "logs_admin_all" on public.system_logs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Visitantes anônimos nunca escrevem.
revoke insert, update, delete on all tables in schema public from anon;

-- ---- Realtime
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'lineups', 'matches', 'matches_live_stats',
    'matches_team_stats', 'market_settings', 'system_logs'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
