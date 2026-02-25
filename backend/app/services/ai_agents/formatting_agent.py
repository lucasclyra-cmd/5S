import json
import re
from typing import Optional

from openai import AsyncOpenAI

BASE_PROMPT = """Você é um especialista em formatação de documentos corporativos do sistema de qualidade TEX COTTON.
Sua tarefa é reestruturar o conteúdo do documento de acordo com a estrutura de seções do tipo de documento.

{sections_block}

INSTRUÇÕES GERAIS:
1. Mapeie o conteúdo existente do documento para as seções corretas do tipo de documento
2. Se uma seção não tiver conteúdo, inclua-a com conteúdo vazio
3. Preserve TODO o conteúdo original — não resuma nem remova nada
4. Mantenha referências a imagens (ex: "Figura 1", "Imagem") como marcadores no texto
5. Use terminologia profissional em português brasileiro

INSTRUÇÕES DE NUMERAÇÃO DE PASSOS:
Cada seção tem um tipo indicado: [PROCEDURAL] ou [PROSE].

Para seções [PROCEDURAL]:
- Detecte todas as ações/etapas e numere-as sequencialmente: 1, 2, 3...
- SEMPRE renumere do zero — ignore a numeração original se houver
- Se um passo tiver sub-etapas subordinadas, use o formato: 1.1, 1.2, 2.1, 2.2...
- Cada passo em sua própria linha, separado por \\n
- Não use bullets (•, -, *) em seções procedurais — use apenas números
- Sub-passos só devem ser criados quando o conteúdo original contém sub-etapas claras
- Se a seção estiver vazia, retorne content como string vazia (não invente passos)

Para seções [PROSE]:
- Mantenha como texto corrido, parágrafos separados por \\n
- Não force numeração em definições, objetivos ou listas de documentos

Retorne o conteúdo reestruturado como um objeto JSON:
{{
    "sections": [
        {{
            "title": "Título da Seção (em português)",
            "content": "Para [PROCEDURAL]: '1. Primeiro passo\\n2. Segundo passo\\n2.1 Sub-etapa'. Para [PROSE]: texto corrido.",
            "level": 1
        }}
    ],
    "metadata": {{
        "title": "Título do documento extraído do conteúdo",
        "author": "Autor, se encontrado no conteúdo",
        "date": "Data, se encontrada no conteúdo"
    }}
}}

REGRAS IMPORTANTES:
- Responda SEMPRE em português brasileiro (pt-BR)
- Mantenha as chaves do JSON em inglês (sections, title, content, level, metadata)
- Considere terminologia técnica corporativa como correta (siglas como PQ, IT, RQ, EPI, NR, etc.)

Apenas retorne o JSON, sem texto adicional."""


DEFAULT_SECTIONS: dict[str, list[str]] = {
    "PQ": [
        "Objetivo e Abrangência",
        "Documentos Complementares",
        "Definições",
        "Descrição das Atividades",
        "Responsabilidades",
    ],
    "IT": [
        "Objetivo e Abrangência",
        "Documentos Complementares",
        "Definições",
        "Condições de Segurança",
        "Características",
        "Condições de Armazenamento",
    ],
}

PROCEDURAL_SECTIONS: dict[str, set[str]] = {
    "IT": {"Características", "Condições de Segurança", "Condições de Armazenamento"},
    "PQ": {"Descrição das Atividades", "Responsabilidades"},
    "RQ": set(),
}


def _build_sections_block(document_type: Optional[str], sections: Optional[list[str]]) -> str:
    """Build the sections instruction block for the prompt, annotating each section type."""
    if sections:
        proc_secs = PROCEDURAL_SECTIONS.get(document_type or "", set())
        label = document_type or "Documento"
        annotated = " → ".join(
            f"{s} [PROCEDURAL]" if s in proc_secs else f"{s} [PROSE]"
            for s in sections
        )
        return (
            f"ESTRUTURA DE SEÇÕES:\n\n"
            f"**{label}:**\n"
            f"Seções: {annotated}"
        )

    # Fallback: use defaults for all known types
    lines = ["ESTRUTURAS POR TIPO DE DOCUMENTO:\n"]
    for dt, secs in DEFAULT_SECTIONS.items():
        proc_secs = PROCEDURAL_SECTIONS.get(dt, set())
        annotated = " → ".join(
            f"{s} [PROCEDURAL]" if s in proc_secs else f"{s} [PROSE]"
            for s in secs
        )
        lines.append(f"**{dt}:**\nSeções: {annotated}\n")
    lines.append("**RQ (Registro da Qualidade):**\nSeções: manter a estrutura original (formulários/registros) — todas as seções são [PROSE].")
    return "\n".join(lines)


async def restructure(
    client: AsyncOpenAI,
    text: str,
    template_config: Optional[dict] = None,
    document_type: Optional[str] = None,
    sections: Optional[list[str]] = None,
) -> dict:
    """Restructure document content according to a template using OpenAI."""
    sections_block = _build_sections_block(document_type, sections)
    prompt = BASE_PROMPT.format(sections_block=sections_block)
    prompt_parts = [prompt]

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
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    result = json.loads(content)

    if "sections" not in result:
        result["sections"] = [{"title": "Content", "content": text, "level": 1}]
    if "metadata" not in result:
        result["metadata"] = {}

    return result


def _number_steps(text: str) -> str:
    """Numera sequencialmente as linhas de uma seção procedural, removendo numeração prévia."""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    numbered = []
    for i, line in enumerate(lines, start=1):
        cleaned = re.sub(r"^(\d+[\.\)]?\s*|[•\-\*]\s*)", "", line)
        numbered.append(f"{i}. {cleaned}")
    return "\n".join(numbered)


def get_mock_restructure(
    text: str,
    document_type: Optional[str] = None,
    sections: Optional[list[str]] = None,
) -> dict:
    """Return a mock restructured document organized by document type sections."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    # Use provided sections, or fall back to defaults
    if sections:
        section_names = sections
    else:
        section_names = DEFAULT_SECTIONS.get(document_type or "PQ", DEFAULT_SECTIONS["PQ"])

    if not paragraphs:
        result_sections = [
            {"title": name, "content": "", "level": 1}
            for name in section_names
        ]
    elif len(paragraphs) <= len(section_names):
        result_sections = []
        for i, name in enumerate(section_names):
            content = paragraphs[i] if i < len(paragraphs) else ""
            result_sections.append({"title": name, "content": content, "level": 1})
    else:
        # Distribute paragraphs across sections
        per_section = max(1, len(paragraphs) // len(section_names))
        result_sections = []
        idx = 0
        for i, name in enumerate(section_names):
            end = idx + per_section if i < len(section_names) - 1 else len(paragraphs)
            content = "\n\n".join(paragraphs[idx:end])
            result_sections.append({"title": name, "content": content, "level": 1})
            idx = end

    # Apply sequential numbering to procedural sections
    proc_secs = PROCEDURAL_SECTIONS.get(document_type or "", set())
    for sec in result_sections:
        if sec["title"] in proc_secs and sec["content"]:
            sec["content"] = _number_steps(sec["content"])

    # Extract title from first line
    title = "Documento"
    if paragraphs:
        first_line = paragraphs[0].split("\n")[0][:100]
        if len(first_line) < 80:
            title = first_line

    return {
        "sections": result_sections,
        "metadata": {"title": title, "author": "Unknown", "date": "Unknown"},
    }
