# Como Usar o Sistema 5S — Guia do Usuário

Este documento explica como funciona o sistema 5S do ponto de vista de quem o usa no dia a dia. Sem termos técnicos de TI — apenas o que você precisa saber para trabalhar com ele.

---

## O que é o Sistema 5S?

O sistema 5S automatiza o processo de criação, revisão e aprovação de documentos normativos da empresa — como procedimentos de qualidade, instruções de trabalho e registros.

Em vez de o autor escrever, formatar e circular o documento manualmente, o sistema usa **inteligência artificial** para:

- Verificar se o documento está correto e completo
- Corrigir erros de escrita
- Formatar o documento no padrão da empresa
- Encaminhar para as pessoas certas aprovarem

---

## Os Três Perfis de Usuário

O sistema tem três perfis com acesso a funções diferentes. Você pode **trocar de perfil** clicando em "Trocar Perfil" no canto inferior da barra lateral.

| Perfil | Quem usa | O que faz |
|--------|----------|-----------|
| **Autor** | Quem escreve documentos | Envia, acompanha e corrige documentos |
| **Processos** | Gestores, aprovadores | Revisa e aprova documentos; publica na Lista Mestra |
| **Admin** | Administrador do sistema | Configura regras, modelos e aprovadores |

---

## O Ciclo de Vida de um Documento

Todo documento passa pelas mesmas etapas, em ordem. Veja o caminho completo:

```
Envio → Análise IA → Revisão Ortográfica → Em Revisão → Formatação → Aprovação → Publicação
```

Nas seções abaixo, cada etapa é explicada em detalhe.

---

## Perfil: Autor

### Painel Principal

Ao entrar no perfil **Autor**, você vê:

- **Quatro cards** com o resumo dos seus documentos: total enviado, pendentes, aprovados e rejeitados.
- **Tabela de documentos** com código, título, versão, status e data.
- **Campo de busca** para encontrar documentos pelo código ou título.
- **Filtro por status** para ver, por exemplo, só os rejeitados.
- Botão **"+ Novo Documento"** para começar a enviar um novo arquivo.

---

### Enviando um Novo Documento

1. Clique em **"+ Novo Documento"**.
2. **Selecione o tipo** do documento:
   - **PQ** — Procedimento da Qualidade
   - **IT** — Instrução de Trabalho
   - **RQ** — Registro da Qualidade
3. **Faça o upload** do arquivo (arraste ou clique para selecionar).
4. **Preencha o título** do documento (obrigatório) e o setor responsável (opcional).
5. O sistema **gera automaticamente o código** (ex: `IT-001.00`). Você não precisa inventar o código.
6. Clique em **"Submeter Documento"**.

Após o envio, você é levado para a **página de detalhe** do documento, onde poderá acompanhar cada etapa do processo.

---

### Acompanhando o Documento (Página de Detalhe)

Esta é a página mais importante para o autor. Ela mostra o status atual do documento e os botões disponíveis para cada situação.

---

## Etapa 1 — Envio

**Status:** `Rascunho`

O documento foi recebido pelo sistema. A análise pela IA começa automaticamente em seguida.

---

## Etapa 2 — Análise pela IA

**Status:** `Analisando`

A IA lê o documento e verifica:

- Se todas as **seções obrigatórias** estão presentes (ex: Objetivo, Descrição das Atividades)
- Se o conteúdo é **claro e coerente**
- Se há **referências cruzadas** a outros documentos (apenas para PQs)
- Se o conteúdo é **consistente com versões anteriores** (para revisões)

**Resultado da análise:**

- **IA aprovou** → O processo continua automaticamente para a próxima etapa.
- **IA reprovou** → Você vê uma lista dos problemas encontrados. Você pode:
  - Corrigir o arquivo e **reenviar** clicando em "Re-submeter".
  - **Prosseguir sem a aprovação da IA** (com aviso de que as verificações automáticas não serão feitas).

> **Atenção:** "IA aprovou" aqui significa que a análise foi concluída com êxito — não que o documento já foi aprovado para publicação. Ainda há etapas humanas pela frente.

---

## Etapa 3 — Revisão Ortográfica

**Status:** `Revisão Ortográfica`

