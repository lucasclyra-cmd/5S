"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  LayoutTemplate,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { getTemplates, getTemplatePlaceholders, deleteTemplate } from "@/lib/api";
import type { DocumentTemplate, TemplatePlaceholderPreview } from "@/types";
import TemplateUpload from "@/components/TemplateUpload";

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case "PQ":
      return "Procedimento da Qualidade";
    case "IT":
      return "Instrução de Trabalho";
    case "RQ":
      return "Registro da Qualidade";
    default:
      return type;
  }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<TemplatePlaceholderPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const result = await getTemplates(undefined, false);
      setTemplates(result.templates);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    try {
      await deleteTemplate(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Erro ao excluir template");
    }
  }

  async function handlePreview(id: number) {
    if (previewData?.template_id === id) {
      setPreviewData(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const data = await getTemplatePlaceholders(id);
      setPreviewData(data);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleUploaded() {
    setShowUpload(false);
    loadData();
  }

  // Group by document_type
  const groupedByType: Record<string, DocumentTemplate[]> = {};
  for (const t of templates) {
    const key = t.document_type;
    if (!groupedByType[key]) groupedByType[key] = [];
    groupedByType[key].push(t);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 transition-colors mb-4"
          style={{ fontSize: 13, color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} />
          Voltar ao painel
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: "var(--text-primary)" }}>Templates de Documento</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
              Faça upload de templates .docx ou .odt para formatar documentos automaticamente.
            </p>
          </div>
          {!showUpload && (
            <button onClick={() => setShowUpload(true)} className="btn-primary">
              <Plus size={18} />
              Upload Template
            </button>
          )}
        </div>
      </div>

      {/* Error */}
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

      {/* Upload form */}
      {showUpload && (
        <div className="mb-6">
          <TemplateUpload
            onUploaded={handleUploaded}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && templates.length === 0 && !showUpload && (
        <div className="card text-center py-16">
          <LayoutTemplate
            size={48}
            className="mx-auto mb-4"
            style={{ color: "var(--text-muted)" }}
          />
          <h3
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            Nenhum template cadastrado
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginTop: 4,
              marginBottom: 24,
            }}
          >
            Faça upload de um template .docx ou .odt para começar.
          </p>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <Plus size={18} />
            Upload Template
          </button>
        </div>
      )}

      {/* Templates list grouped by type */}
      {!loading &&
        templates.length > 0 &&
        ["PQ", "IT", "RQ"].map((type) => {
          const group = groupedByType[type];
          if (!group || group.length === 0) return null;
          return (
            <div key={type} className="mb-8">
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {typeLabel(type)} ({type})
              </h2>
              <div className="space-y-3">
                {group.map((template) => (
                  <div key={template.id} className="card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText
                            size={20}
                            style={{ color: template.is_active ? "var(--accent)" : "var(--text-muted)" }}
                          />
                          <h3
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {template.name}
                          </h3>
                          {template.is_active ? (
                            <span className="badge badge-success">
                              <CheckCircle size={12} />
                              Ativo
                            </span>
                          ) : (
                            <span className="badge badge-neutral">
                              <XCircle size={12} />
                              Inativo
                            </span>
                          )}
                        </div>

                        {template.description && (
                          <p
                            style={{
                              fontSize: 13,
                              color: "var(--text-secondary)",
                              marginBottom: 8,
                            }}
                          >
                            {template.description}
                          </p>
                        )}

                        <div
                          className="flex flex-wrap gap-4"
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          <span>
                            Tipo: <strong>{template.document_type}</strong>
                          </span>
                          <span>Criado em: {formatDate(template.created_at)}</span>
                          {template.section_mapping?.placeholders && (
                            <span>
                              Placeholders:{" "}
                              {template.section_mapping.placeholders.length}
                            </span>
                          )}
                        </div>

                        {/* Placeholder preview */}
                        {previewData?.template_id === template.id && (
                          <div
                            className="mt-4"
                            style={{
                              padding: 12,
                              background: "rgba(95, 145, 230, 0.04)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid rgba(95, 145, 230, 0.15)",
                            }}
                          >
                            <p
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                marginBottom: 8,
                              }}
                            >
                              Placeholders encontrados:
                            </p>
                            {previewData.placeholders.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {previewData.placeholders.map((p) => (
                                  <span
                                    key={p}
                                    style={{
                                      fontFamily: "monospace",
                                      fontSize: 12,
                                      padding: "2px 8px",
                                      background: "var(--bg-elevated)",
                                      borderRadius: "var(--radius-sm)",
                                      border: "1px solid var(--border)",
                                      color: "var(--accent)",
                                    }}
                                  >
                                    {`{{${p}}}`}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                }}
                              >
                                Nenhum placeholder encontrado no template.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handlePreview(template.id)}
                          className="btn-action"
                          title="Ver placeholders"
                          disabled={previewLoading}
                        >
                          {previewLoading &&
                          previewData?.template_id !== template.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                        {deleteConfirmId === template.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="btn-danger"
                              style={{ padding: "6px 12px", fontSize: 12 }}
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="btn-ghost"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(template.id)}
                            className="btn-action"
                            title="Desativar"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}
