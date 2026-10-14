"use strict";

/*
  Service worker do Fala Currículo (tarefa 7.3).
  Guarda os arquivos do app para o fluxo de perguntas funcionar sem internet.

  - Arquivos do app: tenta a rede primeiro (sempre a versão nova quando há
    internet) e usa a cópia guardada quando está sem internet.
  - Fontes e jsPDF (de outros sites): usa a cópia guardada quando existe.
  - /api/...: nunca guarda. Respostas e currículos não ficam no cache.
*/
const VERSAO = "fala-curriculo-v1";
const ARQUIVOS = [
  "./", "./index.html", "./estilos.css", "./roteiro.js", "./armazenamento.js", "./app.js",
  "./privacidade.html", "./manifest.webmanifest",
  "./icones/icone.svg", "./icones/icone-192.png", "./icones/icone-512.png", "./icones/icone-apple-180.png",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];
const EXTERNOS = ["cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(VERSAO)
      .then((cache) => Promise.all(ARQUIVOS.map((u) => cache.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function redePrimeiro(pedido) {
  return fetch(pedido).then((resp) => {
    if (resp && resp.ok) {
      const copia = resp.clone();
      caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
    }
    return resp;
  }).catch(() => caches.match(pedido, { ignoreSearch: true })
    .then((r) => r || (pedido.mode === "navigate" ? caches.match("./index.html") : undefined))
    .then((r) => r || Response.error()));
}

function cachePrimeiro(pedido) {
  return caches.match(pedido).then((guardado) => guardado || fetch(pedido).then((resp) => {
    if (resp && (resp.ok || resp.type === "opaque")) {
      const copia = resp.clone();
      caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
    }
    return resp;
  }));
}

self.addEventListener("fetch", (ev) => {
  const pedido = ev.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api/")) return; // nunca guardar dados da API
    ev.respondWith(redePrimeiro(pedido));
    return;
  }
  if (EXTERNOS.includes(url.hostname)) ev.respondWith(cachePrimeiro(pedido));
});
