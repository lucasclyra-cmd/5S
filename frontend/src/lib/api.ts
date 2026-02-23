import type {
  Document,
  DocumentVersion,
  DocumentWithVersions,
  AIAnalysis,
  Changelog,
  WorkflowItem,
  Category,
  Tag,
  AdminConfig,
} from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let message = `Erro na requisição: ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) {
        message =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      // ignore parse error
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// ─── Documents ───────────────────────────────────────────────

export async function uploadDocument(
  file: File,
  metadata: {
    code: string;
    title: string;
    category_id?: number;
    tags?: string[];
    created_by_profile: string;
  }
): Promise<{ document: Document; version: DocumentVersion }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("metadata", JSON.stringify(metadata));

  return request("/api/documents/upload", {
    method: "POST",
    body: formData,
  });
}

export async function getDocuments(
  params?: {
    status?: string;
    category_id?: number;
    code?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ documents: Document[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.category_id)
    searchParams.set("category_id", String(params.category_id));
  if (params?.code) searchParams.set("code", params.code);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const qs = searchParams.toString();
  return request(`/api/documents${qs ? `?${qs}` : ""}`);
}

export async function searchDocuments(
  query: string
): Promise<Document[]> {
  return request(
    `/api/documents/search?q=${encodeURIComponent(query)}`
  );
}

export async function getDocument(
  code: string
): Promise<DocumentWithVersions> {
  return request(`/api/documents/${encodeURIComponent(code)}`);
}

export async function getVersion(
  code: string,
  versionNumber: number
): Promise<DocumentVersion> {
  return request(
    `/api/documents/${encodeURIComponent(code)}/versions/${versionNumber}`
  );
}

export async function resubmitDocument(
  code: string,
  file: File,
  profile: string
): Promise<{ document: Document; version: DocumentVersion }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("created_by_profile", profile);

  return request(`/api/documents/${encodeURIComponent(code)}/resubmit`, {
    method: "POST",
    body: formData,
  });
}

export async function skipAiApproval(code: string): Promise<void> {
  return request(
    `/api/documents/${encodeURIComponent(code)}/skip-ai`,
    {
      method: "POST",
    }
  );
}

// ─── AI ──────────────────────────────────────────────────────

export async function analyzeDocument(
  versionId: number
): Promise<AIAnalysis> {
  return request(`/api/ai/analyze/${versionId}`, {
    method: "POST",
  });
}

export async function getAnalysis(
  versionId: number
): Promise<AIAnalysis | null> {
  const results: AIAnalysis[] = await request(`/api/ai/analysis/${versionId}`);
  if (!results || results.length === 0) return null;
  // Return the most recent analysis of type "analysis"
  const analysisResult = results.find((r) => r.agent_type === "analysis");
  return analysisResult || results[0];
}

export async function formatDocument(
  versionId: number
): Promise<any> {
  return request(`/api/ai/format/${versionId}`, {
    method: "POST",
  });
}

export async function generateChangelog(
  versionId: number
): Promise<Changelog> {
  return request(`/api/ai/changelog/${versionId}`, {
    method: "POST",
  });
}

// ─── Workflow ────────────────────────────────────────────────

export async function getWorkflowQueue(): Promise<WorkflowItem[]> {
  return request("/api/workflow/queue");
}

export async function approveDocument(
  versionId: number
): Promise<void> {
  return request(`/api/workflow/${versionId}/approve`, {
    method: "POST",
  });
}

export async function rejectDocument(
  versionId: number,
  comments: string
): Promise<void> {
  return request(`/api/workflow/${versionId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reject", comments }),
  });
}

// ─── Categories ──────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  return request("/api/admin/categories");
}

export async function createCategory(data: {
  name: string;
  description: string;
  parent_id?: number | null;
}): Promise<Category> {
  return request("/api/admin/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateCategory(
  id: number,
  data: { name?: string; description?: string; parent_id?: number | null }
): Promise<Category> {
  return request(`/api/admin/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: number): Promise<void> {
  return request(`/api/admin/categories/${id}`, {
    method: "DELETE",
  });
}

// ─── Tags ────────────────────────────────────────────────────

export async function getTags(): Promise<Tag[]> {
  return request("/api/admin/tags");
}

export async function createTag(data: {
  name: string;
}): Promise<Tag> {
  return request("/api/admin/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteTag(id: number): Promise<void> {
  return request(`/api/admin/tags/${id}`, {
    method: "DELETE",
  });
}

// ─── Admin Configs ───────────────────────────────────────────

function configTypeToEndpoint(configType: string): string {
  switch (configType) {
    case "template":
      return "templates";
    case "analysis_rules":
    case "analysis_rule":
      return "rules";
    case "prompt":
      return "prompts";
    default:
      return "templates";
  }
}

export async function getAdminConfigs(
  type: string
): Promise<AdminConfig[]> {
  const endpoint = configTypeToEndpoint(type);
  return request(`/api/admin/${endpoint}`);
}

export async function createAdminConfig(data: {
  config_type: string;
  category_id?: number | null;
  document_type?: string | null;
  config_data: Record<string, any>;
}): Promise<AdminConfig> {
  const endpoint = configTypeToEndpoint(data.config_type);
  return request(`/api/admin/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateAdminConfig(
  id: number,
  data: {
    config_type?: string;
    category_id?: number | null;
    document_type?: string | null;
    config_data?: Record<string, any>;
  }
): Promise<AdminConfig> {
  const endpoint = configTypeToEndpoint(data.config_type || "template");
  return request(`/api/admin/${endpoint}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteAdminConfig(id: number, configType: string): Promise<void> {
  const endpoint = configTypeToEndpoint(configType);
  return request(`/api/admin/${endpoint}/${id}`, {
    method: "DELETE",
  });
}

// ─── Export ──────────────────────────────────────────────────

export function getExportUrl(
  versionId: number,
  format: "docx" | "pdf"
): string {
  return `${API_URL}/api/export/${versionId}/${format}`;
}
