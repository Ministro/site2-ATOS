import https from "https";

// Necessário quando o IXC usa certificado SSL autoassinado.
// Sem isso, o fetch derruba a conexão e cai no catch como "Erro interno" (500).
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

function limparCpf(cpf) {
  return String(cpf).replace(/\D/g, "");
}

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

// get_pix é uma chamada de ação, não usa o header "ixcsoft: listar"
async function ixcGetPix(baseUrl, idAreceber, auth) {
  const resp = await fetch(`${baseUrl}/get_pix`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`
    },
    body: JSON.stringify({ id_areceber: String(idAreceber) }),
    agent: baseUrl.startsWith("https:") ? insecureAgent : undefined
  });

  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`get_pix não retornou JSON (status ${resp.status}): ${text.slice(0, 300)}`);
  }
  if (!resp.ok) {
    throw new Error(`get_pix status ${resp.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

// Formato confirmado nesse IXC: { type: "success", pix: { qrCode: { qrcode, imagemQrcode } } }
function extrairPix(pixData) {
  if (pixData?.type !== "success") {
    return { qrcodeDataUri: null, copiaCola: null };
  }

  const copiaCola = pixData.pix?.qrCode?.qrcode || null;
  const qrcodeBruto = pixData.pix?.qrCode?.imagemQrcode || null;

  let qrcodeDataUri = null;
  if (qrcodeBruto) {
    qrcodeDataUri = qrcodeBruto.startsWith("data:")
      ? qrcodeBruto
      : `data:image/png;base64,${qrcodeBruto}`;
  }

  return { qrcodeDataUri, copiaCola };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Use POST" });
  }

  try {
    const { cpf } = req.body || {};
    if (!cpf) {
      return res.status(400).json({ erro: "CPF obrigatório" });
    }

    const IXC_URL = process.env.IXC_URL;
    const IXC_USER = process.env.IXC_USER;
    const IXC_PASS = process.env.IXC_PASS;

    if (!IXC_URL || !IXC_USER || !IXC_PASS) {
      return res.status(500).json({ erro: "Variáveis IXC_URL / IXC_USER / IXC_PASS não configuradas na Vercel" });
    }

    const baseUrl = IXC_URL.replace(/\/+$/, ""); // remove barra final se tiver
    const auth = Buffer.from(`${IXC_USER}:${IXC_PASS}`).toString("base64");
    const cpfLimpo = limparCpf(cpf);
    const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

    // 1. localizar cliente pelo CPF
    let clienteData;
    try {
      clienteData = await ixcListar(`${baseUrl}/cliente`, {
        qtype: "cnpj_cpf",
        query: cpfFormatado,
        oper: "=",
        page: "1",
        rp: "20",
        sortname: "cliente.id",
        sortorder: "desc"
      }, auth);
    } catch (e) {
      throw new Error(`[ETAPA CLIENTE] ${e.message}`);
    }

    const cliente = clienteData?.registros?.[0];
    if (!cliente) {
      return res.status(404).json({ erro: "Cliente não encontrado" });
    }

    // 2. buscar boletos do cliente
    let boletosData;
    try {
      boletosData = await ixcListar(`${baseUrl}/fn_areceber`, {
        qtype: "fn_areceber.id_cliente",
        query: String(cliente.id),
        oper: "=",
        page: "1",
        rp: "20",
        sortname: "fn_areceber.data_vencimento",
        sortorder: "asc",
        grid_param: JSON.stringify([
          { TB: "fn_areceber.liberado", OP: "=", P: "S" },
          { TB: "fn_areceber.status", OP: "!=", P: "C" },
          { TB: "fn_areceber.status", OP: "!=", P: "R" }
        ])
      }, auth);
    } catch (e) {
      throw new Error(`[ETAPA BOLETOS] ${e.message}`);
    }

    const boletos = boletosData?.registros || [];
    if (boletos.length === 0) {
      return res.status(404).json({ erro: "Nenhum boleto em aberto encontrado para esse cliente" });
    }

    // ordena por vencimento e prioriza o vencido; senão pega o próximo a vencer
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ordenados = [...boletos].sort(
      (a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento)
    );
    const vencido = ordenados.find(b => new Date(`${b.data_vencimento}T00:00:00`) < hoje);
    const boleto = vencido || ordenados[0];

    // 3. buscar o PIX do boleto escolhido
    let pix = { qrcodeDataUri: null, copiaCola: null };
    try {
      const pixData = await ixcGetPix(baseUrl, boleto.id, auth);
      pix = extrairPix(pixData);
    } catch (pixErr) {
      console.error("Falha ao buscar PIX:", pixErr.message);
      // não trava a consulta — o front mostra o boleto mesmo sem QR
    }

    return res.status(200).json({
      cliente: {
        nome: cliente.razao || cliente.nome || cliente.fantasia || "-",
        cpf_cnpj: cliente.cnpj_cpf || cliente.cpf_cnpj || cpf
      },
      boleto: {
        id: boleto.id,
        valor: boleto.valor,
        vencimento: boleto.data_vencimento,
        status: boleto.status,
        linha_digitavel: boleto.linha_digitavel || boleto.nosso_numero || ""
      },
      pix: {
        qrcodeDataUri: pix.qrcodeDataUri,
        copiaCola: pix.copiaCola
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro interno", detalhe: err.message });
  }
}
