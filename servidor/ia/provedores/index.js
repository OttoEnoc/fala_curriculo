"use strict";

/*
  Escolha do provedor de IA.
  Para trocar de serviço, basta criar um arquivo nesta pasta com a função
  gerar(pedido) e registrá-lo abaixo. O restante do servidor não muda.

  Variáveis de ambiente:
  - IA_PROVEDOR: "anthropic", "simulado" ou "nenhum" (padrão).
  - IA_API_KEY: chave do serviço escolhido.
  - IA_MODELO: modelo do serviço (opcional).
  - IA_TEMPO_LIMITE_MS: tempo máximo de espera (padrão 20000).
*/

const { criarProvedorAnthropic } = require("./anthropic");
const { criarProvedorSimulado } = require("./simulado");

function criarProvedorIA(env) {
  const nome = (env.IA_PROVEDOR || "nenhum").toLowerCase();
  const config = {
    chave: env.IA_API_KEY,
    modelo: env.IA_MODELO,
    tempoLimiteMs: Number(env.IA_TEMPO_LIMITE_MS) || 20000
  };

  if (nome === "anthropic") {
    if (!config.chave) return null;
    return criarProvedorAnthropic(config);
  }
  if (nome === "simulado") return criarProvedorSimulado();
  return null;
}

module.exports = { criarProvedorIA };
