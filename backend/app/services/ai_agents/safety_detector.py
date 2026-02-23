import json
from typing import Optional

from openai import AsyncOpenAI

BASE_PROMPT = """Você é um especialista em segurança do trabalho que analisa documentos corporativos.

Analise o seguinte texto de documento e determine se ele contém conteúdo relacionado a segurança do trabalho.

Procure por menções a:
- EPIs (Equipamentos de Proteção Individual)
- Riscos ocupacionais (químicos, físicos, biológicos, ergonômicos)
- NRs (Normas Regulamentadoras)
- Condições perigosas ou insalubres
- Procedimentos de emergência
- Manuseio de produtos químicos
- Proteção contra incêndio
- Trabalho em altura, espaço confinado, eletricidade
- CIPA, SESMT, PPRA, PCMSO
- Acidentes de trabalho

Retorne um JSON com a seguinte estrutura:
{
    "involves_safety": true ou false,
    "confidence": 0.0 a 1.0,
    "safety_topics": ["lista de tópicos de segurança encontrados"],
    "recommendation": "Recomendação sobre necessidade de aprovação por Técnico de Segurança"
}

Retorne APENAS o JSON, sem texto adicional."""


async def detect_safety(
    client: AsyncOpenAI,
    text: str,
) -> dict:
    """Detect if document content involves workplace safety topics."""
    messages = [
        {"role": "system", "content": BASE_PROMPT},
        {"role": "user", "content": f"Analise o seguinte documento:\n\n{text[:8000]}"},
    ]

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.1,
        max_tokens=500,
    )

    content = response.choices[0].message.content or "{}"
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    return json.loads(content)


def get_mock_safety_detection(text: str) -> dict:
    """Mock safety detection for when no AI client is available."""
    safety_keywords = [
        "epi", "equipamento de proteção", "segurança do trabalho",
        "nr-", "norma regulamentadora", "risco", "perigo",
        "incêndio", "emergência", "acidente", "insalubre",
        "cipa", "sesmt", "ppra", "pcmso", "proteção",
        "químico", "tóxico", "espaço confinado", "altura",
    ]

    text_lower = text.lower()
    found_topics = [kw for kw in safety_keywords if kw in text_lower]
    involves_safety = len(found_topics) >= 2

    return {
        "involves_safety": involves_safety,
        "confidence": 0.8 if involves_safety else 0.2,
        "safety_topics": found_topics[:5],
        "recommendation": (
            "Recomenda-se incluir o Técnico de Segurança do Trabalho na cadeia de aprovação."
            if involves_safety
            else "Não foram identificados temas significativos de segurança do trabalho."
        ),
    }
