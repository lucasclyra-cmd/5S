import json
from typing import Optional

from openai import AsyncOpenAI

BASE_PROMPT = """Você é um analista de conformidade documental para um sistema corporativo de gestão de documentos.

Analise o documento a seguir nos seguintes critérios:
1. **Completude** — Possui todas as seções e conteúdos obrigatórios?
2. **Conformidade** — Segue as normas e padrões corporativos?
3. **Formatação** — A estrutura é lógica e bem organizada?

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


TYPE_SPECIFIC_PROMPTS = {
    "PQ": """
Tipo de documento: Procedimento da Qualidade (PQ)
Critérios adicionais para PQ:
- DEVE ter seção de Objetivo e Abrangência claramente definido
- DEVE listar Documentos Complementares com códigos corporativos
- DEVE ter seção de Definições e Siglas
- DEVE ter Descrição das Atividades detalhada (seção mais importante - rejeite se vazia)
- DEVE ter Responsabilidades definidas por cargo/setor
- Verificar se referências cruzadas a outros PQs ou ITs são consistentes
""",
    "IT": """
Tipo de documento: Instrução de Trabalho (IT)
Critérios adicionais para IT:
- DEVE ter Objetivo operacional específico
- Condições de Segurança (EPIs, riscos): OBRIGATÓRIO apenas para ITs de processos produtivos, operacionais ou que envolvam equipamentos, máquinas, substâncias químicas ou riscos físicos. Para ITs administrativas, financeiras, de TI ou de escritório, esta seção é OPCIONAL — NÃO rejeite por ausência.
- DEVE ter passos numerados e sequenciais
- DEVE ter Características do processo/produto
- DEVE indicar Condições de Armazenamento se aplicável
""",
    "RQ": """
Tipo de documento: Registro da Qualidade (RQ)
Critérios adicionais para RQ:
- Deve ter campos de preenchimento identificados
- NÃO aplique critérios de narrativa (objetivo, definições, etc.)
- Verifique se o formulário está completo e funcional
- Verifique se há campos obrigatórios claramente marcados
""",
}


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

    if document_type and document_type in TYPE_SPECIFIC_PROMPTS:
        prompt_parts.append(TYPE_SPECIFIC_PROMPTS[document_type])
    elif document_type:
        prompt_parts.append(f"\nTipo de documento: {document_type}")

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
            "item": "Conteúdo do documento",
            "status": "approved" if has_content else "rejected",
            "suggestion": None if has_content else "O documento parece estar vazio ou muito curto.",
        },
        {
            "item": "Estrutura do documento",
            "status": "approved",
            "suggestion": None,
        },
    ]

    return {
        "feedback_items": feedback_items,
        "approved": all(item["status"] == "approved" for item in feedback_items),
    }
