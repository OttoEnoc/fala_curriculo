# Modelo do currículo em PDF (tarefas 5.1 e 5.2)

Proposta para o PDF sair mais organizado. Exemplo com dados fictícios em
`docs/modelo-curriculo/` (`curriculo-atual.pdf` mostra como sai hoje e
`curriculo-proposto.pdf` mostra o modelo novo).

> Situação: **proposta**. O código abaixo segue a mesma estrutura de
> `gerarPDF()` em `prototipo/app.js`, mas ainda não foi testado no app.
> Conferir no Chrome e no celular antes de integrar.

## O que muda e por quê

| Hoje | Proposto | Motivo |
|---|---|---|
| Contato no fim da página | Cidade, telefone e e-mail logo abaixo do nome | É a primeira coisa que o recrutador procura |
| "ajudante de pedreiro" em minúsculas | "Ajudante de Pedreiro" | Aparência profissional |
| "São Paulo · São Paulo (SP)" | "São Paulo – SP" | Tira a repetição |
| "Trabalhei por conta própria" | "Autônomo" | Linguagem de currículo |
| Atividades em uma frase corrida, em 1ª pessoa | Lista com 2 a 4 itens curtos | Leitura rápida |
| Período numa linha separada | Período alinhado à direita, na linha do cargo | Economiza espaço e organiza |
| "Ensino médio · Escola · Terminei" | "Ensino Médio – Completo", com a escola embaixo | Termos usados em currículo |
| "Carteira de motorista de moto · Sim, no local de trabalho" | "CNH categoria A" e "Disponível para trabalho presencial" | Linguagem de currículo |
| Título de seção pode ficar sozinho no fim da página | Título só entra se couber junto com o conteúdo | Evita quebra feia |
| Sem resumo quando não há IA | Resumo da IA, ou "Em busca do primeiro emprego." | Toda página começa igual |

Regras que continuam: seção vazia não aparece; a idade não entra no PDF; não
se inventa nada.

## Divisão do trabalho

- **Formatação fixa (no app, sem IA):** maiúsculas, cidade e UF, "Autônomo",
  situação do estudo, CNH e disponibilidade. São trocas de texto previsíveis e
  não dependem da internet.
- **IA (Claude, no servidor):** só reescreve o texto livre. Corrige o cargo,
  quebra as atividades em itens curtos e escreve o resumo (ver
  `manual-integracao-claude.md`, seção 6).

## Passo 1: dicionários de formatação (`app.js`, perto de `cvBase()`)

```js
var SITUACAO_CV = {"Terminei":"Completo", "Não terminei":"Incompleto", "Ainda estou estudando":"Em andamento"};
var CNH_CV = {"Sim, de moto":"CNH categoria A", "Sim, de carro":"CNH categoria B", "Sim, de moto e de carro":"CNH categorias A e B"};
var MODALIDADE_CV = {"Sim, no local de trabalho":"Disponível para trabalho presencial",
                     "Só de casa":"Disponível para trabalho remoto",
                     "Dos dois jeitos":"Disponível para trabalho presencial ou remoto"};

function capitalizar(t){ t = String(t || "").trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ""; }

// "São Paulo" + "São Paulo (SP)"  ->  "São Paulo – SP"
function localCV(cidade, estado){
  var m = /\(([A-Z]{2})\)\s*$/.exec(estado || "");
  return [cidade, m ? m[1] : estado].filter(Boolean).join(" – ");
}

function empresaCV(t){ return t === "Trabalhei por conta própria" ? "Autônomo" : t; }

// Formação como objeto; usar formacaoTexto() onde hoje se espera texto.
function formacaoTexto(f){
  if(typeof f === "string") return f;
  return [f.nivel, f.situacao, f.instituicao].filter(Boolean).join(" – ");
}

// A IA devolve uma lista; sem IA, vem a frase original.
function listaDe(a){ return Array.isArray(a) ? a.filter(Boolean) : (a ? [capitalizar(a)] : []); }
```

## Passo 2: ajustes em `cvBase()`

Trocar só estes campos (o resto continua igual):

```js
    titulo: maiusculas(pes("objetivo")) || "Profissional",
    local: localCV(pes("cidade"), pes("estado")),
    cnh: CNH_CV[pes("cnh")] || "",
    modalidade: MODALIDADE_CV[pes("modalidade")] || "",
    // dentro de experiencia.map:
    //   cargo: maiusculas(it.cargo || ""), empresa: empresaCV(it.empresa || ""),
    formacao: estudos.map(function(it){
      return {nivel: maiusculas(it.escolaridade), situacao: SITUACAO_CV[it.situacao] || "", instituicao: it.instituicao || ""};
    }),
    cursos: cursos.map(capitalizar),
    idiomas: capitalizar((S.dados.idiomas && S.dados.idiomas[0] && S.dados.idiomas[0].idiomas) || ""),
```

O `maiusculas()` já existe no app e deixa "de", "da", "do" e "e" em
minúsculas.

Como `formacao` passa a ser objeto, trocar `f` por `formacaoTexto(f)` em
`renderCV()`, `textoDoCV()` e `promptCV()`. Em `prepararCV()`, usar sempre
`base.formacao`: a IA não mexe na formação.

## Passo 3: novo `gerarPDF()`

