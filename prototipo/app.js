(function(){
"use strict";



/* ============================================================
   2. ESTADO
   ============================================================ */
var S = {
  tela:"t-inicio",
  pos:{g:0, inst:0, q:-1},
  dados:{}, portas:{}, visitados:{},
  rascunho:"", ultimaChave:null, repeticoes:0, som:true, modo:"sozinho", letraGrande:false, anuncio:"", micOk:null,
  editandoSecao:null, conferindoFaltas:false,
  faltouEscrever:false, cv:null
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
  S.rascunho = ""; S.ultimaChave = null; S.demo = false;
  S.historico = []; S.voltando = false;
}
zerar();

/* ============================================================
   3. NAVEGAÇÃO
   ============================================================ */
function ir(id, volta){
  var atual = document.querySelector(".tela.ativa");
  if(atual) atual.classList.remove("ativa","entra","entra-volta");
  var nova = document.getElementById(id);
  if(!nova) return;
  S.tela = id;
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
/*
  A voz do app vem do servidor (/api/falar, voz neural da OpenAI), que soa
  natural em qualquer navegador. Se o servidor não responder, usa a voz do
  próprio navegador como reserva, escolhendo a melhor voz em português.
*/
var vozPT = null;
var BOAS_VOZES = /(luciana|francisca|thalita|google portugu|premium|enhanced|aprimorad|natural|neural)/i;
function acharVoz(){
  if(!("speechSynthesis" in window)) return;
  var vs = (window.speechSynthesis.getVoices() || []).filter(function(v){ return /^pt/i.test(v.lang); });
  var br = vs.filter(function(v){ return /pt[-_]BR/i.test(v.lang); });
  vozPT = br.filter(function(v){ return BOAS_VOZES.test(v.name); })[0] || br[0] || vs[0] || null;
}
if("speechSynthesis" in window){ acharVoz(); window.speechSynthesis.onvoiceschanged = acharVoz; }

function falarNavegador(texto, aoFim){
  if(!("speechSynthesis" in window)){ if(aoFim) setTimeout(aoFim, 200); return; }
  try{ window.speechSynthesis.cancel(); }catch(e){}
  var u = new SpeechSynthesisUtterance(String(texto));
  u.lang = "pt-BR";
  if(vozPT) u.voice = vozPT;
  u.rate = 0.95;
  u.onstart = function(){ document.body.classList.add("falando"); };
  u.onend = function(){ if(aoFim) aoFim(); };
  u.onerror = function(){ if(aoFim) aoFim(); };
  window.speechSynthesis.speak(u);
}

var audioFala = new Audio();
audioFala.preload = "auto";
var vozServidor = true, falhasVoz = 0, falaId = 0, audioLiberado = false;
// 0,1 s de silêncio em WAV, montado aqui mesmo (serve só para liberar o áudio).
var SILENCIO = (function(){
  try{
    var n = 800, buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf);
    function s(o, t){ for(var k = 0; k < t.length; k++) d.setUint8(o + k, t.charCodeAt(k)); }
    s(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); s(8, "WAVEfmt "); d.setUint32(16, 16, true);
    d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, 8000, true); d.setUint32(28, 16000, true);
    d.setUint16(32, 2, true); d.setUint16(34, 16, true); s(36, "data"); d.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([buf], {type:"audio/wav"}));
  }catch(e){ return ""; }
})();
// O Safari só deixa tocar som depois de um toque na tela: o primeiro toque "libera" o áudio.
document.addEventListener("pointerdown", function(){
  if(audioLiberado) return;
  audioLiberado = true;
  if(SILENCIO && (!audioFala.src || audioFala.paused)){
    audioFala.src = SILENCIO;
    var pr = audioFala.play(); if(pr && pr.catch) pr.catch(function(){});
  }
}, {capture:true});

/* Frase longa vira pedaços (uma ou duas frases cada): o primeiro pedaço
   fica pronto rápido e começa a tocar enquanto os outros são gerados. */
function pedacosDe(texto){
  var t = String(texto || "").replace(/\s+/g, " ").trim();
  if(!t) return [];
  var frases = t.match(/[^.!?]+[.!?]*\s*/g) || [t], saida = [], atual = "";
  frases.forEach(function(f){
    f = f.trim(); if(!f) return;
    if(!atual) atual = f;
    else if(atual.length < 30 || (atual + " " + f).length <= 160) atual += " " + f;
    else { saida.push(atual); atual = f; }
  });
  if(atual) saida.push(atual);
  // pedaço gigante (lista sem pontos): corta nas vírgulas
  return saida.reduce(function(lista, p){
    while(p.length > 400){ var c = p.lastIndexOf(",", 400); if(c < 100) c = 400; lista.push(p.slice(0, c + 1).trim()); p = p.slice(c + 1).trim(); }
    if(p) lista.push(p);
    return lista;
  }, []);
}

var vozCache = {};          // pedaço -> Promise de endereço do áudio (blob)
var filaVoz = [], buscandoVoz = 0;
// privado = texto com respostas da pessoa (nome, telefone...): o servidor
// não guarda em cache, e aqui também não fica guardado depois de tocar.
function pegarAudio(pedaco, privado){
  if(!privado && vozCache[pedaco]) return vozCache[pedaco];
  var pr = new Promise(function(ok, falha){
    filaVoz.push({pedaco:pedaco, privado:!!privado, ok:ok, falha:falha});
    andarFilaVoz();
  });
  if(!privado){
    vozCache[pedaco] = pr;
    pr.catch(function(){ delete vozCache[pedaco]; });
  }
  return pr;
}
function andarFilaVoz(){
  while(buscandoVoz < 3 && filaVoz.length){
    (function(item){
      buscandoVoz++;
      fetch("/api/falar?t=" + encodeURIComponent(item.pedaco) + (item.privado ? "&privado=1" : ""),
            item.privado ? {cache:"no-store"} : undefined).then(function(r){
        if(!r.ok) throw new Error("voz " + r.status);
        return r.blob();
      }).then(function(b){
        if(!b.size) throw new Error("voz vazia");
        item.ok(URL.createObjectURL(b));
      }).catch(item.falha).then(function(){ buscandoVoz--; andarFilaVoz(); });
    })(filaVoz.shift());
  }
}
// Deixa prontas, em segundo plano, as frases que o app vai falar.
function preaquecerVoz(frases){
  if(!vozServidor) return;
  frases.forEach(function(f){ pedacosDe(f).forEach(function(p){ pegarAudio(p).catch(function(){}); }); });
}

function tocarPedaco(url, meu){
  return new Promise(function(ok, falha){
    if(meu !== falaId) return ok();
    audioFala.onended = function(){ ok(); };
    audioFala.onerror = function(){ falha(new Error("erro ao tocar")); };
    audioFala.onplaying = function(){ if(meu === falaId) document.body.classList.add("falando"); };
    audioFala.src = url;
    var pr = audioFala.play();
    if(pr && pr.catch) pr.catch(function(err){
      if(err && err.name === "AbortError") return ok();
      falha(err);
    });
  });
}

// texto pode ser uma frase ou uma lista de frases, faladas em sequência.
// Frase com dados da pessoa vai como {t:"...", privado:true}.
function privado(t){ return {t:t, privado:true}; }
function falar(texto, aoFim){
  var lista = (Array.isArray(texto) ? texto : [texto]).map(function(x){
    return (x && typeof x === "object") ? x : {t:x, privado:false};
  }).filter(function(x){ return x.t; });
  if(!S.som || !lista.length){ if(aoFim) setTimeout(aoFim, 200); return; }
  calar();
  var meu = ++falaId, terminou = false;
  function fim(){
    if(terminou || meu !== falaId) return;
    terminou = true;
    document.body.classList.remove("falando");
    if(aoFim) aoFim();
  }
  var pedacos = [], privados = [];
  lista.forEach(function(x){ pedacosDe(x.t).forEach(function(p){ pedacos.push(p); privados.push(x.privado); }); });
  if(!vozServidor){ falarNavegador(pedacos.join(" "), fim); return; }

  var promessas = pedacos.map(function(p, k){ return pegarAudio(p, privados[k]); }); // pede todos de uma vez
  var k = 0;
  function proximo(){
    if(meu !== falaId) return;
    if(k >= pedacos.length){ fim(); return; }
    var atual = k++;
    promessas[atual].then(function(url){
      return tocarPedaco(url, meu).then(function(){
        if(privados[atual]) try{ URL.revokeObjectURL(url); }catch(e){}
      });
    }).then(function(){
      falhasVoz = 0;
      proximo();
    }).catch(function(err){
      if(meu !== falaId) return;
      if(err && err.name === "NotAllowedError"){ fim(); return; } // ainda sem toque na tela
      falhasVoz++;
      if(falhasVoz >= 2) vozServidor = false; // servidor sem voz: não insiste
      falarNavegador(pedacos.slice(atual).join(" "), fim);
    });
  }
  proximo();
}
function calar(){
  falaId++;
  try{ audioFala.pause(); }catch(e){}
  try{ window.speechSynthesis.cancel(); }catch(e){}
  document.body.classList.remove("falando");
}

