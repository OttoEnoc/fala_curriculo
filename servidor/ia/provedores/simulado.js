"use strict";

/*
  Provedor simulado, para testes locais sem chave de API.
  Não usa IA: apenas devolve o próprio texto recebido, com a primeira letra
  maiúscula e ponto final. Nunca acrescenta informação.
*/

function frase(t) {
  t = String(t || "").trim();
  if (!t) return "";
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(t) ? t : t + ".";
}

function criarProvedorSimulado() {
  return {
    nome: "simulado",
    async gerar(pedido) {
      const inicio = pedido.usuario.indexOf("{");
      const fim = pedido.usuario.lastIndexOf("}");
      const dados = JSON.parse(pedido.usuario.slice(inicio, fim + 1));
      return {
        titulo: dados.vagaProcurada,
        resumo: "",
        experiencia: dados.trabalhos.map((t) => ({
          cargo: t.funcao,
          atividades: frase(t.oQueFazia),
          maisSobre: frase(t.maisSobre)
        }))
      };
    }
  };
}

module.exports = { criarProvedorSimulado };
