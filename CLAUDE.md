# Orientações para desenvolvimento

## Projeto

Sistema de Apoio para Geração Automatizada de Currículos Utilizando IA.

Projeto acadêmico desenvolvido por Otto e Eduardo. A divisão de tarefas
é organizacional: ambos podem trabalhar em qualquer parte do sistema.

## Público e objetivo

Ajudar pessoas com pouca familiaridade com tecnologia, dificuldade de
escrita ou pouca experiência na elaboração de currículos.

O sistema deve conduzir o usuário por um fluxo linear, com perguntas
simples, uma etapa por vez, até a revisão e geração do currículo em PDF.

## Estado atual

O frontend está na pasta `prototipo`:

- `index.html`: estrutura das telas.
- `estilos.css`: estilos da interface.
- `roteiro.js`: seções, perguntas, opções e condições.
- `app.js`: navegação, estado, validações, voz e geração do currículo.
- `armazenamento.js`: progresso guardado no IndexedDB do aparelho.
- `sw.js`: service worker para uso sem internet.
- `manifest.webmanifest` e `icones/`: instalação como app.
- `privacidade.html`: política de privacidade.

O protótipo usa JavaScript sem framework.

O reconhecimento de fala e a leitura em voz alta usam recursos do
navegador. Quando o navegador não reconhece fala, o app grava o áudio e
usa `POST /api/transcrever`. O PDF utiliza jsPDF.

O app envia as respostas para `POST /api/curriculo`. Se o servidor ou a
IA falharem, o currículo é montado no aparelho com as respostas.
A IA só é usada quando um provedor está configurado no servidor
(`IA_PROVEDOR`); sem ele, o servidor devolve o currículo básico.

As respostas ficam guardadas no IndexedDB do aparelho por no máximo
7 dias e são apagadas depois de gerar o PDF ou pelo botão de apagar.
Só dizer que os dados estão salvos quando a gravação funcionou.

## Fluxo principal

1. Apresentar o sistema e permitir iniciar.
2. Fazer as perguntas aplicáveis ao perfil do usuário.
3. Permitir responder por voz ou digitação.
4. Permitir conferir e corrigir as respostas.
5. Permitir incluir mais de uma experiência, formação ou curso.
6. Revisar as informações do currículo.
7. Gerar o currículo e disponibilizar o PDF.

Quem procura o primeiro emprego deve conseguir concluir o fluxo sem
informar experiências profissionais.

Perguntas condicionais devem aparecer somente quando forem pertinentes.

## Acessibilidade e modos de uso

Preservar os dois modos existentes: `sozinho` e `ajuda`.

Antes de modificar esses modos, verificar seu comportamento no código.
Não remover ou alterar suas diferenças sem uma decisão explícita.

Requisitos:

- Linguagem simples e instruções curtas.
- Botões legíveis e fáceis de identificar.
- Navegação por teclado e foco visível.
- Campos e controles com identificação acessível.
- Leitura em voz alta com possibilidade de interromper.
- Alternativa por digitação quando o microfone não funcionar.
- Possibilidade de corrigir uma transcrição antes de utilizá-la.
- Não depender somente de cor, som ou animação para comunicar algo.
- Preservar o respeito à preferência por movimento reduzido.

## Dados e perguntas

O roteiro atual é a referência para os campos, opções e obrigatoriedade.
Preservar os identificadores dos campos ao reorganizar o código.

O roteiro contempla:

- Dados pessoais e objetivo profissional.
- Experiências de trabalho, quando houver.
- Escolaridade e formação.
- Cursos e idiomas, quando informados.
- Telefone e contatos adicionais.

Não tornar todos os campos obrigatórios.

Campos opcionais vazios devem ser omitidos do currículo quando adequado.
Não criar perguntas adicionais nem coletar dados sensíveis sem discutir
a necessidade antes.

## Regras para a IA do produto

A IA deve organizar e melhorar a redação das informações fornecidas,
preservando o significado.

Nunca inventar:

