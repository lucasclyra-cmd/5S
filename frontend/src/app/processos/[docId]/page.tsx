"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
} from "lucide-react";
import {
  getDocument,
  getAnalysis,
  approveDocument,
  rejectDocument,
  generateChangelog,
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

export default function ProcessosReviewPage() {
  const params = useParams();
  const router = useRouter();
  const docCode = params.docId as string;

  const [document, setDocument] = useState<DocumentWithVersions | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectComments, setRejectComments] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

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

  async function handleApprove() {
    const version = getCurrentVersion();
    if (!version) return;
    setActionLoading("approve");
    try {
      await approveDocument(version.id);
      router.push("/processos");
    } catch (err: any) {
      setError(err.message || "Erro ao aprovar documento");
      setActionLoading(null);
    }
  }

  async function handleReject() {
    const version = getCurrentVersion();
    if (!version) return;
    if (!rejectComments.trim()) {
      setError("Adicione comentarios para a rejeicao.");
      return;
    }
    setActionLoading("reject");
    try {
      await rejectDocument(version.id, rejectComments.trim());
      router.push("/processos");
    } catch (err: any) {
      setError(err.message || "Erro ao rejeitar documento");
      setActionLoading(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "approved":
        return (
          <span className="badge-success flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <CheckCircle2 size={14} />
            Aprovado
          </span>
        );
      case "rejected":
        return (
          <span className="badge-danger flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <XCircle size={14} />
            Rejeitado
          </span>
        );
      case "pending_analysis":
        return (
          <span className="badge-warning flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <Clock size={14} />
            Analise Pendente
          </span>
        );
      case "pending_review":
        return (
          <span className="badge-info flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <AlertCircle size={14} />
            Revisao Pendente
          </span>
        );
      default:
        return <span className="badge-neutral px-3 py-1.5 text-sm">{status}</span>;
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
        <Loader2 size={32} className="animate-spin text-indigo-600" />
        <span className="ml-3 text-sm text-gray-500">
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
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Voltar a fila
        </Link>
        <div className="card text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium text-gray-900">
            Erro ao carregar documento
          </h3>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
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

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/processos"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Voltar a fila
      </Link>

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Document header */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
            <FileText size={24} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">
                {document.title}
              </h1>
              {getStatusBadge(document.status)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span>
                Codigo: <strong className="text-gray-700">{document.code}</strong>
              </span>
              <span>
                Versao: <strong className="text-gray-700">v{document.current_version}</strong>
              </span>
              <span>
                Autor: <strong className="text-gray-700">{document.created_by_profile}</strong>
              </span>
              <span>Criado em: {formatDate(document.created_at)}</span>
            </div>
            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {document.tags.map((tag) => (
                  <span key={tag} className="badge-neutral">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review actions */}
      <div className="card mb-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Decisao de Revisao
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleApprove}
            disabled={actionLoading !== null}
            className="btn-success"
          >
            {actionLoading === "approve" ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            Aprovar
          </button>
          <button
            onClick={() => setShowRejectForm(!showRejectForm)}
            disabled={actionLoading !== null}
            className="btn-danger"
          >
            <XCircle size={18} />
            Rejeitar
          </button>
        </div>

        {/* Reject form */}
        {showRejectForm && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <label className="label-field">Comentarios da Rejeicao</label>
            <textarea
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              placeholder="Explique o motivo da rejeicao..."
              rows={4}
              className="input-field resize-none"
              disabled={actionLoading !== null}
            />
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleReject}
                disabled={
                  actionLoading !== null || !rejectComments.trim()
                }
                className="btn-danger"
              >
                {actionLoading === "reject" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <XCircle size={18} />
                )}
                Confirmar Rejeicao
              </button>
              <button
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectComments("");
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