A IA verifica o texto do documento em busca de:

- **Erros de escrita** (obrigatório corrigir)
- **Sugestões de clareza** (opcional aceitar)

**O que você faz:**

- Você vê a lista de erros e sugestões.
- Pode **aceitar as correções da IA** com um clique.
- Pode **editar o texto manualmente** na caixa de edição e enviar sua versão.
- Se editar manualmente, o texto é revisado mais uma vez — isso pode acontecer em várias rodadas, até que o texto esteja limpo.

Quando não houver mais erros, você clica em **"Aceitar e Prosseguir"**.

---

## Etapa 4 — Em Revisão (e Formatação)

**Status:** `Em Revisão`

> ⚠️ **Esta é a etapa onde o botão de formatação aparece.**

Após a análise e a revisão ortográfica serem concluídas, o documento entra no status **"Em Revisão"**. Neste momento, dois caminhos são possíveis:

### Opção A — Formatar o Documento (recomendado)

Clique no botão **"Formatar Documento"** para que a IA reorganize o conteúdo nas seções obrigatórias do padrão da empresa e gere os arquivos finais em DOCX e PDF.

O processo de formatação:
1. A IA reorganiza o texto nas seções corretas (Objetivo, Atividades, Responsabilidades, etc.)
2. Numera os passos automaticamente (para ITs)
3. Gera o arquivo `.docx` e o `.pdf` formatados
4. O documento volta ao status "Em Revisão", com os arquivos disponíveis para download

### Opção B — Enviar para Aprovação sem Formatar

Você pode criar a cadeia de aprovação diretamente, sem passar pela formatação. Neste caso, o documento original (sem a formatação da IA) será o que os aprovadores verão.

---

## Etapa 5 — Cadeia de Aprovação

Ainda na página de detalhe, você configura **quem precisa aprovar** o documento antes de ser publicado.

- O sistema pode ter aprovadores padrão já configurados para cada tipo de documento.
- Você pode adicionar ou ajustar os aprovadores conforme necessário.
- Os aprovadores são organizados em **níveis**: aprovadores do mesmo nível analisam em paralelo; o próximo nível só começa quando todos do anterior concluírem.

Após criar a cadeia, o documento aguarda as aprovações.

---

## Etapa 6 — Aprovação Humana

**Status:** `Em Revisão` (aguardando aprovadores)

Os aprovadores recebem a tarefa de revisar o documento. Você, como autor, pode acompanhar na página de detalhe:

- Quem já aprovou ✓
- Quem ainda está pendente ⏳
- Se alguém rejeitou ✗ (com o motivo informado)

**Se o documento for rejeitado por algum aprovador:**

- Você pode corrigir o arquivo e reenviar uma nova versão.
- A nova versão passa novamente por todas as etapas acima.

---

## Etapa 7 — Publicação

**Status:** `Aprovado` → `Publicado`

Quando todos os aprovadores concluem, o documento fica com status **"Aprovado"**. A partir daí, um usuário do perfil **Processos** publica o documento oficialmente.

Após a publicação:

- O documento entra na **Lista Mestra** (o registro oficial da empresa).
- Versões anteriores são automaticamente arquivadas.

---

## Atualizando um Documento Já Existente (Nova Revisão)

Quando um documento já passou por todo o ciclo e você precisa atualizá-lo — seja porque a norma mudou, o processo foi revisado, ou um aprovador pediu correções — o fluxo é diferente de submeter um documento do zero.

### Qual botão usar?

Na página de detalhe do documento, dois botões podem aparecer dependendo da situação:

| Situação | Botão exibido | O que faz |
|----------|--------------|-----------|
| Documento aprovado ou publicado | **"Nova Versão"** | Inicia uma nova revisão oficial |
| Documento rejeitado | **"Re-submeter"** | Reenvia sem alterar o número de revisão |

> **Importante:** Não use "Nova Versão" apenas para corrigir um erro de envio — para isso, use "Re-submeter". "Nova Versão" incrementa o número de revisão e cria um registro formal de alteração.

### O que acontece ao clicar em "Nova Versão"

