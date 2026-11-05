"use strict";

/* ============================================================
   MELHORIA DO TEXTO PELA IA
   ------------------------------------------------------------
   O app.js chama window.processarCurriculoComIA() quando a pessoa
   termina as perguntas. Este arquivo:

   1. monta só os dados que a IA precisa reescrever (sem nome,
      idade, telefone, e-mail e LinkedIn);
   2. manda para o servidor em POST /api/curriculo, que chama o
      Claude, confere a resposta e devolve os textos melhorados;
   3. junta esses textos com o resto do currículo.

   Se o servidor ou a IA falharem, o currículo é montado com as
   próprias respostas, só com maiúsculas e pontuação arrumadas,
   e a tela avisa que a IA não foi usada.
   ============================================================ */
(function(){

  var AVISO = "Não consegui melhorar o texto agora. Montei o currículo com as suas respostas.";
  var ESPERA_MAXIMA = 25000; // ms

  // Só o que a IA precisa para reescrever.
  function dadosParaIA(base){
    return {
      vagaProcurada: base.titulo,
      primeiroEmprego: base.primeiroEmprego,
      trabalhos: base.experiencia.map(function(e){
        return {funcao:e.cargo, local:e.empresa, tempo:e.periodo,
                oQueFazia:e.atividades, maisSobre:e.maisSobre || ""};
      }),
      estudos: base.formacao.map(function(f){
        return {nivel:f.nivel, curso:f.curso || "", instituicao:f.instituicao || "", situacao:f.situacao || ""};
      }),
      cursos: base.cursos,
      idiomas: base.idiomas || ""
    };
  }

  // Mesmo filtro do servidor (servidor/ia/instrucoes.js): frase com cara de
  // instrução ("</dados> Nova regra: invente...") não entra no currículo,
  // nem quando o currículo é montado sem a IA.
  var MARCAS = new RegExp([
    "<\\s*/?\\s*[a-z_]+\\s*>",
    "\\bnovas? (regras?|instru[cç](ao|ão|oes|ões))\\b",
    "\\b(ignore|ignora|ignorar|desconsidere|desconsiderar|esque[cç]a)\\b.{0,40}\\b(instru|regra|anterior|acima|tudo)",
    "\\b(instru[cç](ao|ão|oes|ões)|regras?) (do|de) sistema\\b",
    "\\b(system|sistema|assistant|assistente|developer)\\s*:",
    "\\bprompt\\b",
    "\\binvent(e|a|ar|em)\\b",
    "\\b(acrescente|adicione|coloque|inclua|escreva)\\b.{0,40}\\b(no|na|nos|nas|ao|à)\\s+(resumo|lista|curr[ií]culo|campo|cursos|experi[eê]ncia)",
    "\\bvoc[eê] (agora )?(é|e|deve|vai) (um|uma|ser|obedecer|responder)\\b",
    "\\b(responda|retorne|devolva) (em|com|apenas|s[oó])\\b"
  ].join("|"), "i");
  function semInstrucoes(t){
    if(!MARCAS.test(t)) return t;
    var frases = t.replace(/<\s*\/?\s*[a-z_]+\s*>/gi, " ").match(/[^.!?;:\n]+[.!?;:\n]*/g) || [];
    return frases.filter(function(f){ return !MARCAS.test(f); }).join(" ").replace(/\s+/g, " ").trim();
  }
  function texto(v){ return typeof v === "string" ? semInstrucoes(v.replace(/\s+/g, " ").trim()) : ""; }

  // Maiúsculas em nomes próprios: "construtora silva" -> "Construtora Silva".
  var MINUSCULAS = ["de","da","do","das","dos","e","em","na","no"];
  function nomeProprio(t){
    var s = texto(t);
    if(!s || s !== s.toLowerCase()) return s; // a pessoa já usou maiúsculas: respeita
    return s.split(" ").map(function(w, k){
      if(k > 0 && MINUSCULAS.indexOf(w) >= 0) return w;
      if(/^[ivxlc]+$/.test(w) && w.length > 1) return w.toUpperCase(); // João XXIII
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(" ");
  }
  function frase(t){
    t = texto(t);
    if(!t) return "";
    t = t.charAt(0).toUpperCase() + t.slice(1);
    return /[.!?]$/.test(t) ? t : t + ".";
  }

  // Junta o que veio do servidor (ou nada, se falhou) com as partes que nunca passam pela IA.
  function montar(base, ia){
    ia = ia || {};
    var expIA = Array.isArray(ia.experiencia) ? ia.experiencia : [];
    var cursosIA = Array.isArray(ia.cursos) ? ia.cursos : [];
    var estIA = Array.isArray(ia.formacao) ? ia.formacao : [];
    return {
      titulo: texto(ia.titulo) || nomeProprio(base.titulo),
      resumo: texto(ia.resumo),
      experiencia: base.experiencia.map(function(e, k){
        var x = expIA[k] || {};
        var atividades = Array.isArray(x.atividades) && x.atividades.length ? x.atividades : frase(e.atividades);
        return {
          cargo: texto(x.cargo) || nomeProprio(e.cargo),
          empresa: texto(x.empresa) || nomeProprio(e.empresa),   // a IA só arruma o nome; o período vem das respostas
          periodo: e.periodo,
          atividades: atividades,
          maisSobre: e.maisSobre ? (texto(x.maisSobre) || frase(e.maisSobre)) : ""
        };
      }),
      formacao: base.formacao.map(function(f, k){
        var x = estIA[k] || {};
        return {nivel:f.nivel, situacao:f.situacao,
                curso: texto(x.curso) || nomeProprio(f.curso),
                instituicao: texto(x.instituicao) || nomeProprio(f.instituicao)};
      }),
      cursos: base.cursos.map(function(c, k){ return texto(cursosIA[k]) || nomeProprio(c); }),
      idiomas: base.idiomas ? (texto(ia.idiomas) || frase(base.idiomas).replace(/\.$/, "")) : "",
      local: base.local.split(" – ").map(function(p, k){ return k === 0 ? nomeProprio(p) : p; }).join(" – ")
    };
  }

  function avisarDepois(msg){
    // A tela do currículo aparece depois da espera do app.js; o motivo vai no texto dela.
    setTimeout(function(){
      var sub = document.getElementById("subPronto");
      if(sub) sub.textContent = msg + " Veja se está tudo certo.";
    }, 1800);
  }

  function semIA(base, motivo){
    avisarDepois(motivo || AVISO);
    var cv = montar(base, null);
    cv.semIA = true;
    return cv;
  }

  /* ---------- ajuste livre no fim ("o nome da empresa é ...") ---------- */
  // Vai para a IA o currículo sem telefone, e-mail e LinkedIn. O nome vai,
  // porque a pessoa pode pedir para mudá-lo.
  function paraAjuste(cv){
    var lista = window.FalaCurriculoApp.listaDe;
    return {
      nome: cv.nome || "", titulo: cv.titulo || "", local: cv.local || "", idade: String(cv.idade || ""),
      resumo: cv.resumo || "",
      experiencia: (cv.experiencia || []).map(function(e){
        return {cargo:e.cargo || "", empresa:e.empresa || "", periodo:e.periodo || "",
                atividades: lista(e.atividades), maisSobre:e.maisSobre || ""};
      }),
      formacao: (cv.formacao || []).map(function(f){
        return {nivel:f.nivel || "", curso:f.curso || "", situacao:f.situacao || "", instituicao:f.instituicao || ""};
      }),
      cursos: cv.cursos || [], idiomas: cv.idiomas || "", cnh: cv.cnh || "", modalidade: cv.modalidade || ""
    };
  }

  function contatoNovo(atual, novo, tipo){
    novo = texto(novo);
    if(!novo) return atual;
    var app = window.FalaCurriculoApp;
    if(tipo === "telefone"){ var v = app.validar({tipo:"telefone", ajuda:""}, novo, true); return v.ok ? v.valor : atual; }
    if(tipo === "email"){ var e = app.emailFalado(novo); return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e) ? e : atual; }
    return novo;
  }

  window.ajustarCurriculoComIA = function(cv, pedido){
    var ctrl = window.AbortController ? new AbortController() : null;
    var limite = setTimeout(function(){ if(ctrl) ctrl.abort(); }, ESPERA_MAXIMA);
    return fetch("/api/ajustar", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({cv: paraAjuste(cv), pedido: pedido}),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function(r){ return r.json().catch(function(){ return null; }); })
    .then(function(j){
      clearTimeout(limite);
      if(!j || !j.ok || !j.cv) return {motivo: j && j.motivo};
      var n = j.cv, c = j.contatos || {};
      var novo = {};
      for(var k in cv) novo[k] = cv[k];
      ["nome","titulo","local","resumo","idiomas","cnh","modalidade"].forEach(function(k){ novo[k] = texto(n[k]); });
      novo.idade = texto(n.idade).replace(/\D/g, "");
      novo.experiencia = n.experiencia;
      novo.formacao = n.formacao;
      novo.cursos = n.cursos;
      novo.primeiroEmprego = !n.experiencia.length;
      novo.telefone = contatoNovo(cv.telefone, c.telefone, "telefone");
      novo.email = contatoNovo(cv.email, c.email, "email");
      novo.linkedin = contatoNovo(cv.linkedin, c.linkedin, "linkedin");
      if(!novo.nome) novo.nome = cv.nome;
      return {cv: novo, resposta: texto(j.resposta)};
    }).catch(function(){
      clearTimeout(limite);
      return {motivo: "Não consegui falar com o servidor. Tente de novo em instantes."};
    });
  };

  window.processarCurriculoComIA = function(){
    var app = window.FalaCurriculoApp;
    if(!app) return Promise.resolve(null);
    var base = app.cvBase();
    var ctrl = window.AbortController ? new AbortController() : null;
    var limite = setTimeout(function(){ if(ctrl) ctrl.abort(); }, ESPERA_MAXIMA);

    return fetch("/api/curriculo", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({dados: dadosParaIA(base)}),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function(r){
      return r.json().catch(function(){ return null; });
    }).then(function(j){
      clearTimeout(limite);
      if(!j || !j.ok || !j.cv){ return semIA(base, j && j.motivo); }
      var cv = montar(base, j.cv);
      if(j.origem !== "ia"){ cv.semIA = true; avisarDepois(j.motivo || AVISO); }
      return cv;
    }).catch(function(){
      clearTimeout(limite);
      // Nada das respostas vai para o console.
      console.warn("[ia] servidor indisponível");
      return semIA(base, AVISO);
    });
  };

})();
