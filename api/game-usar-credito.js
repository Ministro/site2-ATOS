import { limitarMetodo, validarToken, supabase } from './_supabase.js';
export default async function handler(req,res){
  if(!limitarMetodo(req,res)) return;
  try{
    const dadosToken=validarToken(req.body?.token);
    if(!dadosToken) return res.status(401).json({autorizado:false,erro:'Sessão expirada. Consulte o CPF novamente.'});
    const d=await supabase('rpc/game_usar_credito_partida',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_cpf:dadosToken.cpf})});
    const r=Array.isArray(d)?d[0]:d;
    if(!r?.autorizado) return res.status(403).json({autorizado:false,creditosRestantes:Number(r?.creditos_restantes||0),erro:'Seus créditos acabaram.'});
    return res.status(200).json({autorizado:true,creditosRestantes:Number(r.creditos_restantes||0),partidaId:r.partida_id});
  }catch(e){console.error('Usar crédito:',e);return res.status(500).json({autorizado:false,erro:'Não foi possível utilizar o crédito'});}
}
