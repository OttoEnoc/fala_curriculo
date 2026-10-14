# Resultados dos testes (tarefa 9.5)

> **Situação: parcial.** Este capítulo registra só os testes que foram
> realmente executados. A planilha liga esta tarefa à 8.4, que ainda não
> existe na planilha; os testes com pessoas, com sotaques (3.6) e em
> celulares reais ainda **não foram feitos** e estão listados como pendentes.
> Nenhum número de uso real foi inventado.

## 1. Testes automáticos do servidor

Executados com `npm test` (Node.js 22, `node --test`) em 14/10/2026.
Todos usam dados fictícios. Resultado: **27 de 27 passaram**.

| Grupo | O que confere | Testes | Resultado |
|---|---|---|---|
| Rotas e formato | `/api/saude`; recusa de formato errado, grupo ausente e JSON quebrado | 2 | Passou |
| Geração | Sem IA devolve currículo básico com aviso; primeiro emprego sem experiência; IA devolve JSON; falha e lentidão da IA (tempo limite) mantêm o básico | 5 | Passou |
| Instruções da IA | Regras ficam no servidor; nome, telefone e e-mail não vão para a IA | 1 | Passou |
| Anti-invenção | Reescrita fiel aceita; estrutura errada descartada; número, empresa, idioma e carteira inventados descartados; número informado aceito; campo vazio continua vazio; campo descartado volta ao original; dados factuais nunca vêm da IA | 9 | Passou |
| Limite de uso | 429 com aviso e `Retry-After` depois do limite; saúde fora do limite | 2 | Passou |
| Privacidade | Nenhum dado pessoal no console em falha da IA, envio grande e JSON quebrado; erro não devolve o conteúdo enviado | 2 | Passou |
| Transcrição | Áudio volta como texto (provedor simulado); 503 sem serviço; recusa sem áudio; falha vira mensagem simples; pedido à OpenAI montado corretamente | 5 | Passou |
| App e CORS | Servidor entrega o app; aceita origem local e recusa origem desconhecida | 1 | Passou |

## 2. Testes do app no navegador (automatizados com Playwright)

Executados no Chromium (sem interface), com o servidor local e o provedor de
IA simulado. Respostas digitadas com dados fictícios.

| Cenário | Resultado observado |
|---|---|
| Fluxo completo com experiência | Chega ao currículo pronto; texto melhorado pelo servidor |
| Fluxo completo de primeiro emprego | Chega ao currículo pronto com "Em busca do primeiro emprego" |
| Servidor desligado | Currículo montado no aparelho com aviso "Não consegui falar com o servidor" |
| Servidor sem IA | Currículo básico com aviso "O texto não foi melhorado agora" |
| Recarregar a página no meio | Respostas continuam no IndexedDB |
| Retomar | Volta à mesma pergunta do 2º trabalho |
| Começar de novo | Dados apagados |
| Baixar o PDF | Arquivo `curriculo-maria-de-souza.pdf`; dados apagados do aparelho |
| Botão de apagar | Volta ao início com confirmação escrita; IndexedDB vazio |
| Consentimento | "Não aceito" não avança e não guarda nada; tentativa de pular a tela volta para ela |
| Navegador sem reconhecimento de voz | Grava áudio (`audio/webm;codecs=opus`), envia ao servidor e mostra "Está certo?" |
| Reconhecimento ao vivo | Texto parcial aparece enquanto fala ("em São" → "em São Paulo") |
| Falha do serviço de voz do navegador | Troca para gravação e transcrição pelo servidor |
| WhatsApp com compartilhamento | PDF anexado (`application/pdf`) |
| WhatsApp sem compartilhamento | Baixa o PDF e abre o WhatsApp com instruções |
| Desistir de compartilhar | Nada mais acontece |
| PDF com 1 e 7 trabalhos e de primeiro emprego | Sempre 1 página A4 |
| Impressão pelo navegador | 1 página A4, só o currículo |
| Sem internet (modo avião simulado) | App abre pelo service worker, fluxo respondido por escrito e PDF baixado |
| Manifesto do app | Sem erros de instalação no Chromium |

## 3. Acentos no PDF

Ver `docs/teste-pdf-acentos.md`: todos os acentos do português aparecem
corretamente; emoji e caracteres fora da fonte são removidos ou trocados.

## 4. Pendentes

| Teste | Tarefa | O que falta |
|---|---|---|
| Testes com pessoas do público-alvo (tempo para concluir, erros, satisfação) | 8.x / 8.4 | Planejar e aplicar |
| Sotaque e barulho | 3.6 | Aplicar o protocolo de `docs/teste-voz.md` |
| Voz neural | 3.5 | Gravar e avaliar amostras |
| Celulares reais (Android e iPhone) | 3.3, 3.4, 5.4, 7.2 | Gravação no Safari, WhatsApp com PDF, instalação |
| Serviço de IA real | 2.3, 2.4 | Rodar com chave real e conferir descartes em respostas reais |
| Transcrição real | 3.2 | Enviar áudio real com chave válida |
| Publicação | 7.1, 7.4 | Publicar no Render e conferir HTTPS e deploy automático |

## 5. Discussão (preliminar)

- A camada de validação anti-invenção mostrou-se necessária: nos testes, um
  único número ou nome novo já é suficiente para o campo voltar ao texto
  original, o que é conservador. Com a IA real, é preciso medir quantos
  campos são descartados sem necessidade.
- O fluxo continua possível em todas as falhas testadas (sem servidor, sem
  IA, sem internet, sem reconhecimento de voz), sempre com aviso em texto e voz.
- As métricas de usabilidade com pessoas reais ainda precisam ser coletadas
  para concluir este capítulo.
