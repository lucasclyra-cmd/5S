"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  RefreshCw,
  Search,
  Download,
  Filter,
  BookOpen,
} from "lucide-react";
import { getMasterList, getMasterListStats, getMasterListExportUrl } from "@/lib/api";
import type { MasterListEntry, MasterListStats } from "@/types";

const DOCUMENT_TYPES = [
  { value: "", label: "Todos os tipos" },
  { value: "PQ", label: "PQ - Procedimento" },
  { value: "IT", label: "IT - Instrução de Trabalho" },
  { value: "RQ", label: "RQ - Registro" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "active", label: "Ativo" },
  { value: "obsolete", label: "Obsoleto" },
  { value: "cancelled", label: "Cancelado" },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "badge badge-success";
    case "obsolete":
      return "badge badge-neutral";
    case "cancelled":
      return "badge badge-danger";
    default:
      return "badge badge-info";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Ativo";
    case "obsolete":
      return "Obsoleto";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

export default function ListaMestraPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<MasterListEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<MasterListStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [documentType, setDocumentType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listResult, statsResult] = await Promise.all([
        getMasterList({
          document_type: documentType || undefined,
          search: search || undefined,
          status: statusFilter || undefined,
          page,
          limit,
        }),
        getMasterListStats(),
      ]);
      setEntries(listResult.entries);
      setTotal(listResult.total);
      setStats(statsResult);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar Lista Mestra");
    } finally {
      setLoading(false);
    }
  }, [documentType, search, statusFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function handleExport() {
    const url = getMasterListExportUrl(documentType || undefined);
    window.open(url, "_blank");
  }

  const totalPages = Math.ceil(total / limit);

  // Group entries by type for the grouped view
  const groupedEntries: Record<string, MasterListEntry[]> = {};
  for (const entry of entries) {
    const type = entry.document_type || "Outros";
    if (!groupedEntries[type]) groupedEntries[type] = [];
    groupedEntries[type].push(entry);
  }

  const typeOrder = ["PQ", "IT", "RQ", "Outros"];
  const sortedGroups = Object.entries(groupedEntries).sort(
    ([a], [b]) => typeOrder.indexOf(a) - typeOrder.indexOf(b)
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BookOpen size={24} style={{ color: "var(--accent)" }} />
            <h1 style={{ color: "var(--text-primary)" }}>Lista Mestra</h1>
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Registro centralizado de todos os documentos controlados (PQ-001.03,
            seção 4.6).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="btn-secondary"
            disabled={loading || total === 0}
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button onClick={loadData} className="btn-secondary" disabled={loading}>
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <p className="stat-label">Total Ativo</p>
            <p className="stat-value">{stats.total_active}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Procedimentos (PQ)</p>
            <p className="stat-value">{stats.total_by_type["PQ"] || 0}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Instruções (IT)</p>
            <p className="stat-value">{stats.total_by_type["IT"] || 0}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Registros (RQ)</p>
            <p className="stat-value">{stats.total_by_type["RQ"] || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div
        className="flex flex-wrap items-end gap-4 mb-6"
        style={{
          padding: 16,
          background: "var(--bg-card)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
        }}
      >
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por código, título ou LM..."
              className="input-field"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <button type="submit" className="btn-secondary">
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Filter size={16} style={{ color: "var(--text-muted)" }} />
          <select
            value={documentType}
            onChange={(e) => {
              setDocumentType(e.target.value);
              setPage(1);
            }}
            className="input-field"
            style={{ width: "auto", minWidth: 180 }}
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input-field"
            style={{ width: "auto", minWidth: 160 }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: "var(--accent)" }}
          />
          <span
            style={{
              marginLeft: 12,
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            Carregando Lista Mestra...
          </span>
        </div>
      )}

      {/* Table */}
      {!loading && entries.length === 0 && (
        <div
          className="text-center py-20"
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
          }}
        >
          <BookOpen
            size={40}
            style={{ color: "var(--text-muted)", margin: "0 auto 12px" }}
          />
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Lista Mestra vazia
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Documentos aprovados aparecerão aqui automaticamente.
          </p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <>
          {sortedGroups.map(([type, groupEntries]) => (
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
                {type === "PQ"
                  ? "Procedimentos da Qualidade (PQ)"
                  : type === "IT"
                  ? "Instruções de Trabalho (IT)"
                  : type === "RQ"
                  ? "Registros da Qualidade (RQ)"
                  : type}
              </h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Código LM</th>
                      <th>Código Documento</th>
                      <th>Título</th>
                      <th>Revisão</th>
                      <th>Data em Vigor</th>
                      <th>Setor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        onClick={() =>
                          router.push(
                            `/processos/${encodeURIComponent(entry.document_code)}`
                          )
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 600,
                              fontSize: 13,
                              color: "var(--accent-hover)",
                            }}
                          >
                            {entry.master_list_code}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            {entry.document_code}
                          </span>
                        </td>
                        <td>{entry.document_title}</td>
                        <td
                          style={{
                            fontFamily: "monospace",
                            fontSize: 13,
                          }}
                        >
                          .{String(entry.revision_number).padStart(2, "0")}
                        </td>
                        <td>{formatDate(entry.effective_date)}</td>
                        <td
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: 13,
                          }}
                        >
                          {entry.sector || "—"}
                        </td>
                        <td>
                          <span className={statusBadgeClass(entry.status)}>
                            {statusLabel(entry.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Mostrando {(page - 1) * limit + 1}–
                {Math.min(page * limit, total)} de {total} registros
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="btn-ghost"
                >
                  Anterior
                </button>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    padding: "0 8px",
                  }}
                >
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="btn-ghost"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
