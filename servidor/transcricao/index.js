"use strict";

/*
  Escolha do serviço de transcrição (ver docs/escolha-stt.md).
  Para trocar de serviço, crie outro arquivo com transcrever(audio, tipo, sinal)
  e registre abaixo.

  Variáveis de ambiente:
  - TRANSCRICAO_PROVEDOR: "openai" ou "nenhum" (padrão).
  - TRANSCRICAO_API_KEY: chave do serviço.
  - TRANSCRICAO_MODELO: modelo (opcional).
*/

const { criarProvedorOpenAI } = require("./openai");

function criarProvedorTranscricao(env) {
  const nome = (env.TRANSCRICAO_PROVEDOR || "nenhum").toLowerCase();
  const config = { chave: env.TRANSCRICAO_API_KEY, modelo: env.TRANSCRICAO_MODELO };
  if (nome === "openai" && config.chave) return criarProvedorOpenAI(config);
  return null;
}

module.exports = { criarProvedorTranscricao };
