"use strict";

require("dotenv").config();

const express = require("express");

const app = express();
const PORTA = process.env.PORTA || 3002;

const GRUPOS_ESPERADOS = [
  "pessoais",
  "trabalho",
  "estudo",
  "cursos",
  "idiomas",
  "contato"
];

app.disable("x-powered-by");

// Permite que o servidor receba JSON.
// O limite evita o envio de arquivos ou textos excessivamente grandes.
app.use(express.json({ limit: "50kb" }));

function objetoSimples(valor) {
  return (
    valor !== null &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  );
}

app.get("/api/saude", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/curriculo", (req, res) => {
  const corpo = req.body;

  if (!objetoSimples(corpo)) {
    return res.status(400).json({
      ok: false,
      erro: "O corpo da requisição deve ser um objeto JSON."
    });
  }

  if (!objetoSimples(corpo.respostas)) {
    return res.status(400).json({
      ok: false,
      erro: 'O campo "respostas" é obrigatório e deve ser um objeto.'
    });
  }

  const gruposAusentes = GRUPOS_ESPERADOS.filter((grupo) => {
    return !Array.isArray(corpo.respostas[grupo]);
  });

  if (gruposAusentes.length > 0) {
    return res.status(400).json({
      ok: false,
      erro: "Existem grupos ausentes ou em formato incorreto.",
      gruposAusentes
    });
  }

  const grupoComItemInvalido = GRUPOS_ESPERADOS.find((grupo) => {
    return corpo.respostas[grupo].some((item) => {
      return !objetoSimples(item);
    });
  });

  if (grupoComItemInvalido) {
    return res.status(400).json({
      ok: false,
      erro: `O grupo "${grupoComItemInvalido}" contém uma resposta inválida.`
    });
  }

  if (
    corpo.portas !== undefined &&
    !objetoSimples(corpo.portas)
  ) {
    return res.status(400).json({
      ok: false,
      erro: 'O campo "portas" deve ser um objeto.'
    });
  }

  return res.status(200).json({
    ok: true,
    mensagem: "Respostas recebidas e validadas com sucesso.",
    gruposRecebidos: GRUPOS_ESPERADOS
  });
});

// Retorna um erro compreensível quando o JSON estiver quebrado.
app.use((erro, req, res, next) => {
  if (
    erro instanceof SyntaxError &&
    erro.status === 400 &&
    "body" in erro
  ) {
    return res.status(400).json({
      ok: false,
      erro: "O JSON enviado está inválido."
    });
  }

  return next(erro);
});

app.listen(PORTA, "127.0.0.1", () => {
  console.log(
    `Servidor disponível em http://127.0.0.1:${PORTA}`
  );
});