1. Uma janela abre pedindo:
   - O **novo arquivo** atualizado (upload)
   - O **motivo da revisão** (campo de texto — ex: "Atualização do procedimento conforme auditoria interna de jan/2026")

2. Ao confirmar:
   - A versão anterior é **arquivada automaticamente** — ela não é deletada, fica visível no histórico da página de detalhe
   - O **código do documento muda**, pois o número de revisão é incrementado:
     - `PQ-001.00` → `PQ-001.01` → `PQ-001.02`
     - O número sequencial (001) permanece o mesmo — continua sendo o mesmo documento
   - O sistema redireciona você automaticamente para a nova URL com o novo código
   - A nova versão começa em status **"Rascunho"** e passa por todo o ciclo novamente

### Diferenças na análise da IA para revisões

Quando a IA analisa uma nova versão, ela faz duas verificações adicionais que não existem no primeiro envio:

**1. Verificação de consistência**

> A IA compara o conteúdo novo com a versão anterior para garantir que o documento ainda trata do mesmo assunto.

Se você enviou o arquivo errado por engano (ex: subiu a IT-002 no lugar da IT-001 que pretendia revisar), a IA detecta e exibe um aviso. Esse aviso **não bloqueia** o processo — você pode continuar mesmo assim, mas é um sinal de atenção importante.

**2. Changelog automático comparativo**

> A IA não apenas descreve o novo documento — ela compara seção por seção com a versão anterior.

O resultado é um changelog detalhado que identifica:
- Seções **adicionadas**
- Seções **removidas**
- Seções **modificadas** (com trechos do que era e do que ficou)
- Um resumo geral em uma frase

Esse changelog fica visível na página de detalhe tanto para o autor quanto para os aprovadores, facilitando a revisão humana.

### O que muda e o que permanece igual

| Aspecto | Primeiro envio | Nova versão |
|---------|---------------|-------------|
| Código | `PQ-001.00` | `PQ-001.01`, `.02`... |
| Versão anterior | Não existe | Arquivada, visível no histórico |
| Verificação de consistência pela IA | Não | Sim — alerta se conteúdo divergir muito |
| Changelog gerado | "Versão inicial" | Comparação detalhada com a versão anterior |
| Revisão ortográfica | Sim | Sim (mesmo fluxo) |
| Formatação | Sim (opcional) | Sim (opcional) |
| Cadeia de aprovação | Nova | Nova — a cadeia anterior fica arquivada com a versão antiga |

---

## Perfil: Processos

### Fila de Revisão

Ao entrar no perfil **Processos**, você vê a fila de documentos aguardando aprovação.

- **Indicadores de urgência:** Documentos há mais de 3 dias aparecem com chip laranja; mais de 7 dias, vermelho.
- Clique em qualquer linha para abrir o documento e realizar a revisão.

### Revisando e Aprovando um Documento

Na página de detalhe (perfil Processos), você tem acesso a:

- **Análise da IA**: o que a IA encontrou e recomendou.
- **Histórico de revisão ortográfica**: quantas rodadas ocorreram e se o autor aceitou ou editou.
- **Changelog**: o que mudou em relação à versão anterior.
- **Cadeia de aprovação**: sua situação atual e os botões para agir.

Para aprovar, clique em **"Aprovar"**. Para rejeitar, clique em **"Rejeitar"** e informe o motivo.

### Publicando um Documento

Quando a cadeia de aprovação é concluída (todos aprovaram), aparece um card com o botão **"Publicar Documento"**. Ao clicar, o documento é publicado oficialmente e passa a constar na Lista Mestra.

### Lista Mestra

A Lista Mestra é o registro oficial de todos os documentos controlados ativos na empresa.

- Permite buscar por código, título ou número de lista mestra (LM).
- Pode filtrar por tipo (PQ, IT, RQ) e por status (Ativo, Obsoleto, Cancelado).
- Possui botão para **exportar em CSV**.

---

## Perfil: Admin

O administrador configura o funcionamento do sistema para todos os outros perfis.

