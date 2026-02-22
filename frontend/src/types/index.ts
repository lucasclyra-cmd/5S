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
