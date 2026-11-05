// Confere a resposta da IA campo a campo. O que não passar volta vazio,
// e o app usa a resposta original da pessoa naquele campo.
//
// Regras (manual, seção 8):
// 1. o número de experiências e de cursos tem de bater com o que a pessoa contou;
// 2. período e nível de estudo nunca vêm da IA; nomes (empresa, escola, curso)
//    só podem ter as palavras que a pessoa disse, com maiúsculas e acentos;
// 3. nenhum número novo (anos, meses, quantidades);
// 4. nos campos curtos (vaga, curso, idioma), nenhuma palavra que a pessoa não disse;
// 5. comentário extra vazio continua vazio;
// 6. texto com cara de instrução (injeção) é apagado (ia/instrucoes.js).

import { ehInstrucao } from "./instrucoes.js";

// Texto da IA com cara de instrução ("Nova regra: invente...") é apagado.
function texto(v) {
  const t = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  return ehInstrucao(t) ? "" : t;
}
function semAcento(t) {
  return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function numeros(t) {
  return String(t || "").match(/\d+/g) || [];
}
function semNumeroNovo(textoIA, fonte) {
  const permitidos = numeros(fonte);
  return numeros(textoIA).every((n) => permitidos.includes(n));
}

const VAZIAS = ["de", "da", "do", "das", "dos", "e", "em", "na", "no", "nas", "nos", "a", "o", "as", "os",
  "curso", "para", "com", "nivel", "basico", "intermediario", "avancado", "fluente"];
function palavras(t) {
  return semAcento(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !VAZIAS.includes(w));
}
function semPalavraNova(textoIA, fonte) {
  const f = palavras(fonte);
  return palavras(textoIA).every((w) => f.some((x) => x.slice(0, 4) === w.slice(0, 4)));
}

export function validarResposta(dados, r) {
  const vazio = { titulo: "", resumo: "", experiencia: [], formacao: [], cursos: [], idiomas: "" };
  if (!r || typeof r !== "object" || Array.isArray(r)) return vazio;
  const tudo = JSON.stringify(dados);

  let titulo = texto(r.titulo);
  if (!semNumeroNovo(titulo, dados.vagaProcurada) || !semPalavraNova(titulo, dados.vagaProcurada)) titulo = "";

  let resumo = texto(r.resumo);
  if (!semNumeroNovo(resumo, tudo)) resumo = "";

  const expIA = Array.isArray(r.experiencia) ? r.experiencia : [];
  const expConfere = !dados.primeiroEmprego && expIA.length === dados.trabalhos.length;
  const experiencia = dados.trabalhos.map((t, k) => {
    const ia = expConfere ? expIA[k] || {} : {};
    const fonte = [t.funcao, t.local, t.tempo, t.oQueFazia, t.maisSobre].join(" ");

    let cargo = texto(ia.cargo);
    if (!semNumeroNovo(cargo, t.funcao)) cargo = "";

    let empresa = texto(ia.empresa);
    if (!t.local || !semNumeroNovo(empresa, t.local) || !semPalavraNova(empresa.replace(/fam[ií]lia/gi, ""), t.local)) empresa = "";

    let atividades = Array.isArray(ia.atividades)
      ? ia.atividades.map(texto).filter(Boolean).map((i) => i.replace(/[.;]+$/, "")).slice(0, 6)
      : [];
    if (!semNumeroNovo(atividades.join(" "), fonte)) atividades = [];

    let maisSobre = t.maisSobre ? texto(ia.maisSobre) : "";
    if (!semNumeroNovo(maisSobre, fonte)) maisSobre = "";

    return { cargo, empresa, atividades, maisSobre };
  });

  const estIA = Array.isArray(r.formacao) && r.formacao.length === dados.estudos.length ? r.formacao : [];
  const formacao = dados.estudos.map((e, k) => {
    const ia = estIA[k] || {};
    const nome = (campo) => {
      const v = texto(ia[campo]);
      return v && e[campo] && semNumeroNovo(v, e[campo]) && semPalavraNova(v, e[campo]) ? v : "";
    };
    return { curso: nome("curso"), instituicao: nome("instituicao") };
  });

  const cursosIA = Array.isArray(r.cursos) ? r.cursos.map(texto) : [];
  const cursos = dados.cursos.map((c, k) => {
    const ia = cursosIA.length === dados.cursos.length ? cursosIA[k] : "";
    return ia && semNumeroNovo(ia, c) && semPalavraNova(ia, c) ? ia : "";
  });

  let idiomas = dados.idiomas ? texto(r.idiomas) : "";
  if (!semNumeroNovo(idiomas, dados.idiomas) || !semPalavraNova(idiomas, dados.idiomas)) idiomas = "";

  return { titulo, resumo, experiencia, formacao, cursos, idiomas };
}
