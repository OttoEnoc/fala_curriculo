(function(){
"use strict";



/* ============================================================
   2. ESTADO
   ============================================================ */
var S = {
  tela:"t-inicio",
  pos:{g:0, inst:0, q:-1},
  dados:{}, portas:{}, visitados:{},
  rascunho:"", ultimaChave:null, repeticoes:0, som:true, modo:"sozinho", micOk:null,
  editandoSecao:null, conferindoFaltas:false,
  faltouEscrever:false, cv:null,
  iniciado:false, salvoNoAparelho:false, consentiu:false
};

var $ = function(s){ return document.querySelector(s); };
var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
var reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var ORDEM = $$(".tela").map(function(t){ return t.id; });
var dentroDeQuadro = (function(){ try{ return window.self !== window.top; }catch(e){ return true; } })();

function zerar(){
  S.dados = {}; S.portas = {}; S.visitados = {};
  ROTEIRO.forEach(function(g){ S.dados[g.id] = [{}]; });
  S.pos = {g:0, inst:0, q:-1};
  S.editandoSecao = null; S.conferindoFaltas = false; S.cv = null;
  S.rascunho = ""; S.ultimaChave = null;
}
zerar();

/* ============================================================
   2b. PROGRESSO SALVO NO APARELHO (armazenamento.js)
   ============================================================ */
function estadoParaSalvar(){
  return {dados:S.dados, portas:S.portas, visitados:S.visitados, pos:S.pos, modo:S.modo,
    tela:S.tela, cv:S.cv, editandoSecao:S.editandoSecao, conferindoFaltas:S.conferindoFaltas};
}
function salvarProgresso(){
  if(!S.iniciado || typeof Armazenamento === "undefined") return;
  var copia;
  try{ copia = JSON.parse(JSON.stringify(estadoParaSalvar())); }catch(e){ return; }
  Armazenamento.salvar(copia).then(
    function(){ S.salvoNoAparelho = true; },
    function(){ S.salvoNoAparelho = false; });
}

var estadoGuardado = null;

/* Apaga o que está guardado no aparelho e para de guardar. */
function apagarDoAparelho(){
  S.iniciado = false;
  S.salvoNoAparelho = false;
  if(typeof Armazenamento === "undefined") return Promise.resolve();
  return Armazenamento.apagar().catch(function(){});
}

/* Depois de gerar o PDF, as respostas não ficam mais guardadas no aparelho.
   O currículo continua nesta tela até o app ser fechado. */
var AVISO_APAGADO = " As suas respostas foram apagadas deste aparelho.";
function limparAposPDF(){ return apagarDoAparelho(); }

function retomar(e){
  S.dados = e.dados || S.dados; S.portas = e.portas || {}; S.visitados = e.visitados || {};
  S.pos = e.pos || {g:0, inst:0, q:-1}; S.modo = e.modo || "sozinho"; S.cv = e.cv || null;
  S.editandoSecao = e.editandoSecao || null; S.conferindoFaltas = !!e.conferindoFaltas;
  S.iniciado = true;
  S.consentiu = true; // só existe progresso guardado depois de aceitar
  aplicarModo();
  var t = e.tela;
  if(["t-pergunta","t-ouvindo","t-escrever","t-confirmar","t-faltou","t-erro","t-processando"].indexOf(t) >= 0){ mostrarPergunta(); return; }
  if(t === "t-mais"){ mostrarMais(); return; }
  if((t === "t-pronto" || t === "t-enviar") && S.cv){ $("#previaCV").innerHTML = renderCV(S.cv); ir(t); return; }
  if(t === "t-corrigir"){ montarCorrigir(); ir(t); return; }
  if(["t-progresso","t-conferir","t-tudocerto","t-faltando"].indexOf(t) >= 0){ ir(t); return; }
  if(t === "t-lendo" || t === "t-preparando" || t === "t-pronto" || t === "t-enviar"){ ir("t-tudocerto"); return; }
  mostrarPergunta();
}

function verificarProgressoGuardado(){
  if(typeof Armazenamento === "undefined") return;
  Armazenamento.carregar().then(function(e){
    if(!e || S.iniciado || S.tela !== "t-inicio") return;
    estadoGuardado = e;
    var nome = e.dados && e.dados.pessoais && e.dados.pessoais[0] && e.dados.pessoais[0].nome;
    $("#resumoRetomar").innerHTML = nome
      ? '<div class="cartao cartao--estatico"><span><b>' + esc(nome) + '</b><small>Currículo começado neste aparelho</small></span></div>'
      : "";
    ir("t-retomar");
  }, function(){});
}

/* ============================================================
   3. NAVEGAÇÃO
   ============================================================ */
function ir(id, volta){
  var atual = document.querySelector(".tela.ativa");
  if(atual) atual.classList.remove("ativa","entra","entra-volta");
  var nova = document.getElementById(id);
  if(!nova) return;
  S.tela = id;
  salvarProgresso();
  nova.classList.add("ativa");
  void nova.offsetWidth;
  nova.classList.add(volta ? "entra-volta" : "entra");
  window.scrollTo({top:0, behavior: reduzir ? "auto" : "smooth"});
  aoEntrar(id);
}
document.addEventListener("click", function(e){
  var a = e.target.closest("[data-ir]");
  if(a){ pararTudo(); ir(a.getAttribute("data-ir")); }
  var v = e.target.closest("[data-voltar]");
  if(v){ pararTudo(); ir(v.getAttribute("data-voltar"), true); }
});

/* ============================================================
   4. O APP FALA
   ============================================================ */
var vozPT = null;
function acharVoz(){
  if(!("speechSynthesis" in window)) return;
  var vs = window.speechSynthesis.getVoices() || [];
  vozPT = vs.filter(function(v){ return /pt[-_]BR/i.test(v.lang); })[0]
       || vs.filter(function(v){ return /^pt/i.test(v.lang); })[0] || null;
}
if("speechSynthesis" in window){ acharVoz(); window.speechSynthesis.onvoiceschanged = acharVoz; }

function falar(texto, aoFim){
  if(!("speechSynthesis" in window) || !S.som || !texto){ if(aoFim) setTimeout(aoFim, 200); return; }
  try{ window.speechSynthesis.cancel(); }catch(e){}
  var u = new SpeechSynthesisUtterance(String(texto));
  u.lang = "pt-BR";
  if(vozPT) u.voice = vozPT;
  u.rate = S.modo === "ajuda" ? 0.96 : 0.85;
  u.onstart = function(){ document.body.classList.add("falando"); };
  u.onend = function(){ document.body.classList.remove("falando"); if(aoFim) aoFim(); };
  u.onerror = function(){ document.body.classList.remove("falando"); if(aoFim) aoFim(); };
  window.speechSynthesis.speak(u);
}
function calar(){ try{ window.speechSynthesis.cancel(); }catch(e){} document.body.classList.remove("falando"); }

$("#btnSom").addEventListener("click", function(){
  S.som = !S.som;
  this.setAttribute("aria-pressed", S.som ? "true" : "false");
  $("#icoSom").innerHTML = S.som
    ? '<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>'
    : '<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M17 9l4 6M21 9l-4 6"/>';
  if(!S.som) calar();
});

/* ============================================================
   5. O APP OUVE
   ============================================================ */
var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
var rec = null, gravando = false, textoOuvido = "", encerrando = false;
function temMic(){ return (!!SR || podeGravarAudio()) && S.micOk !== false; }

/* ---- Gravação de áudio enviada ao servidor (quando o navegador não reconhece fala) ---- */
var gravador = null, pedacos = [], enviarAoParar = false, timerGravacao = null;
var TEMPO_MAXIMO_GRAVACAO = 60000;

function podeGravarAudio(){
  return !!(S.recursos && S.recursos.transcricao && window.MediaRecorder &&
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
function tipoDeAudio(){
  var tipos = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for(var k = 0; k < tipos.length; k++){
    try{ if(MediaRecorder.isTypeSupported(tipos[k])) return tipos[k]; }catch(e){}
  }
  return "";
}
function mostrarOuvindo(){
  gravando = true;
  document.body.classList.add("ouvindo");
  $("#btnParar").hidden = false;
  $("#btnMicDeNovo").hidden = true;
  $("#tituloOuvindo").textContent = "Pode falar agora";
  $("#subOuvindo").textContent = "Quando terminar, aperte o botão vermelho de parar.";
  $("#seloOuvindo").textContent = "Estou ouvindo";
}
function iniciarGravacaoAudio(){
  textoOuvido = "";
  var el = $("#aoVivo"); if(el) el.textContent = "";
  $("#aoVivo").setAttribute("data-vazio", "Estou gravando. O texto aparece quando você parar.");
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(fluxo){
    if(S.tela !== "t-ouvindo"){ fluxo.getTracks().forEach(function(t){ t.stop(); }); return; }
    var tipo = tipoDeAudio();
    try{ gravador = tipo ? new MediaRecorder(fluxo, {mimeType:tipo}) : new MediaRecorder(fluxo); }
    catch(e){ fluxo.getTracks().forEach(function(t){ t.stop(); }); ir("t-escrever"); return; }
    pedacos = []; enviarAoParar = false;
    gravador.ondataavailable = function(ev){ if(ev.data && ev.data.size) pedacos.push(ev.data); };
    gravador.onstop = function(){
      clearTimeout(timerGravacao);
      fluxo.getTracks().forEach(function(t){ t.stop(); });
      var g = gravador; gravador = null;
      gravando = false; document.body.classList.remove("ouvindo");
      if(enviarAoParar) enviarAudio(new Blob(pedacos, {type:(g && g.mimeType) || tipo || "audio/webm"}));
    };
    gravador.start();
    mostrarOuvindo();
    // não deixa a gravação ficar ligada para sempre
    timerGravacao = setTimeout(function(){ if(gravador) $("#btnParar").click(); }, TEMPO_MAXIMO_GRAVACAO);
  }).catch(function(err){
    S.micOk = false;
    $("#tituloOuvindo").textContent = "O microfone está bloqueado";
    $("#subOuvindo").textContent = (err && err.name === "NotAllowedError")
      ? "Toque no cadeado ao lado do endereço e libere o microfone. Ou responda escrevendo."
      : "Não encontrei um microfone neste aparelho. Você pode responder escrevendo.";
    $("#seloOuvindo").textContent = "Microfone bloqueado";
    $("#btnParar").hidden = true; $("#btnMicDeNovo").hidden = true;
    falar("O microfone não funcionou. Você pode responder escrevendo.");
  });
  return true;
}
function encerrarAudio(enviar){
  if(!gravador || gravador.state === "inactive") return false;
  enviarAoParar = enviar;
  try{ gravador.stop(); }catch(e){ return false; }
  return true;
}
function enviarAudio(blob){
  S.aguardandoTranscricao = true;
  ir("t-processando");
  var controle = ("AbortController" in window) ? new AbortController() : null;
  var timer = setTimeout(function(){ if(controle) controle.abort(); }, 35000);
  fetch(API_BASE + "/api/transcrever", {
    method:"POST", headers:{"Content-Type": blob.type || "audio/webm"}, body:blob,
    signal: controle ? controle.signal : undefined
  }).then(function(r){
    return r.json().then(function(c){ if(!r.ok || !c || !c.ok) throw new Error("falhou"); return c.texto; });
  }).then(function(texto){
    clearTimeout(timer); S.aguardandoTranscricao = false;
    if(S.tela !== "t-processando") return;
    texto = String(texto || "").trim();
    if(!texto){ ir("t-erro"); return; }
    S.rascunho = texto;
    tratarResposta(texto);
  }).catch(function(){
    clearTimeout(timer); S.aguardandoTranscricao = false;
    if(S.tela !== "t-processando") return;
    S.rascunho = "";
    ir("t-escrever");
    falar("Não consegui entender o áudio agora. Escreva a resposta, por favor.");
  });
}

/*
  Ordem de preferência:
  1. reconhecimento do navegador, com o texto aparecendo enquanto a pessoa fala;
  2. gravação de áudio transcrita pelo servidor, quando o 1 não existe ou falha;
  3. escrita.
*/
function iniciarGravacao(){
  if(!SR || S.srFalhou){
    if(podeGravarAudio()) return iniciarGravacaoAudio();
    ir("t-escrever"); return false;
  }
  textoOuvido = ""; encerrando = false;
  var el = $("#aoVivo"); if(el){ el.textContent = ""; el.setAttribute("data-vazio", "O que você falar aparece aqui…"); }
  try{ if(rec){ rec.onend = null; rec.abort(); } }catch(e){}
  try{ rec = new SR(); }catch(e){ ir("t-escrever"); return false; }

  rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;

  rec.onstart = function(){
    gravando = true;
    document.body.classList.add("ouvindo");
    $("#btnParar").hidden = false;
    $("#btnMicDeNovo").hidden = true;
    $("#tituloOuvindo").textContent = "Pode falar agora";
    $("#subOuvindo").textContent = "Quando terminar, aperte o botão vermelho de parar.";
    $("#seloOuvindo").textContent = "Estou ouvindo";
  };
  rec.onresult = function(ev){
    var fechado = "", aberto = "";
    for(var k = 0; k < ev.results.length; k++){
      var r = ev.results[k];
      if(r.isFinal) fechado += r[0].transcript; else aberto += r[0].transcript;
    }
    textoOuvido = (fechado + " " + aberto).replace(/\s+/g," ").trim();
    var a = $("#aoVivo"); if(a) a.textContent = textoOuvido;
  };
  rec.onerror = function(ev){
    gravando = false;
    document.body.classList.remove("ouvindo");
    var erro = ev && ev.error;
    // o serviço de voz do navegador não está disponível: grava o áudio no lugar
    var servicoFalhou = erro === "service-not-allowed" || erro === "language-not-supported" ||
      (erro === "network" && navigator.onLine !== false);
    if(servicoFalhou && podeGravarAudio()){
      S.srFalhou = true; encerrando = true;
      iniciarGravacaoAudio();
      return;
    }
    if(erro === "not-allowed" || erro === "service-not-allowed"){
      S.micOk = false;
      $("#tituloOuvindo").textContent = "O microfone está bloqueado";
      $("#subOuvindo").textContent = dentroDeQuadro
        ? "Esta janela não tem permissão de microfone. Abra o link numa aba do navegador, ou responda escrevendo."
        : "Toque no cadeado ao lado do endereço e libere o microfone. Ou responda escrevendo.";
      $("#seloOuvindo").textContent = "Microfone bloqueado";
      $("#btnParar").hidden = true;
      $("#btnMicDeNovo").hidden = true;
      falar("O microfone está bloqueado. Você pode responder escrevendo.");
      return;
    }
    if(erro === "network"){ ir("t-offline"); return; }
    if(erro === "no-speech"){
      $("#tituloOuvindo").textContent = "Não ouvi nada";
      $("#subOuvindo").textContent = "Toque no botão abaixo e fale mais perto do aparelho.";
    }
    $("#btnParar").hidden = true;
    $("#btnMicDeNovo").hidden = false;
  };
  rec.onend = function(){
    gravando = false;
    document.body.classList.remove("ouvindo");
    if(encerrando) return;
    if(S.tela === "t-ouvindo" && !textoOuvido){
      $("#btnParar").hidden = true;
      $("#btnMicDeNovo").hidden = false;
    }
  };
  try{ rec.start(); }
  catch(e){ $("#btnParar").hidden = true; $("#btnMicDeNovo").hidden = false; return false; }
  return true;
}

function pararGravacao(){
  encerrarAudio(false);
  encerrando = true;
  if(rec){ try{ rec.stop(); }catch(e){} }
  gravando = false;
  document.body.classList.remove("ouvindo");
}
function pararTudo(){ calar(); pararGravacao(); clearTimeout(timerAuto); clearTimeout(timerRepetir); clearInterval(timerFrases); lendo = false; }

function falarResposta(){
  calar();
  if(!temMic()){ ir("t-escrever"); return; }
  ir("t-ouvindo");
  iniciarGravacao();
}

/* ============================================================
   6. NÚMEROS FALADOS
   ============================================================ */
var UNI = {zero:0,um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,meia:6,sete:7,oito:8,nove:9,
  dez:10,onze:11,doze:12,treze:13,catorze:14,quatorze:14,quinze:15,dezesseis:16,dezessete:17,dezoito:18,dezenove:19};
var DEZ = {vinte:20,trinta:30,quarenta:40,cinquenta:50,sessenta:60,setenta:70,oitenta:80,noventa:90};
var CEM = {cem:100,cento:100,duzentos:200,trezentos:300,quatrocentos:400,quinhentos:500,
  seiscentos:600,setecentos:700,oitocentos:800,novecentos:900};

function semAcento(t){ return String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(); }

function classeDe(p){
  if(Object.prototype.hasOwnProperty.call(CEM,p)) return 3;
  if(Object.prototype.hasOwnProperty.call(DEZ,p)) return 2;
  if(Object.prototype.hasOwnProperty.call(UNI,p)) return 1;
  return 0;
}
function valorDe(p){
  if(Object.prototype.hasOwnProperty.call(CEM,p)) return CEM[p];
  if(Object.prototype.hasOwnProperty.call(DEZ,p)) return DEZ[p];
  if(Object.prototype.hasOwnProperty.call(UNI,p)) return UNI[p];
  return null;
}

/* idade: "quarenta e dois" -> 42 */
function numeroDe(texto){
  var t = semAcento(texto);
  var so = t.replace(/[^0-9]/g,"");
  if(so) return parseInt(so, 10);
  var total = 0, achou = false;
  t.split(/[\s,]+/).forEach(function(p){
    var v = valorDe(p);
    if(v !== null){ total += v; achou = true; }
  });
  return achou ? total : null;
}

/* telefone: junta blocos falados em dígitos.
   "onze novecentos e noventa e oito duzentos e oitenta duzentos e noventa e nove"
   -> "11" + "998" + "280" + "299" */
function telefoneDigitos(texto){
  var t = semAcento(texto).replace(/[^a-z0-9\s]/g," ");
  var partes = t.split(/\s+/).filter(Boolean);
  var saida = "", bloco = null, ultimaClasse = 0;

  function fechar(){
    if(bloco !== null){ saida += String(bloco); bloco = null; ultimaClasse = 0; }
  }
  partes.forEach(function(p){
    if(p === "e") return;
    if(/^\d+$/.test(p)){ fechar(); saida += p; return; }
    var c = classeDe(p);
    if(c === 0){ fechar(); return; }
    var v = valorDe(p);
    if(bloco === null){ bloco = v; ultimaClasse = c; return; }
    if(c >= ultimaClasse){ fechar(); bloco = v; ultimaClasse = c; return; }
    bloco += v; ultimaClasse = c;
  });
  fechar();
  return saida;
}

function mascaraTelefone(d){
  d = String(d).replace(/\D/g,"").slice(0,11);
  if(d.length <= 2) return d.length ? "(" + d : "";
  if(d.length <= 6) return "(" + d.slice(0,2) + ") " + d.slice(2);
  if(d.length <= 10) return "(" + d.slice(0,2) + ") " + d.slice(2,6) + "-" + d.slice(6);
  return "(" + d.slice(0,2) + ") " + d.slice(2,7) + "-" + d.slice(7);
}

var UFS = {"acre":"AC","alagoas":"AL","amapa":"AP","amazonas":"AM","bahia":"BA","ceara":"CE",
  "distrito federal":"DF","espirito santo":"ES","goias":"GO","maranhao":"MA","mato grosso":"MT",
  "mato grosso do sul":"MS","minas gerais":"MG","para":"PA","paraiba":"PB","parana":"PR",
  "pernambuco":"PE","piaui":"PI","rio de janeiro":"RJ","rio grande do norte":"RN",
  "rio grande do sul":"RS","rondonia":"RO","roraima":"RR","santa catarina":"SC",
  "sao paulo":"SP","sergipe":"SE","tocantins":"TO"};
var SIGLAS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function maiusculas(t){
  return String(t).split(" ").map(function(p){
    if(!p) return p;
    if(["de","da","do","das","dos","e"].indexOf(p.toLowerCase()) >= 0) return p.toLowerCase();
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }).join(" ");
}

/* ============================================================
   7. VALIDAÇÃO
   ============================================================ */
var VAZIAS = ["nao sei","sei nao","nada","sla","sei la","talvez","qualquer coisa","tanto faz"];
function ehVazia(t){
  var s = semAcento(t).replace(/[^a-z0-9\s]/g,"").trim();
  return !s || VAZIAS.indexOf(s) >= 0;
}

function validar(p, texto, obrigatoria){
  var t = String(texto || "").replace(/\s+/g," ").trim();
  if(!t) return {ok:false, titulo:"Não recebi a sua resposta", msg:"Vamos tentar de novo? " + p.ajuda};
  if(obrigatoria && ehVazia(t)) return {ok:false, titulo:"Preciso desta informação", msg:"Sem ela o currículo fica incompleto. " + p.ajuda};

  switch(p.tipo){
    case "nome":
      if(t.split(/\s+/).filter(function(x){ return x.length > 1; }).length < 2)
        return {ok:false, titulo:"Faltou o sobrenome", msg:"Preciso do nome e do sobrenome. Fale assim: José da Silva."};
      return {ok:true, valor:maiusculas(t)};

    case "idade":
      var n = numeroDe(t);
      if(n === null) return {ok:false, titulo:"Preciso de um número", msg:"A idade tem que ser um número. Fale só o número, por exemplo: quarenta e dois."};
      if(n < 14 || n > 90) return {ok:false, titulo:"Esse número não parece certo", msg:"Fale de novo só a sua idade, por exemplo: quarenta e dois."};
      return {ok:true, valor:String(n)};

    case "telefone":
      var d = /^[\d\s()\-+.]+$/.test(t) ? t.replace(/\D/g,"") : telefoneDigitos(t);
      if(!d) return {ok:false, titulo:"Preciso de um número", msg:"O telefone tem que ser um número. Fale o DDD e depois o número, bem devagar."};
      if(d.length > 11 && d.indexOf("55") === 0) d = d.slice(2);   // código do Brasil
      if(d.length > 11) d = d.slice(-11);                          // sobrou alguma coisa na frente
      if(d.length === 8 || d.length === 9)
        return {ok:false, titulo:"Faltou o DDD",
                msg:"Peguei o número, mas preciso dos dois dígitos do DDD na frente. O de São Paulo é 11.", escrever:true};
      if(d.length < 10)
        return {ok:false, titulo:"Faltam números no telefone",
                msg:"Entendi " + d.length + " número" + (d.length > 1 ? "s" : "") + ", mas o telefone precisa de 10 ou 11 contando o DDD.", escrever:true};
      return {ok:true, valor:mascaraTelefone(d)};

    case "email":
      var e = semAcento(t).replace(/\s*arroba\s*/g,"@").replace(/\s*ponto\s*/g,".")
        .replace(/\s*underline\s*/g,"_").replace(/\s*traco\s*/g,"-").replace(/\s+/g,"");
      if(!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e))
        return {ok:false, titulo:"Esse e-mail não está completo",
                msg:"Um e-mail precisa ter arroba e um ponto, assim: jose@gmail.com. É mais fácil escrever do que falar.", escrever:true};
      return {ok:true, valor:e};

    case "estado":
      var s = semAcento(t).replace(/[^a-z\s]/g,"").trim();
      if(UFS[s]) return {ok:true, valor:maiusculas(s) + " (" + UFS[s] + ")"};
      var sig = t.toUpperCase().replace(/[^A-Z]/g,"");
      if(sig.length === 2 && SIGLAS.indexOf(sig) >= 0){
        for(var nm in UFS){ if(UFS[nm] === sig) return {ok:true, valor:maiusculas(nm) + " (" + sig + ")"}; }
      }
      for(var k in UFS){ if(s.indexOf(k) >= 0) return {ok:true, valor:maiusculas(k) + " (" + UFS[k] + ")"}; }
      return {ok:false, titulo:"Não reconheci esse estado", msg:"Fale o nome do estado onde fica a sua cidade. Por exemplo: São Paulo, Bahia, Ceará."};

    case "periodo":
      var sa = semAcento(t);
      var temNumero = /\d/.test(t) || numeroDe(t) !== null;
      var temUnidade = /(mes|meses|ano|anos|semana|semanas|dia|dias)/.test(sa);
      if(!temNumero || !temUnidade)
        return {ok:false, titulo:"Preciso do tempo certinho", msg:"Fale quanto tempo com número e a palavra mês ou ano. Por exemplo: dois anos, ou oito meses."};
      return {ok:true, valor:t};

    case "longo":
      if(t.split(/\s+/).length < 4)
        return {ok:false, titulo:"Me conte um pouquinho mais", msg:"Fale duas ou três coisas que você fazia no serviço. Por exemplo: eu carregava material, fazia massa e ajudava no reboco."};
      return {ok:true, valor:t};

    case "opcao":
      return {ok:true, valor:t};

    default:
      if(obrigatoria && t.replace(/\s/g,"").length < 2)
        return {ok:false, titulo:"A resposta ficou muito curta", msg:p.ajuda};
      return {ok:true, valor:t};
  }
}

/* ============================================================
   8. MOTOR DO ROTEIRO
   ============================================================ */
function grupoAtual(){ return ROTEIRO[S.pos.g]; }
function instancia(g, i){
  g = g || grupoAtual();
  i = (i === undefined) ? S.pos.inst : i;
  if(!S.dados[g.id]) S.dados[g.id] = [];
  if(!S.dados[g.id][i]) S.dados[g.id][i] = {};
  return S.dados[g.id][i];
}
function perguntaAtual(){
  var g = grupoAtual();
  if(S.pos.q === -1) return g.porta;
  return g.perguntas[S.pos.q];
}
function aplicavel(p, it){ return !p.mostrarSe || !!p.mostrarSe(it); }
function ehObrig(p, it){
  if(p.obrig === true) return true;
  if(typeof p.obrigSe === "function") return !!p.obrigSe(it);
  return false;
}
function secaoInfo(id){
  for(var k=0;k<SECOES.length;k++){ if(SECOES[k].id === id) return SECOES[k]; }
  return SECOES[0];
}
function grupoPulado(g){
  return !!(g.porta && S.portas[g.id] === g.porta.negativa);
}

/* --- entrar no grupo atual --- */
function entrarGrupo(){
  var g = grupoAtual();
  S.visitados[g.id] = true;
  if(g.porta && S.portas[g.id] === undefined){ S.pos.q = -1; mostrarPergunta(); return; }
  S.pos.q = -1;
  proximaPergunta();
}

function proximaPergunta(){
  var g = grupoAtual(), it = instancia(g);
  var q = S.pos.q;
  do{ q++; }while(q < g.perguntas.length && !aplicavel(g.perguntas[q], it));
  if(q >= g.perguntas.length){ fimDaInstancia(); return; }
  S.pos.q = q;
  mostrarPergunta();
}

function fimDaInstancia(){
  var g = grupoAtual(), it = instancia(g);
  var podeMais = g.lista && g.mais && (!g.maisSe || g.maisSe(it));
  if(podeMais){ mostrarMais(); return; }
  proximoGrupo();
}

function proximoGrupo(){
  var anterior = grupoAtual();
  var gi = S.pos.g + 1;

  while(gi < ROTEIRO.length){
    if(S.editandoSecao && ROTEIRO[gi].secao !== S.editandoSecao){ S.editandoSecao = null; ir("t-tudocerto"); return; }
    break;
  }
  if(gi >= ROTEIRO.length){
    S.editandoSecao = null;
    var falta = faltandoObrigatorios();
    if(falta.length){ ir("t-faltando"); return; }
    ir("t-conferir");
    return;
  }

  S.pos = {g:gi, inst:0, q:-1};
  var novo = grupoAtual();
  if(!S.editandoSecao && novo.secao !== anterior.secao){ ir("t-progresso"); return; }
  entrarGrupo();
}

/* --- desenhar a pergunta --- */
function mostrarPergunta(){
  var g = grupoAtual(), p = perguntaAtual(), it = instancia(g);
  if(!p){ proximaPergunta(); return; }

  // ao trocar de pergunta, o rascunho anterior não pode sobrar no campo
  var chave = S.pos.g + ":" + S.pos.inst + ":" + S.pos.q;
  if(chave !== S.ultimaChave){ S.rascunho = ""; S.ultimaChave = chave; }

  var obrigatoria = (S.pos.q === -1) ? true : ehObrig(p, it);
  var sec = secaoInfo(g.secao);

  $("#txtPergunta").textContent = p.texto;
  $("#txtPerguntaEsc").textContent = p.texto;
  $("#ajudaPergunta").innerHTML = p.ajuda + (obrigatoria ? ' <span class="obrig">Esta é obrigatória.</span>' : "");
  $("#ajudaEsc").textContent = p.ajuda;

  var etiqueta = sec.nome;
  if(g.lista && S.pos.q >= 0){
    if(g.id === "trabalho") etiqueta += " · " + (S.pos.inst + 1) + "º trabalho";
    if(g.id === "estudo")   etiqueta += " · " + (S.pos.inst + 1) + "ª escola";
    if(g.id === "cursos")   etiqueta += " · " + (S.pos.inst + 1) + "º curso";
  }
  $("#passoP").textContent = etiqueta;
  $("#barraP").style.width = ((S.pos.g + 1) / ROTEIRO.length * 100) + "%";

  var cx = $("#opcoesPergunta");
  var temOpcoes = !!(p.opcoes && p.opcoes.length);
  if(temOpcoes){
    cx.innerHTML = p.opcoes.map(function(o){
      return '<button class="cartao" data-opcao="' + o.replace(/"/g,"&quot;") + '"><span class="num">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m4.5 12.5 5 5 10-11"/></svg>' +
        '</span><span><b>' + o + '</b></span></button>';
    }).join("");
    cx.hidden = false;
  }else if(p.atalhos && p.atalhos.length){
    // resposta rápida sem precisar falar nem escrever
    cx.innerHTML = p.atalhos.map(function(o){
      return '<button class="cartao" data-opcao="' + o.replace(/"/g,"&quot;") +
        '" style="border-color:var(--verde);background:var(--verde-suave)"><span class="num" style="background:var(--verde-bg);color:#fff">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m4.5 12.5 5 5 10-11"/></svg>' +
        '</span><span><b>' + o + '</b></span></button>';
    }).join("");
    cx.hidden = false;
  }else{ cx.innerHTML = ""; cx.hidden = true; }
  var escritaPrimeiro = !!p.escrever || !temMic() || S.modo === "ajuda";

  var exB = $("#exemploPergunta"), exE = $("#exemploEsc");
  var mostrarEx = (S.modo === "ajuda") && !!p.exemplo && !temOpcoes;
  exB.hidden = !mostrarEx; exE.hidden = !mostrarEx;
  if(mostrarEx){
    exB.querySelector("b").textContent = p.exemplo;
    exE.querySelector("b").textContent = p.exemplo;
  }

  $("#btnFalar").hidden = temOpcoes && !temMic();
  $("#btnEscrever").hidden = false;
  $("#btnFalar").className = "btn largura-total " + (escritaPrimeiro ? "btn--claro" : "btn--vermelho btn--mic");
  $("#btnEscrever").className = "btn " + (escritaPrimeiro ? "btn--azul largura-total" : "btn--claro");
  var acoes = $("#acoesPergunta");
  if(escritaPrimeiro) acoes.insertBefore($("#btnEscrever"), $("#btnFalar"));
  else acoes.insertBefore($("#btnFalar"), $("#btnEscrever"));
  $("#btnPularAqui").hidden = obrigatoria;

  ir("t-pergunta");
}

/* --- guardar resposta --- */
function guardar(valor){
  var g = grupoAtual(), p = perguntaAtual();
  if(S.pos.q === -1){
    S.portas[g.id] = valor;
    if(g.porta.negativa && valor === g.porta.negativa){ proximoGrupo(); return; }
    S.pos.q = -1;
    proximaPergunta();
    return;
  }
  instancia(g)[p.id] = valor;
  if(S.conferindoFaltas){
    var falta = faltandoObrigatorios();
    if(falta.length){ ir("t-faltando"); return; }
    S.conferindoFaltas = false;
    ir("t-conferir");
    return;
  }
  proximaPergunta();
}

function tratarResposta(texto){
  var g = grupoAtual(), p = perguntaAtual(), it = instancia(g);
  var obrigatoria = (S.pos.q === -1) ? true : ehObrig(p, it);
  var v = validar(p, texto, obrigatoria);
  if(v.ok){ S.rascunho = v.valor; ir("t-confirmar"); }
  else{ S.rascunho = texto; mostrarFaltou(v, texto); }
}

function mostrarFaltou(v, texto){
  $("#txtFaltou").textContent = v.titulo;
  $("#subFaltou").textContent = v.msg;
  var cx = $("#citacaoFaltou");
  if(texto && String(texto).trim()){ cx.hidden = false; cx.textContent = "Eu entendi: “" + texto + "”"; }
  else{ cx.hidden = true; }
  S.faltouEscrever = !!v.escrever;
  ir("t-faltou");
}

/* --- tela "quer adicionar mais?" --- */
function mostrarMais(){
  var g = grupoAtual();
  $("#txtMais").textContent = g.mais.titulo;
  $("#subMais").textContent = g.mais.sub;
  $("#lblMaisSim").textContent = g.mais.sim;
  $("#lblMaisNao").textContent = g.mais.nao;
  var itens = (S.dados[g.id] || []).map(function(it, k){
    var txt = g.resumo ? g.resumo(it) : "";
    if(!txt) return "";
    return '<div class="cartao cartao--estatico"><span class="num">' + (k + 1) + '</span><span><b>' + esc(txt) + '</b></span></div>';
  }).filter(Boolean).join("");
  $("#resumoMais").innerHTML = itens;
  ir("t-mais");
}
$("#btnMaisSim").addEventListener("click", function(){
  calar();
  S.pos.inst = (S.dados[grupoAtual().id] || []).length;
  instancia();
  S.pos.q = -1;
  proximaPergunta();
});
$("#btnMaisNao").addEventListener("click", function(){ calar(); proximoGrupo(); });

/* --- obrigatórios faltando --- */
function faltandoObrigatorios(){
  var falta = [];
  ROTEIRO.forEach(function(g, gi){
    if(grupoPulado(g)) return;
    if(!S.visitados[g.id]) return;
    (S.dados[g.id] || []).forEach(function(it, inst){
      g.perguntas.forEach(function(p, qi){
        if(!aplicavel(p, it)) return;
        if(!ehObrig(p, it)) return;
        if(it[p.id]) return;
        falta.push({g:gi, inst:inst, q:qi, texto:p.texto, secao:g.secao});
      });
    });
  });
  return falta;
}

function montarFaltando(){
  var falta = faltandoObrigatorios();
  $("#listaFaltando").innerHTML = falta.map(function(f){
    return '<div class="cartao cartao--estatico"><span class="num" style="background:var(--ambar-suave);color:var(--ambar)">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>' +
      '</span><span><b>' + esc(f.texto) + '</b><small>' + secaoInfo(f.secao).nome + '</small></span></div>';
  }).join("");
  return falta;
}
$("#btnIrFaltando").addEventListener("click", function(){
  var falta = faltandoObrigatorios();
  if(!falta.length){ S.conferindoFaltas = false; ir("t-conferir"); return; }
  calar();
  S.conferindoFaltas = true;
  S.pos = {g:falta[0].g, inst:falta[0].inst, q:falta[0].q};
  mostrarPergunta();
});

/* ============================================================
   9. EVENTOS DAS TELAS DE RESPOSTA
   ============================================================ */
$("#btnFalar").addEventListener("click", falarResposta);
$("#btnEscrever").addEventListener("click", function(){ calar(); ir("t-escrever"); });
$("#btnOuvirPergunta").addEventListener("click", function(){
  var p = perguntaAtual();
  if(p) falar(p.texto + ". " + p.ajuda + (p.opcoes ? " " + p.opcoes.join(", ") + "." : ""));
});
$("#btnPularAqui").addEventListener("click", function(){
  calar();
  var g = grupoAtual(), p = perguntaAtual(), it = instancia(g);
  if(S.pos.q === -1 || ehObrig(p, it)){ falar("Esta informação é obrigatória."); return; }
  guardar("");
});
document.addEventListener("click", function(e){
  var b = e.target.closest("[data-opcao]");
  if(!b) return;
  calar();
  tratarResposta(b.getAttribute("data-opcao"));
});

$("#btnParar").addEventListener("click", function(){
  if(encerrarAudio(true)) return; // o texto chega depois, pelo servidor
  pararGravacao();
  var t = textoOuvido.trim();
  if(!t){ ir("t-erro"); return; }
  S.rascunho = t;
  ir("t-processando");
});
$("#btnMicDeNovo").addEventListener("click", function(){ iniciarGravacao(); });
$("#btnOuvindoEscrever").addEventListener("click", function(){ pararGravacao(); calar(); ir("t-escrever"); });

var campo = $("#campoResp"), campoDDD = $("#campoDDD"), campoNum = $("#campoNum");

function soDigitos(el, max){
  el.value = el.value.replace(/\D/g,"").slice(0, max);
}
function validarCampo(){
  var p = perguntaAtual();
  if(p && p.tipo === "telefone"){
    var d = campoDDD.value.replace(/\D/g,""), n = campoNum.value.replace(/\D/g,"");
    $("#btnSalvarEsc").disabled = !(d.length === 2 && n.length >= 8);
    return;
  }
  $("#btnSalvarEsc").disabled = campo.value.trim().length < 1;
}
campo.addEventListener("input", validarCampo);
campoDDD.addEventListener("input", function(){
  soDigitos(campoDDD, 2);
  if(campoDDD.value.length === 2){ try{ campoNum.focus(); }catch(e){} }
  validarCampo();
});
campoNum.addEventListener("input", function(){ soDigitos(campoNum, 10); validarCampo(); });

$("#btnSalvarEsc").addEventListener("click", function(){
  var p = perguntaAtual(), t;
  if(p && p.tipo === "telefone"){
    t = campoDDD.value.replace(/\D/g,"") + campoNum.value.replace(/\D/g,"");
  }else{
    t = campo.value.trim();
  }
  if(!t) return;
  tratarResposta(t);
});
$("#btnVoltarFala").addEventListener("click", falarResposta);

$("#btnOuvirResp").addEventListener("click", function(){ falar(S.rascunho); });
$("#btnIssoMesmo").addEventListener("click", function(){ calar(); guardar(S.rascunho); });
$("#btnRegravar").addEventListener("click", function(){
  var p = perguntaAtual();
  if(p && (p.opcoes || p.escrever || !temMic())){ calar(); mostrarPergunta(); return; }
  falarResposta();
});

$("#btnFaltouFalar").addEventListener("click", falarResposta);
$("#btnFaltouEscrever").addEventListener("click", function(){ calar(); ir("t-escrever"); });
$("#btnTentarDeNovo").addEventListener("click", falarResposta);
$("#btnEscreverErro").addEventListener("click", function(){ calar(); ir("t-escrever"); });
$("#btnPularErro").addEventListener("click", function(){
  var g = grupoAtual(), p = perguntaAtual(), it = instancia(g);
  if(S.pos.q === -1 || ehObrig(p, it)){ falar("Esta informação é obrigatória para o currículo."); return; }
  guardar("");
});

/* --- microfone --- */
$("#btnPermitir").addEventListener("click", function(){
  var seguir = function(){ ir("t-como"); };
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(fluxo){
      fluxo.getTracks().forEach(function(t){ t.stop(); });
      S.micOk = true; seguir();
    }).catch(function(err){
      S.micOk = false;
      $("#txtAvisoMic").textContent = dentroDeQuadro
        ? "Esta janela não tem permissão para usar o microfone. Dá para continuar escrevendo, ou abrir o link numa aba do navegador para falar."
        : ((err && err.name === "NotAllowedError")
            ? "O microfone foi bloqueado. Dá para continuar escrevendo, ou liberar no cadeado ao lado do endereço."
            : "Não encontrei um microfone neste aparelho. Você pode continuar escrevendo as respostas.");
      $("#avisoMic").hidden = false;
      setTimeout(seguir, 3000);
    });
  }else{
    S.micOk = false;
    $("#txtAvisoMic").textContent = "Este navegador não permite gravar voz. Você pode continuar escrevendo as respostas.";
    $("#avisoMic").hidden = false;
    setTimeout(seguir, 3000);
  }
});
$("#btnRetomar").addEventListener("click", function(){
  calar();
  if(estadoGuardado) retomar(estadoGuardado); else ir("t-inicio");
});
$("#btnComecarDeNovo").addEventListener("click", function(){
  calar(); estadoGuardado = null;
  if(typeof Armazenamento !== "undefined") Armazenamento.apagar().catch(function(){});
  ir("t-inicio", true);
});
/* --- consentimento: ninguém começa sem aceitar --- */
function textoConsentimento(){
  return $$("#listaConsentimento .cartao").map(function(c){
    return c.querySelector("b").textContent + ". " + c.querySelector("small").textContent;
  }).join(" ");
}
$("#btnAceito").addEventListener("click", function(){
  calar(); S.consentiu = true; $("#avisoConsentimento").hidden = true; ir("t-microfone");
});
$("#btnNaoAceito").addEventListener("click", function(){
  calar(); S.consentiu = false; $("#avisoConsentimento").hidden = false;
  falar("Tudo bem. Sem aceitar, não dá para montar o currículo. Nada foi guardado.");
});
$("#btnOuvirConsentimento").addEventListener("click", function(){
  falar("Antes de começar. " + textoConsentimento());
});
$("#btnAgoraNao").addEventListener("click", function(){ S.micOk = false; ir("t-como"); });

$$("[data-modo]").forEach(function(b){
  b.addEventListener("click", function(){
    if(!S.consentiu){ ir("t-consentimento"); return; }
    S.modo = b.getAttribute("data-modo");
    aplicarModo();
    zerar();
    S.iniciado = true;
    entrarGrupo();
  });
});

/* --- progresso --- */
function secaoPronta(id){
  var grupos = ROTEIRO.filter(function(g){ return g.secao === id; });
  if(!grupos.every(function(g){ return S.visitados[g.id]; })) return false;
  return !faltandoObrigatorios().some(function(f){ return f.secao === id; });
}
function montarProgresso(){
  var atual = grupoAtual() ? grupoAtual().secao : null;
  $("#listaSecoes").innerHTML = SECOES.map(function(sec){
    var pronto = secaoPronta(sec.id);
    var agora = (sec.id === atual) && !pronto;
    var estado = pronto ? "Pronto" : (agora ? "Fazendo agora" : "Falta fazer");
    var cls = pronto ? "pronto" : (agora ? "agora" : "");
    return '<div class="secao-item ' + cls + '"><span class="bolha">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + sec.icone + '</svg>' +
      '</span><span><b>' + sec.nome + '</b><small>' + estado + '</small></span></div>';
  }).join("");
  var feitas = SECOES.filter(function(s){ return secaoPronta(s.id); }).length;
  setTimeout(function(){ $("#barraProg").style.width = (feitas / SECOES.length * 100) + "%"; }, 80);
  return feitas;
}
$("#btnContinuar").addEventListener("click", function(){ calar(); entrarGrupo(); });

/* ============================================================
   10. MONTAGEM DO CURRÍCULO
   ============================================================ */
function esc(t){ return String(t == null ? "" : t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function pes(id){ return (S.dados.pessoais && S.dados.pessoais[0] && S.dados.pessoais[0][id]) || ""; }
function con(id){ return (S.dados.contato && S.dados.contato[0] && S.dados.contato[0][id]) || ""; }

function cvBase(){
  var trabalhos = grupoPulado(ROTEIRO[1]) ? [] :
    (S.dados.trabalho || []).filter(function(it){ return it.cargo || it.empresa; });
  var estudos = (S.dados.estudo || []).filter(function(it){ return it.escolaridade && it.escolaridade !== "Não estudei"; });
  var cursos = grupoPulado(ROTEIRO[3]) ? [] :
    (S.dados.cursos || []).map(function(it){ return it.curso; }).filter(Boolean);
  var cnh = pes("cnh");
  return {
    nome: pes("nome") || "Seu nome",
    titulo: pes("objetivo") || "Profissional",
    local: [pes("cidade"), pes("estado")].filter(Boolean).join(" · "),
    idade: pes("idade"),
    cnh: (cnh && cnh !== "Não tenho") ? cnh.replace(/^Sim,\s*/,"Carteira de motorista ") : "",
    modalidade: pes("modalidade"),
    primeiroEmprego: trabalhos.length === 0,
    resumo:"",
    experiencia: trabalhos.map(function(it){
      return {cargo:it.cargo || "", empresa:it.empresa || "", periodo:it.periodo || "",
              atividades:it.atividades || "", maisSobre:it.maisSobre || ""};
    }),
    formacao: estudos.map(function(it){
      return [it.escolaridade, it.instituicao, it.situacao].filter(Boolean).join(" · ");
    }),
    cursos: cursos,
    idiomas: (S.dados.idiomas && S.dados.idiomas[0] && S.dados.idiomas[0].idiomas) || "",
    telefone: con("telefone"),
    email: con("email"),
    linkedin: con("temLinkedin") === "Tenho LinkedIn" ? con("linkedin") : ""
  };
}

function renderCV(cv){
  var h = "";
  h += '<h2>' + esc(cv.nome) + '</h2>';
  h += '<p class="cargo">' + esc(cv.titulo) + (cv.local ? " · " + esc(cv.local) : "") + '</p>';
  if(cv.resumo) h += '<p>' + esc(cv.resumo) + '</p>';
  if(cv.experiencia && cv.experiencia.length){
    h += '<h3>Experiência</h3>';
    cv.experiencia.forEach(function(e){
      h += '<p class="item-t">' + esc(e.cargo) + (e.empresa ? " — " + esc(e.empresa) : "") + '</p>';
      if(e.periodo) h += '<p class="item-s">' + esc(e.periodo) + '</p>';
      if(e.atividades) h += '<p>' + esc(e.atividades) + '</p>';
      if(e.maisSobre) h += '<p>' + esc(e.maisSobre) + '</p>';
    });
  }else if(cv.primeiroEmprego){
    h += '<h3>Experiência</h3><p>Em busca do primeiro emprego.</p>';
  }
  if(cv.formacao && cv.formacao.length){
    h += '<h3>Formação</h3><ul>' + cv.formacao.map(function(f){ return '<li>' + esc(f) + '</li>'; }).join("") + '</ul>';
  }
  if(cv.cursos && cv.cursos.length){
    h += '<h3>Cursos</h3><ul>' + cv.cursos.map(function(c){ return '<li>' + esc(c) + '</li>'; }).join("") + '</ul>';
  }
  if(cv.idiomas) h += '<h3>Idiomas</h3><p>' + esc(cv.idiomas) + '</p>';
  h += '<h3>Contato</h3>';
  if(cv.telefone) h += '<p>Telefone e WhatsApp: ' + esc(cv.telefone) + '</p>';
  if(cv.email) h += '<p>E-mail: ' + esc(cv.email) + '</p>';
  if(cv.linkedin) h += '<p>LinkedIn: ' + esc(cv.linkedin) + '</p>';
  var extras = [cv.cnh, cv.modalidade].filter(Boolean).join(" · ");
  if(extras) h += '<p class="item-s">' + esc(extras) + '</p>';
  return h;
}

function textoDoCV(cv){
  var p = [];
  p.push(cv.nome + (cv.local ? ", de " + cv.local : "") + ".");
  if(cv.titulo) p.push("Procura trabalho como " + cv.titulo + ".");
  if(cv.resumo) p.push(cv.resumo);
  if(cv.experiencia.length){
    cv.experiencia.forEach(function(e){
      p.push("Trabalhou como " + e.cargo + (e.empresa ? " na " + e.empresa : "") +
             (e.periodo ? ", por " + e.periodo : "") + ". " + (e.atividades || ""));
    });
  }else if(cv.primeiroEmprego){ p.push("Está em busca do primeiro emprego."); }
  if(cv.formacao.length) p.push("Estudos: " + cv.formacao.join(". ") + ".");
  if(cv.cursos.length) p.push("Cursos: " + cv.cursos.join(", ") + ".");
  if(cv.cnh) p.push(cv.cnh + ".");
  if(cv.telefone) p.push("Telefone e WhatsApp: " + cv.telefone + ".");
  if(cv.email) p.push("E-mail: " + cv.email + ".");
  return p.join(" ");
}

/* ============================================================
   11. LEITURA EM VOZ ALTA
   ============================================================ */
var lendo = false, filaLeitura = [];
function blocosLeitura(){
  var cv = cvBase();
  return [
    {nome:"Dados Pessoais", texto:[cv.nome, cv.idade ? cv.idade + " anos" : "", cv.local,
      cv.titulo ? "Procurando trabalho como " + cv.titulo : "", cv.cnh].filter(Boolean).join(". ")},
    {nome:"Experiência de Trabalho", texto: cv.experiencia.length
      ? cv.experiencia.map(function(e){
          return [e.cargo, e.empresa ? "na " + e.empresa : "", e.periodo ? "por " + e.periodo : "", e.atividades].filter(Boolean).join(". ");
        }).join(". Também ")
      : "Em busca do primeiro emprego"},
    {nome:"Estudos e Cursos", texto:[cv.formacao.join(". "), cv.cursos.join(", "), cv.idiomas].filter(Boolean).join(". ") || "Sem informações"},
    {nome:"Como Falar Comigo", texto:[cv.telefone ? "Telefone e WhatsApp " + cv.telefone : "",
      cv.email ? "E-mail " + cv.email : "", cv.linkedin ? "LinkedIn " + cv.linkedin : ""].filter(Boolean).join(". ") || "Sem contato informado"}
  ];
}
function montarLeitura(){
  filaLeitura = blocosLeitura();
  $("#listaLeitura").innerHTML = filaLeitura.map(function(b, k){
    return '<div class="cartao cartao--estatico" data-bloco="' + k + '"><span><b>' + esc(b.nome) + '</b><small>' + esc(b.texto || "—") + '</small></span></div>';
  }).join("");
}
function destacarBloco(k){
  $$("#listaLeitura [data-bloco]").forEach(function(el, j){
    el.style.borderColor = (j === k) ? "var(--azul)" : "var(--borda)";
    el.style.background  = (j === k) ? "var(--azul-suave)" : "var(--papel)";
  });
  $("#passoLeitura").textContent = "Lendo parte " + (k + 1) + " de " + filaLeitura.length;
  $("#barraLeitura").style.width = ((k + 1) / filaLeitura.length * 100) + "%";
}
function lerBloco(k){
  if(!lendo) return;
  if(k >= filaLeitura.length){ lendo = false; ir("t-tudocerto"); return; }
  destacarBloco(k);
  var b = filaLeitura[k];
  falar(b.nome + ". " + (b.texto || "Não informado"), function(){
    if(lendo) setTimeout(function(){ lerBloco(k + 1); }, 320);
  });
}
function comecarLeitura(volta){
  montarLeitura(); ir("t-lendo", volta); lendo = true;
  setTimeout(function(){ lerBloco(0); }, 420);
}
$("#btnLerCV").addEventListener("click", function(){ comecarLeitura(false); });
$("#btnOuvirTudo").addEventListener("click", function(){ comecarLeitura(true); });
$("#btnPararLeitura").addEventListener("click", function(){ lendo = false; calar(); ir("t-tudocerto"); });

/* --- corrigir --- */
function montarCorrigir(){
  $("#listaCorrigir").innerHTML = SECOES.map(function(sec){
    return '<button class="cartao" data-corrigir="' + sec.id + '"><span class="num">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + sec.icone + '</svg>' +
      '</span><span><b>' + sec.nome + '</b><small>Tocar para mudar esta parte</small></span>' +
      '<span class="num" style="margin-left:auto;background:var(--ambar-suave);color:var(--ambar)">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16z"/></svg>' +
      '</span></button>';
  }).join("");
}
document.addEventListener("click", function(e){
  var b = e.target.closest("[data-corrigir]");
  if(!b) return;
  var idSec = b.getAttribute("data-corrigir");
  for(var k = 0; k < ROTEIRO.length; k++){
    if(ROTEIRO[k].secao === idSec){
      calar();
      S.editandoSecao = idSec;
      S.portas[ROTEIRO[k].id] = undefined;
      S.pos = {g:k, inst:0, q:-1};
      entrarGrupo();
      return;
    }
  }
});
$("#btnMudarAlgo").addEventListener("click", function(){ calar(); montarCorrigir(); ir("t-corrigir"); });

/* ============================================================
   12. ORGANIZAÇÃO DO CURRÍCULO
   ============================================================ */
/*
  O app envia somente as respostas para o servidor.
  As instruções para a IA ficam no servidor (servidor/ia/prompt.js).
*/
var API_BASE = (function(){
  var m = document.querySelector('meta[name="fala-api"]');
  if(m && m.content) return m.content.replace(/\/$/,"");
  var local = location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if(local && location.port !== "3001") return "http://127.0.0.1:3001";
  return "";
})();

function respostasParaEnvio(){
  var respostas = {};
  ROTEIRO.forEach(function(g){ respostas[g.id] = (S.dados[g.id] || [{}]).slice(); });
  var portas = {};
  Object.keys(S.portas).forEach(function(k){ if(typeof S.portas[k] === "string") portas[k] = S.portas[k]; });
  return {respostas:respostas, portas:portas};
}

var TEMPO_LIMITE_SERVIDOR = 25000;
var AVISO_SEM_SERVIDOR = "Não consegui falar com o servidor agora. Montei o currículo só com as suas respostas, sem melhorar o texto.";

function solicitarCurriculoAoServidor(){
  var controle = ("AbortController" in window) ? new AbortController() : null;
  var timer = setTimeout(function(){ if(controle) controle.abort(); }, TEMPO_LIMITE_SERVIDOR);
  var limite = new Promise(function(_, rejeitar){
    setTimeout(function(){ rejeitar(new Error("tempo")); }, TEMPO_LIMITE_SERVIDOR + 500);
  });
  var pedido = fetch(API_BASE + "/api/curriculo", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(respostasParaEnvio()),
    signal: controle ? controle.signal : undefined
  }).then(function(r){
    return r.json().then(function(corpo){
      if(r.status === 429 && corpo && corpo.erro){
        var e = new Error("limite"); e.aviso = corpo.erro + " Por enquanto, montei o currículo só com as suas respostas."; throw e;
      }
      if(!r.ok || !corpo || !corpo.ok) throw new Error("servidor");
      return corpo;
    });
  });
  return Promise.race([pedido, limite]).then(function(c){ clearTimeout(timer); return c; },
    function(e){ clearTimeout(timer); throw e; });
}

/* Confere o currículo vindo do servidor antes de mostrar. */
function curriculoValido(cv){
  if(!cv || typeof cv !== "object") return false;
  var textos = ["nome","titulo","local","idade","cnh","modalidade","resumo","idiomas","telefone","email","linkedin"];
  for(var k = 0; k < textos.length; k++){ if(typeof cv[textos[k]] !== "string") return false; }
  if(!Array.isArray(cv.experiencia) || !Array.isArray(cv.formacao) || !Array.isArray(cv.cursos)) return false;
  return cv.experiencia.every(function(e){
    return e && ["cargo","empresa","periodo","atividades","maisSobre"].every(function(c){ return typeof e[c] === "string"; });
  }) && cv.formacao.concat(cv.cursos).every(function(t){ return typeof t === "string"; });
}

function prepararCV(){
  var pronto = false;
  var espera = new Promise(function(res){ setTimeout(res, 2600); });
  function finalizar(cv, aviso){
    if(pronto) return;
    pronto = true;
    S.cv = cv;
    espera.then(function(){
      $("#previaCV").innerHTML = renderCV(cv);
      $("#txtAvisoPronto").textContent = aviso || "";
      $("#avisoPronto").hidden = !aviso;
      ir("t-pronto");
      soltarConfete();
      setTimeout(function(){ falar("Seu currículo ficou pronto!" + (aviso ? " " + aviso : "")); }, 500);
    });
  }
  var base = cvBase();
  solicitarCurriculoAoServidor().then(function(corpo){
    var cv = corpo.curriculo;
    if(!curriculoValido(cv)){ finalizar(base, AVISO_SEM_SERVIDOR); return; }
    // nome e contatos sempre como a pessoa confirmou
    cv.nome = base.nome; cv.telefone = base.telefone; cv.email = base.email; cv.linkedin = base.linkedin;
    cv.primeiroEmprego = cv.experiencia.length === 0;
    finalizar(cv, corpo.origem === "basico" ? corpo.aviso : "");
  }).catch(function(e){ finalizar(base, (e && e.aviso) || AVISO_SEM_SERVIDOR); });
}

$("#btnSimCerto").addEventListener("click", function(){
  calar(); lendo = false;
  if(faltandoObrigatorios().length){ ir("t-faltando"); return; }
  ir("t-preparando");
  prepararCV();
});

function soltarConfete(){
  if(reduzir) return;
  var cx = $("#confete");
  cx.innerHTML = "";
  var cores = ["var(--ambar)","var(--verde-bg)","var(--azul-bg)","var(--vermelho-bg)"];
  for(var k = 0; k < 34; k++){
    var i = document.createElement("i");
    i.style.left = (Math.random() * 100) + "%";
    i.style.background = cores[k % cores.length];
    i.style.animationDelay = (Math.random() * 0.9) + "s";
    i.style.animationDuration = (2.2 + Math.random() * 1.4) + "s";
    cx.appendChild(i);
  }
  setTimeout(function(){ cx.innerHTML = ""; }, 4200);
}
$("#btnOuvirCV").addEventListener("click", function(){ falar(textoDoCV(S.cv || cvBase())); });

/* ============================================================
   13. PDF / WHATSAPP / IMPRIMIR
   ============================================================ */
function avisar(msg){ $("#txtAvisoEnvio").textContent = msg; $("#avisoEnvio").hidden = false; }

function gerarPDF(){
  var cv = S.cv || cvBase();
  if(!window.jspdf || !window.jspdf.jsPDF) return null;
  var doc = new window.jspdf.jsPDF({unit:"pt", format:"a4"});
  var L = 56, y = 70, W = 595 - L * 2;
  function linha(txt, tam, estilo, cor, espaco){
    doc.setFont("helvetica", estilo || "normal");
    doc.setFontSize(tam);
    doc.setTextColor(cor || "#17242B");
    var ls = doc.splitTextToSize(String(txt), W);
    for(var k = 0; k < ls.length; k++){
      if(y > 780){ doc.addPage(); y = 70; }
      doc.text(ls[k], L, y);
      y += tam + 4;
    }
    y += (espaco || 0);
  }
  function titulo(t){
    y += 10;
    linha(t.toUpperCase(), 10, "bold", "#1E6B45", 2);
    doc.setDrawColor("#D8CDB6"); doc.setLineWidth(1);
    doc.line(L, y - 8, L + W, y - 8);
    y += 4;
  }
  linha(cv.nome, 22, "bold", "#17242B", 2);
  linha([cv.titulo, cv.local].filter(Boolean).join("  ·  "), 11, "normal", "#17457E", 6);
  if(cv.resumo) linha(cv.resumo, 11, "normal", "#17242B", 4);
  if(cv.experiencia && cv.experiencia.length){
    titulo("Experiência");
    cv.experiencia.forEach(function(e){
      linha([e.cargo, e.empresa].filter(Boolean).join(" — "), 12, "bold", "#17242B", 0);
      if(e.periodo) linha(e.periodo, 10, "normal", "#54646E", 0);
      if(e.atividades) linha(e.atividades, 11, "normal", "#17242B", 0);
      if(e.maisSobre) linha(e.maisSobre, 11, "normal", "#17242B", 4);
    });
  }else if(cv.primeiroEmprego){
    titulo("Experiência");
    linha("Em busca do primeiro emprego.", 11, "normal", "#17242B", 0);
  }
  if(cv.formacao && cv.formacao.length){
    titulo("Formação");
    cv.formacao.forEach(function(f){ linha("• " + f, 11, "normal", "#17242B", 0); });
  }
  if(cv.cursos && cv.cursos.length){
    titulo("Cursos");
    cv.cursos.forEach(function(c){ linha("• " + c, 11, "normal", "#17242B", 0); });
  }
  if(cv.idiomas){ titulo("Idiomas"); linha(cv.idiomas, 11, "normal", "#17242B", 0); }
  titulo("Contato");
  if(cv.telefone) linha("Telefone e WhatsApp: " + cv.telefone, 11, "normal", "#17242B", 0);
  if(cv.email) linha("E-mail: " + cv.email, 11, "normal", "#17242B", 0);
  if(cv.linkedin) linha("LinkedIn: " + cv.linkedin, 11, "normal", "#17242B", 0);
  var extras = [cv.cnh, cv.modalidade].filter(Boolean).join("  ·  ");
  if(extras) linha(extras, 10, "normal", "#54646E", 0);
  return doc;
}

function nomeArquivo(){
  var n = (S.cv && S.cv.nome ? S.cv.nome : "curriculo").normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-|-$/g,"").toLowerCase();
  return "curriculo-" + (n || "fala-curriculo") + ".pdf";
}

$("#btnBaixar").addEventListener("click", function(){
  $("#avisoEnvio").hidden = true;
  var doc = gerarPDF();
  if(!doc){ avisar("Não consegui montar o PDF agora. Tente imprimir a página."); return; }
  var blob = doc.output("blob");
  try{
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = nomeArquivo();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
    limparAposPDF();
    avisar("O PDF do currículo foi baixado." + AVISO_APAGADO);
    falar("Pronto. O PDF do currículo foi baixado." + AVISO_APAGADO);
  }catch(e){ avisar("Este navegador bloqueou o download. Use o botão de imprimir."); }
});

$("#btnImprimir").addEventListener("click", function(){
  $("#avisoEnvio").hidden = true;
  var doc = gerarPDF();
  limparAposPDF();
  if(doc){
    try{ var w = window.open(doc.output("bloburl"), "_blank"); if(w){ avisar("O PDF abriu em outra aba para imprimir." + AVISO_APAGADO); return; } }catch(e){}
  }
  window.print();
});

$("#btnWhats").addEventListener("click", function(){
  $("#avisoEnvio").hidden = true;
  var cv = S.cv || cvBase();
  var doc = gerarPDF();
  var blob = doc ? doc.output("blob") : null;
  var arq = null;
  try{ if(blob) arq = new File([blob], nomeArquivo(), {type:"application/pdf"}); }catch(e){}
  if(arq && navigator.canShare && navigator.canShare({files:[arq]})){
    navigator.share({files:[arq], title:"Meu currículo", text:"Segue o meu currículo."})
      .then(function(){ limparAposPDF(); avisar("Currículo enviado." + AVISO_APAGADO); falar("Currículo enviado."); })
      .catch(function(){ abrirWhatsTexto(cv); });
  }else{ abrirWhatsTexto(cv); }
});
function abrirWhatsTexto(cv){
  var texto = "*" + cv.nome + "*\n" + [cv.titulo, cv.local].filter(Boolean).join(" · ") + "\n\n" + textoDoCV(cv);
  var w = window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener");
  if(!w) avisar("O navegador bloqueou a abertura do WhatsApp. Guarde o PDF no aparelho e envie pelo aplicativo.");
  else{
    limparAposPDF();
    avisar("No protótipo, o WhatsApp recebe o currículo em texto. O envio do PDF em anexo entra na versão final." + AVISO_APAGADO);
  }
}

$("#btnRecomecar").addEventListener("click", function(){
  pararTudo(); apagarDoAparelho(); zerar();
  $("#avisoEnvio").hidden = true; $("#avisoPronto").hidden = true; $("#avisoInicio").hidden = true;
  ir("t-inicio", true);
});
$("#btnApagarDados").addEventListener("click", function(){
  pararTudo();
  apagarDoAparelho().then(function(){
    zerar();
    $("#avisoEnvio").hidden = true; $("#avisoPronto").hidden = true;
    $("#txtAvisoInicio").textContent = "Pronto. As suas respostas foram apagadas deste aparelho.";
    $("#avisoInicio").hidden = false;
    ir("t-inicio", true);
    falar("Pronto. As suas respostas foram apagadas deste aparelho.");
  });
});

/* ============================================================
   14. OFFLINE
   ============================================================ */
var telaAntes = null;
window.addEventListener("offline", function(){
  if(S.tela !== "t-offline"){ telaAntes = S.tela; pararTudo(); ir("t-offline"); }
});
$("#btnTentarNet").addEventListener("click", function(){
  if(navigator.onLine !== false) ir(telaAntes || "t-inicio", true);
  else falar("A internet ainda não voltou. Suas respostas continuam guardadas.");
});

/* ============================================================
   15. AO ENTRAR EM CADA TELA
   ============================================================ */
var timerFrases = null, timerAuto = null, timerRepetir = null;
var FRASES = ["Já estou quase terminando…","Conferindo as palavras…","Só mais um instante…"];

/* Modo "sozinho": se a pessoa não agir, o app repete a pergunta por conta própria. */
function agendarRepeticao(){
  clearTimeout(timerRepetir);
  if(S.modo !== "sozinho" || S.tela !== "t-pergunta") return;
  if(S.repeticoes >= 2) return;
  timerRepetir = setTimeout(function(){
    if(S.tela !== "t-pergunta" || S.modo !== "sozinho") return;
    var p = perguntaAtual();
    if(!p) return;
    S.repeticoes++;
    var extra = (S.repeticoes >= 2)
      ? " Quando estiver pronto, toque no botão vermelho e fale a sua resposta."
      : "";
    falar("Vou repetir. " + p.texto + ". " + p.ajuda + extra, agendarRepeticao);
  }, 11000);
}
function cancelarRepeticao(){ clearTimeout(timerRepetir); }
document.addEventListener("pointerdown", cancelarRepeticao);

function aplicarModo(){
  document.body.classList.toggle("modo-ajuda", S.modo === "ajuda");
  $("#icoModo").innerHTML = (S.modo === "ajuda")
    ? '<circle cx="9" cy="8" r="3.4"/><circle cx="17" cy="9" r="2.8"/><path d="M3 20a6 6 0 0 1 12 0M15.5 20a5 5 0 0 1 5.5-4.8"/>'
    : '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>';
  $("#btnModo").setAttribute("title", S.modo === "ajuda" ? "Usando com ajuda de alguém" : "Usando sozinho");
}
$("#btnModo").addEventListener("click", function(){
  S.modo = (S.modo === "ajuda") ? "sozinho" : "ajuda";
  aplicarModo();
  cancelarRepeticao();
  falar(S.modo === "ajuda"
    ? "Modo com ajuda. O botão de escrever fica em primeiro lugar e cada pergunta mostra um exemplo."
    : "Modo sozinho. Eu falo tudo devagar e o botão de falar fica em primeiro lugar.");
  if(S.tela === "t-pergunta") mostrarPergunta();
});

function aoEntrar(id){
  clearInterval(timerFrases);
  clearTimeout(timerAuto);
  clearTimeout(timerRepetir);
  if(id !== "t-ouvindo") pararGravacao();

  switch(id){
    case "t-inicio":
      falar("Fala Currículo. O jeito fácil de fazer o seu currículo usando só a sua voz. Aperte o botão azul para começar.");
      break;
    case "t-retomar":
      falar("Você já começou um currículo neste aparelho. Quer continuar de onde parou?");
      break;
    case "t-consentimento":
      falar("Antes de começar, veja o que acontece com as suas informações. " + textoConsentimento() + " Se concordar, aperte o botão verde.");
      break;
    case "t-microfone":
      if(!S.consentiu){ ir("t-consentimento"); return; }
      falar("Preciso ouvir a sua voz para te ajudar. Como eu escrevo o que você fala, preciso da sua permissão para usar o microfone do aparelho.");
      break;
    case "t-como":
      falar("Como funciona. Um: você fala e me conta sobre o seu trabalho. Dois: o app repete para você conferir. Três: o seu currículo fica pronto em PDF.");
      break;
    case "t-modo":
      falar("Como você prefere usar? Vou fazer sozinho, ou alguém vai me ajudar?");
      break;
    case "t-pergunta":
      var p = perguntaAtual();
      if(p){
        if(S.modo === "ajuda"){
          falar(p.texto);
        }else{
          S.repeticoes = 0;
          falar(p.texto + ". " + p.ajuda + (p.opcoes ? " " + p.opcoes.join(", ") + "." : ""), agendarRepeticao);
        }
      }
      break;
    case "t-ouvindo": break;
    case "t-escrever":
      var pe = perguntaAtual();
      var ehTel = pe && pe.tipo === "telefone";
      campo.hidden = !!ehTel;
      $("#linhaTel").hidden = !ehTel;
      $("#rotuloCampo").setAttribute("for", ehTel ? "campoDDD" : "campoResp");
      $("#rotuloCampo").textContent = ehTel ? "Digite o DDD e depois o número" : "Sua resposta";
      if(ehTel){
        var pre = String(S.rascunho || "").replace(/\D/g,"");
        if(pre.length > 11) pre = pre.slice(-11);
        campoDDD.value = pre.slice(0,2);
        campoNum.value = pre.slice(2);
      }else{
        campo.value = S.rascunho || "";
      }
      $("#txtPerguntaEsc").textContent = pe ? pe.texto : "";
      $("#ajudaEsc").textContent = pe ? pe.ajuda : "";
      validarCampo();
      setTimeout(function(){ try{ (ehTel ? campoDDD : campo).focus(); }catch(e){} }, 380);
      break;
    case "t-processando":
      var n1 = 0;
      $("#fraseProc").textContent = FRASES[0];
      timerFrases = setInterval(function(){ n1 = (n1 + 1) % FRASES.length; $("#fraseProc").textContent = FRASES[n1]; }, 1100);
      if(!S.aguardandoTranscricao) timerAuto = setTimeout(function(){ tratarResposta(S.rascunho); }, 2000);
      break;
    case "t-confirmar":
      $("#citacao").textContent = "“" + (S.rascunho || "") + "”";
      falar("Está certo? Eu entendi assim: " + S.rascunho);
      break;
    case "t-faltou":
      falar($("#txtFaltou").textContent + ". " + $("#subFaltou").textContent, function(){
        if(S.tela === "t-faltou" && S.faltouEscrever) ir("t-escrever");
      });
      break;
    case "t-erro":
      var ge = grupoAtual(), pq = perguntaAtual();
      $("#btnPularErro").hidden = (S.pos.q === -1) || !pq || ehObrig(pq, instancia(ge));
      falar("Não consegui entender. Vamos tentar mais uma vez? Fale um pouco mais devagar e perto do aparelho.");
      break;
    case "t-mais":
      falar($("#txtMais").textContent);
      break;
    case "t-progresso":
      var feitas = montarProgresso();
      falar("Muito bem! Você já terminou " + feitas + " de " + SECOES.length + " partes. Vamos continuar?");
      break;
    case "t-conferir":
      falar("Vamos conferir o seu currículo? Eu vou ler tudo em voz alta para você ouvir e ver se está correto.");
      break;
    case "t-tudocerto":
      falar("Está tudo certo com as informações?");
      break;
    case "t-corrigir":
      falar("Toque na parte que você quer mudar.");
      break;
    case "t-faltando":
      var falta = montarFaltando();
      falar("Ainda falta " + falta.length + " informação" + (falta.length > 1 ? "ões" : "") + " que o currículo precisa ter. Vamos responder agora?");
      break;
    case "t-preparando":
      var m = 0;
      var FRP = ["Organizando as palavras bonitas…","Colocando na ordem certa…","Deixando o texto profissional…","Montando o seu PDF…"];
      $("#frasePrep").textContent = FRP[0];
      timerFrases = setInterval(function(){ m = (m + 1) % FRP.length; $("#frasePrep").textContent = FRP[m]; }, 1700);
      falar("Preparando o seu currículo. Só um momento.");
      break;
    case "t-enviar":
      falar("Como você quer receber o seu currículo?");
      break;
    case "t-offline":
      var guardou = S.salvoNoAparelho
        ? "O sinal sumiu, mas as suas respostas já estão salvas no aparelho."
        : "O sinal sumiu, mas as suas respostas continuam nesta tela. Não feche o app.";
      $("#subOffline").textContent = guardou + " Assim que a internet voltar, a gente continua de onde parou.";
      falar(guardou + " Assim que a internet voltar, a gente continua.");
      break;
  }
  atualizarRodape(id);
}
function atualizarRodape(id){
  var t = document.getElementById(id);
  var n = ORDEM.indexOf(id) + 1;
  $("#rodapeNota").textContent = "Protótipo · Tela " + n + " de " + ORDEM.length + " — " + (t ? t.getAttribute("data-titulo") : "");
}

/* ============================================================
   16. PAINEL DE TELAS
   ============================================================ */
$("#gradeTelas").innerHTML = ORDEM.map(function(id, k){
  var t = document.getElementById(id);
  return '<button data-tela="' + id + '"><b>Tela ' + (k + 1) + '</b>' + t.getAttribute("data-titulo") + '</button>';
}).join("");
$("#btnPainel").addEventListener("click", function(){ $("#painel").classList.add("aberto"); });
$("#btnFecharPainel").addEventListener("click", function(){ $("#painel").classList.remove("aberto"); });
$("#painel").addEventListener("click", function(e){ if(e.target === $("#painel")) $("#painel").classList.remove("aberto"); });

function carregarExemplo(){
  S.dados.pessoais = [{nome:"José da Silva", cidade:"São Paulo", estado:"São Paulo (SP)",
    objetivo:"Ajudante de pedreiro", cnh:"Sim, de moto", modalidade:"Sim, no local de trabalho", idade:"42"}];
  S.portas.trabalho = "Sim, já trabalhei";
  S.dados.trabalho = [
    {cargo:"Ajudante de pedreiro", empresa:"Construtora Silva", periodo:"2 anos",
     atividades:"Eu carregava material, fazia massa e ajudava no reboco e no assentamento.",
     maisSobre:"Aprendi na obra com meu tio e depois passei a ensinar os mais novos"},
    {cargo:"Auxiliar de limpeza", empresa:"Mercado Bom Preço", periodo:"8 meses",
     atividades:"Eu limpava o salão, repunha as prateleiras e ajudava a descarregar o caminhão.", maisSobre:""}
  ];
  S.dados.estudo = [{escolaridade:"Ensino fundamental", instituicao:"Escola Estadual Jardim União", situacao:"Terminei"}];
  S.portas.cursos = "Sim, fiz curso";
  S.dados.cursos = [{curso:"Curso de Segurança em Obras"}];
  S.dados.idiomas = [{idiomas:""}];
  S.dados.contato = [{telefone:"(11) 99828-0299", email:"jose.silva@gmail.com", temLinkedin:"Não tenho", linkedin:""}];
  ROTEIRO.forEach(function(g){ S.visitados[g.id] = true; });
}

document.addEventListener("click", function(e){
  var b = e.target.closest("[data-tela]");
  if(!b) return;
  var id = b.getAttribute("data-tela");
  pararTudo();
  $("#painel").classList.remove("aberto");

  var comDados = ["t-pronto","t-enviar","t-lendo","t-conferir","t-tudocerto","t-corrigir","t-progresso","t-faltando","t-mais"];
  if(comDados.indexOf(id) >= 0 && !S.dados.pessoais[0].nome) carregarExemplo();

  if(id === "t-pronto" || id === "t-enviar"){
    if(!S.cv){
      S.cv = cvBase();
      S.cv.resumo = "Ajudante de pedreiro com 2 anos de experiência em obras e 8 meses em serviços de limpeza e reposição.";
    }
    $("#previaCV").innerHTML = renderCV(S.cv);
  }
  if(["t-pergunta","t-ouvindo","t-escrever","t-confirmar","t-erro","t-faltou"].indexOf(id) >= 0){
    if(!S.rascunho) S.rascunho = "Trabalhei dois anos na obra, como ajudante de pedreiro.";
    if(id === "t-pergunta"){ mostrarPergunta(); return; }
  }
  if(id === "t-faltou"){
    $("#txtFaltou").textContent = "Preciso do tempo certinho";
    $("#subFaltou").textContent = "Fale quanto tempo com número e a palavra mês ou ano. Por exemplo: dois anos, ou oito meses.";
    $("#citacaoFaltou").hidden = false;
    $("#citacaoFaltou").textContent = "Eu entendi: “trabalhei num mercado”";
    S.faltouEscrever = false;
  }
  if(id === "t-mais"){ S.pos = {g:1, inst:1, q:4}; mostrarMais(); return; }
  if(id === "t-lendo"){ montarLeitura(); }
  if(id === "t-corrigir"){ montarCorrigir(); }
  if(id === "t-progresso"){ montarProgresso(); }
  if(id === "t-faltando"){ montarFaltando(); }
  ir(id);
});

/* ============================================================
   17. INÍCIO
   ============================================================ */
/* Pergunta ao servidor se a transcrição de áudio está ligada. */
S.recursos = {ia:false, transcricao:false};
(function(){
  var controle = ("AbortController" in window) ? new AbortController() : null;
  setTimeout(function(){ if(controle) controle.abort(); }, 5000);
  fetch(API_BASE + "/api/recursos", {signal: controle ? controle.signal : undefined})
    .then(function(r){ return r.json(); })
    .then(function(c){ if(c && c.ok) S.recursos = {ia:!!c.ia, transcricao:!!c.transcricao}; })
    .catch(function(){});
})();
aplicarModo();
ir("t-inicio");
verificarProgressoGuardado();

var destravou = false;
document.addEventListener("pointerdown", function(){
  if(destravou) return;
  destravou = true;
  if(S.tela === "t-inicio" && S.som && "speechSynthesis" in window && !window.speechSynthesis.speaking){
    falar("Aperte o botão azul para começar.");
  }
});

})();
