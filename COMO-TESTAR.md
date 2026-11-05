# Como testar o Fala Currículo

Esta versão já liga o app às duas IAs:

- **Voz:** o app grava com o microfone do navegador (MediaRecorder) e manda o
  áudio para `/api/transcrever`. O servidor repassa à OpenAI
  (modelo `gpt-transcribe`) e devolve o texto. O áudio não é guardado.
  Funciona no Chrome, Edge, Firefox, Safari e Samsung Internet.
- **Texto do currículo:** ao terminar as perguntas, o app manda as respostas
  para `/api/curriculo`. O servidor chama o Claude (`claude-haiku-5-5`),
  confere a resposta campo a campo e devolve o texto melhorado.
  **Nome, idade, telefone, e-mail e LinkedIn nunca vão para a IA.**
- **Voz do app:** as frases que o app fala vêm de `/api/falar`, com a voz
  neural da OpenAI (`gpt-4o-mini-tts`, voz `marin`). Cada frase é gerada uma
  vez e fica em cache. Se o servidor não responder, o app usa a voz do
  navegador. **Atenção:** a OpenAI marcou esse modelo para desligar em
  06/01/2027; depois disso o app passa sozinho para a voz do navegador, ou
  troque `FALA_MODELO` no `.env`.
- **Mudança livre no fim:** na tela "Veja como ficou", o botão "Quero mudar
  algo" deixa a pessoa falar ou escrever o que quer mudar, do jeito dela
  ("o nome completo da empresa é ..."). O servidor (`/api/ajustar`) manda o
  currículo e o pedido ao Claude e confere a resposta (nenhum número novo).
  Nesse pedido o nome vai junto, porque a pessoa pode querer mudá-lo;
  telefone, e-mail e LinkedIn continuam sem ir para a IA.
- **Plano B:** se a IA falhar ou estiver sem chave, o currículo sai com as
  respostas da pessoa (maiúsculas e pontuação arrumadas) e a tela avisa.
  Se a transcrição falhar, o app passa para a digitação.

As chaves ficam **só no servidor** (arquivo `servidor/.env` no computador,
segredos do Worker no Cloudflare). Nunca no código do app, no GitHub ou no chat.

---

## 1. Antes de começar (uma vez só)

1. Instalar o **Node.js 20 ou mais recente** (versão LTS em nodejs.org).
2. **Chave do Claude:** em <https://platform.claude.com>, menu
   **API Keys > Create Key**. A chave começa com `sk-ant-api03-`.
   Em **Billing**, colocar crédito (US$ 5 dá para milhares de currículos) e,
   em **Limits**, definir um limite de gasto mensal.
3. **Chave da OpenAI:** em <https://platform.openai.com/api-keys>,
   **Create new secret key**. Em **Settings > Billing**, adicionar crédito
   (o mínimo, US$ 5, dá para cerca de 1.100 minutos de áudio). **Sem crédito,
   a transcrição devolve erro 429** e o app passa para a digitação.
   Em **Limits**, definir um limite de gasto mensal.

## 2. Rodar no computador

No terminal, dentro da pasta do projeto:

```bash
cd servidor
npm install
copy .env.exemplo .env          (no Mac/Linux: cp .env.exemplo .env)
```

Abrir o arquivo `servidor/.env` num editor de texto e colar as chaves
depois do `=`, sem aspas e sem espaços:

```
IA_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
```

Depois:

```bash
npm start
```

O terminal deve mostrar:

```
Fala Currículo em http://localhost:3002
IA de texto: ligada
Transcrição de voz: ligada
```

Abrir **<http://localhost:3002>** no navegador. Use exatamente `localhost`:
o navegador só libera o microfone em `localhost` ou em `https://`.

Para conferir sem passar pelo app: <http://localhost:3002/api/saude> deve
mostrar `{"ok":true,"ia":true,"voz":true}`.

Para parar o servidor: `Ctrl + C`.

## 3. O que conferir

1. Responder algumas perguntas **falando** e ver se o texto da tela
   "Está certo?" bate com o que foi dito.
2. Responder de forma bem informal (ex.: "eu cortava legume lavava a louça")
   e ver, na tela "Veja como ficou", se o texto virou linguagem de currículo.
   A frase de cima deve dizer "Melhorei o texto das suas respostas".
