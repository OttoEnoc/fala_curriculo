# Arquitetura técnica (tarefa 9.4)

> Como app, servidor, IA e transcrição se conectam. Rascunho para revisão.

## Visão geral

```mermaid
flowchart LR
  subgraph APARELHO [Aparelho da pessoa — navegador]
    UI[App web<br/>index.html · app.js · roteiro.js]
    SR[Reconhecimento de voz<br/>do navegador]
    TTS[Voz do aparelho<br/>speechSynthesis]
    REC[Gravador<br/>MediaRecorder]
    IDB[(IndexedDB<br/>progresso · até 7 dias)]
    SW[Service worker<br/>cópia do app para uso sem internet]
    PDF[jsPDF<br/>gera o PDF no aparelho]
  end

  subgraph SERVIDOR [Servidor Node.js + Express — HTTPS]
    API1[POST /api/curriculo]
    API2[POST /api/transcrever]
    API3[GET /api/saude · /api/recursos]
    LIM[Limite de uso<br/>por IP, em memória]
    MONT[Montagem do currículo<br/>curriculo/montar.js]
    PROMPT[Instruções da IA<br/>ia/prompt.js]
    VAL[Validação anti-invenção<br/>ia/validar.js]
  end

  IA[(Serviço de IA<br/>substituível — ex.: Anthropic)]
  STT[(Serviço de transcrição<br/>substituível — ex.: OpenAI Whisper)]
  GSR[(Serviço de voz do navegador<br/>ex.: Google no Chrome)]

  UI <--> IDB
  UI --> TTS
  UI --> SR --> GSR
  UI --> REC
  UI --> PDF
  SW -. entrega arquivos .-> UI
  UI -- respostas JSON --> API1
  REC -- áudio --> API2
  UI --> API3
  API1 --> LIM --> MONT --> PROMPT --> IA
  IA --> VAL --> API1
  API2 --> LIM
  API2 --> STT
```

## Componentes

### App (pasta `prototipo`)

- JavaScript sem framework, para carregar rápido em celulares simples.
- `roteiro.js`: seções, perguntas, opções, obrigatoriedade e condições.
- `app.js`: navegação, estado, validações, voz, revisão, PDF e envio.
- `armazenamento.js`: grava o progresso no IndexedDB do aparelho.
- `sw.js`: guarda os arquivos do app para uso sem internet.
- `manifest.webmanifest`: permite instalar como app.

### Servidor (pasta `servidor`)

- Node.js 22 e Express 5, com `server.js` criando o app e as rotas.
- Entrega também a pasta `prototipo`, então app e API ficam no mesmo endereço.
- Não guarda dados: tudo fica só na memória durante o pedido.
- Logs só com o tipo do erro.

### Integrações substituíveis

| Integração | Pasta | Contrato | Implementações |
|---|---|---|---|
| IA | `servidor/ia/provedores/` | `gerar(pedido) → {titulo, resumo, experiencia[]}` | `anthropic`, `simulado`, `nenhum` |
| Transcrição | `servidor/transcricao/` | `transcrever(audio, tipo, sinal) → texto` | `openai`, `simulado`, `nenhum` |

Trocar de serviço é criar um arquivo novo com o mesmo contrato e mudar a
variável de ambiente (`IA_PROVEDOR` ou `TRANSCRICAO_PROVEDOR`).

## Sequência: gerar o currículo

```mermaid
sequenceDiagram
  participant P as Pessoa
  participant A as App
  participant S as Servidor
  participant I as Serviço de IA
  P->>A: "Sim, está certo"
  A->>S: POST /api/curriculo {respostas, portas}
  S->>S: limite de uso (10/h)
  S->>S: valida formato (400 se errado)
  S->>S: monta currículo básico
  alt IA ligada
    S->>I: regras + <dados> (sem nome, idade e contatos)
    I-->>S: JSON {titulo, resumo, experiencia}
    S->>S: confere estrutura e descarta o que foi inventado
    S-->>A: {origem: "ia", curriculo}
  else IA desligada, lenta (20 s) ou com erro
    S-->>A: {origem: "basico", aviso, curriculo}
  end
  alt servidor fora do ar, sem internet ou 25 s
    A->>A: monta currículo básico no aparelho
  end
  A->>P: prévia + aviso (se houver) + leitura em voz alta
  P->>A: WhatsApp / imprimir / baixar
  A->>A: gera PDF (jsPDF) e apaga os dados do aparelho
```

## Sequência: responder por voz

```mermaid
sequenceDiagram
  participant P as Pessoa
  participant A as App
  participant N as Navegador
  participant S as Servidor
  participant T as Transcrição
  P->>A: "Falar a resposta"
  alt navegador reconhece fala
    A->>N: SpeechRecognition (pt-BR)
    N-->>A: texto parcial ao vivo
  else não reconhece ou o serviço falhou
    A->>N: MediaRecorder (webm ou mp4)
    P->>A: "Parar de gravar"
    A->>S: POST /api/transcrever (áudio)
    S->>T: áudio
    T-->>S: texto
    S-->>A: {texto}
  end
  A->>P: "Está certo? Eu entendi assim: ..."
```

## Segurança

| Ameaça | Proteção |
|---|---|
| Vazamento de chave de API | Chaves só em `.env` no servidor; `.env` no `.gitignore` |
| Resposta tentando mandar na IA ("ignore as regras") | Regras no `system`, respostas num bloco `<dados>` declarado como informação; validação posterior |
| IA inventando dados | `ia/validar.js` volta ao texto original quando aparecem números, nomes, idiomas ou carteira novos |
| Abuso da API | Limite por IP e tamanho máximo do pedido (50 KB JSON, 8 MB áudio) |
| Dados pessoais em logs | Logs só com o tipo do erro; teste automático confere |
| Outro site chamando a API | CORS fechado em produção |

## Tecnologias

| Camada | Tecnologia | Motivo |
|---|---|---|
| App | HTML, CSS e JavaScript sem framework | Leve e simples de manter |
| PDF | jsPDF 2.5.1 | Gera o PDF no aparelho, inclusive sem internet |
| Voz | Web Speech API, MediaRecorder | Recursos nativos do navegador |
| Armazenamento local | IndexedDB | Guarda objetos maiores que o localStorage, sem servidor |
| Servidor | Node.js 22, Express 5 | Mesma linguagem do app |
| IA | SDK oficial da Anthropic (substituível) | Resposta estruturada em JSON |
| Transcrição | API da OpenAI via `fetch` (substituível) | Custo e formatos (ver `docs/escolha-stt.md`) |
| Testes | `node --test` | Sem dependência extra |
| Hospedagem | Render (ver `docs/deploy.md`) | HTTPS e publicação automática |