| Seção | O que configura |
|-------|----------------|
| **Templates** | O modelo de formatação (margens, fontes, cabeçalho, rodapé) para cada tipo de documento |
| **Seções Obrigatórias** | Quais seções cada tipo de documento deve ter (verificadas pela IA na análise) |
| **Categorias** | Categorias para organizar os documentos |
| **Aprovadores Padrão** | Quem aprova cada tipo de documento por padrão (pode ser ajustado pelo autor no momento do envio) |
| **Importar Documentos** | Importar documentos legados em massa para o sistema |
| **Estatísticas de IA** | Relatório de quantas vezes cada agente de IA foi usado e quanto custou |

---

## O que a IA Recebe e o que Verifica em Cada Etapa

O sistema usa cinco agentes de IA diferentes, cada um com uma função específica. Abaixo está descrito, em linguagem simples, exatamente o que é enviado para a IA e o que ela é instruída a fazer.

---

### Agente 1 — Análise de Conformidade

**Quando atua:** Automaticamente após o envio do documento.

**O que é enviado para a IA:**
- O texto completo extraído do documento enviado pelo autor.
- O tipo do documento (PQ, IT ou RQ).

**O que a IA é instruída a fazer:**

A IA recebe a seguinte instrução (em resumo):

> *"Você é um analista de conformidade documental. Analise o documento nos seguintes critérios: (1) Completude — possui todas as seções e conteúdos obrigatórios? (2) Clareza — a linguagem é clara, profissional e sem ambiguidades? (3) Conformidade — segue as normas e padrões corporativos? (4) Formatação — a estrutura é lógica e bem organizada?"*

Além disso, recebe critérios específicos por tipo de documento:

**Para PQ (Procedimento da Qualidade):**
- Deve ter seção de Objetivo e Abrangência claramente definido
- Deve listar Documentos Complementares com códigos corporativos
- Deve ter seção de Definições e Siglas
- Deve ter Descrição das Atividades detalhada (seção mais importante — reprovado se vazia)
- Deve ter Responsabilidades definidas por cargo/setor
- Verifica se referências cruzadas a outros PQs ou ITs são consistentes

**Para IT (Instrução de Trabalho):**
- Deve ter Objetivo operacional específico
- Deve ter passos numerados e sequenciais
- A linguagem deve ser imperativa e direta (ex: "Execute", "Verifique")
- Deve ter Características do processo/produto
- Deve indicar Condições de Armazenamento se aplicável
- Condições de Segurança (EPIs, riscos): **obrigatório apenas para ITs de processos produtivos ou operacionais** — para ITs administrativas, de escritório ou de TI, essa seção é opcional

**Para RQ (Registro da Qualidade):**
- Deve ter campos de preenchimento identificados
- Não se aplica critérios de narrativa (objetivo, definições, etc.)
- Verifica se o formulário está completo e funcional
- Verifica se há campos obrigatórios claramente marcados

**O que a IA devolve:**
- Uma lista de itens verificados, cada um com status "aprovado" ou "reprovado" e sugestão de melhoria
- Um veredicto geral: aprovado (true) ou reprovado (false)

---

### Agente 2 — Revisão Ortográfica e Clareza

**Quando atua:** Logo após a análise de conformidade; pode rodar mais vezes se o autor editar o texto manualmente.

**O que é enviado para a IA:**
- O texto completo do documento.
- Indicação se é uma revisão completa (erros + clareza) ou apenas ortográfica (quando o autor já editou o texto e está na segunda rodada em diante).

**O que a IA é instruída a fazer:**

> *"Você é um revisor especialista em língua portuguesa (pt-BR) para documentos corporativos. Analise o texto e identifique: (1) Erros de ortografia — obrigatórios de corrigir. (2) Sugestões de clareza — opcionais, o usuário pode ignorar."*

Erros de ortografia buscados:
- Palavras grafadas incorretamente
- Acentuação incorreta ou ausente
- Erros de concordância gramatical
- Uso incorreto de crase, hífen, etc.

Sugestões de clareza buscadas (apenas na primeira rodada):
- Frases ambíguas ou confusas
- Jargão desnecessário que pode ser simplificado
- Frases muito longas que poderiam ser divididas
- Redundâncias

**Regra importante:** A IA **não altera** nomes próprios, siglas ou códigos de documentos (como PQ-001.00, EPI, NR, etc.).

