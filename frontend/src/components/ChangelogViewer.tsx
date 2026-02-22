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
        <div key={key} className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">{key}</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{value}</p>
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
          <div key={key} className="rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">{key}</h4>
            <pre className="text-xs text-gray-600 bg-gray-50 rounded-md p-3 overflow-x-auto">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        );
      }

      return (
        <div key={key} className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">{key}</h4>
          <div className="space-y-2">
            {Array.isArray(additions) &&
              additions.map((item: string, i: number) => (
                <div
                  key={`add-${i}`}
                  className="flex items-start gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2"
                >
                  <Plus size={14} className="mt-0.5 shrink-0 text-green-600" />
                  <span className="text-sm text-green-800">{item}</span>
                </div>
              ))}
            {Array.isArray(removals) &&
              removals.map((item: string, i: number) => (
                <div
                  key={`rem-${i}`}
                  className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2"
                >
                  <Minus size={14} className="mt-0.5 shrink-0 text-red-600" />
                  <span className="text-sm text-red-800">{item}</span>
                </div>
              ))}
            {Array.isArray(changes) &&
              changes.map((item: string, i: number) => (
                <div
                  key={`chg-${i}`}
                  className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2"
                >
                  <RefreshCw
                    size={14}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  <span className="text-sm text-amber-800">{item}</span>
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
        <GitCompare size={20} className="text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Changelog</h3>
      </div>

      {/* Summary */}
      <div className="mb-4 rounded-lg bg-indigo-50 border border-indigo-200 p-4">
        <p className="text-sm font-medium text-indigo-900">Resumo</p>
        <p className="text-sm text-indigo-700 mt-1">{changelog.summary}</p>
      </div>

      {/* Diff sections */}
      <div className="space-y-3">
        {Object.keys(diff).length > 0 ? (
          Object.entries(diff).map(([key, value]) =>
            renderDiffSection(key, value)
          )
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Documento novo - sem diferencas para exibir.
          </p>
        )}
      </div>
    </div>
  );
}