$("#btnSom").addEventListener("click", function(){
  S.som = !S.som;
  this.setAttribute("aria-pressed", S.som ? "true" : "false");
  $("#icoSom").innerHTML = S.som
    ? '<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>'
    : '<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M17 9l4 6M21 9l-4 6"/>';
  if(!S.som) calar();
});

// Todas as frases fixas: perguntas, avisos de seção e telas.
function frasesDoApp(){
  var lista = [
    "Preciso ouvir a sua voz para te ajudar. Como eu escrevo o que você fala, preciso da sua permissão para usar o microfone do aparelho.",
    "Está certo? Eu entendi assim:", "Vou repetir.",
    "Preparando o seu currículo. Só um momento.",
    "Seu currículo está pronto. Veja se está tudo certo. Se quiser, aperte o botão para ouvir.",
    "Não consegui entender. Vamos tentar mais uma vez? Fale um pouco mais devagar e perto do aparelho.",
    "O que você quer mudar no currículo? Toque no botão vermelho e fale do seu jeito, ou escreva.",
    "Como você quer receber o seu currículo?",
    "Antes de começar, veja como cuidamos das suas informações. Esta voz que você está ouvindo é gerada por inteligência artificial. A sua voz e as respostas passam por serviços de inteligência artificial só para fazer o currículo. O seu telefone e o seu e-mail não vão para a IA. As respostas ficam guardadas só neste aparelho. Quando estiver pronto, aperte o botão azul.",
    "Veja se ficou certo."
  ];
  SECOES.forEach(function(s){ lista.push("Muito bem! Agora vamos para " + s.nome + "."); });
  ROTEIRO.forEach(function(g){
    if(g.porta) lista.push(frasePergunta(g.porta));
    g.perguntas.forEach(function(p){ lista.push(frasePergunta(p)); });
    if(g.mais) lista.push(g.mais.titulo);
  });
  return lista;
}

/* ============================================================
   5. O APP OUVE
   ============================================================ */
/*
  A voz é gravada com MediaRecorder (funciona no Chrome, Edge, Firefox,
  Safari e Samsung Internet) e enviada ao servidor em /api/transcrever,
  que usa a transcrição da OpenAI. O áudio não fica guardado em lugar nenhum.
*/
var gravador = null, fluxoMic = null, pedacos = [], gravando = false, descartar = false, finalizando = false;
var inicioGravacao = 0, timerRelogio = null, timerLimite = null;
var LIMITE_GRAVACAO = 90; // segundos
var TIPOS_AUDIO = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function temMic(){
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) && S.micOk !== false;
}
function tipoAudio(){
  if(!window.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
  for(var k = 0; k < TIPOS_AUDIO.length; k++){ if(MediaRecorder.isTypeSupported(TIPOS_AUDIO[k])) return TIPOS_AUDIO[k]; }
  return "";
}
// O microfone fica aberto durante o uso do app. Abrir de novo a cada resposta
// atrasava o começo da gravação e cortava a primeira palavra ("São Paulo" -> "Paulo").
function micAberto(){
  return !!(fluxoMic && fluxoMic.getAudioTracks().some(function(t){ return t.readyState === "live"; }));
}
function abrirMic(){
  if(micAberto()) return Promise.resolve(fluxoMic);
  return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}})
    .then(function(f){ fluxoMic = f; return f; });
}
function fecharMic(){
  if(fluxoMic){ fluxoMic.getTracks().forEach(function(t){ t.stop(); }); fluxoMic = null; }
}
window.addEventListener("pagehide", fecharMic);
function soltarMic(){
  clearInterval(timerRelogio); clearTimeout(timerLimite);
  gravando = false;
  document.body.classList.remove("ouvindo");
}
function relogio(){
  var s = Math.floor((Date.now() - inicioGravacao) / 1000);
  var a = $("#aoVivo"); if(a) a.textContent = "Gravando… " + Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
}
function micBloqueado(){
  S.micOk = false;
  $("#tituloOuvindo").textContent = "O microfone está bloqueado";
  $("#subOuvindo").textContent = dentroDeQuadro
    ? "Esta janela não tem permissão de microfone. Abra o link numa aba do navegador, ou responda escrevendo."
    : "Toque no cadeado ao lado do endereço e libere o microfone. Ou responda escrevendo.";
  $("#seloOuvindo").textContent = "Microfone bloqueado";
  $("#btnParar").hidden = true;
  $("#btnMicDeNovo").hidden = true;
  falar("O microfone está bloqueado. Você pode responder escrevendo.");
}

function iniciarGravacao(){
  if(!temMic()){ ir("t-escrever"); return false; }
  soltarMic();
  pedacos = []; descartar = false;
  var el = $("#aoVivo"); if(el) el.textContent = "";
  $("#btnParar").hidden = true;
  $("#btnMicDeNovo").hidden = true;
  abrirMic().then(function(fluxo){
    if(S.tela !== "t-ouvindo") return;
    var tipo = tipoAudio();
    try{ gravador = tipo ? new MediaRecorder(fluxo, {mimeType:tipo}) : new MediaRecorder(fluxo); }
    catch(e){ soltarMic(); ir("t-escrever"); return; }
    gravador.ondataavailable = function(ev){ if(ev.data && ev.data.size) pedacos.push(ev.data); };
    gravador.onstop = function(){
      var segundos = (Date.now() - inicioGravacao) / 1000;
      var blob = new Blob(pedacos, {type: gravador.mimeType || tipo || "audio/webm"});
      soltarMic();
      var jogarFora = descartar; finalizando = false;
      if(jogarFora) return;
      if(segundos < 0.8 || blob.size < 1000){ falhaAudio(); return; }
      enviarAudio(blob);
    };
    gravador.start(1000);
    inicioGravacao = Date.now();
    gravando = true;
    document.body.classList.add("ouvindo");
    $("#btnParar").hidden = false;
    $("#tituloOuvindo").textContent = "Pode falar agora";
    $("#subOuvindo").textContent = "Quando terminar, aperte o botão vermelho de parar.";
    $("#seloOuvindo").textContent = "Estou ouvindo";
    relogio();
    timerRelogio = setInterval(relogio, 500);
    timerLimite = setTimeout(function(){ if(gravando) terminarGravacao(); }, LIMITE_GRAVACAO * 1000);
  }).catch(function(err){
    soltarMic(); fecharMic();
    if(err && (err.name === "NotAllowedError" || err.name === "SecurityError")){ micBloqueado(); return; }
    S.micOk = false;
    ir("t-escrever");
  });
  return true;
}

// Para e manda o áudio para transcrever.
function terminarGravacao(){
  if(!gravador || gravador.state === "inactive"){ falhaAudio(); return; }
  descartar = false; finalizando = true;
  try{ gravador.stop(); }catch(e){ finalizando = false; soltarMic(); falhaAudio(); return; }
  ir("t-processando");
}
// Para sem aproveitar o áudio (trocou de tela, preferiu escrever).
function pararGravacao(){
  if(finalizando) return;
  descartar = true;
  if(gravador && gravador.state !== "inactive"){ try{ gravador.stop(); }catch(e){} }
  soltarMic();
}

// Falha na gravação ou na transcrição: volta para a tela certa.
function falhaAudio(msg){
  if(S.modoAjuste){
    S.modoAjuste = false;
    ir("t-ajuste");
    avisoAjuste(msg || "Não consegui entender. Toque no botão vermelho e fale de novo, ou escreva.");
    return;
  }
  ir("t-erro");
}

