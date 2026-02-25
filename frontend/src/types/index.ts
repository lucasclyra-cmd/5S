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
  review_due_date?: string | null;
  retention_years?: number | null;
  confidentiality_level?: string | null;  // 'publico' | 'interno' | 'restrito' | 'confidencial'
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
  change_summary: string | null;
  published_at?: string | null;
  obsolete_at?: string | null;
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
  deadline?: string | null;
  approval_level?: number;
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
  docx_file_path: string | null;
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

// ─── Bulk Import ──────────────────────────────────────────

export interface ParsedFileItem {
  filename: string;
  document_type: string;
  sequential_number: number;
  revision_number: number;
  title: string;
  code: string;
  extension: string;
  file_size_bytes: number;
}

export interface ParseErrorItem {
  filename: string;
  reason: string;
}

export interface ConflictItem {
  filename: string;
  code: string;
  existing_document_id: number;
  existing_title: string;
  existing_status: string;
}

export interface GroupedDocument {
  document_type: string;
  sequential_number: number;
  title: string;
  latest_revision: number;
  revisions: ParsedFileItem[];
  will_import_as: string;
  conflict: ConflictItem | null;
}

export interface ScanResponse {
  total_files: number;
  parsed_count: number;
  error_count: number;
  conflict_count: number;
  grouped_documents: GroupedDocument[];
  parse_errors: ParseErrorItem[];
}

export interface ImportedDocumentResult {
  code: string;
  title: string;
  status: string;
  master_list_code: string | null;
  error_message: string | null;
}

export interface ImportResponse {
  total_imported: number;
  total_skipped: number;
  total_errors: number;
  results: ImportedDocumentResult[];
}

// ─── Text Review (Spelling/Clarity Loop) ────────────────────

export interface SpellingError {
  original: string;
  corrected: string;
  position: string;
  context: string;
}

export interface ClaritySuggestion {
  original: string;
  suggested: string;
  reason: string;
  position: string;
}

export interface TextReview {
  id: number;
  version_id: number;
  iteration: number;
  original_text: string;
  ai_corrected_text: string | null;
  user_text: string | null;
  spelling_errors: SpellingError[];
  clarity_suggestions: ClaritySuggestion[];
  has_spelling_errors: boolean;
  has_clarity_suggestions: boolean;
  status: string;
  user_skipped_clarity: boolean;
  created_at: string;
  resolved_at: string | null;
}

// ─── Distribution List ───────────────────────────────────────

export interface DistributionEntry {
  id: number;
  document_id: number;
  recipient_name: string;
  recipient_role?: string | null;
  recipient_email?: string | null;
  notified_at?: string | null;
  acknowledged_at?: string | null;
  created_at: string;
}
