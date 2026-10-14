# Teste de acentos no PDF (tarefa 5.3)

Data: 14/10/2026. Executado por Otto (com apoio do Claude Code).

## Como foi testado

1. A função `textoPDF()` foi copiada de `prototipo/app.js` e usada para gerar um
   PDF com o jsPDF 2.5.1 (mesma versão carregada pelo app) e a fonte Helvetica.
2. O texto foi extraído do PDF com `pdftotext` e o PDF foi convertido em imagem
   para conferência visual.
3. O fluxo completo do app (primeiro emprego e com experiência) foi baixado como
   PDF e conferido do mesmo jeito.

## Resultado

| Caso | Entrada | No PDF | Situação |
|---|---|---|---|
| Acentos do português | ã õ â ê ô à á é í ó ú ç (maiúsculas e minúsculas), ü | Igual | OK |
| Nomes reais | João da Conceição, Ribeirão Preto, São Luís, Goiânia | Igual | OK |
| Pontuação | · • — – “aspas” ‘simples’ … nº 1º 2ª 30° | Igual | OK |
| Outros símbolos | € ñ ¿ ¡ | Igual | OK |
| Acento digitado separado (NFD) | José, Conceição com acento combinado | Junta o acento: José Conceição | OK |
| Emoji | Trabalhei 😀 na obra 👷 | Trabalhei na obra | Removido de propósito |
| Fora da tabela da fonte | Gdańsk İstanbul H₂O → ≥ ✓ | Gdansk Istanbul H2O -> >= | Trocado por equivalente simples |

Antes da correção, emoji e caracteres fora da tabela Windows-1252 apareciam
como símbolos quebrados (por exemplo, `Ø=Þ` no lugar do emoji).

## Conclusão

Não é preciso trocar a fonte: a Helvetica do jsPDF cobre todos os acentos do
português. A função `textoPDF()` impede caracteres quebrados nos casos raros
(emoji vindo do teclado do celular, letras de outras línguas).
