"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  RefreshCw,
  SkipForward,
  Paintbrush,
  Loader2,
  AlertCircle,
  FileDown,
  History,
} from "lucide-react";
import {
  getDocument,
  getAnalysis,
  analyzeDocument,
  formatDocument,
  skipAiApproval,
  resubmitDocument,
  generateChangelog,
  getExportUrl,
} from "@/lib/api";
import type {
  DocumentWithVersions,
  DocumentVersion,
  AIAnalysis,
  Changelog,
} from "@/types";
import AIFeedback from "@/components/AIFeedback";
import ChangelogViewer from "@/components/ChangelogViewer";
import DocumentPreview from "@/components/DocumentPreview";
import DocumentUpload from "@/components/DocumentUpload";

export default function DocumentDetail() {
  const params = useParams();
  const router = useRouter();
  const docCode = params.docId as string;

  const [document, setDocument] = useState<DocumentWithVersions | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [showResubmit, setShowResubmit] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [docCode]);

  async function loadDocument() {
    setLoading(true);
    setError(null);
    try {
      const doc = await getDocument(docCode);
      setDocument(doc);

      // Try to load analysis for current version
      if (doc.versions && doc.versions.length > 0) {
        const currentVersion = doc.versions[doc.versions.length - 1];
        try {
          const anal = await getAnalysis(currentVersion.id);
          setAnalysis(anal);
        } catch {
          setAnalysis(null);
        }
        try {
          const cl = await generateChangelog(currentVersion.id);
          setChangelog(cl);
        } catch {
          setChangelog(null);
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

  async function handleAnalyze() {
    const version = getCurrentVersion();
    if (!version) return;
    setActionLoading("analyze");
    try {
      const anal = await analyzeDocument(version.id);
      setAnalysis(anal);
      await loadDocument();
    } catch (err: any) {
      setError(err.message || "Erro ao analisar documento");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleFormat() {
    const version = getCurrentVersion();
    if (!version) return;
    setActionLoading("format");
    try {
      await formatDocument(version.id);
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
      await resubmitDocument(docCode, resubmitFile, "autor");
      setResubmitFile(null);
      setShowResubmit(false);
      await loadDocument();
    } catch (err: any) {
      setError(err.message || "Erro ao reenviar documento");
    } finally {
      setActionLoading(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "approved":
        return (
          <span className="badge-success">
            Aprovado
          </span>
        );
      case "rejected":
        return (
          <span className="badge-danger">
            Rejeitado
          </span>
        );
      case "pending_analysis":
        return (
          <span className="badge-warning">
            Análise Pendente
          </span>
        );
      case "pending_review":
        return (
          <span className="badge-info">
            Revisão Pendente
          </span>
        );
      case "formatted":
        return (
          <span className="badge-success">
            Formatado
          </span>
        );
      default:
        return <span className="badge-neutral">{status}</span>;
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
  const isApproved =
    document.status === "approved" || analysis?.approved === true;
  const isPendingAnalysis = document.status === "pending_analysis";

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
                {getStatusBadge(document.status)}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1" style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
                <span>
                  Código: <strong style={{ color: "var(--text-primary)" }}>{document.code}</strong>
                </span>
                <span>
                  Versão: <strong style={{ color: "var(--text-primary)" }}>v{document.current_version}</strong>
                </span>
                <span>Criado em: {formatDate(document.created_at)}</span>
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
      </div>

      {/* Action buttons */}
      <div className="card mb-6">
        <h3 className="section-title">Ações</h3>
        <div className="flex flex-wrap gap-3">
          {isPendingAnalysis && (
            <button
              onClick={handleAnalyze}
              disabled={actionLoading !== null}
              className="btn-primary"
            >
              {actionLoading === "analyze" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              Executar Análise IA
            </button>
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
                onClick={handleSkipAi}
                disabled={actionLoading !== null}
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

          {isApproved && (
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

          {/* Download links */}
          {currentVersion?.formatted_file_path_docx && (
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
        </div>
      </div>

      {/* Resubmit form */}
      {showResubmit && (
        <div className="card mb-6">
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
            Re-submeter Documento
          </h3>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
            Selecione uma nova versão do arquivo para reanálise.
          </p>
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
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {analysis && (
        <div className="mb-6">
          <AIFeedback analysis={analysis} />
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
                      {getStatusBadge(v.status)}
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
                      <span style={{ color: "var(--text-secondary)" }}>
                        {formatDate(v.submitted_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
