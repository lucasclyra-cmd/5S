import json
from typing import Optional

from openai import AsyncOpenAI

EXTRACT_PROMPT = """Você é um especialista em documentos corporativos (procedimentos, instruções de trabalho).

Analise o texto de um documento do tipo PQ (Procedimento da Qualidade) e extraia TODOS os documentos
citados na seção "2. Documentos Complementares" (ou seção equivalente que liste documentos referenciados).

Retorne um JSON com a seguinte estrutura:
{
    "references": [
        {
            "code_or_title": "Código ou título do documento citado (ex: IT-003.00, PQ-010.01)",
            "description": "Descrição curta do documento conforme aparece no texto"
        }
    ]
}

REGRAS:
- Extraia TODOS os documentos mencionados na seção de documentos complementares
- Inclua o código do documento (ex: IT-001.00, PQ-005.02) se disponível
- Se apenas o título for mencionado (sem código), use o título completo
- Não invente referências — extraia apenas o que está explicitamente listado
- Se não houver seção de documentos complementares, retorne references como array vazio

Apenas retorne o JSON, sem texto adicional."""

VALIDATE_PROMPT = """Você é um auditor de documentos corporativos especializado em validação de referências cruzadas.

Você receberá:
1. O texto de uma PQ (Procedimento da Qualidade)
2. Uma lista de documentos referenciados com seus conteúdos reais

Para cada documento referenciado, verifique:
A) Se ele é MENCIONADO no corpo do texto da PQ (especialmente na seção "3. Descrição de Atividades" ou seções similares de conteúdo operacional)
B) Se o que a PQ diz sobre esse documento é CONSISTENTE com o conteúdo real do documento

Retorne um JSON com a seguinte estrutura:
{
    "cross_references": [
        {
            "cited_document": "Código/título do documento citado",
            "found_in_system": true,
            "mentioned_in_text": true/false,
            "content_consistent": true/false/null,
            "issues": "Descrição do problema encontrado, ou null se tudo OK"
        }
    ],
    "summary": "Resumo geral da validação (ex: '3 de 4 documentos validados com sucesso')"
}

REGRAS:
- mentioned_in_text: true se o documento é referenciado no corpo do texto (seção 3 ou similar), false se só aparece no item 2
- content_consistent: true se o que a PQ diz é compatível com o conteúdo real, false se contradiz, null se não encontrado no sistema
- Seja preciso e objetivo nas descrições de problemas
- Considere que nomes podem variar ligeiramente (abreviações, versões diferentes do título)

Apenas retorne o JSON, sem texto adicional."""


async def extract_references(client: AsyncOpenAI, text: str) -> list[dict]:
    """Extract document references from the 'Documentos Complementares' section of a PQ."""
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": EXTRACT_PROMPT},
            {"role": "user", "content": f"Extraia as referências deste documento PQ:\n\n{text}"},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    result = json.loads(content)
    return result.get("references", [])


async def validate_references(
    client: AsyncOpenAI,
    pq_text: str,
    references_with_content: list[dict],
) -> dict:
    """Validate cross-references between a PQ and its cited documents.

    references_with_content: list of {cited_document, found_in_system, extracted_text}
    """
    # Build context for the AI
    ref_sections = []
    for ref in references_with_content:
        if ref.get("found_in_system") and ref.get("extracted_text"):
            ref_sections.append(
                f"--- DOCUMENTO: {ref['cited_document']} ---\n"
                f"{ref['extracted_text'][:3000]}\n"
                f"--- FIM ---"
            )
        else:
            ref_sections.append(
                f"--- DOCUMENTO: {ref['cited_document']} ---\n"
                f"[NÃO ENCONTRADO NA PLATAFORMA]\n"
                f"--- FIM ---"
            )

    refs_text = "\n\n".join(ref_sections)

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": VALIDATE_PROMPT},
            {
                "role": "user",
                "content": (
                    f"TEXTO DA PQ:\n\n{pq_text}\n\n"
                    f"===== DOCUMENTOS REFERENCIADOS =====\n\n{refs_text}"
                ),
            },
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    result = json.loads(content)

    if "cross_references" not in result:
        result["cross_references"] = []
    if "summary" not in result:
        result["summary"] = ""

    return result


def get_mock_crossref(text: str) -> dict:
    """Return a mock cross-reference validation when no OpenAI key is available."""
    return {
        "cross_references": [],
        "summary": "Validação de referências cruzadas não disponível (modo mock)",
    }
