import json
from typing import Optional

from openai import AsyncOpenAI

BASE_PROMPT = """You are a document compliance analyst for a corporate document management system.
Analyze the following document for:
1. Completeness - Does it have all required sections and content?
2. Clarity - Is the language clear, professional, and unambiguous?
3. Compliance - Does it follow corporate norms and standards?
4. Formatting - Is the structure logical and well-organized?

Return your analysis as a JSON object with the following structure:
{
    "feedback_items": [
        {
            "item": "Description of the item checked",
            "status": "approved" or "rejected",
            "suggestion": "Suggestion for improvement if rejected, null if approved"
        }
    ],
    "approved": true or false (overall approval)
}

Only return the JSON, no additional text."""


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
        result["approved"] = len([
            item for item in result["feedback_items"]
            if item.get("status") == "rejected"
        ]) == 0

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
