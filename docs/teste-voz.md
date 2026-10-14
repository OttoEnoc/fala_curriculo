# Teste de sotaque e barulho (tarefa 3.6)

> Situação: **protocolo pronto, teste ainda não realizado.**
> Os resultados dependem de gravações com pessoas reais e não foram inventados.
> Usar apenas respostas fictícias (nomes, telefones e empresas inventados).

## Objetivo

Medir quantas respostas faladas o app entende corretamente com diferentes
sotaques e níveis de barulho, nos dois caminhos de voz:

- **Navegador ao vivo** (Chrome/Edge, reconhecimento do navegador).
- **Gravação + servidor** (Safari ou navegador sem reconhecimento, `POST /api/transcrever`).

## Participantes e situações

- Sotaques: pelo menos 4 regiões (por exemplo: Nordeste, Sudeste/paulista,
  Sul, Norte ou Centro-Oeste). Preferir participantes do público-alvo.
- Barulho:
  1. Silêncio (quarto fechado).
  2. Barulho de casa (TV ou rádio ligado a cerca de 2 metros).
  3. Barulho de rua (ônibus, calçada movimentada, ou gravação de rua tocando).
- Aparelhos: um Android simples e um iPhone, falando a cerca de 20 cm.

## Roteiro de frases (dados fictícios)

1. Nome: "Maria Aparecida dos Santos".
2. Cidade e estado: "Feira de Santana", "Bahia".
3. Telefone: "setenta e cinco, nove nove oito sete seis, cinco quatro três dois".
4. Tempo de trabalho: "dois anos e meio".
5. Atividades: "eu atendia os clientes, arrumava as prateleiras e fechava o caixa".
6. E-mail falado: "maria ponto santos arroba exemplo ponto com".

## Como medir

Para cada frase, registrar:

- **Acerto total**: o texto entendido pode ser usado sem correção.
- **Acerto parcial**: precisou corrigir até 2 palavras na tela "Está certo?".
- **Erro**: precisou falar de novo ou escrever.
- Taxa de erro de palavras (WER), quando possível:
  (substituições + omissões + inserções) ÷ número de palavras da frase.

## Tabela de resultados

| Sotaque | Barulho | Caminho | Aparelho | Acerto total | Parcial | Erro | WER médio | Observações |
|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | Pendente: aplicar o protocolo |

## O que fazer com os resultados

- Frases com muitos erros (por exemplo, e-mail e telefone falados) devem
  continuar levando à digitação, como o app já faz.
- Se o caminho de gravação tiver acerto bem maior que o do navegador,
  considerar usá-lo também no Chrome.
- Registrar a análise na documentação do TCC (tarefa 9.5).
