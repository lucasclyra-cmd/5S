"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  FileBarChart,
  ClipboardList,
} from "lucide-react";
import {
  getDocument,
  getAnalysis,
  getChangelog,
  generateChangelog,
  getApprovalChain,
  getTextReviewHistory,
  publishDocument,
  getAuditReportUrl,
} from "@/lib/api";
import type {
  DocumentWithVersions,
  DocumentVersion,
  AIAnalysis,
  Changelog,
  ApprovalChain,
  TextReview,
} from "@/types";
import { formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import AIFeedback from "@/components/AIFeedback";
import ChangelogViewer from "@/components/ChangelogViewer";
import DocumentPreview from "@/components/DocumentPreview";
import ApprovalChainView from "@/components/ApprovalChain";
import DistributionPanel from "@/components/DistributionPanel";
import { useToast } from "@/lib/toast-context";

const CONFIDENTIALITY_LABELS: Record<string, string> = {
  publico: "Público",
  interno: "Interno",
  restrito: "Restrito",
  confidencial: "Confidencial",
};

export default function ProcessosReviewPage() {
  const params = useParams();
  const router = useRouter();
  const docCode = params.docId as string;
  const { showToast } = useToast();

  const [document, setDocument] = useState<DocumentWithVersions | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [approvalChain, setApprovalChain] = useState<ApprovalChain | null>(null);
  const [textReviewHistory, setTextReviewHistory] = useState<TextReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [docCode]);

  async function loadDocument() {
    setLoading(true);
    setError(null);
    try {
      const doc = await getDocument(docCode);
      setDocument(doc);

      if (doc.versions && doc.versions.length > 0) {
        const currentVersion = doc.versions[doc.versions.length - 1];
        try {
          const anal = await getAnalysis(currentVersion.id);
          setAnalysis(anal);
        } catch {
          setAnalysis(null);
        }
        try {
          const cl = await getChangelog(currentVersion.id);
          setChangelog(cl);
        } catch (err: any) {
          if (err?.status === 404) {
            try {
              const cl = await generateChangelog(currentVersion.id);
              setChangelog(cl);
            } catch {
              setChangelog(null);
            }
          } else {
            setChangelog(null);
          }
        }
        try {
          const chain = await getApprovalChain(currentVersion.id);
          setApprovalChain(chain);
        } catch {
          setApprovalChain(null);
        }
        try {
          const history = await getTextReviewHistory(currentVersion.id);
          setTextReviewHistory(Array.isArray(history) ? history : []);
        } catch {
          setTextReviewHistory([]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar documento");
    } finally {
      setLoading(false);
    }
  }

  function getCurrentVersion(): DocumentVersion | null {
    if (!document?.versions || document.versions.length === 0) return null;
    return document.versions[document.versions.length - 1];
  }

  function handleChainUpdate(updatedChain: ApprovalChain) {
    setApprovalChain(updatedChain);
    // Reload document if chain resolved
    if (updatedChain.status === "approved" || updatedChain.status === "rejected") {
      loadDocument();
    }
  }

  async function handlePublish() {
    if (!document) return;
    setPublishing(true);
    try {
      await publishDocument(document.code);
      showToast("Documento publicado com sucesso!", "success");
      await loadDocument();
    } catch (err: any) {
      showToast(err?.message || "Erro ao publicar documento", "error");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
        <span style={{ marginLeft: 12, fontSize: 13, color: "var(--text-muted)" }}>
          Carregando documento...
        </span>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link
          href="/processos"
          className="inline-flex items-center gap-1.5 transition-colors mb-4"
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} />
          Voltar à fila
        </Link>
        <div className="card text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "var(--danger)" }} />
          <h3 style={{ fontSize: 18, fontWeight: 500, color: "var(--text-primary)" }}>
            Erro ao carregar documento
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{error}</p>
          <button onClick={loadDocument} className="btn-primary mt-6">
            <RefreshCw size={18} />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!document) return null;

  const currentVersion = getCurrentVersion();
  const hasISOInfo = document.review_due_date || document.retention_years || document.confidentiality_level;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/processos"
        className="inline-flex items-center gap-1.5 transition-colors mb-6"
        style={{ fontSize: 13, color: "var(--text-muted)" }}
      >
        <ArrowLeft size={16} />
        Voltar à fila
      </Link>

      {/* Error banner */}
      {error && (
        <div
          className="mb-6"
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--danger)",
            background: "rgba(201, 69, 62, 0.06)",
            padding: 16,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      {/* Document header */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-md)",
              background: "var(--accent-light)",
              border: "1px solid var(--accent-border)",
            }}
          >
            <FileText size={24} style={{ color: "var(--accent)" }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                {document.title}
              </h1>
              <StatusBadge status={document.status} />
            </div>
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1"
              style={{ fontSize: 13, color: "var(--text-secondary)" }}
            >
              <span>
                Código: <strong style={{ color: "var(--text-primary)" }}>{document.code}</strong>
              </span>
              <span>
                Versão: <strong style={{ color: "var(--text-primary)" }}>v{document.current_version}</strong>
              </span>
              <span>
                Autor: <strong style={{ color: "var(--text-primary)" }}>{document.created_by_profile}</strong>
              </span>
              {document.sector && (
                <span>
                  Setor: <strong style={{ color: "var(--text-primary)" }}>{document.sector}</strong>
                </span>
              )}
              <span>Criado em: {formatDateTime(document.created_at)}</span>
            </div>
            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {document.tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ISO Compliance Info Panel */}
      {hasISOInfo && (
        <div
          className="mb-6"
          style={{
            background: "var(--accent-light)",
            border: "1px solid var(--accent-border)",
            borderRadius: "var(--radius-md)",
            padding: 16,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={16} style={{ color: "var(--accent)" }} />
            <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              Informações de Conformidade ISO
            </h4>
          </div>
          <div
            className="flex flex-wrap gap-x-6 gap-y-1"
            style={{ fontSize: 13, color: "var(--text-secondary)" }}
          >
            {document.review_due_date && (
              <span>
                Revisão prevista:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {new Date(document.review_due_date).toLocaleDateString("pt-BR")}
                </strong>
              </span>
            )}
            {document.retention_years && (
              <span>
                Retenção:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {document.retention_years} {document.retention_years === 1 ? "ano" : "anos"}
                </strong>
              </span>
            )}
            {document.confidentiality_level && (
              <span>
                Confidencialidade:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {CONFIDENTIALITY_LABELS[document.confidentiality_level] ?? document.confidentiality_level}
                </strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Audit Report Link */}
      <div className="mb-6">
        <a
          href={getAuditReportUrl(document.code)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2"
          style={{
            fontSize: 13,
            color: "var(--accent)",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--accent-border)",
            background: "var(--accent-light)",
          }}
        >
          <FileBarChart size={15} />
          Relatório de Auditoria (PDF)
        </a>
      </div>

      {/* Publish button — shown when document is approved */}
      {document.status === "approved" && !currentVersion?.published_at && (
        <div
          className="card mb-6"
          style={{
            background: "rgba(45, 138, 78, 0.06)",
            border: "1px solid var(--success)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                Documento Aprovado
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                A cadeia de aprovação foi concluída. O documento pode ser publicado.
              </p>
            </div>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="btn-primary"
              style={{ flexShrink: 0 }}
            >
              {publishing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <BookOpen size={18} />
              )}
              Publicar Documento
            </button>
          </div>
        </div>
      )}

      {/* Reviewer action context banner */}
      {approvalChain && approvalChain.status === "pending" && (
        <div
          className="card"
          style={{
            marginBottom: 24,
            background: "rgba(230,168,23,0.06)",
            border: "1px solid var(--accent-border)",
          }}
        >
          <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
            <AlertCircle size={20} style={{ color: "var(--warning)", flexShrink: 0 }} />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
              Documento aguardando aprovação
            </h3>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            Revise a análise da IA, o histórico de revisão textual e o changelog abaixo.
            Use os controles da Cadeia de Aprovação para registrar sua decisão.
          </p>
          <div className="flex gap-4" style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <span>
              Aprovadores: {approvalChain.approvers?.filter((a: any) => a.action === "approve").length ?? 0}/{approvalChain.approvers?.length ?? 0}
            </span>
            {approvalChain.requires_training && (
              <span style={{ color: "var(--warning)" }}>Requer treinamento</span>
            )}
          </div>
        </div>
      )}

      {/* Approval Chain */}
      {approvalChain && (
        <div className="mb-6">
          <ApprovalChainView
            chain={approvalChain}
            onUpdate={handleChainUpdate}
            isProcessos
          />
        </div>
      )}

      {/* No chain yet message */}
      {!approvalChain && document.status === "in_review" && (
        <div
          className="card mb-6 text-center py-8"
          style={{ borderStyle: "dashed" }}
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            A cadeia de aprovação ainda não foi configurada pelo autor.
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            O autor precisa configurar os aprovadores para este documento.
          </p>
        </div>
      )}

      {/* AI Analysis */}
      {analysis && (
        <div className="mb-6">
          <AIFeedback analysis={analysis} />
        </div>
      )}

      {/* Text Review History */}
      {textReviewHistory.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
            Histórico de Revisão Textual
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            Revisões ortográficas e de clareza realizadas antes da aprovação.
          </p>
          {textReviewHistory.map((rev, idx) => (
            <div
              key={rev.id || idx}
              style={{
                padding: "10px 14px",
                marginBottom: 8,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg-main)",
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                  Iteração {rev.iteration}
                </span>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 11,
                  fontWeight: 600,
                  background: rev.status === "clean" ? "rgba(34,197,94,0.1)" : "rgba(59,130,246,0.1)",
                  color: rev.status === "clean" ? "var(--success)" : "var(--accent)",
                }}>
                  {rev.status === "clean" ? "Sem erros" : rev.status === "user_accepted" ? "Aceito pelo autor" : rev.status === "user_edited" ? "Editado pelo autor" : rev.status}
                </span>
              </div>
              {rev.spelling_errors && rev.spelling_errors.length > 0 && (
                <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {rev.spelling_errors.length} erro(s) ortográfico(s) encontrado(s)
                </p>
              )}
              {rev.clarity_suggestions && rev.clarity_suggestions.length > 0 && (
                <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {rev.clarity_suggestions.length} sugestão(ões) de clareza
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Changelog */}
      {changelog && (
        <div className="mb-6">
          <ChangelogViewer changelog={changelog} />
        </div>
      )}

      {/* Document preview */}
      {currentVersion?.extracted_text && (
        <div className="mb-6">
          <DocumentPreview text={currentVersion.extracted_text} />
        </div>
      )}

      {/* Distribution panel */}
      {document && (
        <div className="mb-6">
          <DistributionPanel documentId={document.id} documentCode={document.code} />
        </div>
      )}
    </div>
  );
}
