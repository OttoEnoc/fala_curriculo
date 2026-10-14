"use strict";

/*
  Provedor de IA: Anthropic (Claude).
  Usado quando IA_PROVEDOR=anthropic e IA_API_KEY estiver definida no .env.
  A biblioteca só é carregada quando este provedor é escolhido.
*/

const MODELO_PADRAO = "claude-opus-5-5";

function criarProvedorAnthropic(config) {
  const Anthropic = require("@anthropic-ai/sdk");
  const cliente = new Anthropic({
    apiKey: config.chave,
    timeout: config.tempoLimiteMs,
    maxRetries: 1
  });
  const modelo = config.modelo || MODELO_PADRAO;

  return {
    nome: "anthropic",
    async gerar(pedido) {
      const resposta = await cliente.beta.messages.create({
        model: modelo,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: pedido.esquema }
        },
        system: pedido.sistema,
        messages: [{ role: "user", content: pedido.usuario }]
      });

      if (resposta.stop_reason === "refusal") {
        throw new Error("A IA recusou o pedido.");
      }
      if (resposta.stop_reason === "max_tokens") {
        throw new Error("A resposta da IA ficou incompleta.");
      }

      const bloco = resposta.content.find((b) => b.type === "text");
      if (!bloco) throw new Error("A IA não devolveu texto.");
      return JSON.parse(bloco.text);
    }
  };
}

module.exports = { criarProvedorAnthropic, MODELO_PADRAO };
