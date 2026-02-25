"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  SkipForward,
  Paintbrush,
  Loader2,
  AlertCircle,
  FileDown,
  History,
  Upload,
} from "lucide-react";
import {
  getDocument,
  getAnalysis,
  formatDocument,
  skipAiApproval,
  resubmitDocument,
  getChangelog,
  generateChangelog,
  getExportUrl,
  getApprovalChain,
  getTextReview,
  submitTextReview,
  acceptTextReview,
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
import UnifiedAnalysisPanel from "@/components/UnifiedAnalysisPanel";
import ChangelogViewer from "@/components/ChangelogViewer";
import DocumentPreview from "@/components/DocumentPreview";
import DocumentUpload from "@/components/DocumentUpload";
import ApproverSelector from "@/components/ApproverSelector";
import ApprovalChainView from "@/components/ApprovalChain";
import { useToast } from "@/lib/toast-context";

export default function DocumentDetail() {
  const { showToast } = useToast();
  const params = useParams();
  const router = useRouter();
  const docCode = params.docId as string;

  const [document, setDocument] = useState<DocumentWithVersions | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [approvalChain, setApprovalChain] = useState<ApprovalChain | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingChangelog, setLoadingChangelog] = useState(false);
  const [loadingChain, setLoadingChain] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [showResubmit, setShowResubmit] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [textReview, setTextReview] = useState<TextReview | null>(null);
  const [textReviewLoading, setTextReviewLoading] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDocument();
  }, [docCode]);

  // Phase 1: Fetch the document and render the header immediately
  async function loadDocumentOnly() {
    try {
      const doc = await getDocument(docCode);
      setDocument(doc);
      return doc;
    } catch (err: any) {
      setError(err.message || "Erro ao carregar documento");
      return null;
    }
  }

  // Phase 2: Fetch secondary data in parallel
  async function loadSecondaryData(doc: DocumentWithVersions) {
    if (!doc.versions || doc.versions.length === 0) return;
    const currentVersion = doc.versions[doc.versions.length - 1];

    setLoadingAnalysis(true);
    setLoadingChangelog(true);
    setLoadingChain(true);
    setLoadingReview(true);

    async function fetchChangelog(versionId: number): Promise<Changelog | null> {
      try {
        return await getChangelog(versionId);
      } catch (err: any) {
        if (err?.status === 404) {
          try {
            return await generateChangelog(versionId);
          } catch {
            return null;
          }
        }
        return null;
      }
    }

    const [analysisResult, changelogResult, chainResult, reviewResult] =
      await Promise.allSettled([
        getAnalysis(currentVersion.id),
        fetchChangelog(currentVersion.id),
        getApprovalChain(currentVersion.id),
        getTextReview(currentVersion.id),
      ]);

    setAnalysis(analysisResult.status === "fulfilled" ? analysisResult.value : null);
    setLoadingAnalysis(false);

    setChangelog(changelogResult.status === "fulfilled" ? changelogResult.value : null);
    setLoadingChangelog(false);

    setApprovalChain(chainResult.status === "fulfilled" ? chainResult.value : null);
    setLoadingChain(false);

    setTextReview(reviewResult.status === "fulfilled" ? reviewResult.value : null);
    setLoadingReview(false);
  }

  // Full load: Phase 1 then Phase 2
  async function loadDocument() {
    setLoading(true);
    setError(null);
    try {
      const doc = await loadDocumentOnly();
      if (doc) {
        setLoading(false);
        await loadSecondaryData(doc);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar documento");
    } finally {
      setLoading(false);
    }
  }

  // Auto-polling for documents in processing states
  useEffect(() => {
    const processingStatuses = ["analyzing", "spelling_review", "formatting"];
    if (document && processingStatuses.includes(document.status)) {
      pollingRef.current = setInterval(() => {
        loadDocumentOnly();
      }, 5000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [document?.status]);

  function getCurrentVersion(): DocumentVersion | null {
    if (!document?.versions || document.versions.length === 0) return null;
    return document.versions[document.versions.length - 1];
  }

  async function handleFormat() {
    const version = getCurrentVersion();
    if (!version) return;
    setActionLoading("format");
    try {
      await formatDocument(version.id);
      showToast("Documento formatado com sucesso.", "success");
      await loadDocument();
    } catch (err: any) {
      setError(err.message || "Erro ao formatar documento");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSkipAi() {
    setActionLoading("skip");
    try {
      await skipAiApproval(docCode);
      showToast("Documento encaminhado para revisão humana.", "info");
      await loadDocument();
    } catch (err: any) {
      setError(err.message || "Erro ao pular aprovacao da IA");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResubmit() {
    if (!resubmitFile) return;
    setActionLoading("resubmit");
    try {
      const result = await resubmitDocument(docCode, resubmitFile, "autor", changeSummary);
      setResubmitFile(null);
      setChangeSummary("");
      setShowResubmit(false);
      showToast("Nova versão enviada com sucesso.", "success");
      // Redirect to new document code (revision number changes the code)
      if (result.document.code !== docCode) {
        router.push(`/autor/${result.document.code}`);
      } else {
        await loadDocument();
      }
    } catch (err: any) {
      setError(err.message || "Erro ao reenviar documento");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSubmitTextReview(text: string, skipClarity: boolean) {
    const version = getCurrentVersion();
    if (!version) return;
    setTextReviewLoading(true);
    try {
      const newReview = await submitTextReview(version.id, text, skipClarity);
      setTextReview(newReview);
      await loadDocument();
    } catch (err: any) {
      setError(err.message || "Erro na revisao de texto");
    } finally {
      setTextReviewLoading(false);
    }
  }

  async function handleAcceptTextReview() {
    const version = getCurrentVersion();
    if (!version) return;
    setTextReviewLoading(true);
    try {
      const review = await acceptTextReview(version.id);
      setTextReview(review);
      await loadDocument();
    } catch (err: any) {
      setError(err.message || "Erro ao aceitar revisao");
    } finally {
      setTextReviewLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
        <span style={{ marginLeft: 12, fontSize: 13.5, color: "var(--text-muted)" }}>
          Carregando documento...
        </span>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link
          href="/autor"
          className="inline-flex items-center gap-1.5 transition-colors mb-4"
          style={{ fontSize: 13.5, color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} />
          Voltar ao painel
        </Link>
        <div className="card text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "var(--danger)" }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
            Erro ao carregar documento
          </h3>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 4 }}>{error}</p>
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
  const isRejected = document.status === "rejected";
  const isSpellingReview = currentVersion?.status === "spelling_review";
  const isApproved =
    (document.status === "approved" || analysis?.approved === true) &&
    !isSpellingReview;
  const midProcessingStatuses = ["draft", "analyzing", "spelling_review", "pending_analysis", "formatting", "active", "in_review"];
  const canUpdate = !midProcessingStatuses.includes(document.status);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/autor"
        className="inline-flex items-center gap-1.5 transition-colors mb-6"
        style={{ fontSize: 13.5, color: "var(--text-muted)" }}
      >
        <ArrowLeft size={16} />
        Voltar ao painel
      </Link>

      {/* Error banner */}
      {error && (
        <div
          className="mb-6"
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(201, 69, 62, 0.2)",
            background: "rgba(201, 69, 62, 0.06)",
            padding: 16,
          }}
        >
          <p style={{ fontSize: 13.5, color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      {/* Document header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex items-center justify-center"
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
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: "var(--text-primary)" }}>
                  {document.title}
                </h1>
                <StatusBadge status={document.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1" style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
                <span>
                  Código: <strong style={{ color: "var(--text-primary)" }}>{document.code}</strong>
                </span>
                <span>
                  Versão: <strong style={{ color: "var(--text-primary)" }}>v{document.current_version}</strong>
                </span>
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
              {currentVersion?.change_summary && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--accent-light)",
                    border: "1px solid var(--accent-border)",
                    fontSize: 13.5,
                    color: "var(--text-secondary)",
                  }}
                >
                  <strong style={{ color: "var(--text-primary)" }}>Motivo da atualização:</strong>{" "}
                  {currentVersion.change_summary}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="card mb-6">
        <h3 className="section-title">Ações</h3>
        <div className="flex flex-wrap gap-3">
          {(document.status === "analyzing" || document.status === "draft") && (
            <div className="flex items-center gap-2" style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "rgba(59, 130, 246, 0.06)",
              border: "1px solid rgba(59, 130, 246, 0.15)",
              fontSize: 13.5,
              color: "var(--text-secondary)",
            }}>
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }} />
              <span>A análise de IA está sendo executada automaticamente. Aguarde...</span>
            </div>
          )}

          {isRejected && (
            <>
              <button
                onClick={() => setShowResubmit(!showResubmit)}
                disabled={actionLoading !== null}
                className="btn-primary"
              >
                <RefreshCw size={18} />
                Re-submeter
              </button>
              <button
                onClick={() => setShowSkipConfirm(true)}
                disabled={actionLoading !== null || showSkipConfirm}
                className="btn-secondary"
              >
                {actionLoading === "skip" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <SkipForward size={18} />
                )}
                Prosseguir sem aprovação da IA
              </button>
            </>
          )}

          {canUpdate && !isRejected && (
            <button
              onClick={() => setShowResubmit(!showResubmit)}
              disabled={actionLoading !== null}
              className="btn-secondary"
            >
              <Upload size={18} />
              Nova Versão
            </button>
          )}

          {/* Formatar só aparece quando aprovado E ainda sem PDF formatado */}
          {isApproved && !currentVersion?.formatted_file_path_pdf && (
            <button
              onClick={handleFormat}
              disabled={actionLoading !== null}
              className="btn-primary"
            >
              {actionLoading === "format" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Paintbrush size={18} />
              )}
              Formatar Documento
            </button>
          )}

          {/* Download PDF — disponível sempre que houver PDF formatado (watermark aplicado automaticamente pelo backend) */}
          {currentVersion?.formatted_file_path_pdf && (
            <a
              href={getExportUrl(currentVersion.id, "pdf")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-success"
            >
              <FileDown size={18} />
              Baixar PDF
            </a>
          )}

          {/* Download DOCX — somente após publicação */}
          {currentVersion?.formatted_file_path_docx && currentVersion?.status === "published" && (
            <a
              href={getExportUrl(currentVersion.id, "docx")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-success"
            >
              <FileDown size={18} />
              Baixar DOCX
            </a>
          )}
        </div>

        {/* Skip AI confirmation warning */}
        {showSkipConfirm && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--warning)",
              background: "rgba(234, 179, 8, 0.06)",
            }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={20} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13.5, color: "var(--text-primary)", fontWeight: 600, marginBottom: 8 }}>
                  Atenção
                </p>
                <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 12 }}>
                  Ao prosseguir sem aprovação da IA, o documento seguirá para revisão humana sem passar pelas verificações automáticas de conformidade.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowSkipConfirm(false);
                      handleSkipAi();
                    }}
                    disabled={actionLoading !== null}
                    className="btn-primary"
                    style={{ fontSize: 13 }}
                  >
                    {actionLoading === "skip" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : null}
                    Confirmar
                  </button>
                  <button
                    onClick={() => setShowSkipConfirm(false)}
                    className="btn-secondary"
                    style={{ fontSize: 13 }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resubmit / Update form */}
      {showResubmit && (
        <div className="card mb-6">
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
            {isRejected ? "Re-submeter Documento" : "Atualizar Documento — Nova Versão"}
          </h3>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
            {isRejected
              ? "Selecione uma nova versão do arquivo para reanálise."
              : "Envie uma nova versão do documento. A versão atual será arquivada."}
          </p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
              Motivo da Atualização
            </label>
            <textarea
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="Descreva brevemente o que mudou nesta versão..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                resize: "vertical",
                background: "var(--bg-main)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <DocumentUpload
            onFileSelect={setResubmitFile}
            selectedFile={resubmitFile}
            uploading={actionLoading === "resubmit"}
            onClear={() => setResubmitFile(null)}
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleResubmit}
              disabled={!resubmitFile || actionLoading !== null}
              className="btn-primary"
            >
              {actionLoading === "resubmit" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              Enviar nova versão
            </button>
            <button
              onClick={() => {
                setShowResubmit(false);
                setResubmitFile(null);
                setChangeSummary("");
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Approval Chain - show if exists */}
      {loadingChain && (
        <div className="card mb-6 flex items-center gap-2" style={{ padding: 16 }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Carregando cadeia de aprovação...</span>
        </div>
      )}
      {!loadingChain && approvalChain && (
        <div className="mb-6">
          <ApprovalChainView
            chain={approvalChain}
            onUpdate={setApprovalChain}
          />
        </div>
      )}

      {/* Approval Setup - show when AI approved and no chain yet */}
      {!loadingChain &&
        currentVersion &&
        (isApproved || document.status === "in_review") &&
        !approvalChain && (
          <div className="mb-6">
            <ApproverSelector
              versionId={currentVersion.id}
              documentType={document.document_type}
              onChainCreated={loadDocument}
            />
          </div>
        )}

      {/* Unified AI Analysis Panel */}
      {(loadingAnalysis || loadingReview) && (
        <div className="card mb-6 flex items-center gap-2" style={{ padding: 16 }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Carregando análise da IA...</span>
        </div>
      )}
      {!loadingAnalysis && !loadingReview && (analysis || textReview) && (
        <div className="mb-6">
          <UnifiedAnalysisPanel
            analysis={analysis}
            textReview={textReview}
            onSubmitText={handleSubmitTextReview}
            onAccept={handleAcceptTextReview}
            textReviewLoading={textReviewLoading}
            mode="autor"
          />
        </div>
      )}

      {/* Changelog */}
      {loadingChangelog && (
        <div className="card mb-6 flex items-center gap-2" style={{ padding: 16 }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Carregando changelog...</span>
        </div>
      )}
      {!loadingChangelog && changelog && (
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

      {/* Version history */}
      {document.versions && document.versions.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <History size={20} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
              Histórico de Versões
            </h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Versão</th>
                  <th>Status</th>
                  <th>IA</th>
                  <th>Motivo</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {[...document.versions].reverse().map((v) => (
                  <tr key={v.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        v{v.version_number}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={v.status} />
                    </td>
                    <td>
                      {v.ai_approved === true && (
                        <CheckCircle2
                          size={18}
                          style={{ color: "var(--success)" }}
                        />
                      )}
                      {v.ai_approved === false && (
                        <XCircle size={18} style={{ color: "var(--danger)" }} />
                      )}
                      {v.ai_approved === null && (
                        <Clock size={18} style={{ color: "var(--text-muted)" }} />
                      )}
                    </td>
                    <td>
                      <span style={{ color: "var(--text-secondary)", fontSize: 12.5 }}>
                        {v.change_summary || "—"}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {formatDateTime(v.submitted_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity timeline */}
      {(analysis || approvalChain) && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <Clock size={20} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
              Linha do Tempo
            </h3>
          </div>
          <div style={{ position: "relative", paddingLeft: 24 }}>
            {/* Vertical connector line */}
            <div style={{
              position: "absolute",
              left: 7,
              top: 8,
              bottom: 8,
              width: 2,
              background: "var(--border)",
            }} />
            {[
              document && {
                label: "Documento submetido",
                date: document.created_at,
                color: "var(--accent)",
              },
              analysis && {
                label: analysis.approved ? "IA aprovou o documento" : "IA identificou problemas no documento",
                date: analysis.created_at,
                color: analysis.approved ? "var(--success)" : "var(--danger)",
              },
              ...(textReview ? [{
                label: textReview.status === "clean"
                  ? "Revisão ortográfica concluída — sem erros"
                  : "Revisão ortográfica realizada",
                date: textReview.created_at,
                color: "var(--accent)",
              }] : []),
              approvalChain && {
                label: `Cadeia de aprovação criada (${approvalChain.approvers?.length ?? 0} aprovadores)`,
                date: approvalChain.created_at,
                color: "var(--accent)",
              },
              ...(approvalChain?.approvers ?? [])
                .filter((a: any) => a.acted_at)
                .map((a: any) => ({
                  label: `${a.approver_name} ${a.action === "approve" ? "aprovou" : "rejeitou"}${a.comments ? `: "${a.comments}"` : ""}`,
                  date: a.acted_at,
                  color: a.action === "approve" ? "var(--success)" : "var(--danger)",
                })),
              approvalChain?.status === "approved" && {
                label: "Documento aprovado e publicado",
                date: approvalChain.completed_at || approvalChain.created_at,
                color: "var(--success)",
              },
              approvalChain?.status === "rejected" && {
                label: "Documento rejeitado pela cadeia de aprovação",
                date: approvalChain.completed_at || approvalChain.created_at,
                color: "var(--danger)",
              },
            ]
              .filter(Boolean)
              .sort((a: any, b: any) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
              .map((event: any, idx: number) => (
                <div key={idx} style={{ display: "flex", gap: 12, marginBottom: 16, position: "relative" }}>
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: event.color,
                    border: "3px solid var(--bg-card)",
                    marginTop: 2,
                  }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4 }}>
                      {event.label}
                    </p>
                    {event.date && (
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {new Date(event.date).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
