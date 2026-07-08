const cpfInput = document.getElementById("boletoCpf");
const btn = document.getElementById("boletoConsultarBtn");
const loading = document.getElementById("boletoLoading");
const erroBox = document.getElementById("boletoErro");
const resultado = document.getElementById("boletoResultado");
let clienteAtual = null;
let verificarPagamentoTimer = null;

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
      body: JSON.stringify({ cpf })
    });

    const data = await resp.json();

    if (!resp.ok) {
      mostrarErro(data.erro || "Erro ao consultar boleto.");
      if (data.detalhe) console.error("Detalhe do erro:", data.detalhe);
      return;
    }

    if (data.emDia) {

  mostrarEmDia(data.mensagem);

} else {

  preencherResultado(data);

  clienteAtual = data.cliente.id;

  iniciarVerificacaoPagamento();

}

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

function mostrarEmDia(msg){

  resultado.style.display = "block";

  resultado.innerHTML = `

    <div class="status-dia">

      <h2>🎉 Você está em dia!</h2>

      <p>${msg}</p>

    </div>

  `;

}

function iniciarVerificacaoPagamento(){

  if(verificarPagamentoTimer){
    clearInterval(verificarPagamentoTimer);
  }


  verificarPagamentoTimer = setInterval(async ()=>{


    try{


      const resp = await fetch("/api/status-boleto",{

        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({

          clienteId:clienteAtual

        })

      });


      const data = await resp.json();


      if(data.pago){


        clearInterval(verificarPagamentoTimer);


        mostrarPagamentoConfirmado();


      }


    }catch(e){

      console.error("Erro ao verificar pagamento",e);

    }


  },5000);


}

function mostrarPagamentoConfirmado(){


resultado.innerHTML = `

<div class="status-sucesso">


<h1>✅</h1>

<h2>FATURA PAGA COM SUCESSO</h2>


<p>
Pagamento confirmado.
</p>


<p>
Obrigado por escolher a Atos Telecom.
</p>


</div>

`;


resultado.style.display="block";


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

document.getElementById("boletoCopiarPix")
.addEventListener("click", () => copiar("boletoPix"));


document.getElementById("boletoCopiarLinha")
.addEventListener("click", () => copiar("boletoLinhaDigitavel"));

function copiar(id) {
  const el = document.getElementById(id);
  el.select();
  el.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(el.value).catch(() => {
    document.execCommand("copy");
  });
}


