import { supabase } from '../_supabase.js';
export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({erro:'Use GET'});
  try{
    const dados=await supabase('game_premios?ativo=eq.true&quantidade=gt.0&select=nome&order=nome.asc');
    return res.status(200).json({premios:(dados||[]).map(x=>x.nome)});
  }catch(e){return res.status(500).json({erro:'Não foi possível carregar os prêmios'});}
}
