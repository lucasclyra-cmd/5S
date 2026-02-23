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
} from "lucide-react";
import {
  getDocument,
  getAnalysis,
  generateChangelog,
  getApprovalChain,
} from "@/lib/api";
import type {
  DocumentWithVersions,
  DocumentVersion,
  AIAnalysis,
  Changelog,
  ApprovalChain,
} from "@/types";
import { formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import AIFeedback from "@/components/AIFeedback";
import ChangelogViewer from "@/components/ChangelogViewer";
import DocumentPreview from "@/components/DocumentPreview";
import ApprovalChainView from "@/components/ApprovalChain";

export default function ProcessosReviewPage() {
  const params = useParams();
  const router = useRouter();
  const docCode = params.docId as string;

  const [document, setDocument] = useState<DocumentWithVersions | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [approvalChain, setApprovalChain] = useState<ApprovalChain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        try {
          const chain = await getApprovalChain(currentVersion.id);
          setApprovalChain(chain);
        } catch {
          setApprovalChain(null);
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
