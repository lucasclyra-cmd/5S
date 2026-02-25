"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Eye,
  Send,
  Loader2,
  SpellCheck,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import type { TextReview } from "@/types";

interface TextReviewPanelProps {
  review: TextReview;
  onSubmitText: (text: string, skipClarity: boolean) => Promise<void>;
  onAccept: () => Promise<void>;
  loading: boolean;
}

export default function TextReviewPanel({
  review,
  onSubmitText,
  onAccept,
  loading,
}: TextReviewPanelProps) {
  const [mode, setMode] = useState<"diff" | "edit">("diff");
  const [editText, setEditText] = useState(
    review.ai_corrected_text || review.original_text
  );
  const [skipClarity, setSkipClarity] = useState(false);

  const isClean = !review.has_spelling_errors;
  const spellingCount = review.spelling_errors?.length ?? 0;
  const clarityCount = review.clarity_suggestions?.length ?? 0;

  async function handleSubmit() {
    await onSubmitText(editText, skipClarity);
  }

  async function handleAcceptAiText() {
    if (isClean) {
      await onAccept();
    } else {
      await onSubmitText(
        review.ai_corrected_text || review.original_text,
        skipClarity
      );
    }
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SpellCheck size={20} style={{ color: "var(--accent)" }} />
          <h3
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Revisão Ortográfica e Clareza
          </h3>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              background: "var(--bg-main)",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            Iteração {review.iteration}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isClean ? (
            <span className="badge-success">Ortografia OK</span>
          ) : (
            <span className="badge-danger">
              {spellingCount} erro(s) de ortografia
            </span>
          )}
          {clarityCount > 0 && (
            <span className="badge-warning">
              {clarityCount} sugestão(ões) de clareza
            </span>
          )}
        </div>
      </div>

      {/* Clean state — just show accept button */}
      {isClean && (
        <div
          className="mb-4"
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--success)",
            background: "rgba(45, 138, 78, 0.06)",
            padding: 16,
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--success)",
              }}
            >
              Nenhum erro ortográfico encontrado.
              {clarityCount > 0
                ? " Existem sugestões de clareza opcionais abaixo."
                : " O texto está pronto para prosseguir."}
            </p>
          </div>
        </div>
      )}

      {/* Spelling Errors List */}
      {spellingCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} style={{ color: "var(--danger)" }} />
            <h4
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--danger)",
              }}
            >
              Erros de Ortografia (obrigatório corrigir)
            </h4>
          </div>
          <div className="space-y-2">
            {review.spelling_errors.map((err, i) => (
              <div
                key={i}
                style={{
                  padding: 12,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(201, 69, 62, 0.2)",
                  background: "rgba(201, 69, 62, 0.04)",
                }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    style={{
                      textDecoration: "line-through",
                      color: "var(--danger)",
                      fontWeight: 500,
                    }}
                  >
                    {err.original}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>&rarr;</span>
                  <span
                    style={{ fontWeight: 600, color: "var(--success)" }}
                  >
                    {err.corrected}
                  </span>
                </div>
                {err.context && (
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 6,
                      fontStyle: "italic",
                    }}
                  >
                    Contexto: &ldquo;{err.context}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clarity Suggestions List */}
      {clarityCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} style={{ color: "var(--warning)" }} />
            <h4
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--warning)",
              }}
            >
              Sugestões de Clareza (opcional)
            </h4>
          </div>
          <div className="space-y-2">
            {review.clarity_suggestions.map((sug, i) => (
              <div
                key={i}
                style={{
                  padding: 12,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(230, 168, 23, 0.2)",
                  background: "rgba(230, 168, 23, 0.04)",
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  {sug.reason}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                    }}
                  >
                    &ldquo;{sug.original}&rdquo;
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>&rarr;</span>
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--accent)",
                      fontWeight: 500,
                    }}
                  >
                    &ldquo;{sug.suggested}&rdquo;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("diff")}
          className={mode === "diff" ? "btn-primary" : "btn-secondary"}
          style={{ fontSize: 13 }}
        >
          <Eye size={16} />
          Comparar textos
        </button>
        <button
          onClick={() => {
            setMode("edit");
            setEditText(
              review.ai_corrected_text || review.original_text
            );
          }}
          className={mode === "edit" ? "btn-primary" : "btn-secondary"}
          style={{ fontSize: 13 }}
        >
          <Edit3 size={16} />
          Editar manualmente
        </button>
      </div>

      {/* Diff view */}
      {mode === "diff" && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: "var(--text-muted)",
              }}
            >
              Texto Original
            </h4>
            <div
              className="overflow-auto"
              style={{
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-main)",
                padding: 16,
                maxHeight: 400,
              }}
            >
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                {review.original_text}
              </pre>
            </div>
          </div>
          <div>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: "var(--accent)",
              }}
            >
              Texto Corrigido pela IA
            </h4>
            <div
              className="overflow-auto"
              style={{
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--accent-border, var(--border))",
                background: "rgba(99, 102, 241, 0.04)",
                padding: 16,
                maxHeight: 400,
              }}
            >
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                }}
              >
                {review.ai_corrected_text || review.original_text}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Editor mode */}
      {mode === "edit" && (
        <div className="mb-4">
          <h4
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 8,
              color: "var(--text-primary)",
            }}
          >
            Edite o texto abaixo
          </h4>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            style={{
              width: "100%",
              minHeight: 400,
              padding: 16,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-main)",
              fontSize: 13,
              fontFamily: "monospace",
              lineHeight: 1.6,
              color: "var(--text-primary)",
              resize: "vertical",
            }}
          />
        </div>
      )}

      {/* Skip clarity checkbox */}
      {clarityCount > 0 && !isClean && (
        <label
          className="flex items-center gap-2 mb-4 cursor-pointer"
          style={{ fontSize: 13, color: "var(--text-secondary)" }}
        >
          <input
            type="checkbox"
            checked={skipClarity}
            onChange={(e) => setSkipClarity(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          Ignorar sugestões de clareza e prosseguir
        </label>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {isClean ? (
          <button
            onClick={handleAcceptAiText}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            Aceitar e Prosseguir
          </button>
        ) : (
          <>
            <button
              onClick={handleAcceptAiText}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <CheckCircle2 size={18} />
              )}
              Aceitar correções da IA
            </button>
            {mode === "edit" && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                Enviar texto editado para revisão
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
