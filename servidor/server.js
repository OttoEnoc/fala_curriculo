// Servidor para testar no computador: entrega o app (pasta prototipo)
// e as rotas da API no mesmo endereço, http://localhost:3002
import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { gerarCurriculo } from "./ia/gerar.js";
import { ajustarCurriculo } from "./ia/ajustar.js";
import { entenderResposta } from "./ia/entender.js";
import { transcreverAudio, lerPergunta, MAX_AUDIO } from "./voz/transcrever.js";
import { gerarFala, textoDaFala } from "./voz/falar.js";
import { limitesPadrao } from "./limite.js";

const env = process.env;
const app = express();
const PORTA = Number(env.PORTA) || 3002;
const HOST = env.HOST || "127.0.0.1";
const PASTA_APP = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "prototipo");
const limites = limitesPadrao(env);

app.disable("x-powered-by");

app.get("/api/saude", (req, res) => {
  res.json({ ok: true, ia: !!env.IA_API_KEY, voz: !!env.OPENAI_API_KEY });
});

app.post("/api/curriculo", express.json({ limit: "50kb" }), async (req, res) => {
  if (!limites.curriculo(req.ip)) {
    return res.status(429).json({ ok: false, motivo: "Muitos currículos em pouco tempo. Montei com as suas respostas." });
  }
  const r = await gerarCurriculo(req.body, env);
  res.status(r.status).json(r.json);
});

app.post("/api/ajustar", express.json({ limit: "50kb" }), async (req, res) => {
  if (!limites.ajuste(req.ip)) return res.status(429).json({ ok: false, motivo: "Muitas mudanças em pouco tempo. Espere um pouco e tente de novo." });
  const r = await ajustarCurriculo(req.body, env);
  res.status(r.status).json(r.json);
});

app.post("/api/entender", express.json({ limit: "5kb" }), async (req, res) => {
  if (!limites.entender(req.ip)) return res.status(429).json({ ok: false });
  const r = await entenderResposta(req.body, env);
  res.status(r.status).json(r.json);
});

app.post("/api/transcrever", express.raw({ type: "audio/*", limit: MAX_AUDIO }), async (req, res) => {
  if (!limites.transcricao(req.ip)) return res.status(429).json({ ok: false, erro: "Limite de áudios atingido." });
  const bytes = Buffer.isBuffer(req.body) ? req.body : null;
  const r = await transcreverAudio(bytes, req.get("content-type"), lerPergunta(req.get("x-pergunta")), env);
  res.status(r.status).json(r.json);
});

// Cache das falas na memória e no disco (pasta .cache-fala): as perguntas se
// repetem, e assim a mesma frase não é paga de novo nem depois de reiniciar.
const cacheFala = new Map();
const PASTA_CACHE = path.join(path.dirname(fileURLToPath(import.meta.url)), ".cache-fala");
const arquivoFala = (texto) => path.join(PASTA_CACHE,
  crypto.createHash("sha1").update((env.FALA_MODELO || "") + (env.FALA_VOZ || "") + "|" + texto).digest("hex") + ".mp3");
app.get("/api/falar", async (req, res) => {
  const texto = textoDaFala(req.query.t);
  const privado = req.query.privado === "1"; // resposta da pessoa: não guarda em lugar nenhum
  if (privado) {
    if (!limites.fala(req.ip)) return res.status(429).json({ ok: false, erro: "Limite de falas atingido." });
    const r = await gerarFala(texto, env);
    if (!r.audio) return res.status(r.status).json({ ok: false, erro: r.erro });
    res.set({ "Content-Type": "audio/mpeg", "Cache-Control": "no-store" });
    return res.send(Buffer.from(r.audio));
  }
  let audio = cacheFala.get(texto);
  if (!audio && texto) {
    try { audio = fs.readFileSync(arquivoFala(texto)); cacheFala.set(texto, audio); } catch { /* ainda não existe */ }
  }
  if (!audio) {
    if (!limites.fala(req.ip)) return res.status(429).json({ ok: false, erro: "Limite de falas atingido." });
    const r = await gerarFala(texto, env);
    if (!r.audio) return res.status(r.status).json({ ok: false, erro: r.erro });
    audio = Buffer.from(r.audio);
    cacheFala.set(texto, audio);
    try { fs.mkdirSync(PASTA_CACHE, { recursive: true }); fs.writeFileSync(arquivoFala(texto), audio); } catch { /* sem disco: só memória */ }
    if (cacheFala.size > 500) cacheFala.delete(cacheFala.keys().next().value);
  }
  res.set({ "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=2592000" });
  res.send(audio);
});

app.use(express.static(PASTA_APP));

// Erros de corpo (JSON quebrado, áudio grande demais) com resposta compreensível.
app.use((erro, req, res, next) => {
  if (erro && erro.type === "entity.too.large") return res.status(413).json({ ok: false, erro: "Envio grande demais." });
  if (erro instanceof SyntaxError && erro.status === 400) return res.status(400).json({ ok: false, erro: "O JSON enviado está inválido." });
  return next(erro);
});

app.listen(PORTA, HOST, () => {
  console.log(`Fala Currículo em http://localhost:${PORTA}`);
  console.log(`IA de texto: ${env.IA_API_KEY ? "ligada" : "DESLIGADA (falta IA_API_KEY no .env)"}`);
  console.log(`Transcrição de voz: ${env.OPENAI_API_KEY ? "ligada" : "DESLIGADA (falta OPENAI_API_KEY no .env)"}`);
});
