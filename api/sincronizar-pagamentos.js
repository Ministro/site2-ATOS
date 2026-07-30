import https from "https";
import { limparCpf, supabase } from "./_supabase.js";

const insecureAgent = new https.Agent({ rejectUnauthorized: false });
const FUSO_IXC = "America/Porto_Velho";
const ID_ESTADO = "ixc_pagamentos";
const MARGEM_SEGURANCA_MINUTOS = 10;

async function ixcListar(url, body, auth) {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ixcsoft: "listar"
    },
    body: JSON.stringify(body),
    agent: url.startsWith("https:") ? insecureAgent : undefined
  });

  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); }
  catch { throw new Error(`IXC não retornou JSON (${resp.status}): ${text.slice(0, 250)}`); }
  if (!resp.ok) throw new Error(`IXC status ${resp.status}: ${JSON.stringify(json).slice(0, 250)}`);
  return json;
}

function numero(valor) {
  if (typeof valor === "number") return valor;
  const texto = String(valor ?? "").trim();
  if (!texto) return 0;
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

function valorPago(fatura) {
  for (const candidato of [
    fatura.valor_recebido,
    fatura.valor_pago,
    fatura.valor_total_recebido,
    fatura.valor
  ]) {
    const n = numero(candidato);
    if (n > 0) return n;
  }
  return 0;
}

function dataLocal(date = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_IXC,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = tipo => partes.find(p => p.type === tipo)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function datasEntre(inicio, fim) {
  const datas = [];
  let cursor = new Date(`${dataLocal(inicio)}T12:00:00-04:00`);
  const limite = new Date(`${dataLocal(fim)}T12:00:00-04:00`);
  while (cursor <= limite && datas.length < 4) {
    datas.push(dataLocal(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return datas;
}

function instantePagamento(fatura) {
  const data = String(
    fatura.pagamento_data ||
    fatura.data_pagamento ||
    fatura.data_recebimento ||
    fatura.data_baixa ||
    ""
  ).slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;

  const horaBruta = String(
    fatura.pagamento_hora ||
    fatura.hora_pagamento ||
    fatura.hora_recebimento ||
    fatura.hora_baixa ||
    ""
  ).trim();

  const hora = /^\d{2}:\d{2}/.test(horaBruta)
    ? horaBruta.slice(0, 8).padEnd(8, ":00")
    : null;

  // Quando o IXC não devolve hora, não filtramos por horário. O fatura_id único
  // ainda impede duplicidade, sem risco de perder uma baixa manual.
  if (!hora) return null;

  const dt = new Date(`${data}T${hora}-04:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

async function listarRecebidas(baseUrl, auth, datas) {
  const resultados = [];
  for (const data of datas) {
    for (const status of ["R", "P"]) {
      const resposta = await ixcListar(`${baseUrl}/fn_areceber`, {
        qtype: "fn_areceber.pagamento_data",
        query: data,
        oper: "=",
        page: "1",
        rp: "200",
        sortname: "fn_areceber.id",
        sortorder: "desc",
        grid_param: JSON.stringify([
          { TB: "fn_areceber.status", OP: "=", P: status }
        ])
      }, auth);
      resultados.push(...(resposta.registros || []));
    }
  }

  const unicas = new Map();
  for (const fatura of resultados) {
    if (fatura?.id) unicas.set(String(fatura.id), fatura);
  }
  return [...unicas.values()];
}

async function buscarCliente(baseUrl, auth, idCliente) {
  const resposta = await ixcListar(`${baseUrl}/cliente`, {
    qtype: "cliente.id",
    query: String(idCliente),
    oper: "=",
    page: "1",
    rp: "1",
    sortname: "cliente.id",
    sortorder: "desc"
  }, auth);
  return (resposta.registros || [])[0] || null;
}

async function buscarEstado() {
  const dados = await supabase(
    `game_sync_estado?id=eq.${encodeURIComponent(ID_ESTADO)}&select=ultima_sincronizacao&limit=1`,
    { method: "GET" }
  );
  const valor = Array.isArray(dados) ? dados[0]?.ultima_sincronizacao : null;
  const data = valor ? new Date(valor) : null;
  return data && !Number.isNaN(data.getTime()) ? data : null;
}

async function salvarEstado(instante) {
  await supabase("game_sync_estado?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: ID_ESTADO,
      ultima_sincronizacao: instante.toISOString(),
      atualizado_em: new Date().toISOString()
    })
  });
}

async function registrarLog(log) {
  await supabase("game_sync_logs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(log)
  });
}

async function faturasJaProcessadas(ids) {
  if (!ids.length) return new Set();
  const lista = ids.map(id => `"${String(id).replace(/"/g, "")}"`).join(",");
  const dados = await supabase(
    `game_pagamentos?fatura_id=in.(${encodeURIComponent(lista)})&select=fatura_id`,
    { method: "GET" }
  );
  return new Set((dados || []).map(item => String(item.fatura_id)));
}

async function processarFatura(baseUrl, auth, fatura) {
  const valor = valorPago(fatura);
  const creditos = Math.floor(valor / 50);
  if (creditos < 1) {
    return { faturaId: String(fatura.id), resultado: "sem_creditos", valor, creditos: 0 };
  }

  const cliente = await buscarCliente(baseUrl, auth, fatura.id_cliente);
  if (!cliente) throw new Error(`Cliente ${fatura.id_cliente} não encontrado`);

  const cpf = limparCpf(cliente.cnpj_cpf || cliente.cpf_cnpj || "");
  if (cpf.length !== 11) throw new Error(`Cliente ${cliente.id} sem CPF válido`);

  const nome = cliente.razao || cliente.nome || cliente.fantasia || "Cliente IXC";
  const retorno = await supabase("rpc/game_adicionar_creditos", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      p_cpf: cpf,
      p_nome: nome,
      p_fatura_id: String(fatura.id),
      p_valor: valor,
      p_creditos: creditos
    })
  });

  const creditado = Array.isArray(retorno) ? Boolean(retorno[0]) : Boolean(retorno);
  return {
    faturaId: String(fatura.id),
    clienteId: String(cliente.id),
    cpf,
    valor,
    creditos,
    resultado: creditado ? "creditado" : "duplicado"
  };
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({ erro: "Use GET ou POST" });
  }

  const inicioExecucao = new Date();
  let janelaInicio = null;
  let detalhes = [];

  try {
    const segredo = process.env.CRON_SECRET;
    const recebido = req.headers.authorization?.replace(/^Bearer\s+/i, "") || req.query?.secret;
    if (!segredo || recebido !== segredo) {
      return res.status(401).json({ erro: "Não autorizado" });
    }

    const IXC_URL = process.env.IXC_URL;
    const IXC_USER = process.env.IXC_USER;
    const IXC_PASS = process.env.IXC_PASS;
    if (!IXC_URL || !IXC_USER || !IXC_PASS) {
      return res.status(500).json({ erro: "IXC não configurado na Vercel" });
    }

    const ultima = await buscarEstado();
    janelaInicio = ultima
      ? new Date(ultima.getTime() - MARGEM_SEGURANCA_MINUTOS * 60 * 1000)
      : new Date(inicioExecucao.getTime() - 24 * 60 * 60 * 1000);

    const datas = datasEntre(janelaInicio, inicioExecucao);
    const baseUrl = IXC_URL.replace(/\/+$/, "");
    const auth = Buffer.from(`${IXC_USER}:${IXC_PASS}`).toString("base64");
    const encontradas = await listarRecebidas(baseUrl, auth, datas);

    const candidatas = encontradas.filter(fatura => {
      const instante = instantePagamento(fatura);
      return !instante || instante >= janelaInicio;
    });

    const processadas = await faturasJaProcessadas(candidatas.map(f => String(f.id)));
    const novas = candidatas.filter(f => !processadas.has(String(f.id)));

    detalhes = candidatas
      .filter(f => processadas.has(String(f.id)))
      .map(f => ({ faturaId: String(f.id), resultado: "duplicado" }));

    for (const fatura of novas) {
      try { detalhes.push(await processarFatura(baseUrl, auth, fatura)); }
      catch (erro) {
        detalhes.push({ faturaId: String(fatura?.id || ""), resultado: "erro", erro: erro.message });
      }
    }

    const fimExecucao = new Date();
    const resumo = {
      encontradas: candidatas.length,
      novas: novas.length,
      creditadas: detalhes.filter(x => x.resultado === "creditado").length,
      duplicadas: detalhes.filter(x => x.resultado === "duplicado").length,
      semCreditos: detalhes.filter(x => x.resultado === "sem_creditos").length,
      erros: detalhes.filter(x => x.resultado === "erro").length
    };

    await registrarLog({
      inicio_em: inicioExecucao.toISOString(),
      fim_em: fimExecucao.toISOString(),
      janela_inicio: janelaInicio.toISOString(),
      janela_fim: inicioExecucao.toISOString(),
      datas_consultadas: datas,
      encontradas: resumo.encontradas,
      novas: resumo.novas,
      creditadas: resumo.creditadas,
      duplicadas: resumo.duplicadas,
      sem_creditos: resumo.semCreditos,
      erros: resumo.erros,
      sucesso: resumo.erros === 0,
      detalhes
    });

    // Só avança o marcador depois que a execução terminou e o log foi salvo.
    await salvarEstado(inicioExecucao);

    return res.status(200).json({
      ok: true,
      janelaInicio: janelaInicio.toISOString(),
      janelaFim: inicioExecucao.toISOString(),
      datasConsultadas: datas,
      ...resumo,
      detalhes
    });
  } catch (erro) {
    console.error("Sincronizar pagamentos:", erro);
    try {
      await registrarLog({
        inicio_em: inicioExecucao.toISOString(),
        fim_em: new Date().toISOString(),
        janela_inicio: janelaInicio?.toISOString() || null,
        janela_fim: inicioExecucao.toISOString(),
        encontradas: 0,
        novas: 0,
        creditadas: detalhes.filter(x => x.resultado === "creditado").length,
        duplicadas: detalhes.filter(x => x.resultado === "duplicado").length,
        sem_creditos: detalhes.filter(x => x.resultado === "sem_creditos").length,
        erros: Math.max(1, detalhes.filter(x => x.resultado === "erro").length),
        sucesso: false,
        mensagem_erro: erro.message,
        detalhes
      });
    } catch (erroLog) {
      console.error("Falha ao registrar log:", erroLog);
    }
    return res.status(500).json({ erro: "Erro ao sincronizar pagamentos", detalhe: erro.message });
  }
}
