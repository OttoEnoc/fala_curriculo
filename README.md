# fala_curriculo
Sistema web com IA para criação de currículos, focado em acessibilidade. Em um fluxo guiado, o usuário responde cada etapa por voz ou digitação e pode ouvir a tela. A IA aprimora as respostas, mesmo informais, e gera o currículo em PDF. Voltado a quem tem pouca familiaridade com tecnologia, dificuldade de leitura ou nunca fez um currículo.


## Fluxo de trabalho

### Organização das tarefas

- A branch `main` deve manter a versão funcional do projeto.
- Cada tarefa deve ser desenvolvida em uma branch própria.
- As branches devem ser criadas a partir da `main` atualizada.
- Otto e Eduardo podem executar qualquer tarefa da planilha.
- Antes de começar, a dupla deve combinar quem está trabalhando em cada tarefa.

### Nomes das branches

Usamos os nomes definidos na planilha. Exemplos:

- `docs/fluxo-git`: documentar as regras de colaboração.
- `front/separar-arquivos`: separar HTML, CSS e JavaScript.
- `front/roteiro`: separar o roteiro de perguntas.
- `docs/requisitos`: documentar os requisitos do sistema.
- `back/estrutura`: criar a estrutura inicial do servidor.

### Envio e revisão

1. Atualizar a `main` antes de criar uma branch.
2. Criar a branch da tarefa.
3. Fazer as alterações e verificar o funcionamento afetado.
4. Criar commits com mensagens que expliquem as alterações.
5. Publicar a branch e enviar os commits ao GitHub.
6. Abrir um pull request com destino à `main`.
7. Solicitar a revisão do parceiro.
8. Corrigir os pontos apontados, quando necessário.
9. Integrar o pull request após a aprovação.
10. Atualizar a `main` local antes de iniciar outra tarefa.

### Cuidados

- Não enviar chaves de API, senhas ou arquivos `.env` ao GitHub.
- Usar dados fictícios nos testes.
- Evitar alterações sem relação com a tarefa da branch.

## Executar localmente

Pré-requisito: Node.js 22 LTS instalado.

No terminal, a partir da raiz do projeto:

```bash
cd servidor
npm install
npm start
```

No Windows, se o PowerShell bloquear a execução de `npm`,
utilizar `npm.cmd` no lugar de `npm`.

Com o servidor em execução, abrir o app em:

http://127.0.0.1:3001/

Conferir o servidor em http://127.0.0.1:3001/api/saude
(resposta esperada: `{"ok":true}`).

Para encerrar o servidor, pressionar Ctrl + C no terminal.

O app também pode ser aberto pela extensão de prévia do VS Code:
em `localhost`, ele chama a API em `http://127.0.0.1:3001`.

### Configuração

Copie `servidor/.env.exemplo` para `servidor/.env` e ajuste:

- `IA_PROVEDOR`: `nenhum` (currículo básico), `simulado` (testes, sem IA)
  ou `anthropic` (com `IA_API_KEY`).
- `TRANSCRICAO_PROVEDOR`: `nenhum`, `simulado` (testes) ou `openai`
  (com `TRANSCRICAO_API_KEY`).

Nunca envie o `.env` ao Git.

### Testes

```bash
cd servidor
npm test
```

## Documentação

- `docs/politica-dados.md`: o que é guardado e por quanto tempo.
- `docs/escolha-stt.md` e `docs/escolha-tts.md`: serviços de voz.
- `docs/teste-voz.md`: protocolo de teste de sotaque e barulho.
- `docs/modelo-curriculo.md` e `docs/teste-pdf-acentos.md`: PDF.
- `docs/deploy.md`: publicação com HTTPS no Render.
- `docs/tcc/`: requisitos, fluxo, design, arquitetura e resultados dos testes.
