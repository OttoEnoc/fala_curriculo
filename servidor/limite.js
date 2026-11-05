// Limite simples de uso por IP, guardado na memória.
// No Express vale para o servidor inteiro. No Cloudflare vale por instância
// (é aproximado); o acesso já fica fechado pelo Cloudflare Access.

export function criarLimite(maximo, janelaMs) {
  const contas = new Map();
  return function permitir(chave) {
    const agora = Date.now();
    const c = contas.get(chave);
    if (!c || agora - c.inicio > janelaMs) {
      contas.set(chave, { inicio: agora, n: 1 });
      if (contas.size > 5000) {
        for (const [k, v] of contas) if (agora - v.inicio > janelaMs) contas.delete(k);
      }
      return true;
    }
    c.n += 1;
    return c.n <= maximo;
  };
}

const HORA = 60 * 60 * 1000;
export function limitesPadrao(env) {
  return {
    curriculo: criarLimite(Number(env.LIMITE_CURRICULOS_POR_HORA) || 5, HORA),
    transcricao: criarLimite(Number(env.LIMITE_AUDIOS_POR_HORA) || 120, HORA),
    ajuste: criarLimite(Number(env.LIMITE_AJUSTES_POR_HORA) || 20, HORA),
    entender: criarLimite(Number(env.LIMITE_ENTENDER_POR_HORA) || 200, HORA),
    fala: criarLimite(Number(env.LIMITE_FALAS_POR_HORA) || 400, HORA)
  };
}