Substitui a função inteira. Usa a mesma biblioteca (jsPDF) e as mesmas cores
do app.

```js
function gerarPDF(){
  var cv = S.cv || cvBase();
  if(!window.jspdf || !window.jspdf.jsPDF) return null;
  var doc = new window.jspdf.jsPDF({unit:"pt", format:"a4"});
  var L = 56, R = 595 - 56, W = R - L, TOPO = 64, FIM = 786, y = TOPO;
  var COR = {texto:"#17242B", suave:"#54646E", destaque:"#17457E", secao:"#1E6B45", linha:"#D8CDB6"};

  function fonte(tam, estilo, cor){
    doc.setFont("helvetica", estilo || "normal");
    doc.setFontSize(tam);
    doc.setTextColor(cor || COR.texto);
  }
  function caber(alt){ if(y + alt > FIM){ doc.addPage(); y = TOPO; } }
  function texto(txt, tam, estilo, cor){
    fonte(tam, estilo, cor);
    doc.splitTextToSize(String(txt), W).forEach(function(l){
      caber(tam * 1.35); doc.text(l, L, y); y += tam * 1.35;
    });
  }
  function marcador(txt){
    fonte(10.5, "normal", COR.texto);
    var ls = doc.splitTextToSize(String(txt), W - 14);
    caber(ls.length * 14.2);
    doc.text("•", L + 2, y);
    ls.forEach(function(l){ doc.text(l, L + 14, y); y += 14.2; });
  }
  function secao(t){
    caber(48);                       // o título não fica sozinho no fim da página
    y += 14;
    fonte(10, "bold", COR.secao);
    doc.text(t.toUpperCase(), L, y);
    doc.setDrawColor(COR.linha); doc.setLineWidth(0.8);
    doc.line(L, y + 5, R, y + 5);
    y += 20;
  }

  // Cabeçalho: nome, vaga e contato
  texto(cv.nome, 22, "bold");
  y += 2;
  if(cv.titulo) texto(cv.titulo, 12.5, "bold", COR.destaque);
  var contato = [cv.local, cv.telefone ? cv.telefone + " (WhatsApp)" : "", cv.email]
    .filter(Boolean).join("   |   ");
  if(contato) texto(contato, 10, "normal", COR.suave);
  if(cv.linkedin) texto(cv.linkedin, 10, "normal", COR.suave);
  y += 4;
  doc.setDrawColor(COR.destaque); doc.setLineWidth(1.5); doc.line(L, y, R, y);
  y += 4;

  // Resumo
  var resumo = cv.resumo || (cv.primeiroEmprego ? "Em busca do primeiro emprego." : "");
  if(resumo){ secao("Resumo"); texto(resumo, 10.5); }

  // Experiência
  if(cv.experiencia && cv.experiencia.length){
    secao("Experiência profissional");
    cv.experiencia.forEach(function(e, i){
      if(i) y += 8;
      caber(40);
      fonte(10, "normal", COR.suave);
      var wp = e.periodo ? doc.getTextWidth(e.periodo) : 0;
      fonte(11.5, "bold", COR.texto);
      if(doc.getTextWidth(e.cargo) + wp + 16 <= W){
        doc.text(e.cargo, L, y);
        if(e.periodo){ fonte(10, "normal", COR.suave); doc.text(e.periodo, R, y, {align:"right"}); }
        y += 15;
      }else{
        texto(e.cargo, 11.5, "bold");
        if(e.periodo) texto(e.periodo, 10, "normal", COR.suave);
      }
      if(e.empresa) texto(e.empresa, 10.5, "italic", COR.suave);
      y += 2;
      listaDe(e.atividades).forEach(marcador);
      if(e.maisSobre) marcador(capitalizar(e.maisSobre));
    });
  }

  // Formação
  if(cv.formacao && cv.formacao.length){
    secao("Formação");
    cv.formacao.forEach(function(f){
      if(typeof f === "string"){ marcador(f); return; }
      texto([f.nivel, f.situacao].filter(Boolean).join(" – "), 11, "bold");
      if(f.instituicao) texto(f.instituicao, 10.5, "normal", COR.suave);
      y += 4;
    });
  }

  if(cv.cursos && cv.cursos.length){ secao("Cursos"); cv.cursos.forEach(marcador); }
  if(cv.idiomas){ secao("Idiomas"); texto(cv.idiomas, 10.5); }

  var extras = [cv.cnh, cv.modalidade].filter(Boolean);
  if(extras.length){ secao("Informações adicionais"); extras.forEach(marcador); }

  return doc;
}
```

## Passo 4: prévia na tela

Atualizar `renderCV()` com a mesma ordem: contato no topo, atividades em
`<ul>` e as "Informações adicionais" no fim. Assim a pessoa revisa na tela o
mesmo currículo que vai sair no PDF.

## Como conferir (tarefas 5.2, 5.3 e 5.5)

- Gerar o PDF nos caminhos: primeiro emprego, duas experiências, sem curso,
  com LinkedIn e cargo com nome muito longo.
- Conferir acentos: ã, ç, é, õ e "–" (tarefa 5.3).
- Com 3 ou mais experiências, ver se a quebra de página ficou boa.
- Imprimir em A4 e ver se fica legível (tarefa 5.5).
