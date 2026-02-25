import json
from typing import Optional

from openai import AsyncOpenAI

BASE_PROMPT = """Você é um analista de conformidade documental para um sistema corporativo de gestão de documentos.

Analise o documento a seguir nos seguintes critérios:
1. **Completude** — Possui todas as seções e conteúdos obrigatórios?
2. **Clareza** — A linguagem é clara, profissional e sem ambiguidades?
3. **Conformidade** — Segue as normas e padrões corporativos?
4. **Formatação** — A estrutura é lógica e bem organizada?

Retorne sua análise como um objeto JSON com a seguinte estrutura:
{
    "feedback_items": [
        {
            "item": "Descrição do item verificado",
            "status": "approved" ou "rejected",
            "suggestion": "Sugestão de melhoria se rejeitado, null se aprovado"
        }
    ],
    "approved": true ou false (aprovação geral)
}

REGRAS IMPORTANTES:
- Responda SEMPRE em português brasileiro (pt-BR)
- Todas as descrições, sugestões e textos devem estar em português
- Mantenha as chaves do JSON em inglês (feedback_items, status, suggestion, approved)
- Considere terminologia técnica corporativa como correta (siglas como PQ, IT, RQ, EPI, NR, etc.)

Apenas retorne o JSON, sem texto adicional."""


async def analyze(
    client: AsyncOpenAI,
    text: str,
    rules: Optional[dict] = None,
    document_type: Optional[str] = None,
) -> dict:
    """Analyze a document using the OpenAI API and return structured feedback."""
    prompt_parts = [BASE_PROMPT]

    if rules:
        rules_text = json.dumps(rules, indent=2)
        prompt_parts.append(f"\nAdditional analysis rules to apply:\n{rules_text}")

    if document_type:
        prompt_parts.append(f"\nDocument type: {document_type}")

    system_prompt = "\n".join(prompt_parts)

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze this document:\n\n{text}"},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    result = json.loads(content)

    # Ensure required fields
    if "feedback_items" not in result:
        result["feedback_items"] = []
    if "approved" not in result:
        result["approved"] = all(
            item.get("status") != "rejected" for item in result["feedback_items"]
        )

    return result


def get_mock_analysis(text: str) -> dict:
    """Return a mock analysis for testing when no OpenAI key is available."""
    has_content = len(text.strip()) > 100
    feedback_items = [
        {
            "item": "Document has content",
            "status": "approved" if has_content else "rejected",
            "suggestion": None if has_content else "Document appears to be empty or too short.",
        },
        {
            "item": "Document structure",
            "status": "approved",
            "suggestion": None,
        },
        {
            "item": "Language clarity",
            "status": "approved",
            "suggestion": None,
        },
    ]

    return {
        "feedback_items": feedback_items,
        "approved": all(item["status"] == "approved" for item in feedback_items),
    }
