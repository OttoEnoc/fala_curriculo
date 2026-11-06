// Transcrição da voz pela API da OpenAI (modelo gpt-transcribe).
// O áudio é repassado e descartado: não é gravado em disco nem em registro.

const TIPOS = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/x-m4a": "m4a"
};
export const MAX_AUDIO = 5 * 1024 * 1024; // 5 MB: 90 s de voz em WAV de 16 kHz (iPhone) dão 2,9 MB

export async function transcreverAudio(bytes, tipoCompleto, pergunta, env) {
  if (!env.OPENAI_API_KEY) {
    return { status: 503, json: { ok: false, erro: "A transcrição não está ligada no servidor." } };
  }
  const tipo = String(tipoCompleto || "").split(";")[0].trim().toLowerCase();
  const ext = TIPOS[tipo];
  if (!ext) return { status: 415, json: { ok: false, erro: "Formato de áudio não aceito." } };
  if (!bytes || bytes.byteLength < 1000) return { status: 400, json: { ok: false, erro: "Áudio vazio." } };
  if (bytes.byteLength > MAX_AUDIO) return { status: 413, json: { ok: false, erro: "Áudio grande demais." } };

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: tipo }), "resposta." + ext);
  form.append("model", env.TRANSCRICAO_MODELO || "gpt-transcribe");
  form.append("language", "pt");
  form.append("response_format", "json");
  // A pergunta ajuda a acertar nomes e termos (ex.: "estado", "LinkedIn").
  const dica = String(pergunta || "").slice(0, 200);
  if (dica) {
    let prompt = "Resposta falada, em português do Brasil, à pergunta: " + dica;
    prompt += " Se a pessoa soletrar uma palavra letra por letra, escreva as letras separadas por hífen, por exemplo D-I-S-C-E-R-E.";
    if (/e-?mail/i.test(dica)) prompt += " Se a pessoa ditar um e-mail, escreva no formato nome@dominio.com, sem espaços.";
    form.append("prompt", prompt);
  }

  const ctrl = new AbortController();
  const limite = setTimeout(() => ctrl.abort(), Number(env.TRANSCRICAO_TEMPO_LIMITE_MS) || 25000);
  try {
    const base = env.OPENAI_URL_BASE || "https://api.openai.com/v1"; // trocar só em testes
    const r = await fetch(base + "/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.OPENAI_API_KEY },
      body: form,
      signal: ctrl.signal
    });
    if (!r.ok) {
      console.warn("[voz] falha na OpenAI:", r.status);
      // 401 = chave errada, 429 = sem crédito ou limite. O app passa para a digitação.
      return { status: r.status === 429 ? 429 : 502, json: { ok: false, erro: "Não consegui transcrever agora." } };
    }
    const j = await r.json();
    return { status: 200, json: { ok: true, texto: typeof j.text === "string" ? j.text.trim() : "" } };
  } catch (e) {
    console.warn("[voz] falha:", e.name || "erro");
    return { status: 502, json: { ok: false, erro: "Não consegui transcrever agora." } };
  } finally {
    clearTimeout(limite);
  }
}

export function lerPergunta(cabecalho) {
  try { return decodeURIComponent(cabecalho || ""); } catch { return ""; }
}
