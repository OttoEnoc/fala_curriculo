"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { respostasExemplo, iniciar, postar } = require("./apoio");

test("passando do limite, a rota recusa com aviso", async () => {
  const s = await iniciar({ provedorIA: null, env: { LIMITE_CURRICULOS_HORA: "2" } });
  const url = s.url + "/api/curriculo";
  assert.strictEqual((await postar(url, respostasExemplo())).status, 200);
  assert.strictEqual((await postar(url, respostasExemplo())).status, 200);
  const r = await postar(url, respostasExemplo());
  assert.strictEqual(r.status, 429);
  assert.strictEqual(r.corpo.codigo, "limite");
  assert.match(r.corpo.erro, /muitos currículos/);
  assert.ok(Number(r.headers.get("retry-after")) > 0);
  await s.fechar();
});

test("a rota de saúde não entra no limite", async () => {
  const s = await iniciar({ provedorIA: null, env: { LIMITE_CURRICULOS_HORA: "1" } });
  for (let k = 0; k < 3; k++) {
    assert.strictEqual((await fetch(s.url + "/api/saude")).status, 200);
  }
  await s.fechar();
});
