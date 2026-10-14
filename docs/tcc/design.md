# Justificativas de design (tarefa 9.3)

> Cada escolha com o motivo e uma referência. Rascunho para revisão dos dois.

## Fonte

**Escolha:** Atkinson Hyperlegible, com tamanho base de 18 a 21 px.

**Motivo:** foi desenhada pelo Braille Institute para pessoas com baixa visão,
com letras fáceis de diferenciar (por exemplo, `I`, `l` e `1`; `O` e `0`).
Nosso público inclui pessoas mais velhas e com pouca prática de leitura.

**Referências:** Braille Institute, *Atkinson Hyperlegible Font* (2019);
WCAG 2.2, critério 1.4.4 (redimensionar texto).

## Botões

**Escolha:** botões com no mínimo 70 px de altura, largura total no celular,
ícone e texto juntos ("Falar a resposta", "Escrever a resposta") e cores
diferentes por função: vermelho para gravar/parar, verde para confirmar,
azul para avançar, claro para alternativas.

**Motivo:** alvos grandes reduzem toques errados de quem tem pouca
coordenação fina ou usa o celular com uma mão. O texto sempre acompanha o
ícone e a cor, então a função não depende só da cor.

**Referências:** WCAG 2.2, critérios 2.5.8 (tamanho mínimo do alvo, 24 px;
usamos quase o triplo) e 1.4.1 (uso da cor).

## Contraste

Medido com a fórmula da WCAG:

| Par de cores | Contraste | Mínimo AA |
|---|---|---|
| Texto principal sobre branco | 15,9 : 1 | 4,5 : 1 |
| Texto secundário sobre branco | 6,1 : 1 | 4,5 : 1 |
| Texto secundário sobre o fundo areia | 5,6 : 1 | 4,5 : 1 |
| Branco sobre azul (botão) | 9,6 : 1 | 4,5 : 1 |
| Branco sobre verde (botão) | 6,5 : 1 | 4,5 : 1 |
| Branco sobre vermelho (botão) | 5,4 : 1 | 4,5 : 1 |
| Modo escuro: texto sobre cartão | 13,6 : 1 | 4,5 : 1 |

Foco visível: contorno âmbar de 4 px em botões e campos (WCAG 2.4.7).

## Uma pergunta por tela

**Escolha:** cada tela faz uma única pergunta, com ajuda curta e exemplo.

**Motivo:** reduz a carga de memória e a chance de abandono; a pessoa só
precisa decidir uma coisa por vez. Perguntas condicionais só aparecem quando
fazem sentido (por exemplo, sem trabalho anterior, nenhuma pergunta sobre
empresa).

**Referências:** padrão *One thing per page* do GOV.UK Design System;
heurística de Nielsen "reconhecer em vez de lembrar".

## Linguagem simples

**Escolha:** frases curtas, na segunda pessoa, sem termos técnicos
("Que trabalho você está procurando agora?" em vez de "Objetivo profissional").

**Referências:** ISO 24495-1:2023 (Linguagem simples); Programa Linguagem
Simples do Governo Federal.

## Os dois modos: sozinho e com ajuda

| | Sozinho | Com ajuda |
|---|---|---|
| Para quem | A própria pessoa, que pode ter dificuldade de leitura | Um familiar ou agente que digita para a pessoa |
| Primeiro botão | Falar | Escrever |
| Voz | Lê pergunta, ajuda e opções, devagar | Lê só a pergunta |
| Repetição | Repete a pergunta se não houver ação | Não repete (quem ajuda está lendo) |
| Exemplo na tela | Não | Sim, para orientar quem digita |

**Motivo:** em centros de apoio ao trabalhador é comum alguém ajudar a
preencher. Um único modo atenderia mal os dois casos.

## Confirmação por voz

**Escolha:** toda resposta passa pela tela "Está certo?", que mostra e lê o
que foi entendido, com "Isso mesmo" e "Responder de novo".

**Motivo:** o reconhecimento de voz erra, sobretudo com sotaque e barulho.
Confirmar na hora evita que um erro chegue ao currículo e dá controle à
pessoa (heurística de Nielsen "controle e liberdade do usuário" e
"prevenção de erros"). Para e-mail e telefone, que costumam sair errados na
fala, o app sugere escrever.

## Respostas sempre em mais de um sentido

O app fala o conteúdo de cada tela, mas tudo também está escrito. O som pode
ser desligado no botão do topo, e a leitura do currículo pode ser interrompida.
Animações respeitam a preferência de movimento reduzido do sistema
(WCAG 2.3.3).

## Currículo em PDF

Ver `docs/modelo-curriculo.md`: contato no topo, uma página A4, hierarquia por
tamanho e peso (legível em impressão preto e branco) e nenhuma informação além
do que a pessoa respondeu.
