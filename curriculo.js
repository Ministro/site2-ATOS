(function () {
  const form = document.getElementById("curriculoForm");
  if (!form) return;

  const telefoneInput = document.getElementById("curriculoTelefone");
  const anexoInput = document.getElementById("curriculoAnexo");
  const anexoBtn = document.getElementById("curriculoAnexoBtn");
  const anexoNome = document.getElementById("curriculoAnexoNome");
  const anexoErro = document.getElementById("curriculoAnexoErro");
  const loading = document.getElementById("curriculoLoading");
  const erroBox = document.getElementById("curriculoErro");
  const sucessoBox = document.getElementById("curriculoSucesso");
  const submitBtn = document.getElementById("curriculoSubmitBtn");

  const TAMANHO_MAXIMO_MB = 5;

  // máscara de telefone
  telefoneInput.addEventListener("input", () => {
    let v = telefoneInput.value.replace(/\D/g, "").slice(0, 11);
    v = v.replace(/(\d{2})(\d)/, "($1) $2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    telefoneInput.value = v;
  });

  // abrir seletor de arquivo pelo botão "Procurar"
  anexoBtn.addEventListener("click", () => anexoInput.click());

  anexoInput.addEventListener("change", () => {
    anexoErro.style.display = "none";
    anexoErro.textContent = "";

    const arquivo = anexoInput.files[0];
    if (!arquivo) {
      anexoNome.textContent = "Nenhum arquivo selecionado";
      return;
    }

    const isPdf =
      arquivo.type === "application/pdf" ||
      arquivo.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      mostrarErroAnexo("Envie apenas arquivos em PDF.");
      anexoInput.value = "";
      anexoNome.textContent = "Nenhum arquivo selecionado";
      return;
    }

    const tamanhoMb = arquivo.size / (1024 * 1024);
    if (tamanhoMb > TAMANHO_MAXIMO_MB) {
      mostrarErroAnexo(`O arquivo deve ter no máximo ${TAMANHO_MAXIMO_MB}MB.`);
      anexoInput.value = "";
      anexoNome.textContent = "Nenhum arquivo selecionado";
      return;
    }

    anexoNome.textContent = arquivo.name;
  });

  function mostrarErroAnexo(msg) {
    anexoErro.textContent = msg;
    anexoErro.style.display = "block";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erroBox.style.display = "none";
    sucessoBox.style.display = "none";

    const vaga = document.getElementById("curriculoVaga").value;
    const nome = document.getElementById("curriculoNome").value.trim();
    const email = document.getElementById("curriculoEmail").value.trim();
    const telefone = telefoneInput.value.trim();
    const mensagem = document.getElementById("curriculoMensagem").value.trim();
    const consentimento = document.getElementById("curriculoConsentimento").checked;
    const arquivo = anexoInput.files[0];

    if (!consentimento) {
      mostrarErro("Você precisa concordar com o tratamento de dados para continuar.");
      return;
    }

    const dados = new FormData();
    dados.append("vaga", vaga);
    dados.append("nome", nome);
    dados.append("email", email);
    dados.append("telefone", telefone);
    dados.append("mensagem", mensagem);
    if (arquivo) {
      dados.append("anexo", arquivo);
    }

    loading.style.display = "block";
    submitBtn.disabled = true;

    try {
      const resp = await fetch("/api/curriculo", {
        method: "POST",
        body: dados
      });

      const data = await resp.json();

      if (!resp.ok) {
        mostrarErro(data.error || "Erro ao enviar currículo.");
        if (data.detalhe) console.error("Detalhe do erro:", data.detalhe);
        return;
      }

      form.style.display = "none";
      sucessoBox.style.display = "block";
    } catch (err) {
      mostrarErro("Não foi possível conectar ao servidor.");
      console.error(err);
    } finally {
      loading.style.display = "none";
      submitBtn.disabled = false;
    }
  });

  function mostrarErro(msg) {
    erroBox.textContent = msg;
    erroBox.style.display = "block";
  }
})();
