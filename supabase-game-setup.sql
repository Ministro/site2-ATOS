-- Execute uma única vez no SQL Editor do Supabase.
-- Desconta 1 crédito e registra a jogada na mesma transação.

create or replace function public.game_iniciar_partida(p_cpf varchar)
returns table (autorizado boolean, creditos_restantes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_saldo integer;
begin
  update public.game_clientes
     set creditos = creditos - 1,
         atualizado_em = now()
   where cpf = p_cpf
     and creditos > 0
  returning creditos into novo_saldo;

  if novo_saldo is null then
    return query select false, 0;
    return;
  end if;

  insert into public.game_movimentacoes (cpf, tipo, quantidade, saldo_apos)
  values (p_cpf, 'debito_partida', -1, novo_saldo);

  return query select true, novo_saldo;
end;
$$;

revoke all on function public.game_iniciar_partida(varchar) from public, anon, authenticated;
grant execute on function public.game_iniciar_partida(varchar) to service_role;

-- ================================================================
-- CRÉDITOS AUTOMÁTICOS QUANDO UMA FATURA DO IXC FOR PAGA
-- Execute novamente este arquivo no SQL Editor após publicar esta versão.
-- A fatura é única, portanto a mesma baixa nunca gera créditos duas vezes.
-- ================================================================

alter table public.game_pagamentos
  add column if not exists fatura_id varchar,
  add column if not exists cpf varchar,
  add column if not exists valor numeric(12,2) default 0,
  add column if not exists creditos_gerados integer default 0,
  add column if not exists pago_em timestamptz,
  add column if not exists criado_em timestamptz default now();

create unique index if not exists game_pagamentos_fatura_id_unique
  on public.game_pagamentos (fatura_id);

create or replace function public.game_creditar_pagamento(
  p_fatura_id varchar,
  p_cpf varchar,
  p_nome text,
  p_valor_pago numeric,
  p_pago_em text default null
)
returns table (
  creditado boolean,
  duplicado boolean,
  creditos_gerados integer,
  saldo_atual integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  qtd integer;
  novo_saldo integer;
  pagamento_inserido boolean := false;
begin
  qtd := floor(coalesce(p_valor_pago, 0) / 50)::integer;

  if qtd < 1 then
    select coalesce(gc.creditos, 0)
      into novo_saldo
      from public.game_clientes gc
     where gc.cpf = p_cpf;

    return query select false, false, 0, coalesce(novo_saldo, 0);
    return;
  end if;

  insert into public.game_pagamentos
    (fatura_id, cpf, valor, creditos_gerados, pago_em)
  values
    (p_fatura_id, p_cpf, p_valor_pago, qtd,
      case
        when nullif(p_pago_em, '') is null then now()
        else nullif(p_pago_em, '')::timestamptz
      end)
  on conflict (fatura_id) do nothing;

  get diagnostics pagamento_inserido = row_count;

  if not pagamento_inserido then
    select coalesce(gc.creditos, 0)
      into novo_saldo
      from public.game_clientes gc
     where gc.cpf = p_cpf;

    return query select false, true, 0, coalesce(novo_saldo, 0);
    return;
  end if;

  insert into public.game_clientes (cpf, nome, creditos, atualizado_em)
  values (p_cpf, p_nome, qtd, now())
  on conflict (cpf) do update
     set nome = case
                  when excluded.nome is not null and excluded.nome <> '' then excluded.nome
                  else public.game_clientes.nome
                end,
         creditos = public.game_clientes.creditos + qtd,
         atualizado_em = now()
  returning creditos into novo_saldo;

  insert into public.game_movimentacoes (cpf, tipo, quantidade, saldo_apos)
  values (p_cpf, 'credito_pagamento', qtd, novo_saldo);

  return query select true, false, qtd, novo_saldo;
end;
$$;

revoke all on function public.game_creditar_pagamento(varchar, varchar, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.game_creditar_pagamento(varchar, varchar, text, numeric, text)
  to service_role;
