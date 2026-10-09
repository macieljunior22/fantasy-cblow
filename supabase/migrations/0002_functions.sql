-- =============================================================================
-- CBLOW Fantasy — 0002: FUNÇÕES AUXILIARES
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

create or replace function public.market_is_open()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select m.market_status = 'OPEN' from public.market_settings m where m.id = 1), false);
$$;

create or replace function public.current_rodada()
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce((select m.rodada_atual from public.market_settings m where m.id = 1), 1);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Cria o profile automaticamente quando um usuário se cadastra (e-mail ou login social).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'jogador'
      ),
      24
    )
  );
  return new;
end;
$$;

-- Impede que o próprio usuário altere is_admin / saldo / pontos pelo site.
-- (current_user = 'authenticated' nas requisições do site; service_role e funções
--  SECURITY DEFINER passam livremente.)
create or replace function public.profiles_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.saldo_cartoletas := old.saldo_cartoletas;
    new.pontos_totais := old.pontos_totais;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Valida a escalação: 1 jogador por rota, sem repetidos, dentro do orçamento.
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

    v_cost := v_cost + coalesce((select t.preco_presidente from public.teams_cblow t where t.id = new.coach_id), 0);
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
