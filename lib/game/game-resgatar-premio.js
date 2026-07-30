import { limitarMetodo, validarToken, supabase } from '../_supabase.js';
export default async function handler(req,res){
  if(!limitarMetodo(req,res)) return;
  try{
    const dadosToken=validarToken(req.body?.token);
    if(!dadosToken) return res.status(401).json({ok:false,erro:'Sessão expirada'});
    const partidaId=String(req.body?.partidaId||'');
    if(!/^[0-9a-f-]{36}$/i.test(partidaId)) return res.status(400).json({ok:false,erro:'Partida inválida'});
    const d=await supabase('rpc/game_resgatar_premio',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_partida_id:partidaId,p_cpf:dadosToken.cpf})});
    const r=Array.isArray(d)?d[0]:d;
    if(!r?.ok) return res.status(409).json({ok:false,erro:'Prêmio indisponível ou já resgatado'});
    return res.status(200).json({ok:true,premio:r.premio_nome,token:r.token_codigo,quantidadeRestante:Number(r.quantidade_restante||0)});
  }catch(e){console.error('Resgatar prêmio:',e);return res.status(500).json({ok:false,erro:'Não foi possível confirmar o prêmio'});}
}
