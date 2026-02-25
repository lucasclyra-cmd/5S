import json
from typing import Optional

from openai import AsyncOpenAI

BASE_PROMPT = """Você é um especialista em formatação de documentos corporativos do sistema de qualidade TEX COTTON.
Sua tarefa é reestruturar o conteúdo do documento de acordo com a estrutura de seções do tipo de documento.

ESTRUTURAS POR TIPO DE DOCUMENTO:

**PQ (Procedimento da Qualidade):**
Seções: Objetivo e Abrangência → Documentos Complementares → Definições → Descrição das Atividades → Responsabilidades → Aprovação do Documento → Alterações

**IT (Instrução de Trabalho):**
Seções: Objetivo e Abrangência → Documentos Complementares → Definições → Condições de Segurança → Características → Condições de Armazenamento → Aprovação do Documento → Alterações

**RQ (Registro da Qualidade):**
Seções: manter a estrutura original (formulários/registros).

INSTRUÇÕES:
1. Mapeie o conteúdo existente do documento para as seções corretas do tipo de documento
2. Se uma seção não tiver conteúdo, inclua-a com conteúdo vazio
3. Preserve TODO o conteúdo original — não resuma nem remova nada
4. Mantenha referências a imagens (ex: "Figura 1", "Imagem") como marcadores no texto
5. Use terminologia profissional em português brasileiro

Retorne o conteúdo reestruturado como um objeto JSON:
{
    "sections": [
        {
            "title": "Título da Seção (em português)",
            "content": "Texto completo do conteúdo da seção",
            "level": 1
        }
    ],
    "metadata": {
        "title": "Título do documento extraído do conteúdo",
        "author": "Autor, se encontrado no conteúdo",
        "date": "Data, se encontrada no conteúdo"
    }
}

REGRAS IMPORTANTES:
- Responda SEMPRE em português brasileiro (pt-BR)
- Mantenha as chaves do JSON em inglês (sections, title, content, level, metadata)
- Considere terminologia técnica corporativa como correta (siglas como PQ, IT, RQ, EPI, NR, etc.)

Apenas retorne o JSON, sem texto adicional."""


PQ_SECTIONS = [
    "Objetivo e Abrangência",
    "Documentos Complementares",
    "Definições",
    "Descrição das Atividades",
    "Responsabilidades",
]

IT_SECTIONS = [
    "Objetivo e Abrangência",
    "Documentos Complementares",
    "Definições",
    "Condições de Segurança",
    "Características",
    "Condições de Armazenamento",
]


async def restructure(
    client: AsyncOpenAI,
    text: str,
    template_config: Optional[dict] = None,
    document_type: Optional[str] = None,
) -> dict:
    """Restructure document content according to a template using OpenAI."""
    prompt_parts = [BASE_PROMPT]

    if template_config:
        config_text = json.dumps(template_config, indent=2)
        prompt_parts.append(f"\nTemplate configuration:\n{config_text}")

    if document_type:
        prompt_parts.append(f"\nDocument type: {document_type}")
        prompt_parts.append(f"Organize the content strictly into the {document_type} section structure above.")

    system_prompt = "\n".join(prompt_parts)

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Restructure this document:\n\n{text}"},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    result = json.loads(content)

    if "sections" not in result:
        result["sections"] = [{"title": "Content", "content": text, "level": 1}]
    if "metadata" not in result:
        result["metadata"] = {}

    return result


def get_mock_restructure(text: str, document_type: Optional[str] = None) -> dict:
    """Return a mock restructured document organized by document type sections."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    # Choose section list based on document type
    if document_type == "IT":
        section_names = IT_SECTIONS
    elif document_type == "PQ":
        section_names = PQ_SECTIONS
    else:
        section_names = PQ_SECTIONS  # default

    if not paragraphs:
        sections = [
            {"title": name, "content": "", "level": 1}
            for name in section_names
        ]
    elif len(paragraphs) <= len(section_names):
        sections = []
        for i, name in enumerate(section_names):
            content = paragraphs[i] if i < len(paragraphs) else ""
            sections.append({"title": name, "content": content, "level": 1})
    else:
        # Distribute paragraphs across sections
        per_section = max(1, len(paragraphs) // len(section_names))
        sections = []
        idx = 0
        for i, name in enumerate(section_names):
            end = idx + per_section if i < len(section_names) - 1 else len(paragraphs)
            content = "\n\n".join(paragraphs[idx:end])
            sections.append({"title": name, "content": content, "level": 1})
            idx = end

    # Extract title from first line
    title = "Documento"
    if paragraphs:
        first_line = paragraphs[0].split("\n")[0][:100]
        if len(first_line) < 80:
            title = first_line

    return {
        "sections": sections,
        "metadata": {"title": title, "author": "Unknown", "date": "Unknown"},
    }
