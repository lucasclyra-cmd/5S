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
  MasterListEntry,
  MasterListStats,
  ApprovalChain,
  DefaultApprover,
  PendingApprovalItem,
  SafetyDetectionResult,
  DocumentTemplate,
  TemplatePlaceholderPreview,
  ScanResponse,
  ImportResponse,
  TextReview,
  DistributionEntry,
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
    document_type: string;
    title: string;
    category_id?: number;
    tags?: string[];
    created_by_profile: string;
    sector?: string;
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

export async function getNextCode(
  documentType: string
): Promise<{
  code: string;
  document_type: string;
  sequential_number: number;
  revision_number: number;
}> {
  return request(`/api/documents/next-code/${documentType}`);
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
  profile: string,
  changeSummary?: string
): Promise<{ document: Document; version: DocumentVersion }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("created_by_profile", profile);
  if (changeSummary) {
    formData.append("change_summary", changeSummary);
  }

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

export async function getChangelog(
  versionId: number
): Promise<Changelog> {
  return request(`/api/ai/changelog/${versionId}`);
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

// ─── Master List ────────────────────────────────────────────

export async function getMasterList(params?: {
  document_type?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ entries: MasterListEntry[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.document_type) searchParams.set("document_type", params.document_type);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const qs = searchParams.toString();
  return request(`/api/master-list${qs ? `?${qs}` : ""}`);
}

export async function getMasterListStats(): Promise<MasterListStats> {
  return request("/api/master-list/stats");
}

export function getMasterListExportUrl(documentType?: string): string {
  const params = new URLSearchParams({ format: "csv" });
  if (documentType) params.set("document_type", documentType);
  return `${API_URL}/api/master-list/export?${params.toString()}`;
}

// ─── Approval ───────────────────────────────────────────────

export async function createApprovalChain(data: {
  version_id: number;
  chain_type?: string;
  approvers: {
    approver_name: string;
    approver_role: string;
    approver_profile?: string;
    is_required?: boolean;
    ai_recommended?: boolean;
    order?: number;
  }[];
}): Promise<ApprovalChain> {
  return request("/api/approval/chains", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getApprovalChain(
  versionId: number
): Promise<ApprovalChain> {
  return request(`/api/approval/chains/${versionId}`);
}

export async function recordApproverAction(
  chainId: number,
  approverId: number,
  action: "approve" | "reject",
  comments?: string
): Promise<ApprovalChain> {
  return request(
    `/api/approval/chains/${chainId}/approvers/${approverId}/action`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comments }),
    }
  );
}

export async function updateTrainingRequirement(
  chainId: number,
  requiresTraining: boolean
): Promise<ApprovalChain> {
  return request(`/api/approval/chains/${chainId}/training`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requires_training: requiresTraining }),
  });
}

export async function getPendingApprovals(): Promise<PendingApprovalItem[]> {
  return request("/api/approval/pending");
}

export async function getDefaultApprovers(
  documentType?: string
): Promise<DefaultApprover[]> {
  const params = documentType ? `?document_type=${documentType}` : "";
  return request(`/api/approval/defaults${params}`);
}

