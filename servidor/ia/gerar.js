"use strict";

const { montarCurriculoBase } = require("../curriculo/montar");
const { montarPedido } = require("./prompt");
const { combinarRespostaIA } = require("./validar");

const AVISO_SEM_IA =
  "O texto não foi melhorado agora. O currículo foi montado com as suas respostas.";

function comTempoLimite(promessa, ms) {
  let timer;
  const limite = new Promise((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error("tempo-limite")), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

/*
  Gera o currículo:
  1. monta o currículo básico com as respostas;
  2. pede à IA uma redação melhor, quando houver provedor;
  3. confere a resposta da IA antes de usá-la.
  Se a IA falhar, devolve o currículo básico com um aviso compreensível.
*/
async function gerarCurriculo(respostas, portas, provedor, tempoLimiteMs) {
  const base = montarCurriculoBase(respostas, portas);

  if (!provedor) {
    return { curriculo: base, origem: "basico", aviso: AVISO_SEM_IA };
  }

  try {
    const pedido = montarPedido(base);
    const resposta = await comTempoLimite(provedor.gerar(pedido), tempoLimiteMs);
    const combinado = combinarRespostaIA(base, resposta);
    if (!combinado) {
      return { curriculo: base, origem: "basico", aviso: AVISO_SEM_IA };
    }
    return { curriculo: combinado.curriculo, origem: "ia", descartados: combinado.descartados };
  } catch (erro) {
    // Somente o tipo do problema vai para o log, nunca as respostas.
    console.warn("[ia] falha ao gerar:", erro && erro.message === "tempo-limite"
      ? "tempo-limite" : (erro && erro.constructor && erro.constructor.name) || "erro");
    return { curriculo: base, origem: "basico", aviso: AVISO_SEM_IA };
  }
}

module.exports = { gerarCurriculo, AVISO_SEM_IA };
