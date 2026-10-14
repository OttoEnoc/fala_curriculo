"use strict";

/*
  Escolha do serviço de transcrição (ver docs/escolha-stt.md).
  Para trocar de serviço, crie outro arquivo com transcrever(audio, tipo, sinal)
  e registre abaixo.

  Variáveis de ambiente:
  - TRANSCRICAO_PROVEDOR: "openai", "simulado" (só para testes) ou "nenhum" (padrão).
  - TRANSCRICAO_API_KEY: chave do serviço.
  - TRANSCRICAO_MODELO: modelo (opcional).
*/

const { criarProvedorOpenAI } = require("./openai");

// Só para testes locais: devolve sempre o mesmo texto, sem ouvir o áudio.
function criarProvedorSimulado(texto) {
  return { nome: "simulado", async transcrever() { return texto || "texto de teste"; } };
}

function criarProvedorTranscricao(env) {
  const nome = (env.TRANSCRICAO_PROVEDOR || "nenhum").toLowerCase();
  const config = { chave: env.TRANSCRICAO_API_KEY, modelo: env.TRANSCRICAO_MODELO };
  if (nome === "openai" && config.chave) return criarProvedorOpenAI(config);
  if (nome === "simulado") return criarProvedorSimulado(env.TRANSCRICAO_TEXTO_SIMULADO);
  return null;
}

module.exports = { criarProvedorTranscricao };
