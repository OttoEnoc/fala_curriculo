# Diagrama do fluxo (tarefa 9.2)

> Cobre as 24 telas de `prototipo/index.html`, com os desvios de primeiro
> emprego, repetição, validação, correção, falta de microfone e falta de internet.
> O diagrama usa Mermaid (o GitHub mostra como imagem).

## Fluxo geral

```mermaid
flowchart TD
  A([Abrir o app]) --> G{Há respostas guardadas<br/>no aparelho?}
  G -- sim --> RET[t-retomar<br/>Continuar de onde parou?]
  RET -- continuar --> VOLTA([Volta à tela em que parou])
  RET -- começar de novo<br/>apaga os dados --> INI
  G -- não --> INI[t-inicio<br/>Boas-vindas]
  INI --> CON[t-consentimento<br/>Antes de começar]
  CON -- não aceito --> CON
  CON -- aceito --> MIC[t-microfone<br/>Permissão do microfone]
  MIC -- permitir / agora não --> COMO[t-como<br/>Como funciona]
  COMO --> MODO[t-modo<br/>Sozinho ou com ajuda]
  MODO --> PERG

  subgraph ROTEIRO [Roteiro de perguntas]
    PERG[t-pergunta] --> RESP{Como responder?}
    RESP -- opção --> VAL
    RESP -- falar --> OUV[t-ouvindo<br/>texto ao vivo ou gravação]
    RESP -- escrever --> ESC[t-escrever]
    RESP -- pular<br/>só opcionais --> PROX
    OUV -- parar --> PROC[t-processando]
    OUV -- nada ouvido --> ERRO[t-erro]
    OUV -- sem internet --> OFF[t-offline]
    OFF -- escrever --> ESC
    ERRO -- falar de novo --> OUV
    ERRO -- escrever --> ESC
    PROC --> VAL{Resposta válida?}
    ESC --> VAL
    VAL -- não --> FALT[t-faltou<br/>explica o que falta]
    FALT -- falar / escrever --> RESP
    VAL -- sim --> CONF[t-confirmar<br/>Está certo?]
    CONF -- responder de novo --> RESP
    CONF -- isso mesmo --> PROX{Próxima pergunta}
    PROX -- há pergunta aplicável --> PERG
    PROX -- fim de um item que repete --> MAIS[t-mais<br/>Tem mais um?]
    MAIS -- sim --> PERG
    MAIS -- não --> PROXG
    PROX -- fim do grupo --> PROXG{Mudou de seção?}
    PROXG -- sim --> PROG[t-progresso]
    PROG --> PERG
    PROXG -- não --> PERG
  end

  PROXG -- fim do roteiro --> FALTA{Falta obrigatório?}
  FALTA -- sim --> FALTANDO[t-faltando]
  FALTANDO -- responder agora --> PERG
  FALTA -- não --> CONFERIR[t-conferir]
  CONFERIR --> LENDO[t-lendo<br/>leitura em voz alta]
  LENDO -- fim ou parar --> TUDO[t-tudocerto<br/>Está tudo certo?]
  TUDO -- ouvir de novo --> LENDO
  TUDO -- quero mudar --> CORR[t-corrigir]
  CORR -- escolhe seção --> PERG
  CORR -- está tudo certo --> TUDO
  TUDO -- sim --> PREP[t-preparando<br/>servidor + IA]
  PREP --> PRONTO[t-pronto<br/>prévia + aviso se sem IA]
  PRONTO --> ENV[t-enviar]
  ENV -- WhatsApp / imprimir / baixar --> LIMPA([PDF gerado<br/>dados apagados do aparelho])
  ENV -- apagar respostas --> INI
  ENV -- voltar ao início --> INI
```

## Desvios do roteiro

```mermaid
flowchart LR
  subgraph P [Dados pessoais]
    P1[nome] --> P2[cidade] --> P3[estado] --> P4[objetivo] --> P5[cnh*] --> P6[modalidade*] --> P7[idade*]
  end
  subgraph T [Trabalho]
    T0{Já trabalhou?}
    T0 -- nunca trabalhei<br/>primeiro emprego --> FIMT([pula o grupo])
    T0 -- sim --> T1[cargo] --> T2[empresa] --> T3[periodo] --> T4[atividades] --> T5[maisSobre*] --> TM{outro trabalho?}
    TM -- sim --> T1
  end
  subgraph E [Estudo]
    E1[escolaridade] -- não estudei --> FIME([sem instituição e situação])
    E1 -- estudou --> E2[instituicao<br/>obrigatória em técnico e faculdade] --> E3[situacao] --> EM{outra escola?}
    EM -- sim --> E1
  end
  subgraph C [Cursos]
    C0{Fez curso?} -- não --> FIMC([pula o grupo])
    C0 -- sim --> C1[curso] --> CM{outro curso?}
    CM -- sim --> C1
  end
  subgraph I [Idiomas]
    I1[idiomas*]
  end
  subgraph K [Contato]
    K1[telefone] --> K2[email*] --> K3{tem LinkedIn?*}
    K3 -- tenho --> K4[linkedin]
  end
  P --> T --> E --> C --> I --> K
```

`*` = pergunta opcional (pode pular).

## Diferenças entre os modos

| Comportamento | Sozinho | Com ajuda |
|---|---|---|
| Botão em primeiro lugar | Falar a resposta | Escrever a resposta |
| Leitura da pergunta | Pergunta, ajuda e opções, mais devagar | Só a pergunta |
| Repetição automática | Repete após 11 s sem ação (até 2 vezes) | Não repete |
| Exemplo de resposta na tela | Não | Sim |
