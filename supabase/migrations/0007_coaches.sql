-- =============================================================================
-- CBLOW Fantasy — 0007: TÉCNICOS (coaches) como entidade própria
--
-- Antes o "técnico" era o próprio time (coach_id -> teams_cblow, só 8 opções).
-- Agora cada PRESIDENTE individual é um técnico selecionável (16 no total,
-- pois cada time tem 2 presidentes) — atende a exigência de "12 técnicos".
--
-- A pontuação do técnico continua vindo dos OBJETIVOS DO SEU TIME
-- (matches_team_stats), só que agora via coaches.team_id.
-- Reexecutável (idempotente): só semeia o que falta e só migra a FK se necessário.
-- =============================================================================

create table if not exists public.coaches (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  team_id    uuid not null references public.teams_cblow (id) on delete cascade,
  foto_url   text,
  preco      numeric(6, 2) not null default 5.00 check (preco >= 0),
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  unique (nome, team_id)
);
create index if not exists coaches_team_idx on public.coaches (team_id);

-- Semeia 2 técnicos por time a partir do campo "presidente" ("Nome1 e Nome2").
insert into public.coaches (nome, team_id, preco)
select split_part(presidente, ' e ', 1), id, preco_presidente
from public.teams_cblow
where presidente like '% e %'
on conflict (nome, team_id) do nothing;

insert into public.coaches (nome, team_id, preco)
select split_part(presidente, ' e ', 2), id, preco_presidente
from public.teams_cblow
where presidente like '% e %'
on conflict (nome, team_id) do nothing;

-- Migra a FK de lineups.coach_id: teams_cblow -> coaches (seguro: escalações vazias).
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'lineups_coach_id_fkey' and table_name = 'lineups'
  ) then
    alter table public.lineups drop constraint lineups_coach_id_fkey;
  end if;
  alter table public.lineups
    add constraint lineups_coach_id_fkey
    foreign key (coach_id) references public.coaches (id);
end;
$$;
