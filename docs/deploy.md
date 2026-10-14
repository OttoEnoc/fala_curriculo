# Publicação com HTTPS (tarefas 7.1 e 7.4)

> Situação: configuração pronta no repositório (`render.yaml`).
> **Ainda não publicado**: falta criar a conta no Render, ligar o repositório,
> cadastrar as chaves e registrar o domínio próprio.

## Por que HTTPS é obrigatório

O navegador só libera microfone, service worker (uso sem internet), instalação
como app e compartilhamento do PDF no WhatsApp em endereços `https://`.

## Por que o Render

- Roda o servidor Node.js e entrega o app pelo mesmo endereço, sem configurar
  CORS em produção.
- HTTPS automático, inclusive com domínio próprio.
- Publica sozinho a cada merge na `main` (tarefa 7.4).
- Plano gratuito suficiente para o projeto (o serviço "dorme" sem uso e
  demora alguns segundos para acordar; o app já trata a espera com tempo limite).

A Vercel é ótima para páginas estáticas, mas exigiria adaptar o Express para
funções serverless; por isso ficou como alternativa.

## Passo a passo

1. Criar conta em https://render.com entrando com o GitHub.
2. Em **New → Blueprint**, escolher o repositório `fala_curriculo`.
   O Render lê o `render.yaml` e cria o serviço `fala-curriculo`.
3. Preencher as variáveis marcadas como secretas:
   - `IA_PROVEDOR` (`anthropic`, ou `nenhum` para publicar sem IA) e `IA_API_KEY`.
   - `TRANSCRICAO_PROVEDOR` (`openai` ou `nenhum`) e `TRANSCRICAO_API_KEY`.
4. Aguardar o primeiro deploy e abrir `https://fala-curriculo.onrender.com`
   (o nome final aparece no painel).
5. Conferir: `https://.../api/saude` responde `{"ok":true}` e
   `https://.../api/recursos` mostra o que está ligado.
6. Domínio próprio: em **Settings → Custom Domains**, adicionar o domínio e
   criar no registro de DNS o `CNAME` indicado pelo Render. O certificado HTTPS
   é emitido automaticamente.
7. Testar no celular: microfone, instalação na tela inicial, modo avião e envio
   do PDF pelo WhatsApp.

## Publicação automática (7.4)

- O `render.yaml` publica a cada commit na `main` depois que as verificações do
  GitHub passam (`autoDeployTrigger: checksPass`).
- A verificação é o workflow `.github/workflows/testes.yml`, que roda
  `npm test` do servidor em cada pull request e em cada push na `main`.
- Se os testes falharem, nada é publicado.

## Variáveis de ambiente em produção

| Variável | Valor | Observação |
|---|---|---|
| `NODE_ENV` | `production` | Desliga o acesso de outras portas locais (CORS de desenvolvimento) |
| `HOST` | `0.0.0.0` | Necessário para o Render alcançar o servidor |
| `CONFIAR_PROXY` | `1` | O limite de uso passa a ver o IP real de quem acessa |
| `PORT` | definido pelo Render | O servidor já lê `PORT` |
| `IA_*`, `TRANSCRICAO_*` | secretos | Nunca no Git |
