"use strict";

/*
  Confere a estrutura da resposta da IA e junta com o currículo básico.
  Dados factuais (nome, contatos, empresas, períodos, estudos e cursos)
  sempre vêm das respostas confirmadas, nunca da IA.
*/

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
  const curriculo = Object.assign({}, base, {
    titulo: limpar(r.titulo) || base.titulo,
    resumo: limpar(r.resumo),
    experiencia: base.experiencia.map((e, k) => Object.assign({}, e, {
      cargo: limpar(r.experiencia[k].cargo) || e.cargo,
      atividades: limpar(r.experiencia[k].atividades) || e.atividades,
      maisSobre: e.maisSobre ? limpar(r.experiencia[k].maisSobre) : ""
    }))
  });
  return { curriculo, descartados: [] };
}

module.exports = { combinarRespostaIA, estruturaValida };
