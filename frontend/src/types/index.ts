export interface Document {
  id: number;
  code: string;
  title: string;
  category_id: number | null;
  current_version: number;
  status: string;
  created_by_profile: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  document_type: string | null;
  sequential_number: number | null;
  revision_number: number;
  sector: string | null;
  effective_date: string | null;
}

export interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  original_file_path: string;
  formatted_file_path_docx: string | null;
  formatted_file_path_pdf: string | null;
  extracted_text: string;
  ai_approved: boolean | null;
  status: string;
  submitted_at: string;
  archived_at: string | null;
}

export interface FeedbackItem {
  item: string;
  status: "approved" | "rejected";
  suggestion: string | null;
}

export interface AIAnalysis {
  id: number;
  version_id: number;
  agent_type: string;
  feedback_items: FeedbackItem[];
  approved: boolean | null;
  created_at: string;
}

export interface Changelog {
  id: number;
  version_id: number;
  previous_version_id: number | null;
  diff_content: Record<string, any>;
  summary: string;
  created_at: string;
}

export interface WorkflowItem {
  id: number;
  version_id: number;
  document_code: string;
  document_title: string;
  assigned_to_profile: string;
  action: string | null;
  comments: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  parent_id: number | null;
}

export interface Tag {
  id: number;
  name: string;
}

export interface AdminConfig {
  id: number;
  config_type: string;
  category_id: number | null;
  document_type: string | null;
  config_data: Record<string, any>;
  updated_at: string;
}

export interface DocumentWithVersions extends Document {
  versions: DocumentVersion[];
}

export interface MasterListEntry {
  id: number;
  document_id: number;
  master_list_code: string;
  entry_type: string;
  document_code: string;
  document_title: string;
  document_type: string | null;
  revision_number: number;
  effective_date: string | null;
  sector: string | null;
  status: string;
  added_at: string;
  removed_at: string | null;
}

export interface MasterListStats {
  total_active: number;
  total_by_type: Record<string, number>;
  latest_update: string | null;
}

// ─── Approval Chain ─────────────────────────────────────────

export interface ApprovalChainApprover {
  id: number;
  chain_id: number;
  approver_name: string;
  approver_role: string;
  approver_profile: string;
  order: number;
  action: string | null;
  comments: string | null;
  is_required: boolean;
  ai_recommended: boolean;
  acted_at: string | null;
}

export interface ApprovalChain {
  id: number;
  version_id: number;
  chain_type: string;
  requires_training: boolean | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  approvers: ApprovalChainApprover[];
}

export interface DefaultApprover {
  id: number;
  approver_name: string;
  approver_role: string;
  approver_profile: string;
  document_type: string | null;
  is_default: boolean;
  order: number;
}

export interface PendingApprovalItem {
  chain_id: number;
  version_id: number;
  document_code: string;
  document_title: string;
  chain_type: string;
  chain_status: string;
  total_approvers: number;
  approved_count: number;
  pending_count: number;
  created_at: string;
}

export interface SafetyDetectionResult {
  involves_safety: boolean;
  confidence: number;
  safety_topics: string[];
  recommendation: string;
}

// ─── Document Templates ────────────────────────────────────

export interface DocumentTemplate {
  id: number;
  name: string;
  description: string | null;
  document_type: string;
  template_file_path: string;
  is_active: boolean;
  section_mapping: Record<string, any> | null;
  header_config: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface TemplatePlaceholderPreview {
  template_id: number;
  name: string;
  document_type: string;
  placeholders: string[];
}
