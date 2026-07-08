// ===== CONSULTA DE BOLETO POR CPF (2ª Via da Fatura) =====
// Adaptado do mini-site original (boleto.html/boleto.js) para viver dentro do modal do site principal.
// Depende de um endpoint /api/boleto (serverless function) já existente no projeto.
(function () {
  const cpfInput = document.getElementById("boletoCpf");
  const btn = document.getElementById("boletoConsultarBtn");
  const loading = document.getElementById("boletoLoading");
  const erroBox = document.getElementById("boletoErro");
  const resultado = document.getElementById("boletoResultado");

  if (!cpfInput || !btn) return; // modal ainda não está no DOM por algum motivo

  // máscara de CPF ao digitar
  cpfInput.addEventListener("input", () => {
    let v = cpfInput.value.replace(/\D/g, "").slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    cpfInput.value = v;
  });

  btn.addEventListener("click", consultar);
  cpfInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") consultar();
  });

  async function consultar() {
    const cpf = cpfInput.value.trim();
    erroBox.style.display = "none";
    resultado.style.display = "none";

    if (!cpf) {
      mostrarErro("Digite um CPF.");
      return;
    }

    loading.style.display = "block";
    btn.disabled = true;

    try {
      const resp = await fetch("/api/boleto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        mostrarErro(data.erro || "Erro ao consultar boleto.");
        if (data.detalhe) console.error("Detalhe do erro:", data.detalhe);
        return;
      }
      preencherResultado(data);
    } catch (err) {
      mostrarErro("Não foi possível conectar ao servidor.");
      console.error(err);
    } finally {
      loading.style.display = "none";
      btn.disabled = false;
    }
  }

  function preencherResultado(data) {
    document.getElementById("boletoCliente").textContent = data.cliente.nome || "-";
    document.getElementById("boletoValor").textContent = formatarValor(data.boleto.valor);
    document.getElementById("boletoVencimento").textContent = formatarData(data.boleto.vencimento);
    document.getElementById("boletoStatus").textContent = traduzirStatus(data.boleto.status);

    const qrImg = document.getElementById("boletoQrcode");
    const pixArea = document.getElementById("boletoPix");
    const linhaArea = document.getElementById("boletoLinhaDigitavel");

    if (data.pix?.qrcodeDataUri) {
      qrImg.src = data.pix.qrcodeDataUri;
      qrImg.style.display = "inline-block";
    } else {
      qrImg.style.display = "none";
    }

    pixArea.value = data.pix?.copiaCola || "PIX indisponível no momento";
    linhaArea.value = data.boleto.linha_digitavel || "Não informado";

    resultado.style.display = "block";
  }

  function mostrarErro(msg) {
    erroBox.textContent = msg;
    erroBox.style.display = "block";
  }

  function formatarValor(v) {
    const n = Number(v);
    if (isNaN(n)) return v || "-";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatarData(d) {
    if (!d) return "-";
    const partes = String(d).split(/[- ]/);
    if (partes.length >= 3 && partes[0].length === 4) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return d;
  }

  function traduzirStatus(s) {
    const mapa = { A: "Em aberto", P: "Baixado", R: "Recebido", C: "Cancelado" };
    return mapa[s] || s || "-";
  }

  function copiar(id) {
    const el = document.getElementById(id);
    el.select();
    el.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(el.value).catch(() => {
      document.execCommand("copy");
    });
  }

  const btnCopiarPix = document.getElementById("boletoCopiarPix");
  const btnCopiarLinha = document.getElementById("boletoCopiarLinha");
  if (btnCopiarPix) btnCopiarPix.addEventListener("click", () => copiar("boletoPix"));
  if (btnCopiarLinha) btnCopiarLinha.addEventListener("click", () => copiar("boletoLinhaDigitavel"));
})();
