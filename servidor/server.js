"use strict";

const express = require("express");

const app = express();
const PORTA = 3001;

app.disable("x-powered-by");

app.get("/api/saude", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORTA, "127.0.0.1", () => {
  console.log(
    `Servidor disponível em http://localhost:${PORTA}/api/saude`
  );
});