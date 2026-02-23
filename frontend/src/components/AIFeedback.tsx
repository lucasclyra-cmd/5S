"use client";

import React from "react";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import type { AIAnalysis } from "@/types";

interface AIFeedbackProps {
  analysis: AIAnalysis;
}

export default function AIFeedback({ analysis }: AIFeedbackProps) {
  const approvedCount = analysis.feedback_items.filter(
    (item) => item.status === "approved"
  ).length;
  const rejectedCount = analysis.feedback_items.filter(
    (item) => item.status === "rejected"
  ).length;
  const totalCount = analysis.feedback_items.length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
            Análise de IA
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            Agente: {analysis.agent_type}
          </p>
        </div>
        <div>
          {analysis.approved === true && (
            <span className="badge-success">
              Aprovado
            </span>
          )}
          {analysis.approved === false && (
            <span className="badge-danger">
              Rejeitado
            </span>
          )}
          {analysis.approved === null && (
            <span className="badge-warning">
              Pendente
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2" style={{ fontSize: 13 }}>
            <span style={{ color: "var(--text-secondary)" }}>
              {approvedCount} de {totalCount} itens aprovados
            </span>
            <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
              {Math.round((approvedCount / totalCount) * 100)}%
            </span>
          </div>
          <div
            style={{
              height: 8,
              width: "100%",
              overflow: "hidden",
              borderRadius: 100,
              background: "var(--bg-main)",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 100,
                background: "var(--success)",
                transition: "all 0.3s ease",
                width: `${(approvedCount / totalCount) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Feedback items */}
      <div className="space-y-3">
        {analysis.feedback_items.map((item, index) => (
          <div
            key={index}
            style={{
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${item.status === "approved" ? "var(--success)" : "var(--danger)"}`,
              background: item.status === "approved"
                ? "rgba(45, 138, 78, 0.04)"
                : "rgba(201, 69, 62, 0.04)",
              padding: 16,
            }}
          >
            <div className="flex items-start gap-3">
              {item.status === "approved" ? (
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--success)" }}
                />
              ) : (
                <XCircle
                  size={20}
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--danger)" }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: item.status === "approved"
                      ? "var(--success)"
                      : "var(--danger)",
                  }}
                >
                  {item.item}
                </p>
                {item.suggestion && (
                  <div
                    className="mt-2 flex items-start gap-2"
                    style={{
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-card)",
                      padding: 10,
                    }}
                  >
                    <Lightbulb
                      size={16}
                      className="mt-0.5 shrink-0"
                      style={{ color: "var(--warning)" }}
                    />
                    <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {item.suggestion}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {analysis.feedback_items.length === 0 && (
        <p className="text-center py-4" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Nenhum item de feedback disponível.
        </p>
      )}
    </div>
  );
}
