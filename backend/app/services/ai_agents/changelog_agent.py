import json
from typing import Optional

from openai import AsyncOpenAI

BASE_PROMPT_NEW = """You are a document changelog specialist.
Analyze the following new document and generate a content summary.

Return a JSON object with this structure:
{
    "diff_content": {
        "sections": [
            {
                "section": "Section name",
                "change_type": "added",
                "description": "Brief description of this section's content"
            }
        ]
    },
    "summary": "A brief overall summary of the document content"
}

Only return the JSON, no additional text."""

BASE_PROMPT_COMPARE = """You are a document changelog specialist.
Compare the new version of a document with the previous version and generate a detailed changelog.

Identify:
1. Added sections or content
2. Removed sections or content
3. Modified sections with description of changes

Return a JSON object with this structure:
{
    "diff_content": {
        "sections": [
            {
                "section": "Section name",
                "change_type": "added" | "removed" | "modified",
                "description": "Description of the change",
                "old_content_snippet": "Brief snippet of old content if modified/removed",
                "new_content_snippet": "Brief snippet of new content if modified/added"
            }
        ]
    },
    "summary": "A brief overall summary of changes between versions"
}

Only return the JSON, no additional text."""


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
