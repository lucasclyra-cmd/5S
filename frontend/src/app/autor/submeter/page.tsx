"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import DocumentUpload from "@/components/DocumentUpload";
import ApproverSelector from "@/components/ApproverSelector";
import { uploadDocument, getCategories, getNextCode } from "@/lib/api";
import type { Category, Document, DocumentVersion } from "@/types";

const DOCUMENT_TYPES = [
  {
    value: "PQ",
    label: "PQ - Procedimento da Qualidade",
    description: "Define padrões e procedimentos do sistema de qualidade",
  },
  {
    value: "IT",
    label: "IT - Instrução de Trabalho",
    description: "Descreve atividades operacionais com detalhes técnicos",
  },
  {
    value: "RQ",
    label: "RQ - Registro da Qualidade",
    description: "Modelo de formulário para registro de informações",
  },
];

export default function SubmeterDocumento() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [sector, setSector] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);

  // Step 2 state
  const [step, setStep] = useState<1 | 2>(1);
  const [uploadResult, setUploadResult] = useState<{
    document: Document;
    version: DocumentVersion;
  } | null>(null);

  useEffect(() => {
    loadMetadata();
  }, []);

  const fetchNextCode = useCallback(async (type: string) => {
    if (!type) {
      setPreviewCode(null);
      return;
    }
    setLoadingCode(true);
    try {
      const result = await getNextCode(type);
      setPreviewCode(result.code);
    } catch {
      setPreviewCode(null);
    } finally {
      setLoadingCode(false);
    }
  }, []);

  useEffect(() => {
    fetchNextCode(documentType);
  }, [documentType, fetchNextCode]);

  async function loadMetadata() {
    try {
      const cats = await getCategories().catch(() => []);
      setCategories(cats);
    } catch {
      // silently fail, fields will just not have options
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecione um arquivo para enviar.");
      return;
    }
    if (!documentType) {
      setError("Selecione o tipo do documento.");
      return;
    }
    if (!title.trim()) {
      setError("Preencha o título do documento.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const result = await uploadDocument(file, {
        document_type: documentType,
        title: title.trim(),
        category_id: categoryId,
        created_by_profile: "autor",
        sector: sector.trim() || undefined,
      });
      setUploadResult(result);
      setStep(2);
      setUploading(false);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar o documento.");
      setUploading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/autor"
          className="inline-flex items-center gap-1.5 transition-colors mb-4"
          style={{ fontSize: 13.5, color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} />
          Voltar ao painel
        </Link>
        <h1 style={{ color: "var(--text-primary)" }}>
          {step === 1 ? "Submeter Novo Documento" : "Configurar Aprovação"}
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 4 }}>
          {step === 1
            ? "Envie um documento para análise automática pela IA."
            : "Configure a cadeia de aprovação para o documento submetido."}
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mt-6">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: step === 1 ? "var(--accent)" : "var(--success)",
                color: "#fff",
              }}
            >
              {step === 2 ? <CheckCircle2 size={16} /> : "1"}
            </div>
            <span style={{
              fontSize: 13,
              fontWeight: step === 1 ? 600 : 400,
              color: step === 1 ? "var(--text-primary)" : "var(--text-muted)",
            }}>
              Dados do Documento
            </span>
          </div>
          <div style={{ width: 32, height: 2, background: step === 2 ? "var(--accent)" : "var(--border)" }} />
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: step === 2 ? "var(--accent)" : "var(--bg-secondary)",
                color: step === 2 ? "#fff" : "var(--text-muted)",
                border: step === 2 ? "none" : "1px solid var(--border)",
              }}
            >
              2
            </div>
            <span style={{
              fontSize: 13,
              fontWeight: step === 2 ? 600 : 400,
              color: step === 2 ? "var(--text-primary)" : "var(--text-muted)",
            }}>
              Cadeia de Aprovação
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
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

      {/* Step 1: Document form */}
      {step === 1 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File upload */}
          <div>
            <label className="label-field">Arquivo</label>
            <DocumentUpload
              onFileSelect={setFile}
              selectedFile={file}
              uploading={uploading}
              onClear={() => setFile(null)}
            />
          </div>

          {/* Document Type */}
          <div>
            <label htmlFor="document-type" className="label-field">
              Tipo de Documento
            </label>
            <select
              id="document-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="input-field"
              disabled={uploading}
            >
              <option value="">Selecione o tipo</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {documentType && (
              <p style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
                {DOCUMENT_TYPES.find((t) => t.value === documentType)?.description}
              </p>
            )}
          </div>

          {/* Auto-generated Code Preview */}
          {documentType && (
            <div
              style={{
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                padding: 16,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} style={{ color: "var(--accent)" }} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Código auto-gerado
                </span>
              </div>
              <p
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontFamily: "monospace",
                }}
              >
                {loadingCode ? "..." : previewCode || "—"}
              </p>
              <p style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
                Gerado automaticamente pelo sistema. Formato: {documentType}-NNN.00
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="label-field">
              Título
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Controle de Informação Documentada"
              className="input-field"
              disabled={uploading}
            />
          </div>

          {/* Sector */}
          <div>
            <label htmlFor="sector" className="label-field">
              Setor Responsável
            </label>
            <input
              id="sector"
              type="text"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="Ex: Engenharia de Processos, Qualidade, Produção"
              className="input-field"
              disabled={uploading}
            />
            <p style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
              Área responsável pela elaboração do documento.
            </p>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="label-field">
              Categoria
            </label>
            <select
              id="category"
              value={categoryId ?? ""}
              onChange={(e) =>
                setCategoryId(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="input-field"
              disabled={uploading}
            >
              <option value="">Selecione uma categoria (opcional)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <button
              type="submit"
              disabled={uploading || !file || !documentType || !title.trim()}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {uploading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submeter Documento
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Approval chain configuration */}
      {step === 2 && uploadResult && (
        <div className="space-y-6">
          {/* Success banner */}
          <div
            className="card"
            style={{
              background: "rgba(45, 138, 78, 0.06)",
              border: "1px solid rgba(45, 138, 78, 0.2)",
            }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} style={{ color: "var(--success)", flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>
                  Documento enviado com sucesso!
                </p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                  Código: <strong>{uploadResult.document.code}</strong> — Análise de IA em andamento.
                </p>
              </div>
            </div>
          </div>

          {/* Approval chain selector */}
          <ApproverSelector
            versionId={uploadResult.version.id}
            documentType={uploadResult.document.document_type}
            onChainCreated={() => {
              router.push(`/autor/${uploadResult.document.code}`);
            }}
          />
        </div>
      )}
    </div>
  );
}
