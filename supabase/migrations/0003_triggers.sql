-- =============================================================================
-- CBLOW Fantasy — 0003: PONTUAÇÃO AUTOMÁTICA E TRIGGERS
-- =============================================================================

-- Recalcula os pontos das escalações de uma rodada e os pontos totais dos usuários.
create or replace function public.refresh_round_points(p_rodada integer)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.lineups l
  set pontos_rodada =
      coalesce((
        select sum(coalesce(s.pontos_override, s.pontos))
        from public.matches_live_stats s
        join public.matches m on m.id = s.match_id
        where m.rodada = l.rodada
          and s.player_id in (l.top_id, l.jg_id, l.mid_id, l.adc_id, l.sup_id)
      ), 0)
    + coalesce((
        select sum(coalesce(t.pontos_override, t.pontos))
        from public.matches_team_stats t
        join public.matches m on m.id = t.match_id
        where m.rodada = l.rodada and t.team_id = l.coach_id
      ), 0)
  where l.rodada = p_rodada;

  update public.profiles p
  set pontos_totais = coalesce((select sum(l.pontos_rodada) from public.lineups l where l.user_id = p.id), 0)
  where p.id in (select l.user_id from public.lineups l where l.rodada = p_rodada);
end;
$$;

revoke all on function public.refresh_round_points(integer) from public, anon, authenticated;

create or replace function public.trg_refresh_after_stats()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_match  uuid;
  v_rodada integer;
begin
  if tg_op = 'DELETE' then
    v_match := old.match_id;
  else
    v_match := new.match_id;
  end if;

  select m.rodada into v_rodada from public.matches m where m.id = v_match;
  if v_rodada is not null then
    perform public.refresh_round_points(v_rodada);
  end if;
  return null;
end;
$$;

-- Novo usuário -> profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg
  before update on public.profiles
  for each row execute function public.profiles_guard();

drop trigger if exists lineups_guard_trg on public.lineups;
create trigger lineups_guard_trg
  before insert or update on public.lineups
  for each row execute function public.lineups_guard();

-- Recálculo: stats de jogadores
drop trigger if exists live_stats_ai on public.matches_live_stats;
create trigger live_stats_ai after insert on public.matches_live_stats
  for each row execute function public.trg_refresh_after_stats();

drop trigger if exists live_stats_au on public.matches_live_stats;
create trigger live_stats_au after update on public.matches_live_stats
  for each row
  when (old.pontos is distinct from new.pontos or old.pontos_override is distinct from new.pontos_override)
  execute function public.trg_refresh_after_stats();

drop trigger if exists live_stats_ad on public.matches_live_stats;
create trigger live_stats_ad after delete on public.matches_live_stats
  for each row execute function public.trg_refresh_after_stats();

-- Recálculo: stats de times (Técnico/Presidente)
drop trigger if exists team_stats_ai on public.matches_team_stats;
create trigger team_stats_ai after insert on public.matches_team_stats
  for each row execute function public.trg_refresh_after_stats();

drop trigger if exists team_stats_au on public.matches_team_stats;
create trigger team_stats_au after update on public.matches_team_stats
  for each row
  when (old.pontos is distinct from new.pontos or old.pontos_override is distinct from new.pontos_override)
  execute function public.trg_refresh_after_stats();

drop trigger if exists team_stats_ad on public.matches_team_stats;
create trigger team_stats_ad after delete on public.matches_team_stats
  for each row execute function public.trg_refresh_after_stats();

-- updated_at automático
drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at before update on public.matches
  for each row execute function public.set_updated_at();

drop trigger if exists live_stats_set_updated_at on public.matches_live_stats;
create trigger live_stats_set_updated_at before update on public.matches_live_stats
  for each row execute function public.set_updated_at();

drop trigger if exists team_stats_set_updated_at on public.matches_team_stats;
create trigger team_stats_set_updated_at before update on public.matches_team_stats
  for each row execute function public.set_updated_at();

drop trigger if exists market_set_updated_at on public.market_settings;
create trigger market_set_updated_at before update on public.market_settings
  for each row execute function public.set_updated_at();
