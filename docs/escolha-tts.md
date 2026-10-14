# Avaliação de voz neural (tarefa 3.5)

> Situação: **análise e proposta** escrita por Otto. A decisão depende de
> ouvir as amostras (ver "Como gravar as amostras") e da concordância da dupla.
> Preços são referências públicas e precisam ser conferidos.

## Situação atual

O app lê as telas com a voz do próprio aparelho (`speechSynthesis`), escolhendo
uma voz `pt-BR` quando existe. Vantagens: grátis, funciona sem internet e o
texto não sai do aparelho. Desvantagens: a qualidade varia muito entre
aparelhos (Android barato, iPhone, Windows) e algumas vozes soam robóticas.

## Opções comparadas

| Opção | Qualidade em pt-BR | Custo de referência | Funciona sem internet | Privacidade |
|---|---|---|---|---|
| Voz nativa do aparelho (atual) | Varia: boa no iPhone e no Chrome com vozes Google; fraca em alguns Android | Grátis | Sim (vozes instaladas) | Texto não sai do aparelho |
| Google Cloud Text-to-Speech (Neural2 / WaveNet) | Muito boa | cerca de US$ 16 por 1 milhão de caracteres (há cota gratuita mensal) | Não | Texto vai ao Google |
| Azure AI Speech (vozes neurais pt-BR, ex.: Francisca, Antonio) | Muito boa | cerca de US$ 15 a 16 por 1 milhão de caracteres (há cota gratuita mensal) | Não | Texto vai à Microsoft |
| OpenAI TTS | Boa, sotaque às vezes não brasileiro | cerca de US$ 15 por 1 milhão de caracteres | Não | Texto vai à OpenAI |

## Estimativa de uso

Um fluxo completo fala cerca de 6.000 a 9.000 caracteres (perguntas, ajudas,
confirmações e leitura do currículo). Com voz neural, isso daria por volta de
US$ 0,10 a 0,15 por currículo, mais o tempo de espera de rede em cada fala.
As respostas lidas de volta ("Está certo? Eu entendi assim: ...") incluiriam
dados pessoais enviados a mais um serviço.

## Proposta

1. **Manter a voz nativa como padrão**, porque é grátis, imediata, funciona
   sem internet (tarefa 7.3) e não envia dados pessoais.
2. Melhorar a escolha da voz nativa: preferir vozes `pt-BR` marcadas como
   naturais ou do Google/Apple quando existirem.
3. Considerar voz neural **só para os textos fixos** (perguntas e ajudas, que
   não têm dados pessoais), gerados uma vez e guardados como arquivos de áudio.
   Isso tem custo único e baixo e não exige chamada a cada uso.
4. Decidir depois de ouvir as amostras abaixo.

## Como gravar as amostras

Gravar a mesma frase em cada opção e em pelo menos três aparelhos
(um Android simples, um iPhone e um computador):

> "Qual era a sua função nesse trabalho? É o nome do serviço que você fazia.
> Por exemplo: ajudante de pedreiro."

Registrar para cada amostra: aparelho, opção, nota de 1 a 5 para clareza e
naturalidade (dada por pelo menos três pessoas do público-alvo) e comentários.

| Aparelho | Opção | Clareza (1–5) | Naturalidade (1–5) | Comentário |
|---|---|---|---|---|
| — | — | — | — | Pendente: gravar amostras |
