"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { respostasExemplo, primeiroEmprego, iniciar, postar } = require("./apoio");
const { montarPedido } = require("../ia/prompt");
const { montarCurriculoBase } = require("../curriculo/montar");

test("GET /api/saude responde ok", async () => {
  const s = await iniciar({ provedorIA: null });
  const r = await fetch(s.url + "/api/saude");
  assert.deepStrictEqual(await r.json(), { ok: true });
  await s.fechar();
});

test("recusa formato errado", async () => {
  const s = await iniciar({ provedorIA: null });
  assert.strictEqual((await postar(s.url + "/api/curriculo", { respostas: [] })).status, 400);
  assert.strictEqual((await postar(s.url + "/api/curriculo", "{quebrado")).status, 400);
  const d = respostasExemplo(); delete d.respostas.contato;
  const r = await postar(s.url + "/api/curriculo", d);
  assert.strictEqual(r.status, 400);
  assert.deepStrictEqual(r.corpo.gruposAusentes, ["contato"]);
  await s.fechar();
});

test("sem provedor de IA devolve o currículo básico com aviso", async () => {
  const s = await iniciar({ provedorIA: null });
  const r = await postar(s.url + "/api/curriculo", respostasExemplo());
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.corpo.origem, "basico");
  assert.ok(r.corpo.aviso);
  assert.strictEqual(r.corpo.curriculo.nome, "José da Silva");
  assert.strictEqual(r.corpo.curriculo.cnh, "Carteira de motorista de moto");
  assert.strictEqual(r.corpo.curriculo.experiencia.length, 1);
  await s.fechar();
});

test("primeiro emprego conclui sem experiência", async () => {
  const s = await iniciar({ provedorIA: null });
  const r = await postar(s.url + "/api/curriculo", primeiroEmprego());
  assert.strictEqual(r.corpo.curriculo.primeiroEmprego, true);
  assert.deepStrictEqual(r.corpo.curriculo.experiencia, []);
  await s.fechar();
});

test("rota usa a IA e devolve o currículo em JSON", async () => {
  const provedor = {
    async gerar() {
      return { titulo: "Ajudante de Pedreiro", resumo: "Procuro vaga de ajudante de pedreiro.",
        experiencia: [{ cargo: "Ajudante de Pedreiro",
          atividades: "Carregava material, preparava massa e ajudava no reboco.", maisSobre: "" }] };
    }
  };
  const s = await iniciar({ provedorIA: provedor });
  const r = await postar(s.url + "/api/curriculo", respostasExemplo());
  assert.strictEqual(r.corpo.origem, "ia");
  assert.strictEqual(r.corpo.curriculo.experiencia[0].empresa, "Construtora Exemplo");
  assert.strictEqual(r.corpo.curriculo.experiencia[0].cargo, "Ajudante de Pedreiro");
  assert.strictEqual(r.corpo.curriculo.telefone, "(11) 90000-0000");
  await s.fechar();
});

test("falha da IA mantém o currículo básico", async () => {
  const s = await iniciar({ provedorIA: { async gerar() { throw new Error("x"); } } });
  const r = await postar(s.url + "/api/curriculo", respostasExemplo());
  assert.strictEqual(r.corpo.origem, "basico");
  assert.strictEqual(r.corpo.curriculo.nome, "José da Silva");
  await s.fechar();
});

test("IA lenta respeita o tempo limite", async () => {
  const lenta = { gerar: () => new Promise((ok) => setTimeout(() => ok({}), 2000)) };
  const s = await iniciar({ provedorIA: lenta, env: { IA_TEMPO_LIMITE_MS: "100" } });
  const inicio = Date.now();
  const r = await postar(s.url + "/api/curriculo", respostasExemplo());
  assert.ok(Date.now() - inicio < 1500);
  assert.strictEqual(r.corpo.origem, "basico");
  await s.fechar();
});

test("prompt fica no servidor e não leva nome nem contatos", () => {
  const base = montarCurriculoBase(respostasExemplo().respostas, respostasExemplo().portas);
  const p = montarPedido(base);
  assert.match(p.sistema, /proibido inventar/);
  assert.match(p.usuario, /^<dados>/);
  assert.doesNotMatch(p.usuario, /José|90000|exemplo\.com/);
});
