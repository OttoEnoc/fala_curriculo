"use strict";

/*
  Guarda o progresso no próprio aparelho, usando IndexedDB.
  Nada disso vai para o servidor.

  - salvar(estado): grava o estado atual (substitui o anterior).
  - carregar(): devolve o estado salvo, ou null.
  - apagar(): remove tudo o que foi salvo.

  Os dados ficam guardados por no máximo DIAS_RETENCAO dias.
  Depois disso são apagados na próxima vez que o app abrir.
*/
var Armazenamento = (function(){
  var BANCO = "fala-curriculo", LOJA = "progresso", CHAVE = "atual", VERSAO_DADOS = 1;
  var DIAS_RETENCAO = 7;
  var abrindo = null;

  function abrir(){
    if(abrindo) return abrindo;
    abrindo = new Promise(function(ok, falhou){
      if(!("indexedDB" in window)){ falhou(new Error("sem-indexeddb")); return; }
      var pedido;
      try{ pedido = window.indexedDB.open(BANCO, 1); }catch(e){ falhou(e); return; }
      pedido.onupgradeneeded = function(){ pedido.result.createObjectStore(LOJA); };
      pedido.onsuccess = function(){ ok(pedido.result); };
      pedido.onerror = function(){ falhou(pedido.error); };
      pedido.onblocked = function(){ falhou(new Error("bloqueado")); };
    });
    abrindo.catch(function(){ abrindo = null; });
    return abrindo;
  }

  function operar(modo, acao){
    return abrir().then(function(bd){
      return new Promise(function(ok, falhou){
        var tx = bd.transaction(LOJA, modo);
        var pedido = acao(tx.objectStore(LOJA));
        tx.oncomplete = function(){ ok(pedido ? pedido.result : undefined); };
        tx.onerror = function(){ falhou(tx.error); };
        tx.onabort = function(){ falhou(tx.error); };
      });
    });
  }

  function salvar(estado){
    var registro = {versao:VERSAO_DADOS, salvoEm:Date.now(), estado:estado};
    return operar("readwrite", function(loja){ return loja.put(registro, CHAVE); });
  }

  function apagar(){
    return operar("readwrite", function(loja){ return loja.delete(CHAVE); });
  }

  function carregar(){
    return operar("readonly", function(loja){ return loja.get(CHAVE); }).then(function(r){
      if(!r || r.versao !== VERSAO_DADOS || !r.estado) return null;
      if(Date.now() - r.salvoEm > DIAS_RETENCAO * 24 * 60 * 60 * 1000){
        return apagar().then(function(){ return null; });
      }
      return r.estado;
    });
  }

  return {salvar:salvar, carregar:carregar, apagar:apagar, DIAS_RETENCAO:DIAS_RETENCAO};
})();
