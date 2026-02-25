"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  ChevronDown,
  AlertTriangle,
  SpellCheck,
  ClipboardCheck,
  Eye,
  Edit3,
  Send,
  Loader2,
  FileSearch,
} from "lucide-react";
import type { AIAnalysis, TextReview } from "@/types";

// ─── Props ───────────────────────────────────────────────────

interface UnifiedAnalysisPanelProps {
  analysis: AIAnalysis | null;
  textReview: TextReview | null;
  onSubmitText?: (text: string, skipClarity: boolean) => Promise<void>;
  onAccept?: () => Promise<void>;
  textReviewLoading?: boolean;
  mode?: "autor" | "processos";
  textReviewHistory?: TextReview[];
}

// ─── Collapsible Section ─────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  badge,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full"
        style={{
          padding: "12px 16px",
          background: expanded ? "var(--bg-main)" : "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {title}
          </span>
          {badge}
        </div>
        <ChevronDown
          size={16}
          style={{
            color: "var(--text-muted)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>
      {expanded && (
        <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function UnifiedAnalysisPanel({
  analysis,
  textReview,
  onSubmitText,
  onAccept,
  textReviewLoading = false,
  mode = "autor",
  textReviewHistory,
}: UnifiedAnalysisPanelProps) {
  // Section collapse state
  const spellingCount = textReview?.spelling_errors?.length ?? 0;
  const clarityCount = textReview?.clarity_suggestions?.length ?? 0;
  const hasSpellingErrors = textReview?.has_spelling_errors ?? false;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    completude: true,
    ortografia: hasSpellingErrors,
    clareza: clarityCount > 0,
  });

  // Spelling edit state (only for autor mode)
  const [spellingMode, setSpellingMode] = useState<"diff" | "edit">("diff");
  const [editText, setEditText] = useState(
    textReview?.ai_corrected_text || textReview?.original_text || ""
  );
  const [skipClarity, setSkipClarity] = useState(false);

  // Derived data
  const feedbackItems = analysis?.feedback_items ?? [];
  const approvedCount = feedbackItems.filter((i) => i.status === "approved").length;
  const totalCount = feedbackItems.length;
  const isClean = !hasSpellingErrors;

  function toggleSection(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleAcceptAiText() {
    if (!onSubmitText && !onAccept) return;
    if (isClean) {
      await onAccept?.();
    } else {
      await onSubmitText?.(
        textReview?.ai_corrected_text || textReview?.original_text || "",
        skipClarity
      );
    }
  }

  async function handleSubmitEdit() {
    await onSubmitText?.(editText, skipClarity);
  }

  return (
    <div className="card">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileSearch size={20} style={{ color: "var(--accent)" }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
            Análise de IA
          </h3>
        </div>
        <div>
          {analysis?.approved === true && <span className="badge-success">Aprovado</span>}
          {analysis?.approved === false && <span className="badge-danger">Rejeitado</span>}
          {analysis?.approved === null && <span className="badge-warning">Pendente</span>}
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────────────── */}
      {totalCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2" style={{ fontSize: 13 }}>
            <span style={{ color: "var(--text-secondary)" }}>
              {approvedCount} de {totalCount} itens aprovados
            </span>
            <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
              {Math.round((approvedCount / totalCount) * 100)}%
            </span>
          </div>
          <div
            style={{
              height: 8,
              width: "100%",
              overflow: "hidden",
              borderRadius: 100,
              background: "var(--bg-main)",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 100,
                background: "var(--success)",
                transition: "all 0.3s ease",
                width: `${totalCount > 0 ? (approvedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ── Quick stats badges ─────────────────────────────── */}
      {textReview && (
        <div className="flex flex-wrap gap-2 mb-5">
          <span className={isClean ? "badge-success" : "badge-danger"}>
            {isClean ? "Ortografia OK" : `${spellingCount} erro(s) ortográfico(s)`}
          </span>
          <span className={clarityCount > 0 ? "badge-warning" : "badge-success"}>
            {clarityCount > 0 ? `${clarityCount} sugestão(ões) de clareza` : "Clareza OK"}
          </span>
        </div>
      )}

      {/* ── Collapsible Sections ───────────────────────────── */}
      <div className="space-y-3">
        {/* ─ Completude e Conformidade ─ */}
        {analysis && (
          <CollapsibleSection
            title={`Completude e Conformidade${totalCount > 0 ? ` (${approvedCount}/${totalCount})` : ""}`}
            icon={<ClipboardCheck size={16} style={{ color: "var(--accent)" }} />}
            badge={
              totalCount > 0 && approvedCount === totalCount ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(45, 138, 78, 0.1)",
                    color: "var(--success)",
                  }}
                >
                  Completo
                </span>
              ) : null
            }
            expanded={expanded.completude}
            onToggle={() => toggleSection("completude")}
          >
            {feedbackItems.length > 0 ? (
              <div className="space-y-3">
                {feedbackItems.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${item.status === "approved" ? "var(--success)" : "var(--danger)"}`,
                      background:
                        item.status === "approved"
                          ? "rgba(45, 138, 78, 0.04)"
                          : "rgba(201, 69, 62, 0.04)",
                      padding: 14,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {item.status === "approved" ? (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                      ) : (
                        <XCircle size={18} className="mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: item.status === "approved" ? "var(--success)" : "var(--danger)",
                          }}
                        >
                          {item.item}
                        </p>
                        {item.suggestion && (
                          <div
                            className="mt-2 flex items-start gap-2"
                            style={{
                              borderRadius: "var(--radius-sm)",
                              background: "var(--bg-card)",
                              padding: 10,
                            }}
                          >
                            <Lightbulb size={14} className="mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
                            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                              {item.suggestion}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Nenhum item de feedback disponível.
              </p>
            )}
          </CollapsibleSection>
        )}

        {/* ─ Ortografia ─ */}
        {textReview && (
          <CollapsibleSection
            title={`Ortografia${spellingCount > 0 ? ` (${spellingCount} erro${spellingCount > 1 ? "s" : ""})` : ""}`}
            icon={<SpellCheck size={16} style={{ color: isClean ? "var(--success)" : "var(--danger)" }} />}
            badge={
              isClean ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(45, 138, 78, 0.1)",
                    color: "var(--success)",
                  }}
                >
                  OK
                </span>
              ) : null
            }
            expanded={expanded.ortografia}
            onToggle={() => toggleSection("ortografia")}
          >
            {isClean ? (
              /* Clean state */
              <div
                style={{
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--success)",
                  background: "rgba(45, 138, 78, 0.06)",
                  padding: 12,
                }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
                  <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 500 }}>
                    Nenhum erro ortográfico encontrado.
                  </span>
                </div>
              </div>
            ) : (
              /* Errors found */
              <div>
                {/* Error list */}
                <div className="space-y-2 mb-4">
                  {textReview.spelling_errors.map((err, i) => (
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
                        <span style={{ textDecoration: "line-through", color: "var(--danger)", fontWeight: 500 }}>
                          {err.original}
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>&rarr;</span>
                        <span style={{ fontWeight: 600, color: "var(--success)" }}>
                          {err.corrected}
                        </span>
                      </div>
                      {err.context && (
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                          Contexto: &ldquo;{err.context}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Interactive controls (only in autor mode) */}
                {mode === "autor" && (
                  <>
                    {/* Mode toggle */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setSpellingMode("diff")}
                        className={spellingMode === "diff" ? "btn-primary" : "btn-secondary"}
                        style={{ fontSize: 13 }}
                      >
                        <Eye size={16} />
                        Comparar textos
                      </button>
                      <button
                        onClick={() => {
                          setSpellingMode("edit");
                          setEditText(textReview.ai_corrected_text || textReview.original_text);
                        }}
                        className={spellingMode === "edit" ? "btn-primary" : "btn-secondary"}
                        style={{ fontSize: 13 }}
                      >
                        <Edit3 size={16} />
                        Editar manualmente
                      </button>
                    </div>

                    {/* Diff view */}
                    {spellingMode === "diff" && (
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>
                            Texto Original
                          </h4>
                          <div
                            className="overflow-auto"
                            style={{
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--border)",
                              background: "var(--bg-main)",
                              padding: 16,
                              maxHeight: 300,
                            }}
                          >
                            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, fontFamily: "monospace", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                              {textReview.original_text}
                            </pre>
                          </div>
                        </div>
                        <div>
                          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--accent)" }}>
                            Texto Corrigido pela IA
                          </h4>
                          <div
                            className="overflow-auto"
                            style={{
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--accent-border, var(--border))",
                              background: "rgba(99, 102, 241, 0.04)",
                              padding: 16,
                              maxHeight: 300,
                            }}
                          >
                            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, fontFamily: "monospace", color: "var(--text-primary)", lineHeight: 1.6 }}>
                              {textReview.ai_corrected_text || textReview.original_text}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Edit mode */}
                    {spellingMode === "edit" && (
                      <div className="mb-4">
                        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>
                          Edite o texto abaixo
                        </h4>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          style={{
                            width: "100%",
                            minHeight: 300,
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

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleAcceptAiText}
                        disabled={textReviewLoading}
                        className="btn-primary"
                      >
                        {textReviewLoading ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                        Aceitar correções da IA
                      </button>
                      {spellingMode === "edit" && (
                        <button
                          onClick={handleSubmitEdit}
                          disabled={textReviewLoading}
                          className="btn-secondary"
                        >
                          {textReviewLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Send size={18} />
                          )}
                          Enviar texto editado para revisão
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Processos mode: iteration history */}
            {mode === "processos" && textReviewHistory && textReviewHistory.length > 1 && (
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
                  Histórico de iterações
                </p>
                {textReviewHistory.map((rev, idx) => (
                  <div
                    key={rev.id || idx}
                    style={{
                      padding: "8px 12px",
                      marginBottom: 6,
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      background: "var(--bg-main)",
                      fontSize: 12,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                        Iteração {rev.iteration}
                      </span>
                      <span
                        style={{
                          padding: "1px 6px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 11,
                          fontWeight: 600,
                          background: rev.status === "clean" ? "rgba(34,197,94,0.1)" : "rgba(59,130,246,0.1)",
                          color: rev.status === "clean" ? "var(--success)" : "var(--accent)",
                        }}
                      >
                        {rev.status === "clean"
                          ? "Sem erros"
                          : rev.status === "user_accepted"
                            ? "Aceito pelo autor"
                            : rev.status === "user_edited"
                              ? "Editado pelo autor"
                              : rev.status}
                      </span>
                    </div>
                    {rev.spelling_errors?.length > 0 && (
                      <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                        {rev.spelling_errors.length} erro(s) ortográfico(s)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Autor clean state: accept button */}
            {mode === "autor" && isClean && textReview.status !== "clean" && onAccept && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={onAccept}
                  disabled={textReviewLoading}
                  className="btn-primary"
                >
                  {textReviewLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  Aceitar e Prosseguir
                </button>
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* ─ Clareza ─ */}
        {textReview && (
          <CollapsibleSection
            title={`Clareza${clarityCount > 0 ? ` (${clarityCount} sugestão${clarityCount > 1 ? "ões" : ""})` : ""}`}
            icon={<Lightbulb size={16} style={{ color: clarityCount > 0 ? "var(--warning)" : "var(--success)" }} />}
            badge={
              clarityCount === 0 ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(45, 138, 78, 0.1)",
                    color: "var(--success)",
                  }}
                >
                  OK
                </span>
              ) : null
            }
            expanded={expanded.clareza}
            onToggle={() => toggleSection("clareza")}
          >
            {clarityCount === 0 ? (
              /* No suggestions */
              <div
                style={{
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--success)",
                  background: "rgba(45, 138, 78, 0.06)",
                  padding: 12,
                }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
                  <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 500 }}>
                    Nenhuma sugestão de clareza.
                  </span>
                </div>
              </div>
            ) : (
              /* Suggestions list */
              <div>
                <div className="space-y-2">
                  {textReview.clarity_suggestions.map((sug, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 12,
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid rgba(230, 168, 23, 0.2)",
                        background: "rgba(230, 168, 23, 0.04)",
                      }}
                    >
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                        {sug.reason}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          &ldquo;{sug.original}&rdquo;
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>&rarr;</span>
                        <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>
                          &ldquo;{sug.suggested}&rdquo;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Skip clarity checkbox (only for autor with spelling errors) */}
                {mode === "autor" && hasSpellingErrors && (
                  <label
                    className="flex items-center gap-2 mt-3 cursor-pointer"
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
              </div>
            )}
          </CollapsibleSection>
        )}
      </div>

      {/* No data state */}
      {!analysis && !textReview && (
        <p className="text-center py-4" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Nenhuma análise disponível.
        </p>
      )}
    </div>
  );
}
