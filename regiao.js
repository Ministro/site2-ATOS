// ===== CONSULTE SUA REGIÃO (busca de planos por localidade) =====
(function () {
  const dados = {
    "Candeias Área Urbana": {
      instalacao:
        "<strong>Com fidelidade:</strong> Instalação R$100,00 no Ato da Instalação.<br><strong>Sem fidelidade:</strong> R$ 200,00 no Ato da instalação.",
      planos: {
        "300MB": "109,99",
        "500MB": "134,99",
        "700MB": "149,99",
        "800MB": "169,99",
        "1000MB": "199,99",
      },
      obs: "<strong>Com fidelidade (12 meses):</strong> Taxa de instalação de R$ 100,00 a vista, com permanência mínima de 12 meses.<br><strong>Sem fidelidade:</strong> Taxa de instalação de R$ 200,00 à vista, com possibilidade de cancelamento a qualquer momento.",
    },
    "Setor chacareiro depois do Cemitério/Candeias": {
      instalacao: "350,00 à vista/ R$450,00 Parcelado",
      planos: { "200MB": "149,99", "300MB": "169,99", "400MB": "249,99" },
      obs: "R$450,00 Instalação parcelado com entrada de R$200,00",
    },
    "Setor chacareiro antes do Cemitério/Candeias": {
      instalacao: "250,00 à vista/ R$350,00 Parcelado",
      planos: { "200MB": "149,99", "300MB": "169,99", "400MB": "249,99" },
      obs: "R$350,00 Instalação parcelado com entrada de R$150,00",
    },
    "Green-PK": {
      instalacao: "R$200,00",
      planos: {
        "300MB": "109,99",
        "500MB": "134,99",
        "700MB": "149,99",
        "800MB": "169,99",
        "1000MB": "199,99",
      },
      obs: "Com fidelidade ou sem fidelidade é R$200,00",
    },
    Pamus: {
      instalacao: "R$350,00 à vista / R$700,00 parcelado",
      planos: { "200MB": "149,99", "300MB": "199,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$300,00 de entrada",
    },
    "55A": {
      instalacao: "R$350,00 à vista / R$700,00 parcelado",
      planos: { "200MB": "149,99", "300MB": "199,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$300,00 de entrada",
    },
    "55B": {
      instalacao: "R$350,00 à vista / R$700,00 parcelado",
      planos: { "200MB": "149,99", "300MB": "199,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$300,00 de entrada",
    },
    "BR 364-Cuiba": {
      instalacao: "R$700,00 à vista / R$1.100,00 parcelado",
      planos: { "200MB": "169,99", "300MB": "199,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$500,00 de entrada",
    },
    "BR 364-KM50 (Cinquentinha)": {
      instalacao: "R$700,00 à vista / R$1.100,00 parcelado",
      planos: { "200MB": "169,99", "300MB": "199,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$600,00 de entrada",
    },
    "BR 364-PVH": {
      instalacao: "R$250,00 à vista",
      planos: { "200MB": "109,99", "300MB": "129,99", "400MB": "139,99" },
      obs: "",
    },
    "Rancho Alegre": {
      instalacao: "R$600,00 à vista / R$900,00 parcelado",
      planos: { "200MB": "149,99", "300MB": "199,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$400,00 de entrada",
    },
    "BR 364 (Cuiabá,Após o Silos)": {
      instalacao: "R$700,00 à vista / R$1.100,00 parcelado",
      planos: { "200MB": "169,99", "300MB": "199,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$600,00 de entrada",
    },
    "Corpo Dourado": {
      instalacao: "R$350,00 à vista / R$450,00 parcelado",
      planos: { "200MB": "149,99", "300MB": "169,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$200,00 de entrada",
    },
    "Santa Luzia": {
      instalacao: "250,00 à vista",
      planos: { "200MB": "149,99", "300MB": "169,99", "400MB": "249,99" },
      obs: "",
    },
    "Setor Industrial PVH": {
      instalacao: "250,00 à vista",
      planos: {
        "200MB": "129,99",
        "400MB": "149,99",
        "600MB": "169,99",
        "800MB": "199,99",
      },
      obs: "",
    },
    "Bacia Leiteira Bom Jesus": {
      instalacao: "R$600,00 à vista / R$900,00 parcelado",
      planos: { "200MB": "149,99", "300MB": "199,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$400,00 de entrada",
    },
    "Bacia Leiteira Ramal do Boto": {
      instalacao: "R$600,00 à vista / R$900,00 parcelado",
      planos: { "200MB": "149,99", "300MB": "199,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$400,00 de entrada",
    },
    "Bacia Leiteira Ramal da Fortuna": {
      instalacao: "R$600,00 à vista / R$900,00 parcelado",
      planos: { "200MB": "149,99", "300MB": "199,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$400,00 de entrada",
    },
    "Bairro 13/ Castanheiras": {
      instalacao: "R$200,00 à vista",
      planos: { "100MB": "99,99", "200MB": "119,99", "300MB": "129,99" },
      obs: "",
    },
    Piquiá: {
      instalacao: "600,00 à vista / 900,00 parcelado",
      planos: { "200MB": "149,99", "300MB": "199,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$400,00 de entrada",
    },
    "Bairro Novo de Candeias": {
      instalacao: "R$200,00 à vista",
      planos: {
        "200MB": "109,99",
        "300MB": "129,99",
        "400MB": "139,99",
        "500MB": "159,99",
      },
      obs: "",
    },
    "Linha do Caju": {
      instalacao: "R$350,00 à vista/ parcelado R$600,00",
      planos: { "200MB": "149,99", "300MB": "169,99", "400MB": "249,99" },
      obs: "Instalação parcelada tem que dar R$300,00 de entrada",
    },
  };

  const apelidos = {
    green: "Green-PK",
    Candeias: "Candeias Área Urbana",
    "green park": "Green-PK",
    "green-pk": "Green-PK",
    candeias: "Candeias Área Urbana",
    cemiterio: "Setor chacareiro depois do Cemitério/Candeias",
    "setor chacareiro": "Setor chacareiro depois do Cemitério/Candeias",
    industrial: "Setor Industrial PVH",
    setor: "Setor chacareiro antes do Cemitério/Candeias",
    corpo: "Corpo Dourado",
    "corpo dourado": "Corpo Dourado",
    br364: "BR 364 (Cuiabá,Após o Silos)",
    caju: "Linha do Caju",
    rancho: "Rancho Alegre",
    "santa luzia": "Santa Luzia",
    piquia: "Piquiá",
    bacia: "Bacia Leiteira Ramal do Boto",
    boto: "Bacia Leiteira Ramal do Boto",
    fortuna: "Bacia Leiteira Ramal da Fortuna",
    "ramal da fortuna": "Bacia Leiteira Ramal da Fortuna",
    "bom jesus": "Bacia Leiteira Bom Jesus",
    br: "BR 364-Cuiba",
    "rancho alegre": "Rancho Alegre",
    "rio preto": "Bairro Novo de Candeias",
    dallas: "Bairro Novo de Candeias",
    loteamento: "Bairro Novo de Candeias",
    Loteamento: "Bairro Novo de Candeias",
    Caju: "Linha do Caju",
    cinquentinha: "BR 364-KM50 (Cinquentinha)",
    50: "BR 364-KM50 (Cinquentinha)",
    "ramal do boto": "Bacia Leiteira Ramal do Boto",
    "linha do caju": "Linha do Caju",
  };

  const btnBuscar = document.getElementById("regiaoBtnBuscar");
  const btnImprimir = document.getElementById("regiaoBtnImprimir");
  const resultado = document.getElementById("regiaoResultado");
  const busca = document.getElementById("regiaoBusca");

  if (!btnBuscar || !busca) return;

  busca.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      pesquisar();
    }
  });

  btnBuscar.addEventListener("click", pesquisar);
  btnImprimir.addEventListener("click", imprimir);

  function pesquisar() {
    const termo = busca.value.trim().toLowerCase();
    const chave =
      apelidos[termo] ||
      Object.keys(dados).find((n) => n.toLowerCase().includes(termo));

    if (!chave) {
      resultado.innerHTML = "<strong>Nenhuma localidade encontrada.</strong>";
      resultado.classList.add("show");
      btnImprimir.style.display = "none";
      return;
    }

    const info = dados[chave];
    let html = `<h3>${chave}</h3>`;
    html += `<p class="regiao-instalacao"><strong>Instalação:</strong><br>${info.instalacao}</p>`;
    html += `<p class="regiao-label-planos"><strong>Planos:</strong></p><ul class="regiao-planos-list">`;
    for (const plano in info.planos) {
      html += `<li>${plano}: R$ ${info.planos[plano]}</li>`;
    }
    html += `</ul>`;
    html += `<p class="regiao-obs"><strong>Observações:</strong><br>${
      info.obs || "Nenhuma"
    }</p>`;

    resultado.innerHTML = html;
    resultado.classList.add("show");
    btnImprimir.style.display = "inline-flex";
  }

  function imprimir() {
    if (!resultado.innerHTML) {
      alert("Nenhum resultado para imprimir.");
      return;
    }
    const logoUrl =
      "https://i.supaimg.com/12820c3b-da0c-4cbf-86c0-12ae6f6217c6.png";
    const janela = window.open("", "_blank");
    janela.document.write(`<html><head><title>Impressão</title><style>
          body{font-family:Poppins,sans-serif;padding:20px;}
          h1{text-align:center;color:#333;}
          h3{color:#5e72e4;}
          ul{padding-left:20px;}
          img{display:block;margin:0 auto 15px auto; max-width:150px;}
        </style></head><body>
          <img src="${logoUrl}" alt="Logo Atos Telecom">
          <h1>Planos Atos Telecom</h1>
          ${resultado.innerHTML}
        </body></html>`);
    janela.document.close();
    janela.onload = function () {
      janela.print();
      janela.close();
    };
  }
})();
