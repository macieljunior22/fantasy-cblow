-- =============================================================================
-- CBLOW Fantasy — 0006: orçamento em "LOW Coins" (150 iniciais)
-- O nome exibido na interface passa a ser "LOW Coins"; internamente a coluna
-- continua saldo_cartoletas (renomear a coluna é desnecessário e arriscado).
-- Novos usuários já nascem com 150 (default alterado abaixo).
-- =============================================================================

-- Default para novos cadastros
alter table public.profiles
  alter column saldo_cartoletas set default 150.00;

-- Perfis antigos (criados com 100) sobem para 150 também
update public.profiles
  set saldo_cartoletas = 150.00
  where saldo_cartoletas < 150.00;
