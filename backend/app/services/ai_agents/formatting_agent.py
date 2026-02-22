import json
from typing import Optional

from openai import AsyncOpenAI

BASE_PROMPT = """You are a corporate document formatting specialist.
Your task is to restructure the given document content according to the provided template configuration.

You should:
1. Reorganize sections to match the template structure
2. Adjust terminology to be professional and consistent
3. Fill in metadata placeholders where possible
4. Ensure proper section numbering and hierarchy

Return the restructured content as a JSON object with the following structure:
{
    "sections": [
        {
            "title": "Section Title",
            "content": "Section content text",
            "level": 1
        }
    ],
    "metadata": {
        "title": "Document title",
        "author": "Author if found",
        "date": "Date if found"
    }
}

Only return the JSON, no additional text."""


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


def get_mock_restructure(text: str) -> dict:
    """Return a mock restructured document for testing."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    sections = []

    if paragraphs:
        sections.append({
            "title": "Introduction",
            "content": paragraphs[0] if paragraphs else "",
            "level": 1,
        })
        if len(paragraphs) > 1:
            sections.append({
                "title": "Content",
                "content": "\n\n".join(paragraphs[1:]),
                "level": 1,
            })
    else:
        sections.append({
            "title": "Content",
            "content": text,
            "level": 1,
        })

    return {
        "sections": sections,
        "metadata": {
            "title": "Document",
            "author": "Unknown",
            "date": "Unknown",
        },
    }
