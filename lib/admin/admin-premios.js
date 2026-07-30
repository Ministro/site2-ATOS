import { exigirAdmin } from '../_admin.js';
import { supabase } from '../_supabase.js';

export default async function handler(req,res){
  if(!exigirAdmin(req,res)) return;
  try{
    if(req.method==='GET'){
      const premios=await supabase('game_premios?select=id,nome,quantidade,ativo,atualizado_em&order=ativo.desc,nome.asc');
      const ganhos=await supabase('game_premios_ganhos?select=id,cpf,premio_nome,token_codigo,status,criado_em,entregue_em&order=criado_em.desc&limit=150');
      return res.status(200).json({premios:premios||[],ganhos:ganhos||[]});
    }
    if(req.method!=='POST') return res.status(405).json({erro:'Use GET ou POST'});
    const acao=String(req.body?.acao||'salvar');
    if(acao==='salvar'){
      let id=Number(req.body?.id||0); const nome=String(req.body?.nome||'').trim().toUpperCase();
      const quantidade=Math.max(0,Math.floor(Number(req.body?.quantidade||0))); const ativo=req.body?.ativo!==false;
      if(!nome) return res.status(400).json({erro:'Informe o nome do prêmio'});
      if(id>0){
        const d=await supabase(`game_premios?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({nome,ativo,atualizado_em:new Date().toISOString()})});
        if(!d?.[0]) return res.status(404).json({erro:'Prêmio não encontrado'});
      }else{
        const d=await supabase('game_premios',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({nome,quantidade:0,ativo})}); id=Number(d?.[0]?.id||0);
      }
      await supabase('rpc/game_definir_estoque_premio',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_premio_id:id,p_quantidade:quantidade})});
      return res.status(200).json({ok:true,id,quantidade});
    }
    if(acao==='resgatar_token'){
      const token=String(req.body?.token||'').trim().toUpperCase();
      if(!token) return res.status(400).json({erro:'Informe o token'});
      const d=await supabase('rpc/game_entregar_premio_token',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_token:token})});
      const r=Array.isArray(d)?d[0]:d;
      if(!r?.ok) return res.status(409).json({erro:r?.mensagem||'Token inválido',detalhes:r||null});
      return res.status(200).json({ok:true,mensagem:r.mensagem,premio:r.premio_nome,cpf:r.cpf,status:r.status});
    }
    if(acao==='status_ganho'){
      const id=String(req.body?.id||''); const status=String(req.body?.status||'pendente');
      if(!['pendente','cancelado'].includes(status)) return res.status(400).json({erro:'Para entregar, confirme pelo token'});
      await supabase(`game_premios_ganhos?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status,entregue_em:null})});
      return res.status(200).json({ok:true});
    }
    return res.status(400).json({erro:'Ação inválida'});
  }catch(e){console.error('Admin prêmios:',e);return res.status(500).json({erro:e.message||'Erro ao gerenciar prêmios'});}
}
