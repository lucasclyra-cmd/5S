"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertCircle, Lightbulb } from "lucide-react";
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
          <h3 className="text-lg font-semibold text-gray-900">
            Analise de IA
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Agente: {analysis.agent_type}
          </p>
        </div>
        <div>
          {analysis.approved === true && (
            <span className="badge-success flex items-center gap-1.5 px-3 py-1.5 text-sm">
              <CheckCircle2 size={16} />
              Aprovado
            </span>
          )}
          {analysis.approved === false && (
            <span className="badge-danger flex items-center gap-1.5 px-3 py-1.5 text-sm">
              <XCircle size={16} />
              Rejeitado
            </span>
          )}
          {analysis.approved === null && (
            <span className="badge-warning flex items-center gap-1.5 px-3 py-1.5 text-sm">
              <AlertCircle size={16} />
              Pendente
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">
              {approvedCount} de {totalCount} itens aprovados
            </span>
            <span className="font-medium text-gray-900">
              {Math.round((approvedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{
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
            className={`rounded-lg border p-4 ${
              item.status === "approved"
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {item.status === "approved" ? (
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-green-600"
                />
              ) : (
                <XCircle
                  size={20}
                  className="mt-0.5 shrink-0 text-red-600"
                />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    item.status === "approved"
                      ? "text-green-900"
                      : "text-red-900"
                  }`}
                >
                  {item.item}
                </p>
                {item.suggestion && (
                  <div className="mt-2 flex items-start gap-2 rounded-md bg-white/60 p-2.5">
                    <Lightbulb
                      size={16}
                      className="mt-0.5 shrink-0 text-amber-500"
                    />
                    <p className="text-xs text-gray-700">
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
        <p className="text-sm text-gray-500 text-center py-4">
          Nenhum item de feedback disponivel.
        </p>
      )}
    </div>
  );
}
