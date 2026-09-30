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

## Executar o backend localmente

Pré-requisito: Node.js LTS instalado.

No terminal, a partir da raiz do projeto:

```bash
cd servidor
npm install
npm start
```

No Windows, se o PowerShell bloquear a execução de `npm`,
utilizar `npm.cmd` no lugar de `npm`.

Com o servidor em execução, acessar:

http://localhost:3001/api/saude

Resposta esperada:

```json
{"ok":true}
```

Para encerrar o servidor, pressionar Ctrl + C no terminal.

O frontend continua sendo executado pela extensão de prévia do VS Code.
A integração entre frontend, backend e IA será desenvolvida no bloco 2.