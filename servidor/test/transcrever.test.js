"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { iniciar } = require("./apoio");
const { criarProvedorOpenAI, URL_TRANSCRICAO } = require("../transcricao/openai");

const AUDIO = Buffer.from("audio-ficticio-de-teste");

function enviar(url, corpo, tipo) {
  return fetch(url + "/api/transcrever", { method: "POST", headers: { "Content-Type": tipo }, body: corpo })
    .then(async (r) => ({ status: r.status, corpo: await r.json() }));
}

test("áudio de teste volta transcrito", async () => {
  let recebido = null;
  const provedor = { async transcrever(audio, tipo) { recebido = { audio, tipo }; return "  trabalhei dois anos   na obra "; } };
  const s = await iniciar({ provedorIA: null, provedorTranscricao: provedor });
  const r = await enviar(s.url, AUDIO, "audio/webm;codecs=opus");
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.corpo.texto, "trabalhei dois anos na obra");
  assert.ok(recebido.audio.equals(AUDIO));
  assert.match(recebido.tipo, /^audio\/webm/);
  await s.fechar();
});

test("sem serviço configurado responde 503 para o app oferecer a escrita", async () => {
  const s = await iniciar({ provedorIA: null, provedorTranscricao: null });
  const r = await enviar(s.url, AUDIO, "audio/webm");
  assert.strictEqual(r.status, 503);
  assert.strictEqual(r.corpo.codigo, "indisponivel");
  const rec = await (await fetch(s.url + "/api/recursos")).json();
  assert.deepStrictEqual(rec, { ok: true, ia: false, transcricao: false });
  await s.fechar();
});

test("recusa pedido sem áudio", async () => {
  const s = await iniciar({ provedorIA: null, provedorTranscricao: { async transcrever() { return "x"; } } });
  assert.strictEqual((await enviar(s.url, "{}", "application/json")).status, 400);
  await s.fechar();
});

test("falha do serviço vira mensagem simples", async () => {
  const s = await iniciar({ provedorIA: null, provedorTranscricao: { async transcrever() { throw new Error("x"); } } });
  const r = await enviar(s.url, AUDIO, "audio/mp4");
  assert.strictEqual(r.status, 502);
  assert.match(r.corpo.erro, /escreva a resposta/);
  await s.fechar();
});

test("provedor OpenAI monta o pedido multipart", async () => {
  const original = global.fetch;
  let pedido = null;
  global.fetch = async (url, init) => { pedido = { url, init }; return new Response(JSON.stringify({ text: "olá" }), { status: 200 }); };
  try {
    const p = criarProvedorOpenAI({ chave: "chave-ficticia" });
    assert.strictEqual(await p.transcrever(AUDIO, "audio/mp4"), "olá");
  } finally { global.fetch = original; }
  assert.strictEqual(pedido.url, URL_TRANSCRICAO);
  assert.strictEqual(pedido.init.headers.Authorization, "Bearer chave-ficticia");
  assert.strictEqual(pedido.init.body.get("language"), "pt");
  assert.strictEqual(pedido.init.body.get("model"), "whisper-1");
  assert.strictEqual(pedido.init.body.get("file").name, "resposta.mp4");
});
