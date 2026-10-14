"use strict";

require("dotenv").config();

const path = require("path");
const express = require("express");
const { gerarCurriculo } = require("./ia/gerar");
const { criarProvedorIA } = require("./ia/provedores");
const { criarLimitador } = require("./limite");
const { criarProvedorTranscricao } = require("./transcricao");

const TIPOS_DE_AUDIO = ["audio/*", "video/webm", "video/mp4"];

const PORTA = process.env.PORT || process.env.PORTA || 3001;

const GRUPOS_ESPERADOS = [
  "pessoais",
  "trabalho",
  "estudo",
  "cursos",
  "idiomas",
  "contato"
];

function objetoSimples(valor) {
  return (
    valor !== null &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  );
}

function criarApp(opcoes) {
  opcoes = opcoes || {};
  const env = opcoes.env || process.env;
  const provedorIA = opcoes.provedorIA !== undefined ? opcoes.provedorIA : criarProvedorIA(env);
  const tempoLimiteIA = Number(env.IA_TEMPO_LIMITE_MS) || 20000;
  const provedorTranscricao = opcoes.provedorTranscricao !== undefined
    ? opcoes.provedorTranscricao : criarProvedorTranscricao(env);
  const tempoLimiteTranscricao = Number(env.TRANSCRICAO_TEMPO_LIMITE_MS) || 30000;

  const app = express();
  app.disable("x-powered-by");

  // Atrás de um serviço de hospedagem, o IP real chega pelo proxy.
  if (env.CONFIAR_PROXY === "1") app.set("trust proxy", 1);

  const limiteCurriculo = criarLimitador({
    maximo: Number(env.LIMITE_CURRICULOS_HORA) || 10,
    janelaMs: 60 * 60 * 1000,
    mensagem: "Você já gerou muitos currículos nesta última hora. Espere um pouco e tente de novo."
  });
  const limiteTranscricao = criarLimitador({
    maximo: Number(env.LIMITE_TRANSCRICOES_HORA) || 120,
    janelaMs: 60 * 60 * 1000,
    mensagem: "Você já mandou muitos áudios nesta última hora. Por enquanto, escreva a resposta."
  });

  // Durante o desenvolvimento, o app pode abrir em outra porta
  // (por exemplo, na prévia do VS Code). Só estas origens podem chamar a API.
  const origensPermitidas = (env.CORS_ORIGENS || "").split(",").map((o) => o.trim()).filter(Boolean);
  const origemLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  app.use("/api", (req, res, next) => {
    const origem = req.get("Origin");
    const permitida = origem && (origensPermitidas.includes(origem) ||
      (env.NODE_ENV !== "production" && origemLocal.test(origem)));
    if (permitida) {
      res.set("Access-Control-Allow-Origin", origem);
      res.set("Vary", "Origin");
      res.set("Access-Control-Allow-Methods", "GET, POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") return res.sendStatus(permitida ? 204 : 403);
    return next();
  });

  // Permite que o servidor receba JSON.
  // O limite evita o envio de arquivos ou textos excessivamente grandes.
  app.use(express.json({ limit: "50kb" }));

  app.get("/api/saude", (req, res) => {
    res.json({ ok: true });
  });

  // Diz ao app quais recursos do servidor estão ligados.
  app.get("/api/recursos", (req, res) => {
    res.json({ ok: true, ia: !!provedorIA, transcricao: !!provedorTranscricao });
  });

  // Recebe o áudio de uma resposta e devolve o texto.
  // O áudio fica só na memória durante o pedido e nunca vai para o log.
  app.post("/api/transcrever",
    limiteTranscricao,
    express.raw({ type: TIPOS_DE_AUDIO, limit: "8mb" }),
    async (req, res) => {
      if (!provedorTranscricao) {
        return res.status(503).json({ ok: false, codigo: "indisponivel",
          erro: "A transcrição pelo servidor não está ligada. Escreva a resposta." });
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ ok: false,
          erro: "Envie o áudio no corpo do pedido, com o tipo audio/..." });
      }

      const controle = new AbortController();
      const timer = setTimeout(() => controle.abort(), tempoLimiteTranscricao);
      try {
        const texto = await provedorTranscricao.transcrever(req.body, req.get("Content-Type"), controle.signal);
        return res.json({ ok: true, texto: String(texto).replace(/\s+/g, " ").trim() });
      } catch (erro) {
        console.warn("[transcricao] falha:", controle.signal.aborted ? "tempo-limite"
          : (erro.statusProvedor || erro.name || "erro"));
        return res.status(502).json({ ok: false, codigo: "falhou",
          erro: "Não consegui entender o áudio agora. Tente de novo ou escreva a resposta." });
      } finally {
        clearTimeout(timer);
      }
    });

  app.post("/api/curriculo", limiteCurriculo, async (req, res) => {
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

    const resultado = await gerarCurriculo(
      corpo.respostas, corpo.portas, provedorIA, tempoLimiteIA
    );

    return res.status(200).json(Object.assign({ ok: true }, resultado));
  });

  // O próprio servidor entrega o app, assim app e API ficam no mesmo endereço.
  app.use(express.static(path.join(__dirname, "..", "prototipo")));

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

  // Qualquer outro erro: resposta genérica.
  // O log registra só o tipo do erro, nunca o conteúdo do pedido.
  // eslint-disable-next-line no-unused-vars
  app.use((erro, req, res, next) => {
    const status = erro.status || erro.statusCode || 500;
    console.warn("[erro]", status, erro.type || erro.name || "erro");
    const mensagem = status === 413
      ? "O envio ficou grande demais."
      : "Não foi possível atender o pedido agora.";
    res.status(status >= 400 && status < 600 ? status : 500).json({ ok: false, erro: mensagem });
  });

  return app;
}

module.exports = { criarApp };

if (require.main === module) {
  const HOST = process.env.HOST || "127.0.0.1";
  criarApp().listen(PORTA, HOST, () => {
    console.log(`Servidor disponível em http://${HOST}:${PORTA}`);
  });
}