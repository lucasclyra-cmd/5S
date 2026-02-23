"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, X } from "lucide-react";
import Link from "next/link";
import DocumentUpload from "@/components/DocumentUpload";
import { uploadDocument, getCategories, getTags } from "@/lib/api";
import type { Category, Tag } from "@/types";

export default function SubmeterDocumento() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetadata();
  }, []);

  async function loadMetadata() {
    try {
      const [cats, tags] = await Promise.all([
        getCategories().catch(() => []),
        getTags().catch(() => []),
      ]);
      setCategories(cats);
      setAvailableTags(tags);
    } catch {
      // silently fail, fields will just not have options
    }
  }

  function addTag(tagName: string) {
    const trimmed = tagName.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    setTagInput("");
  }

  function removeTag(tagName: string) {
    setSelectedTags(selectedTags.filter((t) => t !== tagName));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecione um arquivo para enviar.");
      return;
    }
    if (!code.trim()) {
      setError("Preencha o código do documento.");
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
        code: code.trim(),
        title: title.trim(),
        category_id: categoryId,
        tags: selectedTags,
        created_by_profile: "autor",
      });
      router.push(`/autor/${result.document.code}`);
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
          Submeter Novo Documento
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 4 }}>
          Envie um documento para análise automática pela IA.
        </p>
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

        {/* Code */}
        <div>
          <label htmlFor="code" className="label-field">
            Código do Documento
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ex: DOC-001, PROC-2024-001"
            className="input-field"
            disabled={uploading}
          />
          <p style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
            Identificador único do documento no sistema.
          </p>
        </div>

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
            placeholder="Ex: Procedimento de Segurança do Trabalho"
            className="input-field"
            disabled={uploading}
          />
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

        {/* Tags */}
        <div>
          <label className="label-field">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="chip inline-flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-full p-0.5 transition-colors"
                  style={{ color: "var(--accent-hover)" }}
                  disabled={uploading}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Digite uma tag e pressione Enter"
              className="input-field flex-1"
              disabled={uploading}
              list="available-tags"
            />
            <datalist id="available-tags">
              {availableTags
                .filter((t) => !selectedTags.includes(t.name))
                .map((t) => (
                  <option key={t.id} value={t.name} />
                ))}
            </datalist>
            <button
              type="button"
              onClick={() => addTag(tagInput)}
              className="btn-secondary"
              disabled={uploading || !tagInput.trim()}
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* Submit */}
        <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <button
            type="submit"
            disabled={uploading || !file || !code.trim() || !title.trim()}
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
    </div>
  );
}
