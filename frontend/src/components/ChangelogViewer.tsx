"use client";

import React, { useState } from "react";
import { GitCompare, Plus, Minus, RefreshCw, ChevronDown, FileText } from "lucide-react";
import type { Changelog } from "@/types";

interface ChangelogViewerProps {
  changelog: Changelog;
}

interface DiffSection {
  section: string;
  change_type: "added" | "removed" | "modified";
  description: string;
  old_content_snippet?: string;
  new_content_snippet?: string;
}

const CHANGE_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Plus }> = {
  added: { label: "Adição", color: "var(--success)", bg: "rgba(45, 138, 78, 0.08)", icon: Plus },
  removed: { label: "Remoção", color: "var(--danger)", bg: "rgba(201, 69, 62, 0.08)", icon: Minus },
  modified: { label: "Modificação", color: "var(--warning)", bg: "rgba(230, 168, 23, 0.08)", icon: RefreshCw },
};

function parseSections(diff: Record<string, any>): DiffSection[] {
  if (diff.sections && Array.isArray(diff.sections)) {
    return diff.sections;
  }
  return [];
}

export default function ChangelogViewer({ changelog }: ChangelogViewerProps) {
  const [showDetails, setShowDetails] = useState(false);
  const sections = parseSections(changelog.diff_content || {});
  const isNewDocument = sections.length === 0 || sections.every(s => s.change_type === "added");

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <GitCompare size={20} style={{ color: "var(--accent)" }} />
        <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
          Alterações da Versão
        </h3>
      </div>

      {/* Summary — main content */}
      {changelog.summary && (
        <div
          style={{
            borderRadius: "var(--radius-sm)",
            background: "var(--accent-light)",
            border: "1px solid var(--accent-border)",
            padding: 16,
          }}
        >
          <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
            {changelog.summary}
          </p>
        </div>
      )}

      {/* No summary fallback */}
      {!changelog.summary && sections.length === 0 && (
        <div className="flex items-center gap-2" style={{ padding: 16 }}>
          <FileText size={16} style={{ color: "var(--text-muted)" }} />
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Versão inicial do documento — sem alterações para comparar.
          </p>
        </div>
      )}

      {/* Expandable details */}
      {sections.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 w-full"
            style={{
              padding: "10px 0",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--accent)",
            }}
          >
            <ChevronDown
              size={16}
              style={{
                transform: showDetails ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
            {showDetails ? "Ocultar detalhes" : `Ver detalhes das mudanças (${sections.length})`}
          </button>

          {showDetails && (
            <div className="space-y-3" style={{ marginTop: 4 }}>
              {sections.map((section, idx) => {
                const config = CHANGE_TYPE_CONFIG[section.change_type] || CHANGE_TYPE_CONFIG.modified;
                const Icon = config.icon;

                return (
                  <div
                    key={idx}
                    style={{
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${config.color}`,
                      background: config.bg,
                      padding: 14,
                    }}
                  >
                    {/* Section header */}
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} className="shrink-0" style={{ color: config.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {section.section}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: "var(--radius-sm)",
                          background: config.color,
                          color: "#fff",
                        }}
                      >
                        {config.label}
                      </span>
                    </div>

                    {/* Description */}
                    {section.description && (
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                        {section.description}
                      </p>
                    )}

                    {/* Content snippets */}
                    {(section.old_content_snippet || section.new_content_snippet) && (
                      <div className="space-y-1" style={{ marginTop: 6 }}>
                        {section.old_content_snippet && (
                          <div
                            className="flex items-start gap-2"
                            style={{
                              padding: "6px 10px",
                              borderRadius: "var(--radius-sm)",
                              background: "rgba(201, 69, 62, 0.06)",
                            }}
                          >
                            <Minus size={12} className="mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />
                            <span style={{ fontSize: 12, color: "var(--danger)", fontStyle: "italic" }}>
                              {section.old_content_snippet}
                            </span>
                          </div>
                        )}
                        {section.new_content_snippet && (
                          <div
                            className="flex items-start gap-2"
                            style={{
                              padding: "6px 10px",
                              borderRadius: "var(--radius-sm)",
                              background: "rgba(45, 138, 78, 0.06)",
                            }}
                          >
                            <Plus size={12} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                            <span style={{ fontSize: 12, color: "var(--success)", fontStyle: "italic" }}>
                              {section.new_content_snippet}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
