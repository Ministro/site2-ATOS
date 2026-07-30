SISTEMA DE CRÉDITOS DO MINI GAME

1) Execute o arquivo supabase-game-setup.sql no SQL Editor do Supabase.
2) Confirme na Vercel as variáveis:
   SUPABASE_URL
   SUPABASE_SECRET_KEY
3) Faça um novo deploy do projeto.
4) Teste com o CPF 02924314224, que possui 5 créditos.

Fluxo:
- O cliente abre jogar.html pelo botão MINI GAME.
- Informa o CPF.
- A API consulta o Supabase.
- Ao clicar em JOGAR, 1 crédito é descontado de forma atômica.
- A movimentação é registrada em game_movimentacoes.
- Uma sessão temporária autoriza a abertura do jogo.
