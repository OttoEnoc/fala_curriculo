# Modelo do currículo em PDF (tarefa 5.1)

> Situação: **proposta** de Otto, já aplicada no PDF (5.2).
> Precisa ser aprovada pelos dois; ajustes viram nova tarefa.

## Objetivos

- Caber em **uma página A4**, com margens de impressão seguras.
- Quem recruta deve achar em segundos: **quem é, que vaga quer e como ligar**.
- Hierarquia clara por tamanho e peso da letra, não só por cor
  (impressão em preto e branco continua legível).
- Mostrar só o que a pessoa informou. Campos vazios não aparecem.

## Estrutura

```
┌──────────────────────────────────────────────────────────┐
│ MARIA DE SOUZA                          (22 pt, negrito) │
│ Objetivo: Atendente de loja             (12 pt, azul)    │
│ (81) 90000-0000 (WhatsApp) · maria@exemplo.com           │
│ Recife · Pernambuco (PE)                (10 pt, cinza)   │
├──────────────────────────────────────────────────────────┤
│ RESUMO              (só quando a IA escreveu um resumo)  │
│ EXPERIÊNCIA                                              │
│   Vendedora — Loja Exemplo                  (negrito)    │
│   8 meses                                   (cinza)      │
│   O que fazia...                                         │
│   (ou "Em busca do primeiro emprego.")                   │
│ FORMAÇÃO                                                 │
│   • Ensino médio · Escola ... · Terminei                 │
│ CURSOS              (se houver)                          │
│ IDIOMAS             (se houver)                          │
│ INFORMAÇÕES ADICIONAIS (se houver)                       │
│   • Carteira de motorista de moto                        │
│   • Disponível para trabalho presencial                  │
│   • 32 anos                                              │
└──────────────────────────────────────────────────────────┘
```

## Decisões

| Decisão | Motivo |
|---|---|
| Contato logo abaixo do nome | Recrutador liga pelo WhatsApp; não precisa procurar no fim da página |
| "Objetivo:" escrito por extenso | Deixa claro que é a vaga procurada, não um cargo que a pessoa já teve |
| Títulos de seção em maiúsculas, negrito e com linha | Separação visível também em impressão sem cor |
| Disponibilidade escrita como frase ("Disponível para trabalho presencial") | A opção do roteiro ("Dos dois jeitos") não faz sentido fora da pergunta |
| Idade em "Informações adicionais" e só se informada | É opcional e não deve ser destaque |
| Primeira letra maiúscula em cargos, cursos e objetivo | Apresentação; o texto não muda |
| Fonte Helvetica (padrão do jsPDF) | Leve, sem download extra, acentos do português funcionam (ver 5.3) |
| Se passar de uma página, reduz a letra até 80 % | Garante uma página na maioria dos casos sem cortar informação |

## Fora do escopo

- Foto, estado civil, CPF, endereço completo: não são pedidos (ver CLAUDE.md).
- Modelos com colunas ou cores fortes: pior na impressão e na leitura automática
  por sistemas de vagas.
