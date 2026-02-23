"use client";

import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";

interface DocumentUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  uploading?: boolean;
  selectedFile?: File | null;
  onClear?: () => void;
}

export default function DocumentUpload({
  onFileSelect,
  accept = ".docx,.pdf",
  uploading = false,
  selectedFile = null,
  onClear,
}: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/pdf",
  ];
  const allowedExtensions = [".docx", ".pdf"];

  function validateFile(file: File): boolean {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext) && !allowedTypes.includes(file.type)) {
      setError("Tipo de arquivo inválido. Apenas .docx e .pdf são aceitos.");
      return false;
    }
    setError(null);
    return true;
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }

  function handleClear() {
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onClear?.();
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  if (selectedFile) {
    return (
      <div
        style={{
          borderRadius: "var(--radius-lg)",
          border: "2px solid var(--accent-border)",
          background: "var(--accent-light)",
          padding: 24,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {uploading ? (
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
            ) : (
              <FileText size={24} style={{ color: "var(--accent)" }} />
            )}
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                {selectedFile.name}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {formatSize(selectedFile.size)}
              </p>
            </div>
          </div>
          {!uploading && (
            <button
              type="button"
              onClick={handleClear}
              className="btn-action"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {uploading && (
          <div className="mt-3">
            <div
              style={{
                height: 8,
                width: "100%",
                overflow: "hidden",
                borderRadius: 100,
                background: "var(--accent-border)",
              }}
            >
              <div
                className="animate-pulse"
                style={{
                  height: "100%",
                  borderRadius: 100,
                  background: "var(--accent)",
                  width: "66%",
                }}
              />
            </div>
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>
              Enviando documento...
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className="relative flex cursor-pointer flex-col items-center justify-center transition-colors"
        style={{
          borderRadius: "var(--radius-lg)",
          border: `2px dashed ${isDragOver ? "var(--accent)" : "var(--border)"}`,
          background: isDragOver ? "var(--accent-light)" : "var(--bg-main)",
          padding: 40,
        }}
      >
        <Upload
          size={36}
          className="mb-3"
          style={{ color: isDragOver ? "var(--accent)" : "var(--text-muted)" }}
        />
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
          Arraste e solte seu arquivo aqui
        </p>
        <p style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
          ou clique para selecionar
        </p>
        <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
          Formatos aceitos: .docx, .pdf
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {error && (
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--danger)" }}>{error}</p>
      )}
    </div>
  );
}
