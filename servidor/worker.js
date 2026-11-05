// Versão para o Cloudflare Workers. Os arquivos do app (pasta prototipo)
// são entregues pelo próprio Cloudflare ("assets" no wrangler.jsonc);
// este código só responde às rotas /api/*.
// As chaves ficam nos segredos do Worker (npx wrangler secret put ...).
import { gerarCurriculo } from "./ia/gerar.js";
import { ajustarCurriculo } from "./ia/ajustar.js";
import { entenderResposta } from "./ia/entender.js";
import { transcreverAudio, lerPergunta, MAX_AUDIO } from "./voz/transcrever.js";
import { gerarFala, textoDaFala } from "./voz/falar.js";
import { limitesPadrao } from "./limite.js";

let limites = null;

function json(status, corpo) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!limites) limites = limitesPadrao(env);
    const ip = request.headers.get("cf-connecting-ip") || "desconhecido";

    if (url.pathname === "/api/saude" && request.method === "GET") {
      return json(200, { ok: true, ia: !!env.IA_API_KEY, voz: !!env.OPENAI_API_KEY });
    }

    if (url.pathname === "/api/curriculo" && request.method === "POST") {
      if (!limites.curriculo(ip)) return json(429, { ok: false, motivo: "Muitos currículos em pouco tempo. Montei com as suas respostas." });
      const texto = await request.text();
      if (texto.length > 50 * 1024) return json(413, { ok: false, erro: "Envio grande demais." });
      let corpo;
      try { corpo = JSON.parse(texto); } catch { return json(400, { ok: false, erro: "O JSON enviado está inválido." }); }
      const r = await gerarCurriculo(corpo, env);
      return json(r.status, r.json);
    }

    if (url.pathname === "/api/ajustar" && request.method === "POST") {
      if (!limites.ajuste(ip)) return json(429, { ok: false, motivo: "Muitas mudanças em pouco tempo. Espere um pouco e tente de novo." });
      const texto = await request.text();
      if (texto.length > 50 * 1024) return json(413, { ok: false, erro: "Envio grande demais." });
      let corpo;
      try { corpo = JSON.parse(texto); } catch { return json(400, { ok: false, erro: "O JSON enviado está inválido." }); }
      const r = await ajustarCurriculo(corpo, env);
      return json(r.status, r.json);
    }

    if (url.pathname === "/api/entender" && request.method === "POST") {
      if (!limites.entender(ip)) return json(429, { ok: false });
      const texto = await request.text();
      if (texto.length > 5 * 1024) return json(413, { ok: false, erro: "Envio grande demais." });
      let corpo;
      try { corpo = JSON.parse(texto); } catch { return json(400, { ok: false, erro: "O JSON enviado está inválido." }); }
      const r = await entenderResposta(corpo, env);
      return json(r.status, r.json);
    }

    if (url.pathname === "/api/transcrever" && request.method === "POST") {
      if (!limites.transcricao(ip)) return json(429, { ok: false, erro: "Limite de áudios atingido." });
      const tamanho = Number(request.headers.get("content-length") || 0);
      if (tamanho > MAX_AUDIO) return json(413, { ok: false, erro: "Áudio grande demais." });
      const bytes = await request.arrayBuffer();
      const r = await transcreverAudio(bytes, request.headers.get("content-type"),
        lerPergunta(request.headers.get("x-pergunta")), env);
      return json(r.status, r.json);
    }

    if (url.pathname === "/api/falar" && request.method === "GET") {
      if (url.searchParams.get("privado") === "1") {
        // Resposta da pessoa (nome, telefone...): gera e entrega, sem guardar em cache.
        if (!limites.fala(ip)) return json(429, { ok: false, erro: "Limite de falas atingido." });
        const r = await gerarFala(textoDaFala(url.searchParams.get("t")), env);
        if (!r.audio) return json(r.status, { ok: false, erro: r.erro });
        return new Response(r.audio, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
      }
      // O cache do Cloudflare guarda cada frase fixa: a mesma frase não é paga duas vezes.
      const chave = new Request(url.origin + "/api/falar?t=" + encodeURIComponent(textoDaFala(url.searchParams.get("t"))));
      const cache = caches.default;
      const guardado = await cache.match(chave);
      if (guardado) return guardado;
      if (!limites.fala(ip)) return json(429, { ok: false, erro: "Limite de falas atingido." });
      const r = await gerarFala(textoDaFala(url.searchParams.get("t")), env);
      if (!r.audio) return json(r.status, { ok: false, erro: r.erro });
      const resposta = new Response(r.audio, {
        headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=2592000" }
      });
      ctx.waitUntil(cache.put(chave, resposta.clone()));
      return resposta;
    }

    if (url.pathname.startsWith("/api/")) return json(404, { ok: false, erro: "Rota não encontrada." });
    return env.ASSETS.fetch(request);
  }
};
