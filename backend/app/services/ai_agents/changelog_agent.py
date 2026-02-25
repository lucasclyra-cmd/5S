import json
from typing import Optional

from openai import AsyncOpenAI

BASE_PROMPT_NEW = """Você é um especialista em registro de alterações de documentos corporativos.
Analise o novo documento a seguir e gere um resumo do conteúdo.

Retorne um objeto JSON com a seguinte estrutura:
{
    "diff_content": {
        "sections": [
            {
                "section": "Nome da seção",
                "change_type": "added",
                "description": "Breve descrição do conteúdo desta seção"
            }
        ]
    },
    "summary": "Um breve resumo geral do conteúdo do documento"
}

REGRAS IMPORTANTES:
- Responda SEMPRE em português brasileiro (pt-BR)
- Todas as descrições e resumos devem estar em português
- Mantenha as chaves do JSON em inglês (diff_content, sections, section, change_type, description, summary)

Apenas retorne o JSON, sem texto adicional."""

BASE_PROMPT_COMPARE = """Você é um especialista em registro de alterações de documentos corporativos.
Compare a nova versão de um documento com a versão anterior e gere um changelog detalhado.

Identifique:
1. Seções ou conteúdos adicionados
2. Seções ou conteúdos removidos
3. Seções modificadas com descrição das alterações

Retorne um objeto JSON com a seguinte estrutura:
{
    "diff_content": {
        "sections": [
            {
                "section": "Nome da seção",
                "change_type": "added" | "removed" | "modified",
                "description": "Descrição da alteração",
                "old_content_snippet": "Trecho breve do conteúdo anterior se modificado/removido",
                "new_content_snippet": "Trecho breve do novo conteúdo se modificado/adicionado"
            }
        ]
    },
    "summary": "Um breve resumo geral das alterações entre as versões"
}

REGRAS IMPORTANTES:
- Responda SEMPRE em português brasileiro (pt-BR)
- Todas as descrições, trechos e resumos devem estar em português
- Mantenha as chaves do JSON em inglês (diff_content, sections, change_type, description, summary, etc.)

Apenas retorne o JSON, sem texto adicional."""


async def generate_changelog(
    client: AsyncOpenAI,
    new_text: str,
    old_text: Optional[str] = None,
) -> dict:
    """Generate a changelog comparing two document versions using OpenAI."""
    if old_text is None:
        # New document - generate content summary
        system_prompt = BASE_PROMPT_NEW
        user_content = f"New document content:\n\n{new_text}"
    else:
        # Compare versions
        system_prompt = BASE_PROMPT_COMPARE
        user_content = (
            f"PREVIOUS VERSION:\n\n{old_text}\n\n"
            f"---\n\n"
            f"NEW VERSION:\n\n{new_text}"
        )

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    result = json.loads(content)

    if "diff_content" not in result:
        result["diff_content"] = {"sections": []}
    if "summary" not in result:
        result["summary"] = "Changelog generated."

    return result


def get_mock_changelog(new_text: str, old_text: Optional[str] = None) -> dict:
    """Return a mock changelog for testing."""
    if old_text is None:
        return {
            "diff_content": {
                "sections": [
                    {
                        "section": "Full Document",
                        "change_type": "added",
                        "description": "Initial document version created.",
                    }
                ]
            },
            "summary": "Initial document version. All content is new.",
        }

    return {
        "diff_content": {
            "sections": [
                {
                    "section": "Content",
                    "change_type": "modified",
                    "description": "Document content has been updated.",
                    "old_content_snippet": old_text[:200] if old_text else "",
                    "new_content_snippet": new_text[:200] if new_text else "",
                }
            ]
        },
        "summary": "Document has been updated with new content.",
    }
