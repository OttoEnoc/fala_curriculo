"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { respostasExemplo } = require("./apoio");
const { montarCurriculoBase } = require("../curriculo/montar");
const { combinarRespostaIA } = require("../ia/validar");

function base() {
  const d = respostasExemplo();
  return montarCurriculoBase(d.respostas, d.portas);
}

function resposta(mudancas) {
  return Object.assign({
    titulo: "Ajudante de Pedreiro",
    resumo: "Ajudante de pedreiro com experiência em obras.",
    experiencia: [{ cargo: "Ajudante de Pedreiro",
      atividades: "Carregava material, preparava massa e ajudava no reboco.", maisSobre: "" }]
  }, mudancas);
}

test("aceita reescrita fiel", () => {
  const r = combinarRespostaIA(base(), resposta());
  assert.deepStrictEqual(r.descartados, []);
  assert.strictEqual(r.curriculo.resumo, "Ajudante de pedreiro com experiência em obras.");
});

test("estrutura errada descarta a resposta inteira", () => {
  assert.strictEqual(combinarRespostaIA(base(), null), null);
  assert.strictEqual(combinarRespostaIA(base(), resposta({ experiencia: [] })), null);
  assert.strictEqual(combinarRespostaIA(base(), resposta({ resumo: 3 })), null);
});

test("descarta número inventado", () => {
  const r = combinarRespostaIA(base(), resposta({ resumo: "Ajudante com 10 anos de experiência." }));
  assert.strictEqual(r.curriculo.resumo, "");
  assert.strictEqual(r.descartados[0].motivo, "numero-novo");
});

test("aceita número que a pessoa informou", () => {
  const r = combinarRespostaIA(base(), resposta({ resumo: "Ajudante com dois anos de experiência em obras." }));
  assert.strictEqual(r.curriculo.resumo, "Ajudante com dois anos de experiência em obras.");
});

test("descarta empresa inventada", () => {
  const r = combinarRespostaIA(base(), resposta({ resumo: "Trabalhou na Construtora Horizonte por anos." }));
  assert.strictEqual(r.descartados[0].motivo, "nome-novo");
});

test("descarta idioma e carteira não informados", () => {
  const b = base(); b.cnh = "";
  let r = combinarRespostaIA(b, resposta({ resumo: "Ajudante com inglês básico." }));
  assert.strictEqual(r.descartados[0].motivo, "informacao-nova");
  r = combinarRespostaIA(b, resposta({ resumo: "Ajudante com carteira de motorista." }));
  assert.strictEqual(r.descartados[0].motivo, "informacao-nova");
  r = combinarRespostaIA(b, resposta({ resumo: "Ajudante com CNH." }));
  assert.strictEqual(r.curriculo.resumo, "");
});

test("resposta vazia não vira conteúdo", () => {
  const ia = resposta();
  ia.experiencia[0].maisSobre = "Sempre foi muito elogiado pelos colegas.";
  const r = combinarRespostaIA(base(), ia);
  assert.strictEqual(r.curriculo.experiencia[0].maisSobre, "");
  assert.strictEqual(r.descartados[0].motivo, "campo-vazio");
});

test("campo descartado volta ao texto original", () => {
  const ia = resposta();
  ia.experiencia[0].atividades = "Liderou 5 obras ao mesmo tempo.";
  const r = combinarRespostaIA(base(), ia);
  assert.strictEqual(r.curriculo.experiencia[0].atividades,
    "eu carregava material, fazia massa e ajudava no reboco");
});

test("dados factuais nunca vêm da IA", () => {
  const ia = resposta();
  ia.nome = "Outro Nome"; ia.telefone = "0"; ia.experiencia[0].empresa = "Outra";
  const r = combinarRespostaIA(base(), ia);
  assert.strictEqual(r.curriculo.nome, "José da Silva");
  assert.strictEqual(r.curriculo.telefone, "(11) 90000-0000");
  assert.strictEqual(r.curriculo.experiencia[0].empresa, "Construtora Exemplo");
});