function enviarAudio(blob){
  var p = perguntaAtual();
  var dica = S.modoAjuste ? "O que você quer mudar no currículo?" : (p ? p.texto : "");
  var ctrl = window.AbortController ? new AbortController() : null;
  var limite = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 30000);
  fetch("/api/transcrever", {
    method: "POST",
    headers: {"Content-Type": blob.type || "audio/webm", "X-Pergunta": encodeURIComponent(dica)},
    body: blob,
    signal: ctrl ? ctrl.signal : undefined
  }).then(function(r){
    return r.json().catch(function(){ return {}; }).then(function(j){ return {status:r.status, j:j}; });
  }).then(function(res){
    clearTimeout(limite);
    if(S.tela !== "t-processando") return;
    var texto = res.j && typeof res.j.texto === "string" ? res.j.texto.trim() : "";
    if(res.status === 200 && texto && S.modoAjuste){
      S.modoAjuste = false;
      var c = $("#campoAjuste");
      c.value = (c.value.trim() ? c.value.trim() + " " : "") + texto;
      ir("t-ajuste");
      validarAjuste();
      return;
    }
    if(res.status === 200 && texto){ S.rascunho = texto; tratarResposta(texto, "voz"); return; }
    if(S.modoAjuste){ falhaAudio(res.status === 503 || res.status === 429 ? "Agora não consigo ouvir. Escreva o que quer mudar, por favor." : null); return; }
    if(res.status === 503 || res.status === 429){
      // Transcrição desligada ou limite atingido: segue escrevendo.
      S.micOk = false;
      falar("Agora não consigo ouvir. Escreva a sua resposta, por favor.");
      ir("t-escrever");
      return;
    }
    ir("t-erro");
  }).catch(function(){
    clearTimeout(limite);
    if(S.tela !== "t-processando") return;
    if(navigator.onLine === false && !S.modoAjuste){ ir("t-offline"); return; }
    falhaAudio();
  });
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
    var v = valorDe(p.replace(/[^a-z]/g, ""));
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
var NOME_UF = {AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",
  ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",
  PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",
  RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins"};
var SIGLAS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function maiusculas(t){
  return String(t).split(" ").map(function(p){
    if(!p) return p;
    if(["de","da","do","das","dos","e"].indexOf(p.toLowerCase()) >= 0) return p.toLowerCase();
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }).join(" ");
}

/* e-mail falado: "jose ponto silva arroba gmail ponto com" -> jose.silva@gmail.com */
function emailFalado(t){
  return semAcento(t)
    .replace(/[,;:!?"'“”()]/g, " ")             // "Dudu Losco, arroba gmail" -> sem vírgula
    .replace(/\b(o meu e-?mail e|meu e-?mail e|o e-?mail e|e-?mail|e assim|tudo junto|junto)\b/g, " ")
    .replace(/\s*\b(arroba|aroba)\b\s*/g, "@")
    .replace(/\s*\b(ponto)\b\s*/g, ".")
    .replace(/\s*\b(underline|underscore|sublinhado|under)\b\s*/g, "_")
    .replace(/\s*\b(traco|tracinho|hifen|menos)\b\s*/g, "-")
    .replace(/\s+/g, "")
    .replace(/^[.,;:"'“”]+|[.,;:!?"'“”]+$/g, "");
}

/* A transcrição põe ponto final e aspas ("Vinte e dois."). Em respostas curtas, isso sai. */
// Hesitação no começo da fala: "é... Universidade Mackenzie", "ahn, Guarulhos"
var HESITA = /^(?:(?:é+|eh+|ah+n*|ã+h*|hum+|hm+|uhm+|hã+|então|entao|tipo|bom|olha|assim|deixa eu ver)(?:[\s,.…]+|$))+/i;
// Palavra soletrada: "D-I-S-C-E-R-E" ou "d i s c e r e" -> "Discere"
function juntarSoletrado(t){
  return t.replace(/(^|[\s(])((?:[A-Za-zÀ-ú][\s.\-]+){2,}[A-Za-zÀ-ú])(?=$|[\s,.;:!?)])/g, function(m, antes, letras){
    var w = letras.replace(/[\s.\-]+/g, "");
    return antes + w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
}
function limparFala(t, tipo){
  t = String(t || "").replace(/\s+/g, " ").trim().replace(/^["'“”]+|["'“”]+$/g, "");
  if(tipo !== "longo"){
    t = t.replace(HESITA, "").replace(/[.!?,;:…]+$/g, "").trim();
    if(tipo !== "email" && tipo !== "telefone" && tipo !== "estado" && tipo !== "cidade") t = juntarSoletrado(t);
  }
  return t;
}

/* "Guarulhos, São Paulo" / "Guarulhos SP" / "moro em Campinas no estado de São Paulo"
   -> {cidade:"Guarulhos", estado:"São Paulo (SP)"}. Sem estado: {cidade, estado:""}. */
var CAPITAL_MESMO_NOME = {"sao paulo":"SP", "rio de janeiro":"RJ"};
var LIGA_FIM = ["no","na","em","estado","de","do","da","e","aqui","la","ai"];
var LIGA_COMECO = ["eu","moro","em","na","no","cidade","de","sou","fico","a","o","so","nao","e","aqui","la","atualmente","hoje"];

/* Confere a cidade na lista do IBGE (municipios.js): acha, dentro da fala,
   o nome de município mais longo, de preferência no estado que a pessoa disse.
   "Salvador, aqui na Bahia" -> {nome:"Salvador", uf:"BA"}. */
var indiceMunicipios = null;
function montarIndiceMunicipios(){
  indiceMunicipios = {};
  var M = window.MUNICIPIOS || {};
  Object.keys(M).forEach(function(uf){
    M[uf].split("|").forEach(function(nome){
      var chave = semAcento(nome).replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
      (indiceMunicipios[chave] = indiceMunicipios[chave] || []).push({nome:nome, uf:uf});
    });
  });
}
function acharMunicipio(texto, ufDita){
  if(!window.MUNICIPIOS) return null;
  if(!indiceMunicipios) montarIndiceMunicipios();
  var w = semAcento(texto).replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  var melhor = null;
  for(var i = 0; i < w.length; i++){
    for(var n = Math.min(6, w.length - i); n >= 1; n--){
      var lista = indiceMunicipios[w.slice(i, i + n).join(" ")];
      if(!lista) continue;
      var noEstado = ufDita ? lista.filter(function(m){ return m.uf === ufDita; }) : [];
      var nota = n * 10 + (noEstado.length ? 100 : 0);
      if(!melhor || nota > melhor.nota){
        melhor = {nota:nota, nome:(noEstado[0] || lista[0]).nome,
                  uf: noEstado.length ? ufDita : (lista.length === 1 ? lista[0].uf : ""), varios: lista.length > 1};
      }
      break;
    }
  }
  return melhor;
}
function cidadeEstado(texto){
  var orig = String(texto || "").replace(/[,;/–—-]+/g, " ").replace(/[.!?]+$/g, "").split(/\s+/)
    .map(function(w){ return {o:w, n:semAcento(w).replace(/[^a-z]/g, "")}; })
    .filter(function(w){ return w.n || /\d/.test(w.o); });
  var norm = orig.map(function(w){ return w.n; });
  var uf = "", corte = orig.length;
  var ult = orig.length ? orig[orig.length - 1].o.toUpperCase().replace(/[^A-Z]/g, "") : "";
  if(orig.length > 1 && ult.length === 2 && SIGLAS.indexOf(ult) >= 0){ uf = ult; corte = orig.length - 1; }
  else{
    var nomes = Object.keys(UFS).sort(function(x, y){ return y.length - x.length; });
    for(var k = 0; k < nomes.length && !uf; k++){
      var partes = nomes[k].split(" "), n = partes.length;
      if(norm.length >= n && norm.slice(norm.length - n).join(" ") === nomes[k]){ uf = UFS[nomes[k]]; corte = norm.length - n; }
    }
  }
  var cid = orig.slice(0, corte);
  while(cid.length && LIGA_FIM.indexOf(cid[cid.length - 1].n) >= 0) cid.pop();
  while(cid.length > 1 && LIGA_COMECO.indexOf(cid[0].n) >= 0) cid.shift();
  var cidade = maiusculas(cid.map(function(w){ return w.o; }).join(" "));
  if(!cidade && uf){
    // "São Paulo" sozinho: cidade e estado com o mesmo nome
    var nomeEstado = semAcento(NOME_UF[uf]);
    if(CAPITAL_MESMO_NOME[nomeEstado]) cidade = NOME_UF[uf];
  }
  return {cidade:cidade, estado: uf ? NOME_UF[uf] + " (" + uf + ")" : ""};
}

/* ============================================================
   7. VALIDAÇÃO
   ============================================================ */
var VAZIAS = ["nao sei","sei nao","nada","sla","sei la","talvez","qualquer coisa","tanto faz"];
function ehVazia(t){
  var s = semAcento(t).replace(/[^a-z0-9\s]/g,"").trim();
  return !s || VAZIAS.indexOf(s) >= 0;
}

/* "meu nome é Giovanna Zardo, e é Giovanna com dois enes" -> "Giovanna Zardo" */
function nomeSemConversa(t){
  t = t.replace(/^(o\s+)?(meu nome (completo )?(é|e)|eu me chamo|me chamo|eu sou (o |a )?)\s+/i, "");
  // "Felipe Figueira Losco. O Felipe é com PH e dois L's" -> corta no ponto
  var frases = t.split(/\s*[.;,]\s+/);
  if(frases.length > 1 && /\b(com|é|eh|escreve|escrito|letra|letras|dois|duas|ph|th)\b/i.test(frases.slice(1).join(" "))) t = frases[0];
  var corte = t.search(/,?\s+(e\s+)?(é|eh)\s+(com|assim|tudo)\b|,?\s+(com|tem)\s+(dois|duas|um|uma|\d)\s|\s+se\s+escreve|\s+escrito\s+com|,\s*e\s+/i);
  if(corte > 0) t = t.slice(0, corte);
  return t.replace(/[.,;:]+$/, "").trim();
}

/* "eu fiquei oito anos nesse trabalho" -> "8 anos"; "um ano e três meses" -> "1 ano e 3 meses" */
var UNIDADES = {dia:["dia","dias"], dias:["dia","dias"], semana:["semana","semanas"], semanas:["semana","semanas"],
  mes:["mês","meses"], meses:["mês","meses"], ano:["ano","anos"], anos:["ano","anos"]};
function extrairPeriodo(t){
  var w = semAcento(t).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  var ehNum = function(x){ return /^\d+$/.test(x) || valorDe(x) !== null; };
  var partes = [], qualif = "";
  for(var k = 0; k < w.length; k++){
    if(!UNIDADES[w[k]]) continue;
    var j = k - 1, nums = [];
    while(j >= 0 && (ehNum(w[j]) || (w[j] === "e" && j > 0 && ehNum(w[j-1])))){ nums.unshift(w[j]); j--; }
    if(!nums.length) continue;
    if(!partes.length){
      var antes = w.slice(Math.max(0, j - 2), j + 1).join(" ");
      if(/quase$/.test(antes)) qualif = "Quase ";
      else if(/mais de$/.test(antes)) qualif = "Mais de ";
      else if(/(uns|umas|cerca de|mais ou menos|uns|por volta de)$/.test(antes)) qualif = "Cerca de ";
    }
    var n = numeroDe(nums.filter(function(x){ return x !== "e"; }).join(" "));
    if(!n) continue;
    var u = UNIDADES[w[k]];
    var txt = n + " " + (n === 1 ? u[0] : u[1]);
    if(w[k+1] === "e" && (w[k+2] === "meio" || w[k+2] === "meia")){ txt += " e meio"; k += 2; }
    partes.push(txt);
    if(partes.length === 2) break;
  }
  if(!partes.length) return "";
  return qualif + partes.join(" e ");
}

function validar(p, texto, obrigatoria){
  var t = String(texto || "").replace(/\s+/g," ").trim();
  if(!t) return {ok:false, titulo:"Não recebi a sua resposta", msg:"Vamos tentar de novo? " + p.ajuda};
  if(obrigatoria && ehVazia(t)) return {ok:false, titulo:"Preciso desta informação", msg:"Sem ela o currículo fica incompleto. " + p.ajuda};

  switch(p.tipo){
    case "nome":
      t = nomeSemConversa(t);
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
      var e = emailFalado(t);
      if(!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e))
        return {ok:false, titulo:"Esse e-mail não está completo",
                msg:"Um e-mail tem arroba e ponto. Fale devagar, assim: jose ponto silva arroba gmail ponto com. Ou toque em escrever."};
      return {ok:true, valor:e};

    case "cidade":
      var ce = cidadeEstado(t);
      var ufDita = (ce.estado.match(/\(([A-Z]{2})\)$/) || [])[1] || "";
      // procura só na parte da cidade (o estado do fim já saiu)
      var mun = ce.cidade ? acharMunicipio(ce.cidade, ufDita) : null;
      if(mun){
        ce.cidade = mun.nome;                     // grafia oficial, com acento
        if(!ufDita && mun.uf) ce.estado = NOME_UF[mun.uf] + " (" + mun.uf + ")";
      }
      if(!ce.cidade) return {ok:false, titulo:"Faltou o nome da cidade", msg:"Fale a cidade e o estado. Por exemplo: Guarulhos, São Paulo."};
      return {ok:true, valor:ce.cidade, estado:ce.estado,
              mostrar: ce.estado ? ce.cidade + ", " + ce.estado.replace(/\s*\([A-Z]{2}\)$/, "") : ce.cidade};

    case "estado":
      var s = semAcento(t).replace(/[^a-z\s]/g,"").trim();
      if(UFS[s]) return {ok:true, valor:NOME_UF[UFS[s]] + " (" + UFS[s] + ")"};
      var sig = t.toUpperCase().replace(/[^A-Z]/g,"");
      if(sig.length === 2 && SIGLAS.indexOf(sig) >= 0){
        return {ok:true, valor:NOME_UF[sig] + " (" + sig + ")"};
      }
      for(var k in UFS){ if(s.indexOf(k) >= 0) return {ok:true, valor:NOME_UF[UFS[k]] + " (" + UFS[k] + ")"}; }
      return {ok:false, titulo:"Não reconheci esse estado", msg:"Fale o nome do estado onde fica a sua cidade. Por exemplo: São Paulo, Bahia, Ceará."};

    case "periodo":
      var sa = semAcento(t);
      var temNumero = /\d/.test(t) || numeroDe(t) !== null;
      var temUnidade = /(mes|meses|ano|anos|semana|semanas|dia|dias)/.test(sa);
      if(!temNumero || !temUnidade)
        return {ok:false, titulo:"Preciso do tempo certinho", msg:"Fale quanto tempo com número e a palavra mês ou ano. Por exemplo: dois anos, ou oito meses."};
      // "eu fiquei oito anos nesse trabalho" -> "8 anos"
      var per = extrairPeriodo(t);
      return {ok:true, valor: per || t};

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
function frasePergunta(p){
  return p.texto + ". " + p.ajuda + (p.opcoes ? " " + p.opcoes.join(", ") + "." : "");
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
    if(S.editandoSecao && ROTEIRO[gi].secao !== S.editandoSecao){ S.editandoSecao = null; gerarCurriculo(); return; }
    break;
  }
  if(gi >= ROTEIRO.length){
    S.editandoSecao = null;
    var falta = faltandoObrigatorios();
    if(falta.length){ ir("t-faltando"); return; }
    gerarCurriculo();
    return;
  }

  S.pos = {g:gi, inst:0, q:-1};
  var novo = grupoAtual();
  if(!S.editandoSecao && novo.secao !== anterior.secao){
    S.anuncio = "Muito bem! Agora vamos para " + secaoInfo(novo.secao).nome + ".";
  }
  entrarGrupo();
}

/* --- desenhar a pergunta --- */
function mostrarPergunta(){
  var g = grupoAtual(), p = perguntaAtual(), it = instancia(g);
  if(!p){ proximaPergunta(); return; }

  // ao trocar de pergunta, o rascunho anterior não pode sobrar no campo
  var chave = S.pos.g + ":" + S.pos.inst + ":" + S.pos.q;
  if(chave !== S.ultimaChave){ S.rascunho = ""; S.ultimaChave = chave; }

  // histórico para o botão "Voltar para a pergunta anterior"
  if(!S.historico) S.historico = [];
  var topo = S.historico[S.historico.length - 1];
  if(!S.voltando && (!topo || topo.g !== S.pos.g || topo.inst !== S.pos.inst || topo.q !== S.pos.q)){
    S.historico.push({g:S.pos.g, inst:S.pos.inst, q:S.pos.q});
    if(S.historico.length > 200) S.historico.shift();
  }
  S.voltando = false;
  $("#btnVoltarPergunta").hidden = S.historico.length < 2 || !!S.editandoSecao || !!S.conferindoFaltas;

  // ao voltar, mostra o que a pessoa tinha respondido
  var antes = (S.pos.q === -1) ? S.portas[g.id] : it[p.id];
  S.valorAntes = antes || "";
  if(p.tipo === "cidade" && antes && it.estado) antes = antes + ", " + String(it.estado).replace(/\s*\([A-Z]{2}\)$/, "");
  var ra = $("#respostaAntes");
  ra.hidden = !antes;
  if(antes) ra.querySelector("b").textContent = antes;

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
  var escritaPrimeiro = !!p.escrever || !temMic();

  var exB = $("#exemploPergunta"), exE = $("#exemploEsc");
  var mostrarEx = !!p.exemplo && !temOpcoes && !S.valorAntes; // com resposta anterior, o exemplo sai
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
  $("#btnPularAqui").textContent = p.pular || "Pular esta pergunta";

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
  S.rascunhoMostrar = "";
  if(p.tipo === "cidade" && S.estadoJunto !== null && S.estadoJunto !== undefined){
    instancia(g).estado = S.estadoJunto; // vazio: a pergunta do estado aparece em seguida
    S.estadoJunto = null;
  }
  if(S.conferindoFaltas){
    var falta = faltandoObrigatorios();
    if(falta.length){ ir("t-faltando"); return; }
    S.conferindoFaltas = false;
    gerarCurriculo();
    return;
  }
  proximaPergunta();
}

/* Resposta curta que veio com conversa junto ("eu era recepcionista lá",
   "Giovanna com dois enes"): a IA tira só a informação pedida. A resposta
   da IA é conferida no servidor; se falhar, segue com a fala da pessoa. */
var LIMITE_PALAVRAS = {nome:4, objetivo:4, cargo:4, empresa:5, curso:5, instituicao:6};
var CONVERSA = /\b(eu|meu|minha|to|tou|estou|era|trabalhava|trabalhei|procurando|procuro|quero|fiz|fazia|estudei|estudo|chamo|chama|escreve|escrito|dois|duas|la|aqui|tipo|alguma|algum|coisa|parte|vaga)\b/;
function precisaEntender(p, t){
  if(!p || !LIMITE_PALAVRAS[p.id] || !window.fetch) return false;
  var n = t.split(/\s+/).filter(Boolean).length;
  return n > LIMITE_PALAVRAS[p.id] || CONVERSA.test(semAcento(t));
}
function entenderResposta(p, t){
  var ctrl = window.AbortController ? new AbortController() : null;
  var limite = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 9000);
  return fetch("/api/entender", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({campo:p.id, pergunta:p.texto, resposta:t}),
    signal: ctrl ? ctrl.signal : undefined
  }).then(function(r){ return r.json(); }).then(function(j){
    clearTimeout(limite);
    return j && j.ok && j.valor ? j.valor : null;
  }).catch(function(){ clearTimeout(limite); return null; });
}

function tratarResposta(texto, origem, jaEntendido){
  var g = grupoAtual(), p = perguntaAtual(), it = instancia(g);
  if(origem === "voz" && p && !p.opcoes && !jaEntendido) texto = limparFala(texto, p.tipo);
  if(origem === "voz" && !jaEntendido && precisaEntender(p, texto)){
    var meu = p, tela = S.tela;
    entenderResposta(p, texto).then(function(valor){
      if(perguntaAtual() !== meu || S.tela !== tela) return; // a pessoa já saiu daqui
      tratarResposta(valor || texto, origem, true);
    });
    return;
  }
  var obrigatoria = (S.pos.q === -1) ? true : ehObrig(p, it);
  var v = validar(p, texto, obrigatoria);
  if(v.ok){
    S.rascunho = v.valor;
    S.rascunhoMostrar = v.mostrar || "";
    S.estadoJunto = (p && p.tipo === "cidade") ? (v.estado || "") : null;
    if(origem === "voz") ir("t-confirmar"); else guardar(v.valor);
  }
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
  if(!falta.length){ S.conferindoFaltas = false; gerarCurriculo(); return; }
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
  if(p) falar(frasePergunta(p));
});
function itemVazio(it){
  return !it || !Object.keys(it).some(function(k){ return it[k]; });
}
$("#btnVoltarPergunta").addEventListener("click", function(){
  pararTudo();
  if(!S.historico || S.historico.length < 2) return;
  var atual = S.historico.pop();
  var ant = S.historico[S.historico.length - 1];
  // se voltou de um trabalho/escola/curso novo que ainda está vazio, ele sai da lista
  var g = ROTEIRO[atual.g], lista = S.dados[g.id] || [];
  if(atual.inst !== ant.inst || atual.g !== ant.g){
    if(atual.inst > 0 && atual.inst === lista.length - 1 && itemVazio(lista[atual.inst])) lista.pop();
  }
  S.pos = {g:ant.g, inst:ant.inst, q:ant.q};
  S.voltando = true;
  mostrarPergunta();
  falar("Voltamos. " + frasePergunta(perguntaAtual()));
});
$("#btnManterResp").addEventListener("click", function(){
  pararTudo();
  if(S.valorAntes){ S.estadoJunto = null; guardar(S.valorAntes); }
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

$("#btnParar").addEventListener("click", function(){ terminarGravacao(); });
$("#btnMicDeNovo").addEventListener("click", function(){ iniciarGravacao(); });
$("#btnOuvindoEscrever").addEventListener("click", function(){
  pararGravacao(); calar();
  if(S.modoAjuste){ S.modoAjuste = false; ir("t-ajuste"); try{ $("#campoAjuste").focus(); }catch(e){} return; }
  ir("t-escrever");
});

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

$("#btnOuvirResp").addEventListener("click", function(){ falar(privado(S.rascunhoMostrar || S.rascunho)); });
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
  var seguir = function(){ comecarRoteiro(); };
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder){
    abrirMic().then(function(){
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
$("#btnAgoraNao").addEventListener("click", function(){ S.micOk = false; comecarRoteiro(); });

function comecarRoteiro(){
  if(S.retomando){ S.retomando = false; continuarRoteiro(); return; }
  zerar(); entrarGrupo();
}

/* ============================================================
   PROGRESSO GUARDADO NO APARELHO
   ------------------------------------------------------------
   As respostas ficam no localStorage do navegador, só neste aparelho.
   Nada vai para o servidor. Funciona igual no computador e no Cloudflare.
   Se a página fechar ou recarregar, a pessoa continua de onde parou.
   ============================================================ */
var CHAVE_PROGRESSO = "falaCurriculo.progresso.v1";
var VALIDADE_PROGRESSO = 30 * 24 * 60 * 60 * 1000; // 30 dias
var TELAS_SALVAR = ["t-pergunta","t-mais","t-faltando","t-pronto","t-ajuste","t-corrigir","t-enviar"];

function salvarProgresso(tela){
  if(S.demo) return; // o painel "Todas as telas" usa dados de exemplo
  try{
    localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify({
      v:1, quando:Date.now(), tela:tela,
      dados:S.dados, portas:S.portas, visitados:S.visitados, pos:S.pos,
      editandoSecao:S.editandoSecao, conferindoFaltas:S.conferindoFaltas, cv:S.cv,
      historico:S.historico || []
    }));
  }catch(e){ /* navegador sem espaço ou em modo privado: segue sem guardar */ }
}
function lerProgresso(){
  try{
    var p = JSON.parse(localStorage.getItem(CHAVE_PROGRESSO) || "null");
    if(!p || p.v !== 1 || !p.dados || Date.now() - p.quando > VALIDADE_PROGRESSO) return null;
    var temAlgo = Object.keys(p.dados).some(function(k){
      return (p.dados[k] || []).some(function(it){ return it && Object.keys(it).length; });
    });
    return temAlgo ? p : null;
  }catch(e){ return null; }
}
function apagarProgresso(){ try{ localStorage.removeItem(CHAVE_PROGRESSO); }catch(e){} }

var salvoParaRetomar = null;
function aplicarProgresso(p){
  zerar();
  S.dados = p.dados; S.portas = p.portas || {}; S.visitados = p.visitados || {};
  S.pos = p.pos || {g:0, inst:0, q:-1};
  S.editandoSecao = p.editandoSecao || null; S.conferindoFaltas = !!p.conferindoFaltas;
  S.cv = p.cv || null;
  S.historico = Array.isArray(p.historico) ? p.historico : [];
  ROTEIRO.forEach(function(g){ if(!S.dados[g.id]) S.dados[g.id] = [{}]; });
  S.telaSalva = p.tela;
}
function continuarRoteiro(){
  var t = S.telaSalva; S.telaSalva = null;
  if(S.cv && ["t-pronto","t-ajuste","t-corrigir","t-enviar"].indexOf(t) >= 0){
    $("#previaCV").innerHTML = renderCV(S.cv);
    ir("t-pronto");
    $("#subPronto").textContent = "Este é o currículo que você já tinha feito. Veja se está tudo certo.";
    return;
  }
  if(t === "t-mais"){ mostrarMais(); return; }
  if(t === "t-faltando"){ ir("t-faltando"); return; }
  mostrarPergunta();
}
function quandoFoi(ms){
  var d = new Date(ms), hoje = new Date();
  var hora = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  if(d.toDateString() === hoje.toDateString()) return "hoje, às " + hora;
  return "no dia " + d.getDate() + "/" + (d.getMonth() + 1) + ", às " + hora;
}
$("#btnContinuar").addEventListener("click", function(){
  calar();
  if(!salvoParaRetomar){ ir("t-inicio"); return; }
  aplicarProgresso(salvoParaRetomar);
  salvoParaRetomar = null;
  if(S.cv && ["t-pronto","t-ajuste","t-corrigir","t-enviar"].indexOf(S.telaSalva) >= 0){ continuarRoteiro(); return; }
  S.retomando = true;   // passa pela tela do microfone e depois continua
  ir("t-microfone");
});
$("#btnComecarDeNovo").addEventListener("click", function(){
  calar(); apagarProgresso(); salvoParaRetomar = null; zerar();
  ir("t-inicio");
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

/* ============================================================
   10. MONTAGEM DO CURRÍCULO
   ============================================================ */
function esc(t){ return String(t == null ? "" : t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function pes(id){ return (S.dados.pessoais && S.dados.pessoais[0] && S.dados.pessoais[0][id]) || ""; }
function con(id){ return (S.dados.contato && S.dados.contato[0] && S.dados.contato[0][id]) || ""; }

/* Linguagem de currículo (proposta de docs/modelo-curriculo-pdf.md, passos 1 e 2) */
var SITUACAO_CV = {"Terminei":"Completo", "Não terminei":"Incompleto", "Ainda estou estudando":"Em andamento"};
var CNH_CV = {"Sim, de moto":"CNH categoria A", "Sim, de carro":"CNH categoria B", "Sim, de moto e de carro":"CNH categorias A e B"};
var MODALIDADE_CV = {"Sim, no local de trabalho":"Disponível para trabalho presencial",
                     "Só de casa":"Disponível para trabalho remoto",
                     "Dos dois jeitos":"Disponível para trabalho presencial ou remoto"};
function capitalizar(t){ t = String(t || "").trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ""; }
// "São Paulo" + "São Paulo (SP)"  ->  "São Paulo – SP"
function localCV(cidade, estado){
  var m = /\(([A-Z]{2})\)\s*$/.exec(estado || "");
  return [cidade, m ? m[1] : estado].filter(Boolean).join(" – ");
}
function empresaCV(t){ return t === "Trabalhei por conta própria" ? "Autônomo" : t; }
// "Faculdade" + "Administração" -> "Graduação em Administração"
function tituloFormacao(f){
  if(!f.curso) return f.nivel;
  if(/faculdade/i.test(f.nivel)) return "Graduação em " + f.curso;
  if(/t[eé]cnico/i.test(f.nivel)) return /^t[eé]cnico/i.test(f.curso) ? f.curso : "Técnico em " + f.curso;
  return f.nivel + " em " + f.curso;
}
function linhaFormacao(f){ return [tituloFormacao(f), f.situacao].filter(Boolean).join(" – "); }
function formacaoTexto(f){
  if(typeof f === "string") return f;
  return [linhaFormacao(f), f.instituicao].filter(Boolean).join(", ");
}
function listaDe(a){ return Array.isArray(a) ? a.filter(Boolean) : (a ? [capitalizar(a)] : []); }
function atividadesTexto(a){
  return listaDe(a).map(function(x){ return String(x).replace(/[.;]+$/, ""); }).join(". ") + (listaDe(a).length ? "." : "");
}

function cvBase(){
  var trabalhos = grupoPulado(ROTEIRO[1]) ? [] :
    (S.dados.trabalho || []).filter(function(it){ return it.cargo || it.empresa; });
  var estudos = (S.dados.estudo || []).filter(function(it){ return it.escolaridade && it.escolaridade !== "Não estudei"; });
  var cursos = grupoPulado(ROTEIRO[3]) ? [] :
    (S.dados.cursos || []).map(function(it){ return it.curso; }).filter(Boolean);
  return {
    nome: pes("nome") || "Seu nome",
    titulo: maiusculas(pes("objetivo")) || "Profissional",
    local: localCV(pes("cidade"), pes("estado")),
    idade: pes("idade"),
    cnh: CNH_CV[pes("cnh")] || "",
    modalidade: MODALIDADE_CV[pes("modalidade")] || "",
    primeiroEmprego: trabalhos.length === 0,
    resumo:"",
    experiencia: trabalhos.map(function(it){
      return {cargo:maiusculas(it.cargo || ""), empresa:empresaCV(it.empresa || ""), periodo:it.periodo || "",
              atividades:it.atividades || "", maisSobre:it.maisSobre || ""};
    }),
    formacao: estudos.map(function(it){
      return {nivel: maiusculas(it.escolaridade), curso: SUPERIOR.indexOf(it.escolaridade) >= 0 ? (it.curso || "") : "",
              situacao: SITUACAO_CV[it.situacao] || "", instituicao: it.instituicao || ""};
    }),
    cursos: cursos.map(capitalizar),
    idiomas: capitalizar((S.dados.idiomas && S.dados.idiomas[0] && S.dados.idiomas[0].idiomas) || ""),
    telefone: con("telefone"),
    email: con("email"),
    linkedin: con("temLinkedin") === "Tenho LinkedIn" ? con("linkedin") : ""
  };
}

function renderCV(cv){
  var h = "";
  h += '<h2>' + esc(cv.nome) + '</h2>';
  if(cv.titulo) h += '<p class="cargo">' + esc(cv.titulo) + '</p>';
  var contato = [cv.local, cv.idade ? cv.idade + " anos" : "", cv.telefone ? cv.telefone + " (WhatsApp)" : "", cv.email, cv.linkedin].filter(Boolean);
  if(contato.length) h += '<p class="item-s">' + contato.map(esc).join(" &nbsp;|&nbsp; ") + '</p>';
  var resumo = cv.resumo || (cv.primeiroEmprego ? "Em busca do primeiro emprego." : "");
  if(resumo) h += '<h3>Resumo</h3><p>' + esc(resumo) + '</p>';
  if(cv.experiencia && cv.experiencia.length){
    h += '<h3>Experiência profissional</h3>';
    cv.experiencia.forEach(function(e){
      h += '<p class="item-t">' + esc(e.cargo) + (e.periodo ? ' <span class="item-s" style="float:right;font-weight:400">' + esc(e.periodo) + '</span>' : "") + '</p>';
      if(e.empresa) h += '<p class="item-s"><i>' + esc(e.empresa) + '</i></p>';
      var itens = listaDe(e.atividades).concat(e.maisSobre ? [capitalizar(e.maisSobre)] : []);
      if(itens.length) h += '<ul>' + itens.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>';
    });
  }
  if(cv.formacao && cv.formacao.length){
    h += '<h3>Formação</h3>';
    cv.formacao.forEach(function(f){
      if(typeof f === "string"){ h += '<p>' + esc(f) + '</p>'; return; }
      h += '<p class="item-t">' + esc(linhaFormacao(f)) + '</p>';
      if(f.instituicao) h += '<p class="item-s">' + esc(f.instituicao) + '</p>';
    });
  }
  if(cv.cursos && cv.cursos.length){
    h += '<h3>Cursos</h3><ul>' + cv.cursos.map(function(c){ return '<li>' + esc(c) + '</li>'; }).join("") + '</ul>';
  }
  if(cv.idiomas) h += '<h3>Idiomas</h3><p>' + esc(cv.idiomas) + '</p>';
  var extras = [cv.cnh, cv.modalidade].filter(Boolean);
  if(extras.length) h += '<h3>Informações adicionais</h3><ul>' + extras.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>';
  return h;
}

function textoDoCV(cv){
  var p = [];
  p.push(cv.nome + (cv.local ? ", de " + cv.local.replace(" – ", ", ") : "") + ".");
  if(cv.titulo) p.push("Procura trabalho como " + cv.titulo + ".");
  if(cv.resumo) p.push(cv.resumo);
  if(cv.experiencia.length){
    cv.experiencia.forEach(function(e){
      p.push("Trabalhou como " + e.cargo + (e.empresa ? ", em " + e.empresa : "") +
             (e.periodo ? ", por " + e.periodo : "") + ". " + atividadesTexto(e.atividades));
    });
  }else if(cv.primeiroEmprego){ p.push("Está em busca do primeiro emprego."); }
  if(cv.formacao.length) p.push("Estudos: " + cv.formacao.map(formacaoTexto).join(". ") + ".");
  if(cv.cursos.length) p.push("Cursos: " + cv.cursos.join(", ") + ".");
  if(cv.idiomas) p.push("Idiomas: " + cv.idiomas + ".");
  [cv.cnh, cv.modalidade].filter(Boolean).forEach(function(x){ p.push(x + "."); });
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
    {nome:"Estudos e Cursos", texto:[cv.formacao.map(formacaoTexto).join(". "), cv.cursos.join(", "), cv.idiomas].filter(Boolean).join(". ") || "Sem informações"},
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
  if(k >= filaLeitura.length){ lendo = false; ir("t-pronto"); return; }
  destacarBloco(k);
  var b = filaLeitura[k];
  falar([b.nome + ".", privado(b.texto || "Não informado")], function(){
    if(lendo) setTimeout(function(){ lerBloco(k + 1); }, 320);
  });
}
function comecarLeitura(volta){
  montarLeitura(); ir("t-lendo", volta); lendo = true;
  setTimeout(function(){ lerBloco(0); }, 420);
}

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
$("#btnMudarAlgo").addEventListener("click", function(){
  calar();
  $("#campoAjuste").value = "";
  $("#avisoAjuste").hidden = true;
  validarAjuste();
  ir("t-ajuste");
});
$("#btnAjustePartes").addEventListener("click", function(){ calar(); montarCorrigir(); ir("t-corrigir"); });
function avisoAjuste(msg){
  $("#txtAvisoAjuste").textContent = msg;
  $("#avisoAjuste").hidden = !msg;
  if(msg) falar(msg);
}
function validarAjuste(){ $("#btnAjusteFazer").disabled = $("#campoAjuste").value.trim().length < 3; }
$("#campoAjuste").addEventListener("input", validarAjuste);
$("#btnAjusteFalar").addEventListener("click", function(){
  calar();
  $("#avisoAjuste").hidden = true;
  if(!temMic()){ try{ $("#campoAjuste").focus(); }catch(e){} return; }
  S.modoAjuste = true;
  ir("t-ouvindo");
  iniciarGravacao();
});
$("#btnAjusteFazer").addEventListener("click", function(){
  var pedido = $("#campoAjuste").value.trim();
  if(pedido.length < 3) return;
  calar();
  if(typeof window.ajustarCurriculoComIA !== "function"){ avisoAjuste("A mudança pela IA não está disponível agora. Toque em responder uma parte de novo."); return; }
  ir("t-preparando");
  var espera = new Promise(function(ok){ setTimeout(ok, 1200); });
  Promise.all([window.ajustarCurriculoComIA(S.cv || cvBase(), pedido), espera]).then(function(res){
    var r = res[0];
    if(!r || !r.cv){
      ir("t-ajuste");
      avisoAjuste((r && r.motivo) || "Não consegui fazer a mudança agora. Tente de novo, ou toque em responder uma parte de novo.");
      return;
    }
    S.cv = r.cv;
    $("#previaCV").innerHTML = renderCV(S.cv);
    ir("t-pronto");
    var frase = r.resposta || "Fiz a mudança.";
    $("#subPronto").textContent = frase + " Veja se ficou certo.";
    falar([privado(frase), "Veja se ficou certo."]);
  });
});

/* ============================================================
   12. ORGANIZAÇÃO DO CURRÍCULO
   ============================================================ */
var REGRAS = [
  "Você organiza currículos para pessoas com pouca escolaridade no Brasil.",
  "Use SOMENTE as informações fornecidas. É proibido inventar empresas, cargos, datas, cursos, resultados ou qualquer habilidade que a pessoa não tenha dito.",
  "Corrija a ortografia, organize as frases e use um português profissional, porém simples e direto.",
  "Se um campo estiver vazio, devolva string vazia ou lista vazia. Nunca preencha com exemplo.",
  "Se a pessoa nunca trabalhou, deixe experiencia como lista vazia e escreva um resumo focado no objetivo e nos estudos.",
  "Não invente carteira de motorista nem idiomas.",
  "Escreva tudo em português do Brasil."
].join(" ");

function promptCV(){
  var b = cvBase();
  var linhas = [];
  linhas.push("Nome: " + b.nome);
  linhas.push("Cidade e estado: " + b.local);
  linhas.push("Idade: " + (b.idade || "(não informou)"));
  linhas.push("Vaga que procura: " + b.titulo);
  linhas.push("Carteira de motorista: " + (b.cnh || "(não tem ou não informou)"));
  linhas.push("Disponibilidade: " + (b.modalidade || "(não informou)"));
  if(b.experiencia.length){
    b.experiencia.forEach(function(e, k){
      linhas.push("Trabalho " + (k+1) + ": função " + e.cargo + "; local " + e.empresa +
        "; tempo " + e.periodo + "; o que fazia: " + e.atividades +
        (e.maisSobre ? "; mais sobre esse trabalho: " + e.maisSobre : ""));
    });
  }else{ linhas.push("Experiência: nunca trabalhou, procura o primeiro emprego."); }
  b.formacao.forEach(function(f, k){ linhas.push("Estudo " + (k+1) + ": " + formacaoTexto(f)); });
  b.cursos.forEach(function(c, k){ linhas.push("Curso " + (k+1) + ": " + c); });
  if(b.idiomas) linhas.push("Idiomas: " + b.idiomas);
  linhas.push("Telefone: " + b.telefone);
  linhas.push("E-mail: " + b.email);
  if(b.linkedin) linhas.push("LinkedIn: " + b.linkedin);

  return REGRAS + "\n\nInformações da pessoa:\n" + linhas.join("\n") +
    "\n\nResponda SOMENTE com um objeto JSON neste formato, sem nenhum texto antes ou depois:\n" +
    '{"titulo":"","resumo":"","experiencia":[{"cargo":"","empresa":"","periodo":"","atividades":"","maisSobre":""}],"formacao":[""],"cursos":[""]}\n' +
    '"titulo" é a vaga que a pessoa procura, em poucas palavras. "resumo" tem no máximo duas frases e só usa o que foi dito. "atividades" vira uma frase profissional descrevendo o que a pessoa fazia.';
}

/*
  Ponto de integração com a API do projeto.
  A implementação final deve disponibilizar uma função assíncrona chamada
  window.processarCurriculoComIA, que recebe o texto de instruções e retorna
  o objeto JSON com o currículo organizado. Sem a API, o protótipo preserva
  os dados informados e conclui normalmente o fluxo de demonstração.
*/
function solicitarOrganizacaoIA(instrucoes){
  if(typeof window.processarCurriculoComIA !== "function") return Promise.resolve(null);
  return Promise.resolve(window.processarCurriculoComIA(instrucoes));
}

function prepararCV(){
  var pronto = false;
  var espera = new Promise(function(res){ setTimeout(res, 1500); });
  function finalizar(cv){
    if(pronto) return;
    pronto = true;
    S.cv = cv;
    espera.then(function(){
      $("#previaCV").innerHTML = renderCV(cv);
      ir("t-pronto");
      $("#subPronto").textContent = cv.origemIA
        ? "Melhorei o texto das suas respostas. Ouça ou leia e veja se está tudo certo."
        : "Montei o currículo com as suas respostas. Ouça ou leia e veja se está tudo certo.";
      setTimeout(function(){ falar("Seu currículo está pronto. Veja se está tudo certo. Se quiser, aperte o botão para ouvir."); }, 400);
    });
  }
  var base = cvBase();
  solicitarOrganizacaoIA(promptCV()).then(function(d){
    if(!d){ finalizar(base); return; }
      finalizar({
        nome: base.nome,
        titulo: (d && d.titulo) || base.titulo,
        local: (d && d.local) || base.local,
        idade: base.idade,
        cnh: base.cnh,
        modalidade: base.modalidade,
        primeiroEmprego: base.primeiroEmprego,
        resumo: (d && d.resumo) || "",
        experiencia: (d && Array.isArray(d.experiencia)) ? d.experiencia : base.experiencia,
        formacao: (d && Array.isArray(d.formacao)) ? d.formacao : base.formacao,
        cursos: (d && Array.isArray(d.cursos)) ? d.cursos.filter(Boolean) : base.cursos,
        idiomas: (d && typeof d.idiomas === "string") ? d.idiomas : base.idiomas,
        telefone: base.telefone, email: base.email, linkedin: base.linkedin,
        origemIA: !(d && d.semIA)
      });
  }).catch(function(){ finalizar(base); });
}

function gerarCurriculo(){
  calar(); lendo = false;
  if(faltandoObrigatorios().length){ ir("t-faltando"); return; }
  ir("t-preparando");
  prepararCV();
}

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
$("#btnOuvirCV").addEventListener("click", function(){ falar(privado(textoDoCV(S.cv || cvBase()))); });

/* ============================================================
   13. PDF / WHATSAPP / IMPRIMIR
   ============================================================ */
function avisar(msg){ $("#txtAvisoEnvio").textContent = msg; $("#avisoEnvio").hidden = false; }

function gerarPDF(){
  var cv = S.cv || cvBase();
  if(!window.jspdf || !window.jspdf.jsPDF) return null;
  var doc = new window.jspdf.jsPDF({unit:"pt", format:"a4"});
  var L = 56, R = 595 - 56, W = R - L, TOPO = 64, FIM = 786, y = TOPO;
  var COR = {texto:"#17242B", suave:"#54646E", destaque:"#17457E", secao:"#1E6B45", linha:"#D8CDB6"};

  function fonte(tam, estilo, cor){
    doc.setFont("helvetica", estilo || "normal");
    doc.setFontSize(tam);
    doc.setTextColor(cor || COR.texto);
  }
  function caber(alt){ if(y + alt > FIM){ doc.addPage(); y = TOPO; } }
  function texto(txt, tam, estilo, cor){
    fonte(tam, estilo, cor);
    doc.splitTextToSize(String(txt), W).forEach(function(l){
      caber(tam * 1.35); doc.text(l, L, y); y += tam * 1.35;
    });
  }
  function marcador(txt){
    fonte(10.5, "normal", COR.texto);
    var ls = doc.splitTextToSize(String(txt), W - 14);
    caber(ls.length * 14.2);
    doc.text("•", L + 2, y);
    ls.forEach(function(l){ doc.text(l, L + 14, y); y += 14.2; });
  }
  function secao(t){
    caber(48);                       // o título não fica sozinho no fim da página
    y += 14;
    fonte(10, "bold", COR.secao);
    doc.text(t.toUpperCase(), L, y);
    doc.setDrawColor(COR.linha); doc.setLineWidth(0.8);
    doc.line(L, y + 5, R, y + 5);
    y += 20;
  }

  // Cabeçalho: nome, vaga e contato
  texto(cv.nome, 22, "bold");
  y += 2;
  if(cv.titulo) texto(cv.titulo, 12.5, "bold", COR.destaque);
  var contato = [cv.local, cv.idade ? cv.idade + " anos" : "", cv.telefone ? cv.telefone + " (WhatsApp)" : "", cv.email]
    .filter(Boolean).join("   |   ");
  if(contato) texto(contato, 10, "normal", COR.suave);
  if(cv.linkedin) texto(cv.linkedin, 10, "normal", COR.suave);
  y += 4;
  doc.setDrawColor(COR.destaque); doc.setLineWidth(1.5); doc.line(L, y, R, y);
  y += 4;

  var resumo = cv.resumo || (cv.primeiroEmprego ? "Em busca do primeiro emprego." : "");
  if(resumo){ secao("Resumo"); texto(resumo, 10.5); }

  if(cv.experiencia && cv.experiencia.length){
    secao("Experiência profissional");
    cv.experiencia.forEach(function(e, i){
      if(i) y += 8;
      caber(40);
      fonte(10, "normal", COR.suave);
      var wp = e.periodo ? doc.getTextWidth(e.periodo) : 0;
      fonte(11.5, "bold", COR.texto);
      if(doc.getTextWidth(e.cargo) + wp + 16 <= W){
        doc.text(e.cargo, L, y);
        if(e.periodo){ fonte(10, "normal", COR.suave); doc.text(e.periodo, R, y, {align:"right"}); }
        y += 15;
      }else{
        texto(e.cargo, 11.5, "bold");
        if(e.periodo) texto(e.periodo, 10, "normal", COR.suave);
      }
      if(e.empresa) texto(e.empresa, 10.5, "italic", COR.suave);
      y += 2;
      listaDe(e.atividades).forEach(marcador);
      if(e.maisSobre) marcador(capitalizar(e.maisSobre));
    });
  }

  if(cv.formacao && cv.formacao.length){
    secao("Formação");
    cv.formacao.forEach(function(f){
      if(typeof f === "string"){ marcador(f); return; }
      texto(linhaFormacao(f), 11, "bold");
      if(f.instituicao) texto(f.instituicao, 10.5, "normal", COR.suave);
      y += 4;
    });
  }

  if(cv.cursos && cv.cursos.length){ secao("Cursos"); cv.cursos.forEach(marcador); }
  if(cv.idiomas){ secao("Idiomas"); texto(cv.idiomas, 10.5); }

  var extras = [cv.cnh, cv.modalidade].filter(Boolean);
  if(extras.length){ secao("Informações adicionais"); extras.forEach(marcador); }

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
    avisar("Currículo guardado no aparelho.");
    falar("Pronto. Seu currículo foi guardado no aparelho.");
  }catch(e){ avisar("Este navegador bloqueou o download. Use o botão de imprimir."); }
});

$("#btnImprimir").addEventListener("click", function(){
  $("#avisoEnvio").hidden = true;
  var doc = gerarPDF();
  if(doc){
    try{ var w = window.open(doc.output("bloburl"), "_blank"); if(w) return; }catch(e){}
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
      .then(function(){ falar("Currículo enviado."); })
      .catch(function(){ abrirWhatsTexto(cv); });
  }else{ abrirWhatsTexto(cv); }
});
function abrirWhatsTexto(cv){
  var texto = "*" + cv.nome + "*\n" + [cv.titulo, cv.local].filter(Boolean).join(" · ") + "\n\n" + textoDoCV(cv);
  var w = window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener");
  if(!w) avisar("O navegador bloqueou a abertura do WhatsApp. Guarde o PDF no aparelho e envie pelo aplicativo.");
  else avisar("No protótipo, o WhatsApp recebe o currículo em texto. O envio do PDF em anexo entra na versão final.");
}

$("#btnApagarTudo").addEventListener("click", function(){
  pararTudo(); apagarProgresso(); zerar();
  $("#avisoEnvio").hidden = true;
  ir("t-inicio", true);
  falar("Pronto. As suas respostas foram apagadas deste aparelho.");
});
$("#btnAjusteOuvirCV").addEventListener("click", function(){ falar(privado(textoDoCV(S.cv || cvBase()))); });
$("#btnRecomecar").addEventListener("click", function(){
  pararTudo(); zerar();
  $("#avisoEnvio").hidden = true;
  ir("t-inicio", true);
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
    falar(["Vou repetir.", frasePergunta(p), extra], agendarRepeticao);
  }, 11000);
}
function cancelarRepeticao(){ clearTimeout(timerRepetir); }
document.addEventListener("pointerdown", cancelarRepeticao);

function aplicarModo(){
  document.body.classList.toggle("modo-ajuda", S.letraGrande);
  $("#btnLetra").setAttribute("aria-pressed", S.letraGrande ? "true" : "false");
  $("#btnLetra").setAttribute("title", S.letraGrande ? "Voltar a letra ao normal" : "Deixar a letra maior");
}
$("#btnLetra").addEventListener("click", function(){
  S.letraGrande = !S.letraGrande;
  aplicarModo();
  falar(S.letraGrande ? "Letra maior." : "Letra normal.");
});

function aoEntrar(id){
  if(TELAS_SALVAR.indexOf(id) >= 0) salvarProgresso(id);
  clearInterval(timerFrases);
  clearTimeout(timerAuto);
  clearTimeout(timerRepetir);
  if(id !== "t-ouvindo") pararGravacao();

  switch(id){
    case "t-inicio":
      falar("Fala Currículo. O jeito fácil de fazer o seu currículo usando só a sua voz. Aperte o botão azul para começar.");
      break;
    case "t-retomar":
      preaquecerVoz(frasesDoApp());
      falar("Que bom te ver de novo. Quer continuar de onde parou? As suas respostas estão guardadas neste aparelho.");
      break;
    case "t-privacidade":
      preaquecerVoz(frasesDoApp());
      falar("Antes de começar, veja como cuidamos das suas informações. Esta voz que você está ouvindo é gerada por inteligência artificial. A sua voz e as respostas passam por serviços de inteligência artificial só para fazer o currículo. O seu telefone e o seu e-mail não vão para a IA. As respostas ficam guardadas só neste aparelho. Quando estiver pronto, aperte o botão azul.");
      break;
    case "t-microfone":
      preaquecerVoz(frasesDoApp());
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
        S.repeticoes = 0;
        var antes = S.anuncio; S.anuncio = "";
        falar([antes, frasePergunta(p)], agendarRepeticao);
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
      break;
    case "t-confirmar":
      var mostrar = S.rascunhoMostrar || S.rascunho || "";
      $("#citacao").textContent = "“" + mostrar + "”";
      falar(["Está certo? Eu entendi assim:", privado(mostrar)]);
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
    case "t-ajuste":
      $("#previaAjuste .cv").innerHTML = renderCV(S.cv || cvBase());
      if($("#avisoAjuste").hidden && !$("#campoAjuste").value.trim())
        falar("O que você quer mudar no currículo? Toque no botão vermelho e fale do seu jeito, ou escreva.");
      validarAjuste();
      break;
    case "t-enviar":
      falar("Como você quer receber o seu currículo?");
      break;
    case "t-offline":
      falar("O sinal sumiu, mas as suas respostas já estão bem guardadas. Assim que a internet voltar, a gente continua.");
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
  S.demo = true;
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

  var comDados = ["t-pronto","t-enviar","t-corrigir","t-faltando","t-mais"];
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
  if(id === "t-corrigir"){ montarCorrigir(); }
  if(id === "t-faltando"){ montarFaltando(); }
  ir(id);
});

/* --- Funções usadas pelo ia.js --- */
window.FalaCurriculoApp = {cvBase:cvBase, gerarPDF:gerarPDF, nomeArquivo:nomeArquivo, avisar:avisar, falar:falar,
  validar:validar, emailFalado:emailFalado, listaDe:listaDe};

/* ============================================================
   17. INÍCIO
   ============================================================ */
if(!(navigator.mediaDevices && window.MediaRecorder)) S.micOk = false;
aplicarModo();
salvoParaRetomar = lerProgresso();
if(salvoParaRetomar){
  $("#subRetomar").textContent = "As suas respostas de " + quandoFoi(salvoParaRetomar.quando) + ", estão guardadas neste aparelho.";
  ir("t-retomar");
}else{
  ir("t-inicio");
}

var destravou = false;
document.addEventListener("pointerdown", function(){
  if(destravou) return;
  destravou = true;
  if(S.tela === "t-inicio" && S.som && "speechSynthesis" in window && !window.speechSynthesis.speaking){
    falar("Aperte o botão azul para começar.");
  }
});

})();
