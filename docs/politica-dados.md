# Decisão: o que o sistema guarda e por quanto tempo (tarefa 6.2)

> Situação: proposta escrita por Otto. Precisa ser confirmada pela dupla.
> Orienta as tarefas 4.3 (apagar dados do aparelho) e 6.3 (servidor sem dados pessoais).

## Princípio

Guardar o mínimo, pelo menor tempo possível. **No servidor, o ideal é nada.**

## Onde cada dado fica

| Dado | Onde fica | Por quanto tempo | Por quê |
|---|---|---|---|
| Respostas do roteiro (nome, cidade, trabalhos, estudos, contatos) | No navegador da pessoa (IndexedDB) | Até gerar o PDF, até a pessoa apagar ou no máximo **7 dias** | Permitir retomar de onde parou (4.1 e 4.2) |
| Respostas enviadas ao servidor (`POST /api/curriculo`) | Só na memória do servidor durante o pedido | Alguns segundos, até a resposta voltar | Montar e melhorar o currículo |
| Dados repassados ao serviço de IA | Serviço externo escolhido | Conforme a política do provedor | Melhorar a redação. Não enviamos nome, idade, telefone, e-mail nem LinkedIn |
| Áudio enviado para `POST /api/transcrever` | Só na memória do servidor durante o pedido | Alguns segundos | Transformar a fala em texto quando o navegador não faz isso |
| Áudio no reconhecimento do navegador (Chrome) | Serviço de voz do próprio navegador | Conforme a política do navegador | O app não controla esse envio; por isso a digitação é sempre oferecida |
| Endereço IP para o limite de uso | Memória do servidor | No máximo 1 hora | Impedir abuso (2.5) |
| PDF do currículo | Aparelho da pessoa | Decisão da pessoa | É o resultado entregue |

## O que o servidor **não** faz

- Não grava respostas, áudios ou currículos em banco de dados ou arquivo.
- Não registra respostas, áudios ou currículos nos logs.
  Os logs só podem conter o tipo de erro (por exemplo, `tempo-limite`).
- Não usa os dados para treinar modelos nem para outra finalidade.

## Quando revisar esta decisão

- Antes de adicionar qualquer armazenamento no servidor.
- Ao escolher definitivamente o provedor de IA e o de transcrição:
  conferir a retenção de dados de cada um e atualizar a política (6.4).