**O que a IA devolve:**
- O texto completo já corrigido
- Lista de erros encontrados com original → corrigido e o trecho de contexto
- Lista de sugestões de clareza (opcional)
- Indicação se há erros ou sugestões

---

### Agente 3 — Formatação do Documento

**Quando atua:** Quando o autor clica em "Formatar Documento" (status "Em Revisão").

**O que é enviado para a IA:**
- O texto completo do documento (já revisado ortograficamente).
- O tipo do documento (PQ, IT ou RQ).
- A lista de seções obrigatórias configuradas no sistema para aquele tipo.

**O que a IA é instruída a fazer:**

> *"Você é um especialista em formatação de documentos corporativos. Sua tarefa é reestruturar o conteúdo do documento de acordo com a estrutura de seções do tipo de documento. Mapeie o conteúdo existente para as seções corretas. Preserve TODO o conteúdo original — não resuma nem remova nada."*

Seções padrão por tipo de documento:

| Tipo | Seções |
|------|--------|
| **PQ** | Objetivo e Abrangência, Documentos Complementares, Definições, Descrição das Atividades, Responsabilidades |
| **IT** | Objetivo e Abrangência, Documentos Complementares, Definições, Condições de Segurança, Características, Condições de Armazenamento |
| **RQ** | Mantém a estrutura original (é um formulário) |

**Regra de numeração de passos:**
- Seções de conteúdo operacional (ex: "Descrição das Atividades", "Características") têm os passos **renumerados automaticamente** em sequência: 1, 2, 3... com sub-etapas no formato 1.1, 1.2, 2.1...
- Seções descritivas (ex: Objetivo, Definições) mantêm formato de texto corrido, sem numeração forçada.
- A numeração original do documento é **sempre ignorada e refeita do zero**.

**O que a IA devolve:**
- O conteúdo reorganizado seção por seção
- Metadados extraídos (título, autor, data, se encontrados no texto)

---

### Agente 4 — Changelog (Registro de Alterações)

**Quando atua:** Automaticamente durante a análise, junto com o Agente 1.

**O que é enviado para a IA:**
- Para a **primeira versão** do documento: apenas o texto do documento novo.
- Para **revisões** (v2, v3...): o texto da versão anterior + o texto da nova versão.

**O que a IA é instruída a fazer:**

Para primeira versão:
> *"Analise o novo documento e gere um resumo do conteúdo. Descreva cada seção encontrada."*

Para revisões:
> *"Compare a nova versão com a anterior e gere um changelog detalhado. Identifique: seções adicionadas, seções removidas, seções modificadas com descrição das alterações."*

**O que a IA devolve:**
- Lista de alterações por seção (adicionado / removido / modificado)
- Trechos do conteúdo antigo e novo para comparação
- Resumo geral das alterações em uma frase

---

### Agente 5 — Validação de Referências Cruzadas

**Quando atua:** Automaticamente durante a análise, **apenas para documentos do tipo PQ**.

**Funciona em dois passos:**

**Passo 1 — Extração de referências:**

> *"Analise o texto deste PQ e extraia TODOS os documentos citados na seção 'Documentos Complementares'. Retorne apenas o que está explicitamente listado — não invente referências."*

A IA lista todos os documentos citados (ex: IT-003.00, PQ-010.01).

**Passo 2 — Validação:**

O sistema busca esses documentos no banco de dados e envia o conteúdo real deles para a IA, que verifica:

> *"Você é um auditor de documentos. Para cada documento referenciado, verifique: (A) Se ele é mencionado no corpo do texto da PQ (na seção de Descrição de Atividades). (B) Se o que a PQ diz sobre esse documento é consistente com o conteúdo real do documento."*

**O que a IA devolve:**
- Para cada documento referenciado: se foi encontrado no sistema, se é mencionado no texto, se o conteúdo é consistente
- Descrição dos problemas encontrados
- Resumo geral da validação (ex: "3 de 4 documentos validados com sucesso")

---

### Agente 6 — Detector de Segurança do Trabalho

**Quando atua:** Durante a análise, em paralelo com os demais agentes.

**O que é enviado para a IA:**
- Os primeiros 8.000 caracteres do texto do documento.

**O que a IA é instruída a fazer:**

