"use client";

import React from "react";
import { GitCompare, Plus, Minus, RefreshCw } from "lucide-react";
import type { Changelog } from "@/types";

interface ChangelogViewerProps {
  changelog: Changelog;
}

export default function ChangelogViewer({ changelog }: ChangelogViewerProps) {
  const diff = changelog.diff_content;

  function renderDiffSection(key: string, value: any) {
    if (typeof value === "string") {
      return (
        <div
          key={key}
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            padding: 16,
          }}
        >
          <h4 style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>{key}</h4>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{value}</p>
        </div>
      );
    }

    if (typeof value === "object" && value !== null) {
      const additions = value.added || value.additions || [];
      const removals = value.removed || value.removals || [];
      const changes = value.changed || value.changes || [];

      const hasContent =
        (Array.isArray(additions) && additions.length > 0) ||
        (Array.isArray(removals) && removals.length > 0) ||
        (Array.isArray(changes) && changes.length > 0);

      if (!hasContent && typeof value === "object") {
        return (
          <div
            key={key}
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              padding: 16,
            }}
          >
            <h4 style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>{key}</h4>
            <pre
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                background: "var(--bg-main)",
                borderRadius: "var(--radius-sm)",
                padding: 12,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        );
      }

      return (
        <div
          key={key}
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            padding: 16,
          }}
        >
          <h4 style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 12 }}>{key}</h4>
          <div className="space-y-2">
            {Array.isArray(additions) &&
              additions.map((item: string, i: number) => (
                <div
                  key={`add-${i}`}
                  className="flex items-start gap-2 px-3 py-2"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(45, 138, 78, 0.06)",
                    border: "1px solid var(--success)",
                  }}
                >
                  <Plus size={14} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                  <span style={{ fontSize: 13, color: "var(--success)" }}>{item}</span>
                </div>
              ))}
            {Array.isArray(removals) &&
              removals.map((item: string, i: number) => (
                <div
                  key={`rem-${i}`}
                  className="flex items-start gap-2 px-3 py-2"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(201, 69, 62, 0.06)",
                    border: "1px solid var(--danger)",
                  }}
                >
                  <Minus size={14} className="mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />
                  <span style={{ fontSize: 13, color: "var(--danger)" }}>{item}</span>
                </div>
              ))}
            {Array.isArray(changes) &&
              changes.map((item: string, i: number) => (
                <div
                  key={`chg-${i}`}
                  className="flex items-start gap-2 px-3 py-2"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(230, 168, 23, 0.06)",
                    border: "1px solid var(--warning)",
                  }}
                >
                  <RefreshCw
                    size={14}
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--warning)" }}
                  />
                  <span style={{ fontSize: 13, color: "var(--warning)" }}>{item}</span>
                </div>
              ))}
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare size={20} style={{ color: "var(--accent)" }} />
        <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Changelog</h3>
      </div>

      {/* Summary */}
      <div
        className="mb-4"
        style={{
          borderRadius: "var(--radius-sm)",
          background: "var(--accent-light)",
          border: "1px solid var(--accent-border)",
          padding: 16,
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Resumo</p>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{changelog.summary}</p>
      </div>

      {/* Diff sections */}
      <div className="space-y-3">
        {Object.keys(diff).length > 0 ? (
          Object.entries(diff).map(([key, value]) =>
            renderDiffSection(key, value)
          )
        ) : (
          <p className="text-center py-4" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Documento novo - sem diferenças para exibir.
          </p>
        )}
      </div>
    </div>
  );
}
