"use client";

import React, { useState, useRef } from "react";
import { Upload, Loader2, FileText, X } from "lucide-react";
import { uploadTemplate } from "@/lib/api";
import type { DocumentTemplate } from "@/types";

interface TemplateUploadProps {
  onUploaded: (template: DocumentTemplate) => void;
  onCancel: () => void;
}

const DOCUMENT_TYPES = [
  { value: "PQ", label: "PQ - Procedimento da Qualidade" },
  { value: "IT", label: "IT - Instrução de Trabalho" },
  { value: "RQ", label: "RQ - Registro da Qualidade" },
];

export default function TemplateUpload({ onUploaded, onCancel }: TemplateUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("PQ");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (ext !== "docx" && ext !== "odt") {
        setError("Formato não suportado. Use .docx ou .odt");
        return;
      }
      setFile(f);
      setError(null);
      if (!name) {
        setName(f.name.replace(/\.(docx|odt)$/i, ""));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name.trim() || !documentType) return;

    setUploading(true);
    setError(null);
    try {
      const template = await uploadTemplate(file, name.trim(), documentType, description.trim() || undefined);
      onUploaded(template);
    } catch (err: any) {
      setError(err.message || "Erro ao fazer upload do template");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ color: "var(--text-primary)" }}>Upload de Template</h2>
        <button onClick={onCancel} className="btn-action">
          <X size={20} />
        </button>
      </div>

      {error && (
        <div
          className="mb-4"
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--danger)",
            background: "rgba(201, 69, 62, 0.06)",
            padding: 12,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "var(--radius-md)",
            padding: "32px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: file ? "rgba(95, 145, 230, 0.04)" : "transparent",
            transition: "all 0.2s",
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".docx,.odt"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText size={24} style={{ color: "var(--accent)" }} />
              <div style={{ textAlign: "left" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  {file.name}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {(file.size / 1024).toFixed(1)} KB — Clique para trocar
                </p>
              </div>
            </div>
          ) : (
            <>
              <Upload size={32} style={{ color: "var(--text-muted)", margin: "0 auto 8px" }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                Clique para selecionar o arquivo do template
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Formatos aceitos: .docx, .odt
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Nome do Template</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Template PQ Atualizado"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label-field">Tipo de Documento</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="input-field"
              required
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label-field">Descrição (opcional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição do template..."
            className="input-field"
          />
        </div>

        <div
          style={{
            padding: "12px 16px",
            background: "rgba(95, 145, 230, 0.06)",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(95, 145, 230, 0.15)",
          }}
        >
          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            O template ativo anterior para o tipo <strong>{documentType}</strong> será
            desativado automaticamente ao fazer upload de um novo.
            Use placeholders como {"{{TITULO}}"}, {"{{CODIGO}}"}, {"{{REVISAO}}"}, {"{{DATA}}"}, {"{{SETOR}}"} no
            cabeçalho e {"{{OBJETIVO}}"}, {"{{ATIVIDADES}}"}, {"{{RESPONSABILIDADES}}"} etc. nas seções.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={!file || !name.trim() || uploading}
            className="btn-primary"
          >
            {uploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            Fazer Upload
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
