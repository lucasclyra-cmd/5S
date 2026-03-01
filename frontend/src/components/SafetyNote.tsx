"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { detectSafety } from "@/lib/api";
import type { SafetyDetectionResult } from "@/types";

interface Props {
  versionId: number;
}

export default function SafetyNote({ versionId }: Props) {
  const [safety, setSafety] = useState<SafetyDetectionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectSafety(versionId)
      .then(setSafety)
      .catch(() => setSafety(null))
      .finally(() => setLoading(false));
  }, [versionId]);

  // Don't show anything while loading or if no safety issues
  if (loading || !safety?.involves_safety) return null;

  return (
    <div className="card">
      <div
        className="flex items-start gap-3 px-4 py-3"
        style={{
          borderRadius: "var(--radius-sm)",
          background: "rgba(230, 168, 23, 0.06)",
          border: "1px solid rgba(230, 168, 23, 0.2)",
        }}
      >
        <AlertTriangle size={18} style={{ color: "var(--warning)", marginTop: 2, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            Conteúdo de segurança detectado
          </p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            {safety.recommendation}
          </p>
          {safety.safety_topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {safety.safety_topics.map((topic) => (
                <span
                  key={topic}
                  className="chip"
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    background: "rgba(230, 168, 23, 0.08)",
                    borderColor: "rgba(230, 168, 23, 0.2)",
                    color: "var(--warning)",
                  }}
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
            Certifique-se de que um técnico de segurança conste na cadeia de aprovação.
          </p>
        </div>
      </div>
    </div>
  );
}