3. Primeiro emprego ("Nunca trabalhei") até o PDF.
4. Duas experiências de trabalho.
5. Tirar a internet no meio: o app deve avisar e não travar.
6. Apagar a `IA_API_KEY` do `.env`, reiniciar e ver o aviso de que a IA não
   foi usada (o currículo sai mesmo assim).
7. Baixar o PDF e conferir os acentos.
8. **Progresso guardado:** responder umas perguntas, fechar a aba (ou
   apertar Cmd+R) e abrir de novo. Deve aparecer "Quer continuar de onde
   parou?". "Continuar de onde parei" volta na mesma pergunta; "Começar um
   currículo novo" apaga tudo. Depois de pronto o currículo, recarregar
   também deve oferecer voltar direto para ele.
9. **Apagar:** na última tela, "Apagar as minhas respostas deste aparelho"
   limpa tudo; ao recarregar, o app abre na tela inicial.
10. **Privacidade:** depois de "Começar", a tela "Como cuidamos das suas
   informações" aparece e é lida em voz alta.

**Como o progresso é guardado:** no `localStorage` do navegador, só no
aparelho da pessoa. Nada vai para o servidor, então funciona do mesmo jeito
no `localhost` e no Cloudflare, sem banco de dados. Fica guardado por 30
dias. Em aba anônima, o navegador apaga ao fechar a aba.

**Celular:** pelo `localhost` não dá, porque o celular não acessa o
computador por esse endereço e o microfone exige `https`. Para testar no
celular, publicar no Cloudflare (passo 5).

**Custo de um teste completo:** menos de 1 centavo de dólar por currículo
(Claude) e cerca de US$ 0,0045 por minuto de fala (OpenAI).

## 4. Testes automáticos (sem gastar crédito)

```bash
cd servidor
npm test
```

Sobe o servidor com um Claude e uma OpenAI **de mentira** e confere:
o app é entregue, a IA não recebe nome nem telefone, texto com número ou
curso inventado é descartado, o áudio chega à transcrição no formato certo
fala com dados pessoais não fica em cache e o limite de 5 currículos por hora funciona.

## 5. Publicar no Cloudflare (para a banca e para o celular)

O mesmo código roda como um **Cloudflare Worker**: `servidor/worker.js`
responde às rotas `/api/*`, e a pasta `prototipo/` é entregue como site.
Configuração em `servidor/wrangler.jsonc`. O plano gratuito basta.

1. Criar conta em <https://dash.cloudflare.com>.
2. No terminal, dentro de `servidor`:

   ```bash
   npx wrangler login
   npx wrangler secret put IA_API_KEY        (cola a chave do Claude)
   npx wrangler secret put OPENAI_API_KEY    (cola a chave da OpenAI)
   npm run cf:publicar
   ```

   (Na primeira vez, o `secret put` pode perguntar se quer criar o Worker:
   responder que sim.)

3. O terminal mostra o endereço, algo como
   `https://fala-curriculo.<sua-conta>.workers.dev`. Abrir no celular.

