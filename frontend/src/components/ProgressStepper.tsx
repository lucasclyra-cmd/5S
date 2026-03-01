"use client";

import React from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Props {
  status: string;
}

const STEPS = [
  {
    key: "upload",
    label: "Upload",
    completedStatuses: [
      "analyzing", "analysis_failed", "spelling_review", "in_review",
      "approved", "rejected", "formatted", "formatting", "active", "published",
    ],
    activeStatuses: ["draft", "pending_analysis"],
    errorStatuses: [],
  },
  {
    key: "analysis",
    label: "Análise IA",
    completedStatuses: [
      "spelling_review", "in_review", "approved", "rejected",
      "formatted", "formatting", "active", "published",
    ],
    activeStatuses: ["analyzing"],
    errorStatuses: ["analysis_failed"],
  },
  {
    key: "review",
    label: "Revisão",
    completedStatuses: [
      "approved", "formatted", "formatting", "active", "published",
    ],
    activeStatuses: ["spelling_review", "in_review", "rejected"],
    errorStatuses: [],
  },
  {
    key: "publish",
    label: "Publicação",
    completedStatuses: ["active", "published"],
    activeStatuses: ["formatted", "formatting"],
    errorStatuses: [],
  },
];

function getStepState(step: typeof STEPS[number], status: string): "completed" | "active" | "error" | "pending" {
  if (step.errorStatuses.includes(status)) return "error";
  if (step.completedStatuses.includes(status)) return "completed";
  if (step.activeStatuses.includes(status)) return "active";
  return "pending";
}

export default function ProgressStepper({ status }: Props) {
  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const state = getStepState(step, status);
          return (
            <React.Fragment key={step.key}>
              {idx > 0 && (
                <div
                  className="flex-1 mx-2"
                  style={{
                    height: 2,
                    background:
                      state === "completed" || state === "active"
                        ? "var(--accent)"
                        : state === "error"
                          ? "var(--danger)"
                          : "var(--border)",
                    transition: "background 0.3s",
                  }}
                />
              )}
              <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 72 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s",
                    ...(state === "completed"
                      ? { background: "var(--success)", color: "#fff" }
                      : state === "active"
                        ? { background: "var(--accent)", color: "#fff" }
                        : state === "error"
                          ? { background: "var(--danger)", color: "#fff" }
                          : {
                              background: "var(--bg-secondary)",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border)",
                            }),
                  }}
                >
                  {state === "completed" ? (
                    <CheckCircle2 size={18} />
                  ) : state === "active" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : state === "error" ? (
                    <XCircle size={16} />
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{idx + 1}</span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: state === "active" ? 600 : 400,
                    color:
                      state === "active"
                        ? "var(--text-primary)"
                        : state === "error"
                          ? "var(--danger)"
                          : state === "completed"
                            ? "var(--success)"
                            : "var(--text-muted)",
                    textAlign: "center",
                  }}
                >
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
