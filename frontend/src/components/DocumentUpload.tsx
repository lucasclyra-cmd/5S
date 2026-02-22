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
      setError("Tipo de arquivo invalido. Apenas .docx e .pdf sao aceitos.");
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
      <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {uploading ? (
              <Loader2 size={24} className="text-indigo-600 animate-spin" />
            ) : (
              <FileText size={24} className="text-indigo-600" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatSize(selectedFile.size)}
              </p>
            </div>
          </div>
          {!uploading && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {uploading && (
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-200">
              <div className="h-full animate-pulse rounded-full bg-indigo-600 w-2/3" />
            </div>
            <p className="mt-2 text-xs text-indigo-600 font-medium">
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
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
          isDragOver
            ? "border-indigo-400 bg-indigo-50"
            : "border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50"
        }`}
      >
        <Upload
          size={36}
          className={`mb-3 ${
            isDragOver ? "text-indigo-500" : "text-gray-400"
          }`}
        />
        <p className="text-sm font-medium text-gray-700">
          Arraste e solte seu arquivo aqui
        </p>
        <p className="mt-1 text-xs text-gray-500">
          ou clique para selecionar
        </p>
        <p className="mt-3 text-xs text-gray-400">
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
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
