"use strict";

/*
  Monta o currículo básico a partir das respostas confirmadas pelo usuário.
  É a mesma lógica de cvBase() do protótipo (prototipo/app.js), agora no
  servidor. Este currículo é usado como referência pela IA e também como
  resultado final quando a IA não estiver disponível.
*/

const NEGATIVA_TRABALHO = "Nunca trabalhei. Procuro o primeiro emprego";
const NEGATIVA_CURSOS = "Não fiz nenhum curso";
const TAMANHO_MAXIMO_CAMPO = 1000;

function texto(valor) {
  if (typeof valor !== "string") return "";
  return valor.replace(/\s+/g, " ").trim().slice(0, TAMANHO_MAXIMO_CAMPO);
}

function primeiro(respostas, grupo) {
  const lista = respostas[grupo];
  return (Array.isArray(lista) && lista[0]) || {};
}

function montarCurriculoBase(respostas, portas) {
  portas = portas || {};
  const pessoais = primeiro(respostas, "pessoais");
  const contato = primeiro(respostas, "contato");
  const idiomas = primeiro(respostas, "idiomas");

  const trabalhos = portas.trabalho === NEGATIVA_TRABALHO ? [] :
    (respostas.trabalho || []).filter((it) => texto(it.cargo) || texto(it.empresa));
  const estudos = (respostas.estudo || []).filter((it) => {
    return texto(it.escolaridade) && texto(it.escolaridade) !== "Não estudei";
  });
  const cursos = portas.cursos === NEGATIVA_CURSOS ? [] :
    (respostas.cursos || []).map((it) => texto(it.curso)).filter(Boolean);

  const cnh = texto(pessoais.cnh);

  return {
    nome: texto(pessoais.nome) || "Seu nome",
    titulo: texto(pessoais.objetivo) || "Profissional",
    local: [texto(pessoais.cidade), texto(pessoais.estado)].filter(Boolean).join(" · "),
    idade: texto(pessoais.idade),
    cnh: (cnh && cnh !== "Não tenho") ? cnh.replace(/^Sim,\s*/, "Carteira de motorista ") : "",
    modalidade: texto(pessoais.modalidade),
    primeiroEmprego: trabalhos.length === 0,
    resumo: "",
    experiencia: trabalhos.map((it) => ({
      cargo: texto(it.cargo),
      empresa: texto(it.empresa),
      periodo: texto(it.periodo),
      atividades: texto(it.atividades),
      maisSobre: texto(it.maisSobre)
    })),
    formacao: estudos.map((it) => {
      return [texto(it.escolaridade), texto(it.instituicao), texto(it.situacao)]
        .filter(Boolean).join(" · ");
    }),
    cursos,
    idiomas: texto(idiomas.idiomas),
    telefone: texto(contato.telefone),
    email: texto(contato.email),
    linkedin: texto(contato.temLinkedin) === "Tenho LinkedIn" ? texto(contato.linkedin) : ""
  };
}

module.exports = { montarCurriculoBase };
