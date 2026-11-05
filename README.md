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

Pré-requisito: Node.js 20 ou mais recente.

```bash
cd servidor
npm install
copy .env.exemplo .env      (Mac/Linux: cp .env.exemplo .env)
# colar as chaves no .env
npm start
```

Abrir <http://localhost:3002>. O mesmo servidor entrega o app e as rotas
`/api/saude`, `/api/curriculo` (Claude) e `/api/transcrever` (OpenAI).
Passo a passo completo, testes e publicação no Cloudflare: `COMO-TESTAR.md`.

No Windows, se o PowerShell bloquear a execução de `npm`,
utilizar `npm.cmd` no lugar de `npm`.
