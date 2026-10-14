"use strict";

const { criarApp } = require("../server");

// Respostas fictícias no formato enviado pelo protótipo.
function respostasExemplo() {
  return {
    respostas: {
      pessoais: [{ nome: "José da Silva", cidade: "São Paulo", estado: "São Paulo (SP)",
        objetivo: "Ajudante de pedreiro", cnh: "Sim, de moto", modalidade: "Sim, no local de trabalho", idade: "42" }],
      trabalho: [{ cargo: "ajudante de pedreiro", empresa: "Construtora Exemplo", periodo: "2 anos",
        atividades: "eu carregava material, fazia massa e ajudava no reboco", maisSobre: "" }],
      estudo: [{ escolaridade: "Ensino fundamental", instituicao: "Escola Estadual Exemplo", situacao: "Terminei" }],
      cursos: [{ curso: "Curso de Segurança em Obras" }],
      idiomas: [{ idiomas: "" }],
      contato: [{ telefone: "(11) 90000-0000", email: "jose@exemplo.com", temLinkedin: "Não tenho", linkedin: "" }]
    },
    portas: { trabalho: "Sim, já trabalhei", cursos: "Sim, fiz curso" }
  };
}

function primeiroEmprego() {
  const d = respostasExemplo();
  d.respostas.trabalho = [{}];
  d.portas.trabalho = "Nunca trabalhei. Procuro o primeiro emprego";
  return d;
}

async function iniciar(opcoes) {
  const app = criarApp(Object.assign({ env: {} }, opcoes));
  const servidor = await new Promise((ok) => {
    const s = app.listen(0, "127.0.0.1", () => ok(s));
  });
  const url = "http://127.0.0.1:" + servidor.address().port;
  return { url, fechar: () => new Promise((ok) => servidor.close(ok)) };
}

async function postar(url, corpo, cabecalhos) {
  const r = await fetch(url, {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json" }, cabecalhos),
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo)
  });
  return { status: r.status, corpo: await r.json(), headers: r.headers };
}

module.exports = { respostasExemplo, primeiroEmprego, iniciar, postar };
