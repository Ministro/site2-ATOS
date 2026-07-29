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
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`IXC não retornou JSON (status ${resp.status}): ${text.slice(0, 300)}`);
  }
  if (!resp.ok) {
    throw new Error(`IXC status ${resp.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

function numero(valor) {
  if (typeof valor === "number") return valor;
  const texto = String(valor ?? "").trim();
  if (!texto) return 0;
  // Aceita 150.00, 150,00 e 1.150,00.
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

function valorPago(fatura) {
  const candidatos = [
    fatura.valor_recebido,
    fatura.valor_pago,
    fatura.valor_total_recebido,
    fatura.valor
  ];
  for (const candidato of candidatos) {
    const n = numero(candidato);
    if (n > 0) return n;
  }
  return 0;
}

async function creditarPagamento({ fatura, cliente }) {
  const cpf = limparCpf(cliente?.cnpj_cpf || cliente?.cpf_cnpj || "");
  if (cpf.length !== 11) {
    throw new Error("O cadastro do cliente no IXC não possui um CPF válido");
  }

  const valor = valorPago(fatura);
  const creditos = Math.floor(valor / 50);
  const nome = cliente?.razao || cliente?.nome || cliente?.fantasia || "Cliente IXC";

  // Pagamentos menores que R$ 50 são confirmados normalmente, mas não geram crédito.
  if (creditos < 1) {
    return { creditado: false, duplicado: false, creditosGerados: 0, saldo: null };
  }

  const retorno = await supabase("rpc/game_creditar_pagamento", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      p_fatura_id: String(fatura.id),
      p_cpf: cpf,
      p_nome: nome,
      p_valor_pago: valor,
      p_pago_em: fatura.pagamento_data || fatura.data_pagamento || null
    })
  });

  const resultado = Array.isArray(retorno) ? retorno[0] : retorno;
  return {
    creditado: Boolean(resultado?.creditado),
    duplicado: Boolean(resultado?.duplicado),
    creditosGerados: Number(resultado?.creditos_gerados || 0),
    saldo: resultado?.saldo_atual == null ? null : Number(resultado.saldo_atual)
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Use POST" });
  }

  try {
    const { clienteId, faturaId } = req.body || {};
    if (!clienteId || !faturaId) {
      return res.status(400).json({ erro: "Cliente e fatura são obrigatórios" });
    }

    const IXC_URL = process.env.IXC_URL;
    const IXC_USER = process.env.IXC_USER;
    const IXC_PASS = process.env.IXC_PASS;
    if (!IXC_URL || !IXC_USER || !IXC_PASS) {
      return res.status(500).json({ erro: "IXC não configurado na Vercel" });
    }

    const auth = Buffer.from(`${IXC_USER}:${IXC_PASS}`).toString("base64");
    const baseUrl = IXC_URL.replace(/\/+$/, "");

    // Consulta somente a fatura que foi mostrada ao cliente.
    const faturasData = await ixcListar(`${baseUrl}/fn_areceber`, {
      qtype: "fn_areceber.id",
      query: String(faturaId),
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "fn_areceber.id",
      sortorder: "desc"
    }, auth);

    const fatura = (faturasData.registros || [])[0];
    if (!fatura || String(fatura.id_cliente) !== String(clienteId)) {
      return res.status(404).json({ erro: "Fatura não encontrada", pago: false });
    }

    const status = String(fatura.status || "").toUpperCase();
    // No IXC, baixa manual pode aparecer como P (Baixado) e recebimento como R.
    if (!new Set(["R", "P"]).has(status)) {
      return res.status(200).json({ pago: false, status });
    }

    // Recupera o CPF e o nome diretamente do IXC, sem confiar nos dados do navegador.
    const clienteData = await ixcListar(`${baseUrl}/cliente`, {
      qtype: "cliente.id",
      query: String(clienteId),
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente.id",
      sortorder: "desc"
    }, auth);

    const cliente = (clienteData.registros || [])[0];
    if (!cliente) {
      return res.status(404).json({ erro: "Cliente não encontrado no IXC", pago: true });
    }

    const credito = await creditarPagamento({ fatura, cliente });

    return res.status(200).json({
      pago: true,
      status,
      faturaId: String(fatura.id),
      valorPago: valorPago(fatura),
      ...credito
    });
  } catch (e) {
    console.error("Verificar pagamento e creditar:", e);
    return res.status(500).json({
      erro: "Erro ao confirmar pagamento",
      detalhe: e.message
    });
  }
}
