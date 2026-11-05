// Junta tudo: limpa os dados, chama o Claude, valida e tem plano B.
// Funciona igual no Express (server.js) e no Cloudflare Worker (worker.js).
import { limparDados } from "./prompt.js";
import { criarClaude, pedirAoClaude } from "./claude.js";
import { validarResposta } from "./validar.js";

const AVISO = "Não consegui melhorar o texto agora. Montei o currículo com as suas respostas.";

export async function gerarCurriculo(corpo, env) {
  const dados = limparDados(corpo && corpo.dados);
  if (!dados) {
    return { status: 400, json: { ok: false, erro: 'O campo "dados" está ausente ou incompleto.' } };
  }

  const claude = criarClaude(env);
  if (!claude) {
    return { status: 200, json: { ok: true, origem: "basico", motivo: "A IA não está ligada no servidor. Montei o currículo com as suas respostas.", cv: {} } };
  }

  try {
    const r = await pedirAoClaude(claude, dados);
    return { status: 200, json: { ok: true, origem: "ia", cv: validarResposta(dados, r) } };
  } catch (e) {
    // No registro, só o tipo do problema. Nunca as respostas da pessoa.
    console.warn("[ia] falha:", e.codigo || e.status || e.name || "erro");
    return { status: 200, json: { ok: true, origem: "basico", motivo: AVISO, cv: {} } };
  }
}
