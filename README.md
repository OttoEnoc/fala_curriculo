# Fala Currículo

**Sistema de Apoio Para Geração de Currículos Utilizando Inteligência Artificial.** Trabalho de Conclusão de Curso em Ciência da Computação, Universidade Presbiteriana Mackenzie (FCI), 2º semestre de 2026. Autores: Eduardo Figueira Losco e Otto Enoc. Orientador: Me. Luiz Carlos Machi Lozano.

O Fala Currículo é um app web que monta um currículo em PDF a partir de uma conversa por voz. Ele é feito para quem tem pouca familiaridade com tecnologia, tem dificuldade de leitura ou nunca fez um currículo. O app faz uma pergunta por vez e lê cada uma em voz alta. A pessoa responde falando ou escrevendo, confere o que o app entendeu, e a IA reescreve as respostas em linguagem profissional sem inventar informação. No fim, a pessoa revisa o currículo e pode enviá-lo pelo WhatsApp, imprimir ou guardar o PDF.

## App publicado

<https://fala-curriculo.dudulosco.workers.dev>

O endereço está protegido pelo **Cloudflare Access**. Só entram e-mails `@mackenzista.com.br` e `@mackenzie.br`. Para entrar, digite o e-mail, receba o código de 6 dígitos (*One-time PIN*) e cole o código na página.

Foi testado com as APIs reais no Mac (Safari e Chrome), no iPhone 16 Pro Max e no iPhone 12 (Safari).

## Como funciona

| Etapa | Tecnologia | Onde está |
|---|---|---|
| Telas, roteiro de perguntas, voz e PDF | HTML, CSS e JavaScript puro, com jsPDF | `prototipo/` (roteiro em `prototipo/roteiro.js`) |
| Voz da pessoa para texto | OpenAI `gpt-transcribe` | `servidor/voz/transcrever.js`, rota `POST /api/transcrever` |
| Voz do app | OpenAI `gpt-4o-mini-tts`, com a voz do navegador como alternativa | `servidor/voz/falar.js`, rota `GET /api/falar` |
| Texto profissional do currículo | Claude Haiku 5.5 (Anthropic), com saída em JSON Schema | `servidor/ia/`, rota `POST /api/curriculo` |
| Resposta curta com conversa junto | Claude Haiku 5.5 | rota `POST /api/entender` |
| Mudança livre no fim ("quero mudar algo") | Claude Haiku 5.5 | rota `POST /api/ajustar` |

Toda resposta da IA é conferida no servidor antes de chegar à pessoa. A conferência recusa número novo, nome que a pessoa não disse e texto com cara de instrução. Telefone, e-mail e LinkedIn nunca vão para a IA de texto. As chaves de API ficam só no servidor. As respostas ficam guardadas só no aparelho da pessoa (`localStorage`), e o servidor não grava respostas nem áudio.

**Instruções do sistema (`REGRAS`) e formato da resposta (`ESQUEMA`):** estão em `servidor/ia/prompt.js`. O guia da pasta da IA, com todos os arquivos citados no artigo, é o [`servidor/ia/README.md`](servidor/ia/README.md).

## Estrutura

```
prototipo/          app (index.html, estilos.css, roteiro.js, app.js, ia.js, municipios.js)
servidor/
  server.js         servidor Express, para rodar no computador
  worker.js         a mesma coisa como Cloudflare Worker (wrangler.jsonc)
  ia/               prompts, JSON Schema, conferência e filtro contra injeção
  voz/              transcrição e voz do app (OpenAI)
  limite.js         limite de uso por IP e por hora
  testes/           testes automáticos das rotas
  avaliar.mjs       avaliação com a API real (25 pessoas fictícias + 3 injeções)
  resultados-avaliacao.json   resultado da avaliação (só dados fictícios)
docs/               modelo do currículo em PDF e manual de integração
COMO-TESTAR.md      passo a passo completo de teste e publicação
```

## Rodar no computador

Pré-requisitos: **Node.js 20 ou mais recente** (testado no 24), uma chave da Anthropic e uma da OpenAI.

```bash
cd servidor
npm install
cp .env.exemplo .env        # no Windows: copy .env.exemplo .env
# abra o .env e cole IA_API_KEY e OPENAI_API_KEY
npm start
```

Abra <http://localhost:3002>. No Windows, se o PowerShell bloquear o `npm`, use `npm.cmd`.

## Testes e avaliação

Os comandos rodam dentro de `servidor/`:

- `npm test` roda 15 testes das rotas, com o Claude e a OpenAI simulados. Não gasta crédito.
- `npm run avaliar` repete a avaliação do artigo com a API real (precisa do `.env`) e grava `resultados-avaliacao.json`.

## Publicar no Cloudflare

```bash
cd servidor
npx wrangler login
npx wrangler secret put IA_API_KEY
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

O passo a passo do Cloudflare Access está no [`COMO-TESTAR.md`](COMO-TESTAR.md).

## Limitações conhecidas

- No primeiro teste no iPhone (06/11/2026), a voz caía em "não entendi" e o WhatsApp recebia só um texto, sem o PDF. As duas falhas foram corrigidas: no iPhone o app passou a gravar em WAV, e o WhatsApp passou a receber o arquivo PDF pela tela de compartilhar do sistema. Um site não consegue abrir o WhatsApp já com o anexo, então a pessoa escolhe o WhatsApp nessa tela.
- O modelo de voz `gpt-4o-mini-tts` tem desligamento anunciado pela OpenAI para 06/01/2027. Depois disso, o app usa a voz do navegador.

## Fluxo de trabalho da dupla

### Organização das tarefas

- A branch `main` deve manter a versão funcional do projeto.
- Cada tarefa deve ser desenvolvida em uma branch própria.
- As branches devem ser criadas a partir da `main` atualizada.
- Otto e Eduardo podem executar qualquer tarefa da planilha.
- Antes de começar, a dupla deve combinar quem está trabalhando em cada tarefa.

### Nomes das branches

Usamos os nomes definidos na planilha. Exemplos:

- `docs/fluxo-git`: documentar as regras de colaboração.
- `front/separar-arquivos`: separar HTML, CSS e JavaScript.
- `front/roteiro`: separar o roteiro de perguntas.
- `docs/requisitos`: documentar os requisitos do sistema.
- `back/estrutura`: criar a estrutura inicial do servidor.

### Envio e revisão

1. Atualizar a `main` antes de criar uma branch.
2. Criar a branch da tarefa.
3. Fazer as alterações e verificar o funcionamento afetado.
4. Criar commits com mensagens que expliquem as alterações.
5. Publicar a branch e enviar os commits ao GitHub.
6. Abrir um pull request com destino à `main`.
7. Solicitar a revisão do parceiro.
8. Corrigir os pontos apontados, quando necessário.
9. Integrar o pull request após a aprovação.
10. Atualizar a `main` local antes de iniciar outra tarefa.

### Cuidados

- Não enviar chaves de API, senhas ou arquivos `.env` ao GitHub.
- Usar dados fictícios nos testes.
- Evitar alterações sem relação com a tarefa da branch.
