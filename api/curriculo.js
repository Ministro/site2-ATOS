export const config = {
  runtime: "edge",
};

// TODO: troque pelo chat_id da conversa "CURRÍCULO" no Telegram
const CHAT_ID_CURRICULO = "-1003565362692";

export default async function handler(request) {
  try {
    const formData = await request.formData();

    const vaga = formData.get("vaga") || "Não informado";
    const nome = formData.get("nome") || "Não informado";
    const email = formData.get("email") || "Não informado";
    const telefone = formData.get("telefone") || "Não informado";
    const mensagem = formData.get("mensagem") || "";
    const anexo = formData.get("anexo"); // arquivo PDF (ou null)

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "TELEGRAM_BOT_TOKEN não configurado" }),
        { status: 500 }
      );
    }

    const textoMensagem =
      "🧑‍💼 NOVO CURRÍCULO RECEBIDO\n\n" +
      `Vaga: ${vaga}\n` +
      `Nome: ${nome}\n` +
      `E-mail: ${email}\n` +
      `Telefone: ${telefone}\n` +
      (mensagem ? `\nMensagem:\n${mensagem}` : "");

    // ENVIA O TEXTO
    const msgResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID_CURRICULO,
          text: textoMensagem,
        }),
      }
    );

    if (!msgResponse.ok) {
      const erro = await msgResponse.text();
      return new Response(
        JSON.stringify({
          error: "Erro ao enviar texto para o Telegram",
          detalhe: erro,
        }),
        { status: 500 }
      );
    }

    // SE NÃO HOUVER ANEXO, FINALIZA AQUI
    if (!anexo) {
      return new Response(
        JSON.stringify({ success: true, message: "Currículo enviado sem anexo" }),
        { status: 200 }
      );
    }

    // ENVIA O PDF COMO DOCUMENTO (não como foto)
    const docForm = new FormData();
    docForm.append("chat_id", CHAT_ID_CURRICULO);
    docForm.append("document", anexo, anexo.name || "curriculo.pdf");
    docForm.append("caption", `Currículo de ${nome} — ${vaga}`);

    const docResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendDocument`,
      {
        method: "POST",
        body: docForm,
      }
    );

    if (!docResponse.ok) {
      const erro = await docResponse.text();
      return new Response(
        JSON.stringify({
          error: "Texto enviado, mas erro ao enviar o anexo",
          detalhe: erro,
        }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Erro ao enviar currículo para o Telegram" }),
      { status: 500 }
    );
  }
}
