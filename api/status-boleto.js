import https from "https";

const insecureAgent = new https.Agent({
  rejectUnauthorized: false
});

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

  const json = await resp.json();

  return json;

}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Use POST" });
  }

  try {

    const { clienteId } = req.body;

    const IXC_URL = process.env.IXC_URL;
    const IXC_USER = process.env.IXC_USER;
    const IXC_PASS = process.env.IXC_PASS;

    const auth = Buffer.from(`${IXC_USER}:${IXC_PASS}`).toString("base64");

    const baseUrl = IXC_URL.replace(/\/+$/, "");

    // Procura boletos em aberto

    const emAberto = await ixcListar(`${baseUrl}/fn_areceber`, {

      qtype: "fn_areceber.id_cliente",
      query: String(clienteId),
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

    if ((emAberto.registros || []).length > 0) {

      return res.json({
        pago: false
      });

    }

    // Procura boletos pagos

    const pagos = await ixcListar(`${baseUrl}/fn_areceber`, {

      qtype: "fn_areceber.id_cliente",
      query: String(clienteId),
      oper: "=",
      page: "1",
      rp: "5",
      sortname: "fn_areceber.pagamento_data",
      sortorder: "desc",
      grid_param: JSON.stringify([
        { TB: "fn_areceber.status", OP: "=", P: "R" }
      ])

    }, auth);

    if ((pagos.registros || []).length > 0) {

      return res.json({
        pago: true
      });

    }

    return res.json({
      pago: false
    });

  } catch (e) {

    console.error(e);

    return res.status(500).json({
      erro: "Erro interno"
    });

  }

}
