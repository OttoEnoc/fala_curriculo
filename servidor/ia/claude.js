// Chamada ao Claude pela biblioteca oficial da Anthropic.
import Anthropic from "@anthropic-ai/sdk";
import { REGRAS, ESQUEMA, mensagemUsuario } from "./prompt.js";

export function criarClaude(env) {
  if (!env.IA_API_KEY) return null; // sem chave: o servidor usa o currículo básico
  return {
    cliente: new Anthropic({
      apiKey: env.IA_API_KEY,
      timeout: Number(env.IA_TEMPO_LIMITE_MS) || 20000,
      maxRetries: 1,
      ...(env.IA_URL_BASE ? { baseURL: env.IA_URL_BASE } : {}) // trocar só em testes
    }),
    modelo: env.IA_MODELO || "claude-haiku-5-5"
  };
}

// Devolve o objeto JSON da IA, ou lança um erro com um código curto.
export async function pedirAoClaude(claude, dados) {
  const resposta = await claude.cliente.messages.create({
    model: claude.modelo,
    max_tokens: 8000,
    system: REGRAS,
    messages: [{ role: "user", content: mensagemUsuario(dados) }],
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: ESQUEMA }
    }
  });

  if (resposta.stop_reason !== "end_turn") {
    const erro = new Error("resposta incompleta");
    erro.codigo = "parada_" + resposta.stop_reason; // refusal, max_tokens...
    throw erro;
  }
  const bloco = resposta.content.find((b) => b.type === "text");
  if (!bloco) {
    const erro = new Error("sem texto");
    erro.codigo = "sem_texto";
    throw erro;
  }
  return JSON.parse(bloco.text);
}
