"use strict";

/*
  Provedor de transcrição: OpenAI (Whisper).
  Envia o áudio recebido e devolve só o texto. O áudio não é gravado.
*/

const URL_TRANSCRICAO = "https://api.openai.com/v1/audio/transcriptions";

const EXTENSOES = {
  "audio/webm": "webm", "video/webm": "webm", "audio/ogg": "ogg",
  "audio/mp4": "mp4", "video/mp4": "mp4", "audio/m4a": "m4a", "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav"
};

function criarProvedorOpenAI(config) {
  const modelo = config.modelo || "whisper-1";
  return {
    nome: "openai",
    async transcrever(audio, tipo, sinal) {
      const tipoBase = String(tipo || "").split(";")[0].trim();
      const form = new FormData();
      form.append("file", new Blob([audio], { type: tipoBase }), "resposta." + (EXTENSOES[tipoBase] || "webm"));
      form.append("model", modelo);
      form.append("language", "pt");
      form.append("response_format", "json");

      const r = await fetch(URL_TRANSCRICAO, {
        method: "POST",
        headers: { Authorization: "Bearer " + config.chave },
        body: form,
        signal: sinal
      });
      if (!r.ok) {
        const erro = new Error("falha-transcricao");
        erro.statusProvedor = r.status;
        throw erro;
      }
      const corpo = await r.json();
      if (!corpo || typeof corpo.text !== "string") throw new Error("resposta-invalida");
      return corpo.text;
    }
  };
}

module.exports = { criarProvedorOpenAI, URL_TRANSCRICAO };
