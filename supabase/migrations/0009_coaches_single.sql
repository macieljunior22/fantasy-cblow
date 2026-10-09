-- =============================================================================
-- CBLOW Fantasy — 0009: 1 técnico por time (a dupla de presidentes = 1 coach)
--
-- Antes semeamos 2 técnicos por time (16 no total), mas os dois do mesmo time
-- sempre empatam nos pontos (ambos pontuam pelos objetivos do time). Agora
-- consolidamos em 1 técnico por time usando o campo "presidente" inteiro
-- (ex.: "Kennzy e Mylon"), totalizando 8 técnicos.
--
-- Idempotente: limpa a tabela coaches (seguro, pois lineups está vazia) e
-- semeia novamente com 1 por time.
-- =============================================================================

-- Remove os técnicos antigos (duplas separadas). Seguro: nenhuma escalação
-- referencia coaches no momento (tabela lineups vazia).
delete from public.coaches;

-- Semeia exatamente 1 técnico por time, com o nome = presidente (dupla inteira).
insert into public.coaches (nome, team_id, preco)
select presidente, id, preco_presidente
from public.teams_cblow
where presidente is not null and btrim(presidente) <> ''
on conflict (nome, team_id) do nothing;