export async function createDefaultApprover(data: {
  approver_name: string;
  approver_role: string;
  approver_profile?: string;
  document_type?: string | null;
  is_default?: boolean;
  order?: number;
}): Promise<DefaultApprover> {
  return request("/api/approval/defaults", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateDefaultApprover(
  id: number,
  data: {
    approver_name: string;
    approver_role: string;
    approver_profile?: string;
    document_type?: string | null;
    is_default?: boolean;
    order?: number;
  }
): Promise<DefaultApprover> {
  return request(`/api/approval/defaults/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteDefaultApprover(id: number): Promise<void> {
  return request(`/api/approval/defaults/${id}`, {
    method: "DELETE",
  });
}

export async function detectSafety(
  versionId: number
): Promise<SafetyDetectionResult> {
  return request(`/api/approval/detect-safety/${versionId}`, {
    method: "POST",
  });
}

// ─── Document Templates ─────────────────────────────────────

export async function uploadTemplate(
  file: File,
  name: string,
  documentType: string,
  description?: string
): Promise<DocumentTemplate> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  formData.append("document_type", documentType);
  if (description) formData.append("description", description);

  return request("/api/templates/upload", {
    method: "POST",
    body: formData,
  });
}

export async function getTemplates(
  documentType?: string,
  activeOnly?: boolean
): Promise<{ templates: DocumentTemplate[]; total: number }> {
  const params = new URLSearchParams();
  if (documentType) params.set("document_type", documentType);
  if (activeOnly !== undefined) params.set("active_only", String(activeOnly));
  const qs = params.toString();
  return request(`/api/templates${qs ? `?${qs}` : ""}`);
}

export async function getTemplate(id: number): Promise<DocumentTemplate> {
  return request(`/api/templates/${id}`);
}

export async function getTemplatePlaceholders(
  id: number
): Promise<TemplatePlaceholderPreview> {
  return request(`/api/templates/${id}/preview`);
}

export async function deleteTemplate(id: number): Promise<void> {
  return request(`/api/templates/${id}`, { method: "DELETE" });
}

export function getTemplateDownloadUrl(templateId: number): string {
  return `${API_URL}/api/templates/${templateId}/download`;
}

// ─── Export ──────────────────────────────────────────────────

export function getExportUrl(
  versionId: number,
  format: "docx" | "pdf"
): string {
  return `${API_URL}/api/export/${versionId}/${format}`;
}

// ─── Bulk Import ─────────────────────────────────────────────

export async function scanImportFolder(): Promise<ScanResponse> {
  return request("/api/import/scan");
}

export async function executeImport(
  excludeCodes: string[] = []
): Promise<ImportResponse> {
  return request("/api/import/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exclude_codes: excludeCodes }),
  });
}

// ─── Text Review (Spelling/Clarity) ─────────────────────────

export async function getTextReview(
  versionId: number
): Promise<TextReview | null> {
  try {
    return await request<TextReview>(
      `/api/ai/text-review/${versionId}`
    );
  } catch {
    return null;
  }
}

export async function getTextReviewHistory(
  versionId: number
): Promise<TextReview[]> {
  return request<TextReview[]>(
    `/api/ai/text-review/${versionId}/history`
  );
}

export async function submitTextReview(
  versionId: number,
  userText: string,
  skipClarity: boolean = false
): Promise<TextReview> {
  return request<TextReview>(
    `/api/ai/text-review/${versionId}/submit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_text: userText,
        skip_clarity: skipClarity,
      }),
    }
  );
}

export async function acceptTextReview(
  versionId: number
): Promise<TextReview> {
  return request<TextReview>(
    `/api/ai/text-review/${versionId}/accept`,
    { method: "POST" }
  );
}

// ── Publicação de documentos ──────────────────────────────────

export async function publishDocument(
  code: string,
  versionId?: number
): Promise<{ message: string; version_id: number; published_at: string }> {
  const params = versionId ? `?version_id=${versionId}` : "";
  return request(`/api/documents/${encodeURIComponent(code)}/publish${params}`, {
    method: "POST",
  });
}

// ── Lista de distribuição ─────────────────────────────────────

export async function getDistribution(
  documentId: number
): Promise<{ distributions: DistributionEntry[]; total: number }> {
  return request(`/api/distribution/${documentId}`);
}

export async function addToDistribution(
  documentId: number,
  data: { recipient_name: string; recipient_role?: string; recipient_email?: string }
): Promise<DistributionEntry> {
  return request(`/api/distribution/${documentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function notifyAllRecipients(
  documentId: number
): Promise<{ message: string; notified_at: string }> {
  return request(`/api/distribution/${documentId}/notify-all`, {
    method: "POST",
  });
}

export async function acknowledgeDistribution(
  entryId: number
): Promise<DistributionEntry> {
  return request(`/api/distribution/entries/${entryId}/acknowledge`, {
    method: "POST",
  });
}

export async function removeFromDistribution(entryId: number): Promise<void> {
  return request(`/api/distribution/entries/${entryId}`, {
    method: "DELETE",
  });
}

// ── Relatório de auditoria ────────────────────────────────────

export function getAuditReportUrl(code: string): string {
  return `${API_URL}/api/audit/${encodeURIComponent(code)}`;
}

// ── Estatísticas de uso de IA ─────────────────────────────────

export async function getAIUsageStats(): Promise<
  Array<{
    agent_type: string;
    model: string;
    calls: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost_usd: number;
  }>
> {
  try {
    return await request<
      Array<{
        agent_type: string;
        model: string;
        calls: number;
        total_input_tokens: number;
        total_output_tokens: number;
        total_cost_usd: number;
      }>
    >("/api/admin/ai-usage");
  } catch {
    return [];
  }
}