> *"Você é um especialista em segurança do trabalho. Determine se o documento contém conteúdo relacionado a segurança do trabalho."*

A IA procura menções a:
- EPIs (Equipamentos de Proteção Individual)
- Riscos ocupacionais (químicos, físicos, biológicos, ergonômicos)
- NRs (Normas Regulamentadoras)
- Condições perigosas ou insalubres
- Trabalho em altura, espaço confinado, eletricidade
- CIPA, SESMT, PPRA, PCMSO
- Procedimentos de emergência, acidentes de trabalho

**O que a IA devolve:**
- Se o documento envolve segurança do trabalho (sim/não) com grau de confiança
- Lista dos tópicos de segurança identificados
- Recomendação (ex: "Recomenda-se incluir o Técnico de Segurança do Trabalho na cadeia de aprovação")

---

### Resumo: Qual agente faz o quê

| Agente | Quando roda | O que verifica | Resultado visível |
|--------|-------------|---------------|-------------------|
| Análise de Conformidade | Ao enviar | Seções obrigatórias, clareza, conformidade | Lista de aprovado/reprovado por item |
| Revisão Ortográfica | Após análise | Erros de escrita e clareza | Lista de erros + texto corrigido |
| Formatação | Ao clicar "Formatar" | — (reorganiza, não verifica) | Documento DOCX e PDF formatado |
| Changelog | Ao enviar | Diferenças em relação à versão anterior | Registro de alterações |
| Referências Cruzadas | Ao enviar (PQ) | Se os docs citados existem e são consistentes | Relatório de validação |
| Segurança do Trabalho | Ao enviar | Se o doc envolve temas de segurança | Recomendação de aprovador |

---

## Resumo dos Status e seus Significados

| Status | Cor | Significado | O que fazer |
|--------|-----|-------------|-------------|
| Rascunho | Cinza | Documento recém-enviado | Aguardar a análise da IA (automática) |
| Analisando | Azul | IA está verificando o documento | Aguardar |
| Revisão Ortográfica | Laranja | IA encontrou erros de escrita | Aceitar correções ou editar manualmente |
| **Em Revisão** | Azul | Análise concluída — pronto para formatar e aprovar | **Clicar em "Formatar Documento" ou enviar para aprovação** |
| Formatando | Azul | IA está formatando o documento | Aguardar |
| Aprovado | Verde | Todos os aprovadores aprovaram | Aguardar a publicação (perfil Processos) |
| Publicado | Verde | Documento oficialmente publicado | Está na Lista Mestra |
| Rejeitado | Vermelho | IA ou aprovador humano rejeitou | Corrigir e reenviar |

---

## Tipos de Documento

| Sigla | Nome | Descrição |
|-------|------|-----------|
| **PQ** | Procedimento da Qualidade | Descreve processos e fluxos de trabalho |
| **IT** | Instrução de Trabalho | Passo a passo operacional para executar uma tarefa |
| **RQ** | Registro da Qualidade | Formulários e registros de evidência |

---

## Dúvidas Frequentes

**Por que não apareço o botão "Formatar Documento"?**

O botão de formatação aparece somente quando o status é **"Em Revisão"**. Se a análise da IA ainda não concluiu ou se o documento ainda está na etapa de revisão ortográfica, o botão não aparece. Aguarde as etapas anteriores serem concluídas.

**A IA aprovou, mas o documento ainda precisa de aprovação humana?**

Sim. A aprovação da IA é apenas uma verificação automática de conformidade técnica. A aprovação humana (cadeia de aprovadores) é obrigatória e ocorre depois.

**Posso pular a formatação da IA?**

Sim. Quando o documento está "Em Revisão", você pode criar a cadeia de aprovação sem clicar em "Formatar Documento". O documento seguirá para aprovação no formato original.

**O que acontece se um aprovador rejeitar?**

O documento volta com status "Rejeitado" e o autor recebe o motivo informado. O autor corrige e reenvia uma nova versão, que passa por todo o ciclo novamente.

**O que é a Lista Mestra?**

É o registro oficial de todos os documentos normativos controlados da empresa. Só entram documentos publicados. O perfil Processos é o responsável por publicar.