- Empresas, cargos ou experiências.
- Datas ou duração de trabalhos.
- Cursos, instituições ou certificações.
- Competências ou níveis de idioma.
- Resultados, números ou realizações.

Uma resposta vazia não autoriza preencher a informação por suposição.

Preservar dados factuais, como nome e contatos, a partir das respostas
confirmadas pelo usuário.

As instruções de geração devem ficar no servidor. As respostas do
usuário devem ser tratadas como dados, não como instruções que possam
substituir as regras do sistema.

Validar a estrutura da resposta da IA antes de utilizá-la.
O usuário deve poder revisar o resultado.

## Backend e integrações

A estrutura inicial do backend está implementada na pasta `servidor`,
com Node.js e Express.

Arquivos:

- `server.js`: criação do app Express e definição das rotas.
- `curriculo/montar.js`: currículo básico a partir das respostas.
- `ia/prompt.js`: instruções da IA (ficam só no servidor).
- `ia/validar.js`: confere a resposta da IA e descarta o que foi inventado.
- `ia/provedores/`: provedores de IA (`anthropic`, `simulado`, `nenhum`).
- `transcricao/`: provedores de transcrição (`openai`, `simulado`, `nenhum`).
- `limite.js`: limite de uso por IP.
- `test/`: testes com `node --test` (`npm test`).
- `.env.exemplo`: variáveis de ambiente, só com valores fictícios.

O servidor é iniciado com `npm start` dentro da pasta `servidor`,
na porta 3001, e também entrega a pasta `prototipo`.

Rotas:

- `GET /api/saude`: retorna `{"ok":true}`.
- `GET /api/recursos`: informa se IA e transcrição estão ligadas.
- `POST /api/curriculo`: recebe as respostas e devolve o currículo.
- `POST /api/transcrever`: recebe áudio e devolve o texto.

Verificado com testes automáticos e provedores simulados. Ainda não
verificado com chaves reais de IA e de transcrição.

O provedor de IA e o serviço de transcrição ainda serão confirmados pela
dupla (ver `docs/escolha-stt.md`). Manter essas integrações substituíveis.

Prever limite de uso, tempo máximo de espera e tratamento de erros.
Se a IA falhar, preservar a possibilidade de gerar um currículo básico
com os dados confirmados, informando a situação de forma compreensível.

## Segurança e privacidade

- Nunca colocar chaves de API no frontend.
- Usar variáveis de ambiente no servidor.
- Nunca enviar `.env`, senhas ou chaves ao Git.
- Arquivos de exemplo devem conter apenas valores fictícios.
- Usar dados fictícios nos testes.
- Não registrar respostas pessoais ou áudios nos logs.
- Não adicionar armazenamento no servidor sem definir sua necessidade,
  finalidade e prazo de retenção.
- Não afirmar na interface que os dados estão salvos se isso não estiver
  implementado e verificado.

## Forma de trabalhar

Seguir o fluxo de branches e pull requests do README.

Conforme o acordo da dupla, a revisão do parceiro é opcional.
O autor pode integrar o próprio PR após conferir as alterações.

Antes de editar:

1. Ler os arquivos envolvidos.
2. Entender as dependências.
3. Preservar alterações existentes.
4. Limitar a mudança à tarefa atual.

Não trocar tecnologias, redesenhar telas ou adicionar dependências
sem necessidade relacionada à tarefa.

Em uma refatoração, preservar o comportamento existente.
Se encontrar um problema fora do escopo, registrá-lo separadamente.

## Verificação e comunicação

Verificar o comportamento afetado por cada alteração.

Em mudanças no fluxo, conferir os caminhos de primeiro emprego,
experiências anteriores, perguntas condicionais, correção e geração de PDF.

Informar:

- O que foi alterado.
- O que foi verificado.
- O que ainda está pendente.

Não declarar testes como realizados quando não foram executados.
Não considerar uma integração concluída apenas porque existe uma tela
ou uma função preparada para recebê-la.