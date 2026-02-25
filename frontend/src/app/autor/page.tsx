"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { getDocuments, searchDocuments } from "@/lib/api";
import { formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import type { Document } from "@/types";

export default function AutorDashboard() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCurrentPage(1);
    loadDocuments();
    loadCounts();
  }, [statusFilter]);

  useEffect(() => {
    loadDocuments();
  }, [currentPage]);

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page: currentPage, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const data = await getDocuments(params);
      setDocuments(data.documents || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar documentos");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      loadDocuments();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchDocuments(searchQuery);
      const docs = Array.isArray(data) ? data : [];
      setDocuments(docs);
      setTotal(docs.length);
    } catch (err: any) {
      setError(err.message || "Erro na busca");
    } finally {
      setLoading(false);
    }
  }

  async function loadCounts() {
    try {
      const [pa, pr, ap, fm, pb, rj] = await Promise.allSettled([
        getDocuments({ status: "pending_analysis", limit: 1 }),
        getDocuments({ status: "pending_review", limit: 1 }),
        getDocuments({ status: "approved", limit: 1 }),
        getDocuments({ status: "formatted", limit: 1 }),
        getDocuments({ status: "published", limit: 1 }),
        getDocuments({ status: "rejected", limit: 1 }),
      ]);
      const get = (r: PromiseSettledResult<any>) => r.status === "fulfilled" ? r.value.total : 0;
      setCounts({
        pending: get(pa) + get(pr),
        approved: get(ap) + get(fm) + get(pb),
        rejected: get(rj),
      });
    } catch {}
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ color: "var(--text-primary)" }}>
            Painel do Autor
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 4 }}>
            Gerencie seus documentos e acompanhe o status de análise.
          </p>
        </div>
        <Link href="/autor/submeter" className="btn-primary">
          <Plus size={18} />
          Novo Documento
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{total}</div>
          <div className="stat-sub">documentos submetidos</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pendentes</div>
          <div className="stat-value" style={{ color: "var(--warning)" }}>{counts.pending}</div>
          <div className="stat-sub">aguardando análise</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Aprovados</div>
          <div className="stat-value" style={{ color: "var(--success)" }}>{counts.approved}</div>
          <div className="stat-sub">prontos ou publicados</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejeitados</div>
          <div className="stat-value" style={{ color: "var(--danger)" }}>{counts.rejected}</div>
          <div className="stat-sub">necessitam revisão</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="Buscar por código ou título..."
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (searchDebounce.current) clearTimeout(searchDebounce.current);
              searchDebounce.current = setTimeout(() => {
                if (val.trim()) {
                  handleSearch();
                } else {
                  setCurrentPage(1);
                  loadDocuments();
                }
              }, 400);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (searchDebounce.current) clearTimeout(searchDebounce.current);
                handleSearch();
              }
            }}
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto min-w-[180px]"
        >
          <option value="">Todos os status</option>
          <option value="pending_analysis">Analise Pendente</option>
          <option value="pending_review">Revisao Pendente</option>
          <option value="approved">Aprovado</option>
          <option value="rejected">Rejeitado</option>
          <option value="formatted">Formatado</option>
          <option value="published">Publicado</option>
        </select>
        <button onClick={handleSearch} className="btn-secondary">
          <Search size={18} />
          Buscar
        </button>
      </div>

      {/* Error state */}
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

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
          <span style={{ marginLeft: 12, fontSize: 13.5, color: "var(--text-muted)" }}>
            Carregando documentos...
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && documents.length === 0 && (
        <div className="card text-center py-16">
          <FileText size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
            Nenhum documento encontrado
          </h3>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 4, marginBottom: 24 }}>
            Comece submetendo seu primeiro documento.
          </p>
          <Link href="/autor/submeter" className="btn-primary">
            <Plus size={18} />
            Submeter Documento
          </Link>
        </div>
      )}

      {/* Documents table */}
      {!loading && documents.length > 0 && (<>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Título</th>
                <th>Versão</th>
                <th>Status</th>
                <th>Tipo</th>
                <th>Data</th>
                <th style={{ textAlign: "right" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/autor/${doc.code}`)}
                >
                  <td>
                    <span style={{ fontWeight: 600, color: "var(--accent)" }}>
                      {doc.code}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: "var(--text-primary)" }}>
                      {doc.title}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: "var(--text-secondary)" }}>
                      v{doc.current_version}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={doc.status} />
                  </td>
                  <td>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 11,
                      fontWeight: 600,
                      background: "rgba(59,130,246,0.1)",
                      color: "var(--accent)",
                    }}>
                      {doc.document_type || "\u2014"}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {formatDate(doc.created_at)}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span
                      className="inline-flex items-center gap-1"
                      style={{ fontSize: 13.5, color: "var(--accent)", fontWeight: 600 }}
                    >
                      Ver
                      <ChevronRight size={16} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > PAGE_SIZE && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, fontSize: 13, color: "var(--text-secondary)" }}>
            <span>
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} de {total}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary"
                style={{ padding: "6px 12px", fontSize: 13 }}
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage * PAGE_SIZE >= total}
                className="btn-secondary"
                style={{ padding: "6px 12px", fontSize: 13 }}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </>)}
    </div>
  );
}
