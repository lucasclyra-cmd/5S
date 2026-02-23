"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { getDocuments, searchDocuments } from "@/lib/api";
import type { Document } from "@/types";

export default function AutorDashboard() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
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

  function getStatusBadge(status: string) {
    switch (status) {
      case "approved":
        return (
          <span className="badge-success">
            Aprovado
          </span>
        );
      case "rejected":
        return (
          <span className="badge-danger">
            Rejeitado
          </span>
        );
      case "pending_analysis":
        return (
          <span className="badge-warning">
            Análise Pendente
          </span>
        );
      case "pending_review":
        return (
          <span className="badge-info">
            Revisão Pendente
          </span>
        );
      case "formatted":
        return (
          <span className="badge-success">
            Formatado
          </span>
        );
      case "published":
        return (
          <span className="badge-success">
            Publicado
          </span>
        );
      default:
        return (
          <span className="badge-neutral">
            {status}
          </span>
        );
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Stats calculation
  const stats = {
    total: total,
    pending: documents.filter(
      (d) =>
        d.status === "pending_analysis" || d.status === "pending_review"
    ).length,
    approved: documents.filter(
      (d) =>
        d.status === "approved" ||
        d.status === "formatted" ||
        d.status === "published"
    ).length,
    rejected: documents.filter((d) => d.status === "rejected").length,
  };

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
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">documentos submetidos</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pendentes</div>
          <div className="stat-value" style={{ color: "var(--warning)" }}>{stats.pending}</div>
          <div className="stat-sub">aguardando análise</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Aprovados</div>
          <div className="stat-value" style={{ color: "var(--success)" }}>{stats.approved}</div>
          <div className="stat-sub">prontos ou publicados</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejeitados</div>
          <div className="stat-value" style={{ color: "var(--danger)" }}>{stats.rejected}</div>
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
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
      {!loading && documents.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Título</th>
                <th>Versão</th>
                <th>Status</th>
                <th>Tags</th>
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
                    {getStatusBadge(doc.status)}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {doc.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="chip"
                        >
                          {tag}
                        </span>
                      ))}
                      {doc.tags && doc.tags.length > 3 && (
                        <span className="chip">
                          +{doc.tags.length - 3}
                        </span>
                      )}
                    </div>
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
      )}
    </div>
  );
}
