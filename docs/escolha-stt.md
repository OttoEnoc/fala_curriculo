# Escolha do serviço de transcrição (tarefa 3.1)

> Situação: **recomendação** escrita por Otto. A escolha final é da dupla.
> Os preços abaixo são valores de referência das páginas públicas dos
> provedores e **precisam ser conferidos** antes da decisão, porque mudam.

## Onde a transcrição do servidor entra

O app já usa o reconhecimento de voz do navegador quando ele existe
(Chrome e Edge, com texto aparecendo ao vivo). O serviço escolhido aqui só é
usado quando o navegador não oferece reconhecimento ou ele falha: o app grava
o áudio (MediaRecorder) e envia para `POST /api/transcrever` (tarefas 3.2 a 3.4).

Por isso, o uso esperado é **gravar um trecho curto e transcrever de uma vez**
(respostas de 5 a 30 segundos), sem precisar de transmissão contínua.

## Critérios

1. Qualidade em português do Brasil, com sotaques regionais e fala informal.
2. Custo por minuto de áudio.
3. Facilidade de integração (um pedido HTTP com o arquivo de áudio).
4. Privacidade: retenção dos áudios e uso para treinamento.
5. Formatos aceitos (o Safari grava `audio/mp4`; o Chrome, `audio/webm`).

## Comparação

| Critério | OpenAI (Whisper / gpt-4o-mini-transcribe) | Google Cloud Speech-to-Text | Azure AI Speech |
|---|---|---|---|
| Português do Brasil | Bom com sotaques e ruído; modelo multilíngue treinado com muito áudio real | Bom; modelos específicos para pt-BR | Bom; modelos específicos para pt-BR |
| Custo de referência | cerca de US$ 0,003 a 0,006 por minuto | cerca de US$ 0,016 por minuto (há cota gratuita mensal) | cerca de US$ 1 por hora de áudio (≈ US$ 0,017/min; há cota gratuita mensal) |
| Integração | Um `POST` multipart com o arquivo | Precisa de conta GCP, projeto e credencial de serviço | Precisa de recurso Azure, região e chave |
| Formatos | webm, mp4, m4a, mp3, wav e outros | Alguns formatos exigem conversão | Alguns formatos exigem conversão |
| Transmissão ao vivo | Não é necessária para o nosso uso | Sim | Sim |
| Privacidade (API) | Dados da API não usados para treino por padrão; retenção limitada | Configurável; não usado para treino sem consentimento | Áudio não retido por padrão na transcrição em tempo real |

## Recomendação

**OpenAI, com o modelo `whisper-1` (ou `gpt-4o-mini-transcribe`).**

Motivos:

- Menor custo por minuto entre os três, importante para um projeto sem verba.
- Aceita diretamente os formatos gravados pelo Chrome e pelo Safari, sem
  conversão no servidor.
- Integração mais simples: uma chamada HTTP, sem SDK nem credencial de serviço.
- Boa tolerância a sotaques e barulho, que é o cenário do nosso público.

Pontos de atenção:

- Google e Azure fazem transmissão ao vivo, mas o app já cobre isso com o
  reconhecimento do navegador.
- A integração foi feita de forma substituível (`servidor/transcricao/`):
  trocar de serviço é criar outro arquivo de provedor.
- A qualidade real com o nosso público precisa ser medida na tarefa 3.6.

## Configuração

```
TRANSCRICAO_PROVEDOR=openai
TRANSCRICAO_API_KEY=   # chave real só no .env do servidor
TRANSCRICAO_MODELO=whisper-1
```
