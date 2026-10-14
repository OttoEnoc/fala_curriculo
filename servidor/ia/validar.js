"use strict";

/*
  Confere a resposta da IA antes de usá-la.

  1. Estrutura: a resposta precisa ter os campos e tipos esperados e o
     mesmo número de trabalhos enviados. Se não tiver, é descartada inteira.
  2. Conteúdo: cada texto reescrito é comparado com as respostas. Se trouxer
     algo que a pessoa não disse, o campo volta ao texto original.
     - números (datas, duração, quantidades) que não estavam nas respostas;
     - nomes próprios novos (empresas, escolas, cidades);
     - idiomas, níveis de idioma ou carteira de motorista não informados;
     - texto para um campo que estava vazio;
     - texto longo demais para o campo.

  Dados factuais (nome, contatos, empresas, períodos, estudos e cursos)
  sempre vêm das respostas confirmadas, nunca da IA.
*/

const LIMITES = { titulo: 80, cargo: 80, resumo: 400, atividades: 600, maisSobre: 600 };

const NUMEROS_ESCRITOS = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7,
  oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14,
  quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20,
  trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80,
  noventa: 90, cem: 100, cento: 100, mil: 1000, meio: 0.5, meia: 0.5
};

const IDIOMAS = ["ingles", "espanhol", "frances", "alemao", "italiano", "japones",
  "chines", "mandarim", "coreano", "russo", "arabe", "libras", "guarani"];
const NIVEIS = ["fluente", "fluencia", "avancado", "intermediario", "nativo", "bilingue"];
const CNH = ["cnh", "habilitacao", "habilitado", "habilitada", "carteira de motorista"];

function normalizar(t) {
  return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function palavras(t) {
  return normalizar(t).split(/[^a-z0-9]+/).filter(Boolean);
}

function numerosDe(t) {
  const encontrados = new Set();
  (normalizar(t).match(/\d+/g) || []).forEach((n) => encontrados.add(String(Number(n))));
  palavras(t).forEach((p) => {
    if (Object.prototype.hasOwnProperty.call(NUMEROS_ESCRITOS, p)) {
      encontrados.add(String(NUMEROS_ESCRITOS[p]));
    }
  });
  return encontrados;
}

// Palavras com inicial maiúscula que não estão no começo de uma frase.
function nomesProprios(t) {
  const nomes = [];
  String(t || "").split(/(?<=[.!?:])\s+/).forEach((frase) => {
    frase.split(/\s+/).slice(1).forEach((p) => {
      const limpa = p.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
      if (limpa.length > 2 && /^\p{Lu}/u.test(limpa)) nomes.push(normalizar(limpa));
    });
  });
  return nomes;
}

function textoDeOrigem(base) {
  return [
    base.titulo, base.cnh, base.modalidade, base.idiomas,
    base.formacao.join(" "), base.cursos.join(" "),
    base.experiencia.map((e) => [e.cargo, e.empresa, e.periodo, e.atividades, e.maisSobre].join(" ")).join(" "),
    base.primeiroEmprego ? "primeiro emprego" : ""
  ].join(" ");
}

function contemTermo(textoNormalizado, termo) {
  return new RegExp("(^|[^a-z])" + termo + "([^a-z]|$)").test(textoNormalizado);
}

/*
  Devolve o motivo pelo qual o texto da IA não pode ser usado,
  ou null quando o texto só usa o que a pessoa informou.
*/
function motivoParaDescartar(textoIA, origem, limite) {
  if (textoIA.length > limite) return "longo-demais";

  const numerosOrigem = numerosDe(origem);
  for (const n of numerosDe(textoIA)) {
    if (!numerosOrigem.has(n)) return "numero-novo";
  }

  const palavrasOrigem = new Set(palavras(origem));
  for (const nome of nomesProprios(textoIA)) {
    if (!palavrasOrigem.has(nome)) return "nome-novo";
  }

  const ia = normalizar(textoIA);
  const org = normalizar(origem);
  for (const termo of IDIOMAS.concat(NIVEIS, CNH)) {
    if (contemTermo(ia, termo) && !contemTermo(org, termo)) return "informacao-nova";
  }
  return null;
}

function ehObjeto(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function estruturaValida(r, base) {
  if (!ehObjeto(r)) return false;
  if (typeof r.titulo !== "string" || typeof r.resumo !== "string") return false;
  if (!Array.isArray(r.experiencia)) return false;
  if (r.experiencia.length !== base.experiencia.length) return false;
  return r.experiencia.every((e) => {
    return ehObjeto(e) &&
      typeof e.cargo === "string" &&
      typeof e.atividades === "string" &&
      typeof e.maisSobre === "string";
  });
}

function limpar(t) {
  return String(t).replace(/\s+/g, " ").trim();
}

function combinarRespostaIA(base, r) {
  if (!estruturaValida(r, base)) return null;

  const origem = textoDeOrigem(base);
  const descartados = [];

  // Escolhe entre o texto da IA e o original, campo a campo.
  function escolher(caminho, textoIA, original, limite, origemDoCampo) {
    const t = limpar(textoIA);
    if (!t) return original;
    if (!original && origemDoCampo !== undefined && !origemDoCampo) {
      descartados.push({ campo: caminho, motivo: "campo-vazio" });
      return original;
    }
    const motivo = motivoParaDescartar(t, origem, limite);
    if (motivo) {
      descartados.push({ campo: caminho, motivo });
      return original;
    }
    return t;
  }

  const curriculo = Object.assign({}, base, {
    titulo: escolher("titulo", r.titulo, base.titulo, LIMITES.titulo),
    resumo: escolher("resumo", r.resumo, "", LIMITES.resumo),
    experiencia: base.experiencia.map((e, k) => {
      const ia = r.experiencia[k];
      return Object.assign({}, e, {
        cargo: escolher(`experiencia[${k}].cargo`, ia.cargo, e.cargo, LIMITES.cargo, e.cargo),
        atividades: escolher(`experiencia[${k}].atividades`, ia.atividades, e.atividades, LIMITES.atividades, e.atividades),
        maisSobre: escolher(`experiencia[${k}].maisSobre`, ia.maisSobre, e.maisSobre, LIMITES.maisSobre, e.maisSobre)
      });
    })
  });

  return { curriculo, descartados };
}

module.exports = { combinarRespostaIA, estruturaValida, motivoParaDescartar };
