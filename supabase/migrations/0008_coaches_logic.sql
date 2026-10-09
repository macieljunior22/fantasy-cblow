-- =============================================================================
-- CBLOW Fantasy — 0008: funções/RLS/Realtime dos coaches (complementa 0007)
-- =============================================================================

-- Validação da escalação: custo do técnico agora vem de coaches.preco.
create or replace function public.lineups_guard()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_client boolean := current_user in ('authenticated', 'anon') and not public.is_admin();
  v_ok     integer;
  v_cost   numeric;
  v_budget numeric;
begin
  if v_client then
    if tg_op = 'INSERT' then
      new.pontos_rodada := 0;
      new.status := 'ACTIVE';
    else
      new.pontos_rodada := old.pontos_rodada;
      new.status := old.status;
      new.user_id := old.user_id;
      new.rodada := old.rodada;
    end if;
  end if;

  if tg_op = 'INSERT'
     or (new.top_id, new.jg_id, new.mid_id, new.adc_id, new.sup_id, new.coach_id)
        is distinct from (old.top_id, old.jg_id, old.mid_id, old.adc_id, old.sup_id, old.coach_id)
  then
    if (select count(distinct x) from unnest(array[new.top_id, new.jg_id, new.mid_id, new.adc_id, new.sup_id]) x) <> 5 then
      raise exception 'Escalação inválida: jogadores repetidos.';
    end if;

    select count(*) into v_ok
    from public.players_cblow p
    where (p.id = new.top_id and p.rota = 'TOP')
       or (p.id = new.jg_id  and p.rota = 'JG')
       or (p.id = new.mid_id and p.rota = 'MID')
       or (p.id = new.adc_id and p.rota = 'ADC')
       or (p.id = new.sup_id and p.rota = 'SUP');
    if v_ok <> 5 then
      raise exception 'Escalação inválida: cada jogador deve ocupar a sua rota.';
    end if;

    select coalesce(sum(p.preco), 0) into v_cost
    from public.players_cblow p
    where p.id in (new.top_id, new.jg_id, new.mid_id, new.adc_id, new.sup_id);

    v_cost := v_cost + coalesce((select c.preco from public.coaches c where c.id = new.coach_id), 0);
    new.custo_total := v_cost;

    select p.saldo_cartoletas into v_budget from public.profiles p where p.id = new.user_id;
    if v_cost > coalesce(v_budget, 0) then
      raise exception 'Orçamento insuficiente: custo % > saldo %.', v_cost, coalesce(v_budget, 0);
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Recálculo dos pontos: técnico pontua pelos objetivos do SEU time.
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
        where m.rodada = l.rodada
          and t.team_id = (select c.team_id from public.coaches c where c.id = l.coach_id)
      ), 0)
  where l.rodada = p_rodada;

  update public.profiles p
  set pontos_totais = coalesce((select sum(l.pontos_rodada) from public.lineups l where l.user_id = p.id), 0)
  where p.id in (select l.user_id from public.lineups l where l.rodada = p_rodada);
end;
$$;

revoke all on function public.refresh_round_points(integer) from public, anon, authenticated;

-- ---- RLS para coaches ------------------------------------------------------
alter table public.coaches enable row level security;

drop policy if exists "coaches_select_public" on public.coaches;
create policy "coaches_select_public" on public.coaches for select using (true);

drop policy if exists "coaches_admin_write" on public.coaches;
create policy "coaches_admin_write" on public.coaches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- Realtime --------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'coaches'
  ) then
    alter publication supabase_realtime add table public.coaches;
  end if;
end;
$$;
