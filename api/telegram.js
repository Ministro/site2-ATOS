export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  try {
    const formData = await request.formData();

    const nomeCliente = formData.get("nome") || "Cliente não informado";
    const texto = formData.get("texto") || "";

    const docFrente = formData.get("docFrente");
    const docVerso = formData.get("docVerso");
    const selfie = formData.get("selfie");

    const chatId = "-1002492180126";
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return new Response(
        JSON.stringify({
          error: "TELEGRAM_BOT_TOKEN não configurado",
        }),
        { status: 500 }
      );
    }

    // ENVIA O TEXTO DO CADASTRO
    const msgResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: "📋 NOVO CADASTRO\n\n" + texto,
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

    // SE NÃO EXISTIREM FOTOS, FINALIZA AQUI
    if (!docFrente || !docVerso || !selfie) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Cadastro enviado sem fotos",
        }),
        { status: 200 }
      );
    }

    // CASO EXISTA FOTO, ENVIA O ÁLBUM
    const media = [
      {
        type: "photo",
        media: "attach://docFrente",
        caption: `Nome: ${nomeCliente}`,
      },
      {
        type: "photo",
        media: "attach://docVerso",
      },
      {
        type: "photo",
        media: "attach://selfie",
      },
    ];

    const albumForm = new FormData();

    albumForm.append("chat_id", chatId);
    albumForm.append("media", JSON.stringify(media));
    albumForm.append("docFrente", docFrente);
    albumForm.append("docVerso", docVerso);
    albumForm.append("selfie", selfie);

    const albumResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMediaGroup`,
      {
        method: "POST",
        body: albumForm,
      }
    );

    if (!albumResponse.ok) {
      const erro = await albumResponse.text();

      return new Response(
        JSON.stringify({
          error: "Texto enviado, mas erro ao enviar fotos",
          detalhe: erro,
        }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);

    return new Response(
      JSON.stringify({
        error: "Erro ao enviar cadastro para o Telegram",
      }),
      { status: 500 }
    );
  }
}
