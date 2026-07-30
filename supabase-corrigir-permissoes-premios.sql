-- Execute uma vez no Supabase > SQL Editor.
-- Dá acesso somente ao backend que usa a chave service_role.

grant usage on schema public to service_role;

grant select, insert, update, delete on table public.game_premios to service_role;
grant select, insert, update, delete on table public.game_premios_ganhos to service_role;
grant select, insert, update, delete on table public.game_premio_tokens to service_role;
grant select, insert, update, delete on table public.game_partidas to service_role;

grant usage, select, update on all sequences in schema public to service_role;

grant execute on function public.game_definir_estoque_premio(bigint, integer) to service_role;
grant execute on function public.game_resgatar_premio(uuid, text) to service_role;
grant execute on function public.game_entregar_premio_token(text) to service_role;

notify pgrst, 'reload schema';
