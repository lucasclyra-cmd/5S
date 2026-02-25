import json
from typing import Optional

from openai import AsyncOpenAI

BASE_PROMPT = """Você é um revisor especialista em língua portuguesa (pt-BR) para documentos corporativos.

Analise o texto a seguir e identifique:

1. **ERROS DE ORTOGRAFIA** (obrigatórios de corrigir):
   - Palavras grafadas incorretamente
   - Acentuação incorreta ou ausente
   - Erros de concordância gramatical
   - Uso incorreto de crase, hífen, etc.

2. **SUGESTÕES DE CLAREZA** (opcionais, o usuário pode ignorar):
   - Frases ambíguas ou confusas
   - Jargão desnecessário que pode ser simplificado
   - Frases muito longas que poderiam ser divididas
   - Redundâncias

Retorne um JSON com a seguinte estrutura:
{
    "corrected_text": "O texto completo com todas as correções de ortografia e sugestões de clareza aplicadas",
    "spelling_errors": [
        {
            "original": "palavra ou trecho errado",
            "corrected": "versão corrigida",
            "position": "número aproximado da posição no texto",
            "context": "frase contendo o erro para facilitar localização"
        }
    ],
    "clarity_suggestions": [
        {
            "original": "trecho original",
            "suggested": "versão sugerida mais clara",
            "reason": "breve explicação da melhoria",
            "position": "número aproximado da posição no texto"
        }
    ],
    "has_spelling_errors": true/false,
    "has_clarity_suggestions": true/false
}

REGRAS IMPORTANTES:
- O campo corrected_text deve conter o texto COMPLETO com TODAS as correções aplicadas
- NÃO resuma nem omita nenhuma parte do texto
- Mantenha toda a formatação original (parágrafos, listas, etc.)
- Considere terminologia técnica corporativa como correta (siglas como PQ, IT, RQ, EPI, NR, etc.)
- Não altere nomes próprios, siglas ou códigos de documentos
- Se o texto estiver claro e bem escrito, retorne clarity_suggestions como array vazio
- NÃO invente sugestões de clareza apenas para ter algo a dizer
- Apenas sugira melhorias de clareza quando houver um problema REAL e CONCRETO de compreensão
- Frases tecnicamente corretas e claras no contexto corporativo NÃO precisam de sugestões
- Prefira retornar menos sugestões de alta qualidade do que muitas sugestões irrelevantes

Apenas retorne o JSON, sem texto adicional."""

SPELLING_ONLY_SUFFIX = """

ATENÇÃO: Nesta iteração, avalie APENAS erros de ORTOGRAFIA.
Ignore completamente sugestões de clareza — retorne clarity_suggestions como array vazio."""


async def review_spelling_clarity(
    client: AsyncOpenAI,
    text: str,
    spelling_only: bool = False,
) -> dict:
    """Review text for spelling errors and clarity issues using OpenAI."""
    prompt = BASE_PROMPT
    if spelling_only:
        prompt += SPELLING_ONLY_SUFFIX

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Revise o seguinte texto:\n\n{text}"},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    result = json.loads(content)

    # Ensure required fields
    if "corrected_text" not in result:
        result["corrected_text"] = text
    if "spelling_errors" not in result:
        result["spelling_errors"] = []
    if "clarity_suggestions" not in result:
        result["clarity_suggestions"] = []
    if "has_spelling_errors" not in result:
        result["has_spelling_errors"] = len(result["spelling_errors"]) > 0
    if "has_clarity_suggestions" not in result:
        result["has_clarity_suggestions"] = len(result["clarity_suggestions"]) > 0

    return result


def get_mock_review(text: str, spelling_only: bool = False) -> dict:
    """Return a mock spelling/clarity review when no OpenAI key is available."""
    return {
        "corrected_text": text,
        "spelling_errors": [],
        "clarity_suggestions": [],
        "has_spelling_errors": False,
        "has_clarity_suggestions": False,
    }
