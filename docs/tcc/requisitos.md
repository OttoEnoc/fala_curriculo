# Requisitos do sistema (tarefa 9.1)

> Rascunho do capítulo de requisitos, escrito a partir do `CLAUDE.md`
> (tarefa 1.5) e do que foi implementado. Precisa ser revisado pelos dois.

## Público-alvo

Pessoas com pouca familiaridade com tecnologia, dificuldade de escrita ou
pouca experiência na elaboração de currículos, incluindo quem procura o
primeiro emprego.

## Dados mínimos coletados

| Grupo | Campos (identificadores) | Obrigatoriedade |
|---|---|---|
| Dados pessoais | `nome`, `cidade`, `estado`, `objetivo` | Obrigatórios |
| | `cnh`, `modalidade`, `idade` | Opcionais |
| Trabalho (repete) | porta `jaTrabalhou`; `cargo`, `empresa`, `periodo`, `atividades` | Obrigatórios se já trabalhou |
| | `maisSobre` | Opcional |
| Estudo (repete) | `escolaridade`, `situacao` | Obrigatórios (situação só se estudou) |
| | `instituicao` | Obrigatória só para curso técnico e faculdade |
| Cursos (repete) | porta `fezCurso`; `curso` | Obrigatório se fez curso |
| Idiomas | `idiomas` | Opcional |
| Contato | `telefone` | Obrigatório |
| | `email`, `temLinkedin`, `linkedin` | Opcionais (LinkedIn só se tiver) |

## Requisitos funcionais

| Código | Requisito | Onde está |
|---|---|---|
| RF01 | Apresentar o sistema e permitir iniciar | Tela `t-inicio` |
| RF02 | Pedir consentimento antes de coletar dados | Tela `t-consentimento` (6.1) |
| RF03 | Escolher o modo de uso: sozinho ou com ajuda | Tela `t-modo` |
| RF04 | Fazer uma pergunta por vez, só as aplicáveis ao perfil | `roteiro.js` (`mostrarSe`, portas) |
| RF05 | Responder por voz, com texto aparecendo ao vivo quando o navegador permite | Reconhecimento do navegador (3.4) |
| RF06 | Responder por voz gravada e transcrita no servidor quando o navegador não reconhece fala | `MediaRecorder` + `POST /api/transcrever` (3.2, 3.3) |
| RF07 | Responder por digitação em qualquer pergunta | Tela `t-escrever` |
| RF08 | Conferir e corrigir cada resposta antes de usá-la | Tela `t-confirmar` |
| RF09 | Validar respostas (nome com sobrenome, telefone com DDD, e-mail, período etc.) | `validar()` em `app.js` |
| RF10 | Incluir mais de uma experiência, formação ou curso | Tela `t-mais` |
| RF11 | Concluir sem experiência profissional (primeiro emprego) | Porta `jaTrabalhou` |
| RF12 | Mostrar o progresso por seções | Tela `t-progresso` |
| RF13 | Ler o currículo em voz alta, com possibilidade de parar | Telas `t-conferir` e `t-lendo` |
| RF14 | Corrigir uma seção inteira na revisão | Tela `t-corrigir` |
| RF15 | Avisar e levar às informações obrigatórias que faltam | Tela `t-faltando` |
| RF16 | Melhorar a redação com IA sem inventar informações | `POST /api/curriculo` (2.3, 2.4) |
| RF17 | Gerar currículo básico quando a IA ou o servidor falharem | 2.7 |
| RF18 | Gerar PDF de uma página A4 | `gerarPDF()` (5.2) |
| RF19 | Enviar o PDF pelo WhatsApp, imprimir ou baixar | Tela `t-enviar` (5.4, 5.5) |
| RF20 | Guardar o progresso no aparelho e retomar de onde parou | IndexedDB (4.1, 4.2) |
| RF21 | Apagar os dados do aparelho, manualmente e após gerar o PDF | 4.3 |
| RF22 | Funcionar sem internet, com escrita e PDF | Service worker (7.3) |
| RF23 | Instalar como aplicativo na tela inicial | Manifesto (7.2) |

## Requisitos não funcionais

| Código | Categoria | Requisito |
|---|---|---|
| RNF01 | Usabilidade | Linguagem simples, instruções curtas e exemplos no modo com ajuda |
| RNF02 | Acessibilidade | Botões grandes (mínimo 70 px de altura), fonte Atkinson Hyperlegible |
| RNF03 | Acessibilidade | Navegação por teclado e foco visível; campos com rótulo |
| RNF04 | Acessibilidade | Leitura em voz alta de cada tela, com botão para desligar a voz |
| RNF05 | Acessibilidade | Não depender só de cor, som ou animação; respeitar movimento reduzido |
| RNF06 | Confiabilidade | Alternativa por digitação sempre disponível |
| RNF07 | Confiabilidade | Tempo máximo de espera: 20 s para a IA, 25 s no app, 30 s para transcrição |
| RNF08 | Segurança | Chaves de API só em variáveis de ambiente no servidor |
| RNF09 | Segurança | Respostas tratadas como dados no pedido à IA; instruções só no servidor |
| RNF10 | Segurança | Limite de 10 currículos e 120 áudios por hora por aparelho (IP) |
| RNF11 | Privacidade | Nenhum dado pessoal gravado no servidor nem nos logs |
| RNF12 | Privacidade | Nome, idade e contatos não são enviados à IA |
| RNF13 | Privacidade | Dados no aparelho expiram em 7 dias |
| RNF14 | Portabilidade | Funciona em navegadores modernos de celular e computador, via HTTPS |
| RNF15 | Manutenibilidade | Provedores de IA e de transcrição substituíveis |
| RNF16 | Manutenibilidade | Testes automáticos do servidor rodando a cada pull request |

## Regras de negócio da IA

- RN01: usar somente as informações confirmadas pela pessoa.
- RN02: nunca inventar empresas, cargos, datas, cursos, competências, níveis
  de idioma, resultados ou números.
- RN03: campo vazio continua vazio.
- RN04: nome, contatos, empresas, períodos, estudos e cursos vêm sempre das
  respostas, nunca da IA.
- RN05: a pessoa revisa o resultado antes de enviar.
