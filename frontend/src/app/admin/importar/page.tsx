"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FolderInput,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { scanImportFolder, executeImport } from "@/lib/api";
import type {
  ScanResponse,
  ImportResponse,
  GroupedDocument,
} from "@/types";

type Phase = "initial" | "scanning" | "preview" | "importing" | "result";

function typeLabel(type: string): string {
  switch (type) {
    case "PQ":
      return "Procedimento";
    case "IT":
      return "Instrução de Trabalho";
    case "RQ":
      return "Registro";
    default:
      return type;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportarPage() {
  const [phase, setPhase] = useState<Phase>("initial");
  const [scanData, setScanData] = useState<ScanResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [excludedCodes, setExcludedCodes] = useState<Set<string>>(new Set());
  const [showErrors, setShowErrors] = useState(false);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

  async function handleScan() {
    setPhase("scanning");
    setError(null);
    setScanData(null);
    try {
      const data = await scanImportFolder();
      setScanData(data);
      setExcludedCodes(new Set());
      if (data.total_files === 0) {
        setError("Nenhum arquivo encontrado na pasta storage/import/. Copie os arquivos para essa pasta e tente novamente.");
        setPhase("initial");
      } else {
        setPhase("preview");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao escanear pasta de importação");
      setPhase("initial");
    }
  }

  async function handleImport() {
    if (!scanData) return;
    setPhase("importing");
    setError(null);
    try {
      const result = await executeImport(Array.from(excludedCodes));
      setImportResult(result);
      setPhase("result");
    } catch (err: any) {
      setError(err.message || "Erro ao executar importação");
      setPhase("preview");
    }
  }

  function toggleExclude(code: string) {
    setExcludedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  async function handleRetryItem(code: string) {
    setRetrying(prev => { const next = new Set(prev); next.add(code); return next; });
    try {
      // Exclude all codes except the one we want to retry
      const allCodes = importResult?.results.map(r => r.code) || [];
      const excludeAll = allCodes.filter(c => c !== code);
      const result = await executeImport(excludeAll);
      if (result && result.results) {
        const updated = result.results.find((r: any) => r.code === code);
        if (updated && importResult) {
          setImportResult(prev => prev ? {
            ...prev,
            results: prev.results.map(r => r.code === code ? updated : r),
            total_imported: prev.results.map(r => r.code === code ? updated : r).filter(r => r.status === "imported").length,
            total_errors: prev.results.map(r => r.code === code ? updated : r).filter(r => r.status === "error").length,
            total_skipped: prev.results.map(r => r.code === code ? updated : r).filter(r => r.status === "skipped").length,
          } : prev);
        }
      }
    } catch (err: any) {
      setError(err.message || "Erro ao tentar novamente");
    } finally {
      setRetrying(prev => { const next = new Set(prev); next.delete(code); return next; });
    }
  }

  const importableDocs = scanData?.grouped_documents.filter(
    (g) => g.will_import_as === "new" && !excludedCodes.has(g.revisions[g.revisions.length - 1].code)
  ) || [];

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
        <div>
          <h1 style={{ color: "var(--text-primary)" }}>Importar Documentos</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            Importe documentos legados já aprovados diretamente para o sistema.
          </p>
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

      {/* Phase: Initial */}
      {phase === "initial" && (
        <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
          <FolderInput
            size={48}
            className="mx-auto mb-4"
            style={{ color: "var(--text-muted)" }}
          />
          <h3
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            Importação em Massa
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              maxWidth: 500,
              margin: "0 auto 8px",
              lineHeight: 1.6,
            }}
          >
            Copie os arquivos .docx, .odt ou .pdf para a pasta{" "}
            <code
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                padding: "2px 6px",
                background: "var(--bg-elevated)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}
            >
              storage/import/
            </code>{" "}
            no servidor.
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              maxWidth: 500,
              margin: "0 auto 24px",
              lineHeight: 1.6,
            }}
          >
            Os arquivos devem seguir o padrão de nome:{" "}
            <code
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                padding: "2px 6px",
                background: "var(--bg-elevated)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}
            >
              PQ-001.03 Título do Documento.docx
            </code>
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              maxWidth: 500,
              margin: "0 auto 24px",
              lineHeight: 1.6,
            }}
          >
            Os documentos serão importados como <strong>ativos</strong> e adicionados à Lista Mestra automaticamente, sem passar pelo fluxo de aprovação.
          </p>
          <button onClick={handleScan} className="btn-primary">
            <Search size={18} />
            Escanear Pasta de Importação
          </button>
        </div>
      )}

      {/* Phase: Scanning */}
      {phase === "scanning" && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin mb-4" style={{ color: "var(--accent)" }} />
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Escaneando pasta de importação...
          </p>
        </div>
      )}

      {/* Phase: Preview */}
      {phase === "preview" && scanData && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <SummaryCard label="Arquivos encontrados" value={scanData.total_files} />
            <SummaryCard label="Documentos para importar" value={scanData.grouped_documents.filter((g) => g.will_import_as === "new").length} accent />
            <SummaryCard label="Erros de parsing" value={scanData.error_count} danger={scanData.error_count > 0} />
            <SummaryCard label="Conflitos" value={scanData.conflict_count} danger={scanData.conflict_count > 0} />
          </div>

          {/* Parse errors */}
          {scanData.parse_errors.length > 0 && (
            <div className="card mb-6" style={{ border: "1px solid rgba(201, 69, 62, 0.2)" }}>
              <button
                onClick={() => setShowErrors(!showErrors)}
                className="flex items-center gap-2 w-full"
                style={{ fontSize: 14, fontWeight: 600, color: "var(--danger)" }}
              >
                {showErrors ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <AlertTriangle size={16} />
                {scanData.parse_errors.length} arquivo(s) com nome inválido (não serão importados)
              </button>
              {showErrors && (
                <div className="mt-3 space-y-2">
                  {scanData.parse_errors.map((err, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 12,
                        padding: "8px 12px",
                        background: "rgba(201, 69, 62, 0.04)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>{err.filename}</strong>
                      <br />
                      {err.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documents table */}
          {scanData.grouped_documents.length > 0 && (
            <div className="card mb-6" style={{ padding: 0 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                  Documentos Encontrados
                </h3>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Código</th>
                      <th>Título</th>
                      <th>Tipo</th>
                      <th>Revisão</th>
                      <th>Versões</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanData.grouped_documents.map((group) => {
                      const latest = group.revisions[group.revisions.length - 1];
                      const isConflict = group.will_import_as === "conflict";
                      const isExcluded = excludedCodes.has(latest.code);

                      return (
                        <tr
                          key={latest.code}
                          style={{
                            opacity: isConflict || isExcluded ? 0.5 : 1,
                            background: isConflict
                              ? "rgba(201, 69, 62, 0.03)"
                              : undefined,
                          }}
                        >
                          <td>
                            {!isConflict && (
                              <input
                                type="checkbox"
                                checked={!isExcluded}
                                onChange={() => toggleExclude(latest.code)}
                                style={{ cursor: "pointer" }}
                              />
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 600,
                                fontSize: 13,
                              }}
                            >
                              {latest.code}
                            </span>
                          </td>
                          <td style={{ fontSize: 13 }}>{group.title}</td>
                          <td>
                            <span
                              className="badge badge-neutral"
                              style={{ fontSize: 11 }}
                            >
                              {group.document_type}
                            </span>
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                            .{String(group.latest_revision).padStart(2, "0")}
                          </td>
                          <td style={{ fontSize: 13 }}>
                            {group.revisions.length}
                          </td>
                          <td>
                            {isConflict ? (
                              <span className="badge badge-danger" style={{ fontSize: 11 }}>
                                <XCircle size={12} />
                                Conflito
                              </span>
                            ) : isExcluded ? (
                              <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                                Excluído
                              </span>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: 11 }}>
                                <CheckCircle size={12} />
                                Novo
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setPhase("initial"); setScanData(null); }}
              className="btn-ghost"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              className="btn-primary"
              disabled={importableDocs.length === 0}
            >
              <FolderInput size={18} />
              Importar {importableDocs.length} Documento{importableDocs.length !== 1 ? "s" : ""}
            </button>
          </div>
        </>
      )}

      {/* Phase: Importing */}
      {phase === "importing" && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin mb-4" style={{ color: "var(--accent)" }} />
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Importando documentos... Isso pode levar alguns minutos.
          </p>
        </div>
      )}

      {/* Phase: Result */}
      {phase === "result" && importResult && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <SummaryCard label="Importados" value={importResult.total_imported} accent />
            <SummaryCard label="Ignorados" value={importResult.total_skipped} />
            <SummaryCard label="Erros" value={importResult.total_errors} danger={importResult.total_errors > 0} />
          </div>

          {/* Results table */}
          <div className="card mb-6" style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                Resultado da Importação
              </h3>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Título</th>
                    <th>Status</th>
                    <th>Lista Mestra</th>
                    <th>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.results.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 13 }}>
                          {r.code}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>{r.title}</td>
                      <td>
                        {r.status === "imported" && (
                          <span className="badge badge-success" style={{ fontSize: 11 }}>
                            <CheckCircle size={12} />
                            Importado
                          </span>
                        )}
                        {r.status === "skipped" && (
                          <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                            Ignorado
                          </span>
                        )}
                        {r.status === "error" && (
                          <span className="badge badge-danger" style={{ fontSize: 11 }}>
                            <XCircle size={12} />
                            Erro
                          </span>
                        )}
                      </td>
                      <td>
                        {r.master_list_code ? (
                          <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--accent)" }}>
                            {r.master_list_code}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {r.error_message || "—"}
                        {r.status === "error" && (
                          <button
                            onClick={() => handleRetryItem(r.code)}
                            disabled={retrying.has(r.code)}
                            style={{
                              padding: "3px 8px", fontSize: 11, marginLeft: 8,
                              background: "none", border: "1px solid var(--border)",
                              borderRadius: "var(--radius-sm)", cursor: "pointer",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {retrying.has(r.code) ? "Tentando..." : "Tentar novamente"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setPhase("initial");
                setScanData(null);
                setImportResult(null);
              }}
              className="btn-ghost"
            >
              Nova Importação
            </button>
            <Link href="/processos/lista-mestra" className="btn-primary">
              <FileText size={18} />
              Ver Lista Mestra
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: number;
  accent?: boolean;
  danger?: boolean;
}) {
  let valueColor = "var(--text-primary)";
  if (accent && value > 0) valueColor = "var(--accent)";
  if (danger && value > 0) valueColor = "var(--danger)";

  return (
    <div className="card" style={{ textAlign: "center", padding: "16px" }}>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
