// Voz do app: transforma uma frase em áudio com a voz neural da OpenAI.
// As frases do app se repetem (perguntas, avisos), então o áudio fica em
// cache: a mesma frase não é paga duas vezes.
//
// Atenção: a OpenAI marcou o gpt-4o-mini-tts como descontinuado, com
// desligamento previsto para 06/01/2027. Até lá funciona normalmente. Depois,
// troque FALA_MODELO no .env ou o app usa sozinho a voz do navegador.

export const MAX_FALA = 600; // caracteres

const INSTRUCOES =
  "Fale em português do Brasil, com sotaque brasileiro neutro. " +
  "Voz calma, acolhedora e clara, como alguém paciente ajudando uma pessoa que não tem costume com tecnologia. " +
  "Ritmo um pouco mais devagar que o normal, com pausas curtas nas vírgulas e nos pontos.";

export function textoDaFala(t) {
  return String(t || "").replace(/\s+/g, " ").trim().slice(0, MAX_FALA);
}

export async function gerarFala(texto, env) {
  if (!env.OPENAI_API_KEY) return { status: 503, erro: "A voz não está ligada no servidor." };
  if (!texto) return { status: 400, erro: "Texto vazio." };

  const ctrl = new AbortController();
  const limite = setTimeout(() => ctrl.abort(), Number(env.FALA_TEMPO_LIMITE_MS) || 15000);
  try {
    const base = env.OPENAI_URL_BASE || "https://api.openai.com/v1"; // trocar só em testes
    const r = await fetch(base + "/audio/speech", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.FALA_MODELO || "gpt-4o-mini-tts",
        voice: env.FALA_VOZ || "marin",
        input: texto,
        instructions: INSTRUCOES,
        response_format: "mp3"
      }),
      signal: ctrl.signal
    });
    if (!r.ok) {
      console.warn("[fala] falha na OpenAI:", r.status);
      return { status: 502, erro: "Não consegui gerar a voz agora." };
    }
    return { status: 200, audio: await r.arrayBuffer() };
  } catch (e) {
    console.warn("[fala] falha:", e.name || "erro");
    return { status: 502, erro: "Não consegui gerar a voz agora." };
  } finally {
    clearTimeout(limite);
  }
}
