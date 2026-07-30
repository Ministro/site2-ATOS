import https from "https";
import { limparCpf, supabase } from "./_supabase.js";

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

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

function hojeBrasil() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Porto_Velho",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const get = tipo => partes.find(p => p.type === tipo)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dataPagamento(fatura) {
  return String(
    fatura.pagamento_data ||
    fatura.data_pagamento ||
    fatura.data_recebimento ||
    fatura.data_baixa ||
    ""
  ).slice(0, 10);
}

async function listarRecebidasDoDia(baseUrl, auth, data) {
  const resultados = [];
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

  // Alguns IXCs ignoram qtype por data em baixas manuais. Faz uma segunda leitura
  // dos registros mais recentes e mantém somente os que possuem data de pagamento de hoje.
  for (const status of ["R", "P"]) {
    const resposta = await ixcListar(`${baseUrl}/fn_areceber`, {
      qtype: "fn_areceber.status",
      query: status,
      oper: "=",
      page: "1",
      rp: "200",
      sortname: "fn_areceber.id",
      sortorder: "desc"
    }, auth);
    resultados.push(...(resposta.registros || []).filter(f => dataPagamento(f) === data));
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

async function registrarLogSeguro(log) {
  try {
    await supabase("game_sync_logs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(log)
    });
  } catch (erro) {
    // O log nunca pode derrubar a sincronização principal.
    console.warn("Não foi possível registrar game_sync_logs:", erro.message);
  }
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({ erro: "Use GET ou POST" });
  }

  const inicioExecucao = new Date();
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

    const data = String(req.query?.data || hojeBrasil()).slice(0, 10);
    const baseUrl = IXC_URL.replace(/\/+$/, "");
    const auth = Buffer.from(`${IXC_USER}:${IXC_PASS}`).toString("base64");
    const faturas = await listarRecebidasDoDia(baseUrl, auth, data);

    const detalhes = [];
    for (const fatura of faturas) {
      try { detalhes.push(await processarFatura(baseUrl, auth, fatura)); }
      catch (erro) {
        detalhes.push({ faturaId: String(fatura?.id || ""), resultado: "erro", erro: erro.message });
      }
    }

    const resumo = {
      encontradas: faturas.length,
      creditadas: detalhes.filter(x => x.resultado === "creditado").length,
      duplicadas: detalhes.filter(x => x.resultado === "duplicado").length,
      semCreditos: detalhes.filter(x => x.resultado === "sem_creditos").length,
      erros: detalhes.filter(x => x.resultado === "erro").length
    };

    await registrarLogSeguro({
      iniciado_em: inicioExecucao.toISOString(),
      finalizado_em: new Date().toISOString(),
      periodo_inicio: `${data}T00:00:00-04:00`,
      periodo_fim: `${data}T23:59:59-04:00`,
      encontradas: resumo.encontradas,
      novas: resumo.creditadas,
      creditadas: resumo.creditadas,
      duplicadas: resumo.duplicadas,
      erros: resumo.erros,
      detalhes
    });

    return res.status(200).json({ ok: true, data, ...resumo, detalhes });
  } catch (erro) {
    console.error("Sincronizar pagamentos:", erro);
    return res.status(500).json({ erro: "Erro ao sincronizar pagamentos", detalhe: erro.message });
  }
}
