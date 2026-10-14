"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { respostasExemplo, iniciar, postar } = require("./apoio");

// Captura tudo o que o servidor escreve no console durante o teste.
function capturarConsole() {
  const linhas = [];
  const originais = {};
  ["log", "info", "warn", "error", "debug"].forEach((m) => {
    originais[m] = console[m];
    console[m] = (...args) => linhas.push(args.map(String).join(" "));
  });
  return { linhas, restaurar: () => Object.assign(console, originais) };
}

const DADOS_PESSOAIS = /José|Silva|90000|exemplo\.com|Construtora|carregava/;

test("logs não contêm respostas pessoais", async () => {
  const cap = capturarConsole();
  try {
    const falha = { async gerar(p) { throw new Error("falhou com " + p.usuario); } };
    const s = await iniciar({ provedorIA: falha });
    await postar(s.url + "/api/curriculo", respostasExemplo());
    const grande = respostasExemplo();
    grande.respostas.pessoais[0].nome = "José " + "x".repeat(60000);
    const r = await postar(s.url + "/api/curriculo", grande);
    assert.strictEqual(r.status, 413);
    await postar(s.url + "/api/curriculo", '{"respostas": "José da Silva');
    await s.fechar();
  } finally {
    cap.restaurar();
  }
  assert.ok(cap.linhas.length > 0, "deveria haver ao menos um log de erro");
  cap.linhas.forEach((l) => assert.doesNotMatch(l, DADOS_PESSOAIS, l));
});

test("resposta de erro não devolve o conteúdo enviado", async () => {
  const s = await iniciar({ provedorIA: null });
  const r = await postar(s.url + "/api/curriculo", '{"respostas": "José da Silva');
  assert.doesNotMatch(JSON.stringify(r.corpo), DADOS_PESSOAIS);
  await s.fechar();
});
