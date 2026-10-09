-- =============================================================================
-- CBLOW Fantasy — 0010: TREINO vs OFICIAL + HISTÓRICO DE PREÇOS + BÔNUS VITÓRIA
-- =============================================================================
-- 1. matches.match_type: 'TREINO' (calibra preço, NÃO pontua) vs 'OFICIAL' (pontua).
-- 2. player_price_history: auditoria de cada mudança de preço.
-- 3. refresh_round_points: filtra só OFICIAL + bônus de vitória (+2) p/ time vencedor.
--    (O bônus de vitória entra no SQL porque o vencedor só é conhecido no fim,
--     quando o admin marca — o script ao vivo não sabe quem venceu ainda.)
-- =============================================================================

alter table public.matches
  add column if not exists match_type text not null default 'OFICIAL'
  check (match_type in ('TREINO', 'OFICIAL'));

create index if not exists matches_type_idx on public.matches (match_type);

-- Histórico de preços (auditoria da precificação flutuante)
create table if not exists public.player_price_history (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.players_cblow (id) on delete cascade,
  match_id     uuid references public.matches (id) on delete set null,
  preco_antigo numeric(6, 2) not null,
  preco_novo   numeric(6, 2) not null,
  motivo       text not null default 'recalculo',
  created_at   timestamptz not null default now()
);
create index if not exists price_history_player_idx on public.player_price_history (player_id);

-- Recálculo: SÓ partidas OFICIAIS + bônus de vitória para o time vencedor.
-- Mantém a lógica do 0008 (técnico via coaches.team_id), adiciona:
--   +2.00 por jogador cujo team_id = matches.winner_team_id
create or replace function public.refresh_round_points(p_rodada integer)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.lineups l
  set pontos_rodada =
      coalesce((
        select sum(
          coalesce(s.pontos_override, s.pontos)
          + case
              when m.winner_team_id is not null
               and m.winner_team_id = p.team_id then 2.00
              else 0
            end
        )
        from public.matches_live_stats s
        join public.matches m on m.id = s.match_id
        join public.players_cblow p on p.id = s.player_id
        where m.rodada = l.rodada
          and coalesce(m.match_type, 'OFICIAL') = 'OFICIAL'
          and s.player_id in (l.top_id, l.jg_id, l.mid_id, l.adc_id, l.sup_id)
      ), 0)
    + coalesce((
        select sum(coalesce(t.pontos_override, t.pontos))
        from public.matches_team_stats t
        join public.matches m on m.id = t.match_id
        where m.rodada = l.rodada
          and coalesce(m.match_type, 'OFICIAL') = 'OFICIAL'
          and t.team_id = (select c.team_id from public.coaches c where c.id = l.coach_id)
      ), 0)
  where l.rodada = p_rodada;

  update public.profiles p
  set pontos_totais = coalesce((select sum(l.pontos_rodada) from public.lineups l where l.user_id = p.id), 0)
  where p.id in (select l.user_id from public.lineups l where l.rodada = p_rodada);
end;
$$;

revoke all on function public.refresh_round_points(integer) from public, anon, authenticated;

-- ---- RLS + Realtime do histórico -------------------------------------------
alter table public.player_price_history enable row level security;

drop policy if exists "price_history_select_public" on public.player_price_history;
create policy "price_history_select_public" on public.player_price_history for select using (true);

drop policy if exists "price_history_admin_write" on public.player_price_history;
create policy "price_history_admin_write" on public.player_price_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'player_price_history'
  ) then
    alter publication supabase_realtime add table public.player_price_history;
  end if;
end;
$$;
