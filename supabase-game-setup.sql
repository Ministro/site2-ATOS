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