**Opcional, antes de publicar:** testar a versão Cloudflare no computador.
Copiar `.dev.vars.exemplo` como `.dev.vars`, colar as chaves e rodar
`npm run cf:local` (abre em <http://localhost:8787>).

### Deixar o site fechado até a apresentação

No painel do Cloudflare: **Workers & Pages > fala-curriculo > Settings >
Domains & Routes**, ativar **Cloudflare Access** no endereço `workers.dev`.
Depois, em **Zero Trust > Access > Applications**, editar a política para
permitir só os e-mails de vocês e da banca. Quem abrir o link recebe um
código por e-mail antes de entrar.

Para abrir ao público depois da banca, basta desligar o Access. Antes
disso, vale baixar o limite de gasto nas duas contas de IA.

---

## Arquivos que mudaram nesta versão

| Arquivo | O que faz |
|---|---|
| `prototipo/app.js` | Gravação com MediaRecorder no lugar do SpeechRecognition; manda o áudio para `/api/transcrever` |
| `prototipo/ia.js` | Monta os dados sem informações pessoais, chama `/api/curriculo` e junta o resultado; plano B local |
| `servidor/server.js` | Express: entrega o app e as rotas, com limite por IP |
| `servidor/worker.js` + `wrangler.jsonc` | Mesmas rotas no Cloudflare Workers |
| `servidor/ia/prompt.js` | Instruções do Claude, formato da resposta (JSON Schema) e limpeza dos dados recebidos |
| `servidor/ia/claude.js` | Chamada ao Claude pela biblioteca oficial `@anthropic-ai/sdk` |
| `servidor/ia/validar.js` | Confere a resposta: sem números, cursos ou palavras inventados |
| `servidor/ia/gerar.js` | Junta tudo, com plano B |
| `servidor/ia/ajustar.js` | Mudança livre no fim ("quero mudar algo") |
| `servidor/ia/entender.js` | Resposta curta com conversa junto ("eu tô procurando vaga de RH", "Giovanna com dois enes"): a IA tira só a informação, e o servidor confere |
| `servidor/voz/transcrever.js` | Repasse do áudio para a OpenAI |
| `servidor/voz/falar.js` | Voz do app (texto para fala da OpenAI), com cache |
| `servidor/limite.js` | Limite de uso por IP (5 currículos e 120 áudios por hora) |
| `servidor/testes/rotas.test.js` | Testes automáticos |
| `servidor/ia/instrucoes.js` | Filtro contra injeção de instruções nas respostas e na saída da IA |
| `servidor/ia/README.md` | Onde estão as instruções do sistema, o JSON Schema, o roteiro e a avaliação |
| `servidor/avaliar.mjs` + `resultados-avaliacao.json` | Avaliação com a API real (`npm run avaliar`), com o resultado usado no artigo |

**Novidades desta atualização:** tela de privacidade antes do microfone;
progresso guardado no aparelho com a tela "Quer continuar de onde parou?";
botão para apagar as respostas; as falas que leem respostas da pessoa
(nome, telefone, e-mail, texto do currículo) são pedidas com `privado=1` e
não ficam em cache no servidor nem no Cloudflare.

**Correções do teste com a Giovanna:** nome, vaga, função, empresa, curso e
escola falados com conversa junto passam por `POST /api/entender` antes da
tela "Está certo?" (só quando a resposta parece ter mais do que o pedido);
o tempo de trabalho vira só "8 anos" mesmo quando a pessoa fala "eu fiquei
oito anos nesse trabalho"; o e-mail falado com vírgula ("Dudu Losco, arroba
gmail ponto com") agora vira `dudulosco@gmail.com`.

**Rodada seguinte:** nome com grafia explicada ("Felipe Figueira Losco. O
Felipe é com PH e dois L's" -> "Phellipe Figueira Losco"), e o servidor
recusa resposta com explicação sobrando ou palavra repetida; botão
"Voltar para a pergunta anterior", que mostra a resposta antiga com o botão
"Está certo, seguir"; botão de pular com texto certo em cada pergunta (idade:
"Prefiro não informar").

**Rodada de 05/11:** a cidade falada é conferida na lista de municípios do
IBGE (`prototipo/municipios.js`): "Salvador, aqui na Bahia" e "Não, é só
Salvador, Bahia" viram "Salvador, Bahia", com a grafia oficial; cidade com
nome repetido em vários estados (ex.: Bom Jesus) continua perguntando o
estado. Na tela "O que você quer mudar?" o currículo atual aparece em cima,
com rolagem e o botão "Ouvir o currículo".

## Atualizar uma versão que já está no computador

Baixe o zip novo e, no Terminal:

```bash
cd ~/Documents
unzip -o ~/Downloads/fala-curriculo-api.zip
cd fala-curriculo-api/servidor
npm install
npm start
```

O `unzip -o` substitui os arquivos do app e mantém o seu `.env` e a pasta
`node_modules`, que não vêm no zip.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Terminal diz "IA de texto: DESLIGADA" | `.env` não está na pasta `servidor`, ou a linha não começa com `IA_API_KEY=` |
| Currículo sai com o aviso "Não consegui melhorar o texto" | Chave do Claude errada (401) ou sem crédito. O terminal mostra `[ia] falha: 401` ou outro código |
| Depois de gravar, vai direto para "Escreva a sua resposta" | OpenAI sem crédito (429) ou sem chave. O terminal mostra `[voz] falha na OpenAI: 429` |
| Microfone bloqueado | Abrir por `http://localhost:3002`, não pelo IP nem pelo arquivo; liberar no cadeado da barra de endereço |
| PowerShell bloqueia o `npm` | Usar `npm.cmd` no lugar de `npm` |
