# Design: Download com Marcas d'Água e Controle de Acesso por Status

**Data:** 2026-02-25
**Status:** Aprovado para implementação

---

## Contexto

Todo documento aprovado pela IA precisa oferecer ao usuário a opção de formatar ou baixar o arquivo já formatado. Atualmente, o botão "Formatar" e os botões de download aparecem simultaneamente — isso causa confusão. Além disso, documentos não publicados não recebem marca d'água, o que os torna indistinguíveis de versões oficiais, e a view `/processos/[docId]` não oferece nenhuma opção de download.

---

## Requisitos

1. **Exclusão mútua** — "Formatar" ou "Baixar", nunca os dois ao mesmo tempo
2. **DOCX** — disponível apenas quando a versão está `published`
3. **PDF** — disponível sempre que houver PDF formatado; backend adiciona a marca d'água correta automaticamente
4. **Marcas d'água:**
   - Não publicado (qualquer status exceto `published`, `archived`, `obsolete`) → laranja diagonal "AGUARDANDO ANÁLISE"
   - Arquivado/obsoleto → vermelho diagonal "VERSÃO DESATUALIZADA" (já existe)
   - Publicado → sem marca d'água (documento limpo)
5. **Acesso** — download disponível para qualquer perfil autenticado que visualize o documento (`/autor`, `/processos`, `/admin`)

---

## Arquitetura

### Backend — `backend/app/routers/export.py`

**Nova função:** `_add_pending_watermark(input_pdf_path: str) -> str`
- Texto: `"AGUARDANDO ANÁLISE"`
- Cor: laranja `(0.95, 0.55, 0.0)`
- Rotação: 45°, fontname: `Helvetica-Bold`, fontsize: 50
- Posição: centralizada em cada página
- Retorna path de arquivo temporário (mesmo padrão de `_add_obsolete_watermark`)

**Atualização de `download_pdf()`:**
```python
if version.status in ("archived", "obsolete"):
    # watermark VERSÃO DESATUALIZADA (já existe)
elif version.status == "published":
    # sem watermark (retorna FileResponse direta)
else:
    # watermark AGUARDANDO ANÁLISE (novo)
```

**Atualização de `download_docx()`:**
```python
if version.status != "published":
    raise HTTPException(403, "DOCX disponível apenas após publicação")
```

### Frontend — `frontend/src/app/autor/[docId]/page.tsx`

Mudança na lógica dos botões de ação (seção "Ações", linhas 486–523):

| Condição | Botão exibido |
|----------|---------------|
| `isApproved` E `!currentVersion?.formatted_file_path_pdf` | **Formatar Documento** |
| `currentVersion?.formatted_file_path_pdf` existe | **Baixar PDF** |
| `currentVersion?.formatted_file_path_docx` E `currentVersion?.status === "published"` | **Baixar DOCX** |

Regras de exclusão mútua:
- "Formatar" desaparece quando já existe PDF formatado
- "Baixar DOCX" só aparece quando `published`

### Frontend — `frontend/src/app/processos/[docId]/page.tsx`

Adicionar seção de downloads ao painel de ações com as mesmas regras:
- Importar `getExportUrl` de `@/lib/api`
- Exibir "Baixar PDF" quando `formatted_file_path_pdf` existe
- Exibir "Baixar DOCX" apenas quando `status === "published"`

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `backend/app/routers/export.py` | Adicionar `_add_pending_watermark()`, atualizar lógica de PDF, bloquear DOCX se não publicado |
| `frontend/src/app/autor/[docId]/page.tsx` | Exclusão mútua Formatar/Baixar, condicional DOCX por status |
| `frontend/src/app/processos/[docId]/page.tsx` | Adicionar botões de download com as mesmas regras |

---

## Verificação

1. Submeter documento → AI aprova → clicar "Formatar" → verificar que o botão "Formatar" desaparece e botões de download aparecem
2. Baixar PDF com status `in_review` → confirmar marca d'água laranja "AGUARDANDO ANÁLISE"
3. Publicar documento → baixar PDF → confirmar que não há marca d'água
4. Nova versão de doc publicado → versão antiga fica `archived` → baixar PDF antigo → confirmar "VERSÃO DESATUALIZADA"
5. Tentar baixar DOCX de doc não publicado via URL direta → receber 403
6. Acessar `/processos/[docId]` → confirmar botões de download visíveis
