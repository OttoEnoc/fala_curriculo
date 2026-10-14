"use strict";

/*
  Limite de uso por aparelho.
  O aparelho é identificado pelo endereço IP da conexão, guardado só em
  memória e apenas pelo tempo da janela. Nenhuma resposta é guardada.

  Observação: aparelhos na mesma rede (por exemplo, um wi-fi público)
  podem compartilhar o mesmo IP e, portanto, o mesmo limite.
*/

function criarLimitador(opcoes) {
  const maximo = opcoes.maximo;
  const janelaMs = opcoes.janelaMs;
  const mensagem = opcoes.mensagem;
  const usos = new Map();

  // Limpa periodicamente os registros que já saíram da janela.
  const limpeza = setInterval(() => {
    const agora = Date.now();
    for (const [chave, horarios] of usos) {
      const validos = horarios.filter((h) => agora - h < janelaMs);
      if (validos.length) usos.set(chave, validos);
      else usos.delete(chave);
    }
  }, Math.min(janelaMs, 10 * 60 * 1000));
  limpeza.unref();

  return function limitar(req, res, next) {
    const chave = req.ip || "desconhecido";
    const agora = Date.now();
    const horarios = (usos.get(chave) || []).filter((h) => agora - h < janelaMs);

    if (horarios.length >= maximo) {
      const esperaSeg = Math.ceil((janelaMs - (agora - horarios[0])) / 1000);
      res.set("Retry-After", String(esperaSeg));
      return res.status(429).json({
        ok: false,
        codigo: "limite",
        erro: mensagem,
        tenteNovamenteEmSegundos: esperaSeg
      });
    }

    horarios.push(agora);
    usos.set(chave, horarios);
    return next();
  };
}

module.exports = { criarLimitador };
