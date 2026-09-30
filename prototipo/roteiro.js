"use strict";

/* ============================================================
   1. ROTEIRO — grupos únicos e grupos que se repetem
   ============================================================ */
var SECOES = [
  {id:"pessoais", nome:"Dados Pessoais", icone:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'},
  {id:"trabalho", nome:"Trabalho",       icone:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>'},
  {id:"estudo",   nome:"Estudo",         icone:'<path d="M3 8l9-4 9 4-9 4z"/><path d="M7 10v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5"/>'},
  {id:"contato",  nome:"Contato",        icone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>'}
];

var SUPERIOR = ["Curso técnico","Faculdade"];

var ROTEIRO = [
  {
    id:"pessoais", secao:"pessoais", lista:false,
    perguntas:[
      {id:"nome", obrig:true, tipo:"nome", texto:"Qual é o seu nome completo?", ajuda:"Fale o seu nome e o seu sobrenome.", exemplo:"José da Silva"},
      {id:"cidade", obrig:true, tipo:"texto", texto:"Em qual cidade você mora?", ajuda:"Fale só o nome da cidade.", exemplo:"São Paulo"},
      {id:"estado", obrig:true, tipo:"estado", texto:"E essa cidade fica em qual estado?", ajuda:"Por exemplo: São Paulo, Bahia, Ceará.", exemplo:"São Paulo"},
      {id:"objetivo", obrig:true, tipo:"texto", texto:"Que trabalho você está procurando agora?", ajuda:"Fale o nome da vaga que você quer. Por exemplo: ajudante de pedreiro.", exemplo:"Ajudante de pedreiro"},
      {id:"cnh", obrig:false, tipo:"opcao", texto:"Você tem carteira de motorista?", ajuda:"Se não tiver, não tem problema nenhum. Não vai aparecer no currículo.",
       opcoes:["Não tenho","Sim, de moto","Sim, de carro","Sim, de moto e de carro"]},
      {id:"modalidade", obrig:false, tipo:"opcao", texto:"Você pode trabalhar fora de casa?", ajuda:"Toque numa das opções.",
       opcoes:["Sim, no local de trabalho","Só de casa","Dos dois jeitos"]},
      {id:"idade", obrig:false, tipo:"idade", texto:"Quantos anos você tem?", ajuda:"Pode falar só o número.", exemplo:"42"}
    ]
  },
  {
    id:"trabalho", secao:"trabalho", lista:true,
    porta:{id:"jaTrabalhou", tipo:"opcao", texto:"Você já trabalhou antes?", ajuda:"Vale qualquer trabalho, mesmo sem carteira assinada.",
      opcoes:["Sim, já trabalhei","Nunca trabalhei. Procuro o primeiro emprego"], negativa:"Nunca trabalhei. Procuro o primeiro emprego"},
    perguntas:[
      {id:"cargo", obrig:true, tipo:"texto", texto:"Qual era a sua função nesse trabalho?", ajuda:"É o nome do serviço que você fazia. Por exemplo: ajudante de pedreiro.", exemplo:"Ajudante de pedreiro"},
      {id:"empresa", obrig:true, tipo:"texto", texto:"Onde você fazia esse trabalho?", ajuda:"Pode ser o nome da empresa, da obra, da loja, ou a casa das pessoas. Se era por conta própria, toque no botão verde.", exemplo:"Construtora Silva", atalhos:["Trabalhei por conta própria"]},
      {id:"periodo", obrig:true, tipo:"periodo", texto:"Quanto tempo você ficou nesse trabalho?", ajuda:"Fale com número e a palavra mês ou ano. Por exemplo: dois anos.", exemplo:"2 anos"},
      {id:"atividades", obrig:true, tipo:"longo", texto:"O que você fazia todo dia nesse trabalho?", ajuda:"Conte duas ou três coisas que você fazia.", exemplo:"Eu carregava material, fazia massa e ajudava no reboco"},
      {id:"maisSobre", obrig:false, tipo:"texto", texto:"Quer contar mais alguma coisa sobre esse trabalho?", ajuda:"Pode falar o que quiser: como você aprendeu, com quem você trabalhava, o que você fazia de melhor. Se não quiser, pode pular.", exemplo:"Aprendi na obra com meu tio e depois passei a ensinar os mais novos"}
    ],
    mais:{titulo:"Você trabalhou em outro lugar também?", sub:"Contar mais de um trabalho deixa o currículo mais forte.",
      sim:"Sim, trabalhei em outro", nao:"Não, só esse"},
    resumo:function(it){ return [it.cargo, it.empresa].filter(Boolean).join(" — "); }
  },
  {
    id:"estudo", secao:"estudo", lista:true,
    perguntas:[
      {id:"escolaridade", obrig:true, tipo:"opcao", texto:"Até onde você estudou?", ajuda:"Toque na opção mais parecida com a sua.",
       opcoes:["Não estudei","Ensino fundamental","Ensino médio","Curso técnico","Faculdade"]},
      {id:"instituicao", tipo:"texto", texto:"Qual era o nome da escola ou da faculdade?", ajuda:"Se não lembrar o nome, pode pular esta pergunta.", exemplo:"Escola Estadual Jardim União",
       mostrarSe:function(it){ return it.escolaridade && it.escolaridade !== "Não estudei"; },
       obrigSe:function(it){ return SUPERIOR.indexOf(it.escolaridade) >= 0; }},
      {id:"situacao", obrig:true, tipo:"opcao", texto:"Você terminou os estudos nessa escola?", ajuda:"Toque numa das opções.",
       opcoes:["Terminei","Não terminei","Ainda estou estudando"],
       mostrarSe:function(it){ return it.escolaridade && it.escolaridade !== "Não estudei"; }}
    ],
    maisSe:function(it){ return it.escolaridade && it.escolaridade !== "Não estudei"; },
    mais:{titulo:"Você estudou em outro lugar também?", sub:"Por exemplo: terminou o fundamental numa escola e o médio em outra.",
      sim:"Sim, estudei em outro", nao:"Não, só esse"},
    resumo:function(it){ return [it.escolaridade, it.instituicao].filter(Boolean).join(" — "); }
  },
  {
    id:"cursos", secao:"estudo", lista:true,
    porta:{id:"fezCurso", tipo:"opcao", texto:"Você fez algum curso?", ajuda:"Vale qualquer curso, mesmo que seja curto.",
      opcoes:["Sim, fiz curso","Não fiz nenhum curso"], negativa:"Não fiz nenhum curso"},
    perguntas:[
      {id:"curso", obrig:true, tipo:"texto", texto:"Qual foi o curso que você fez?", ajuda:"Fale o nome do curso. Por exemplo: curso de segurança em obras.", exemplo:"Curso de Segurança em Obras"}
    ],
    mais:{titulo:"Você fez outro curso também?", sub:"Pode contar todos, um de cada vez.",
      sim:"Sim, fiz outro curso", nao:"Não, só esse"},
    resumo:function(it){ return it.curso || ""; }
  },
  {
    id:"idiomas", secao:"estudo", lista:false,
    perguntas:[
      {id:"idiomas", obrig:false, tipo:"texto", texto:"Você fala alguma outra língua além do português?", ajuda:"Se falar só português, pode pular esta pergunta.", exemplo:"Espanhol básico"}
    ]
  },
  {
    id:"contato", secao:"contato", lista:false,
    perguntas:[
      {id:"telefone", obrig:true, tipo:"telefone", texto:"Qual é o seu telefone com WhatsApp?", ajuda:"Fale o DDD e depois o número, bem devagar.", exemplo:"(11) 99828-0299"},
      {id:"email", obrig:false, tipo:"email", escrever:true, texto:"Qual é o seu e-mail?", ajuda:"É bem mais fácil escrever o e-mail do que falar.", exemplo:"jose.silva@gmail.com"},
      {id:"temLinkedin", obrig:false, tipo:"opcao", texto:"Você tem LinkedIn?", ajuda:"É um site onde as empresas procuram gente para trabalhar.",
       opcoes:["Não tenho","Tenho LinkedIn"]},
      {id:"linkedin", tipo:"texto", escrever:true, texto:"Qual é o seu LinkedIn?", ajuda:"Escreva o endereço do seu perfil.", exemplo:"linkedin.com/in/josedasilva",
       mostrarSe:function(it){ return it.temLinkedin === "Tenho LinkedIn"; }}
    ]
  }
];