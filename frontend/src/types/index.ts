export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type FindingCategory = 'security' | 'bug' | 'performance' | 'style' | 'maintainability' | 'best_practice';
export type FindingStatus = 'open' | 'resolved' | 'dismissed';
export type ReviewStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  preferences: {
    theme?: 'dark' | 'light';
    default_language?: string;
    enable_security_checks?: boolean;
    enable_performance_checks?: boolean;
    enable_style_checks?: boolean;
    enable_ai_explanation?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Finding {
  id: string;
  review_id: string;
  rule_id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  description: string;
  why_it_matters?: string;
  file_path: string;
  start_line: number;
  end_line: number;
  source: 'static_analyzer' | 'ast_visitor' | 'security_scanner' | 'ai_llm';
  confidence: number;
  suggested_fix?: string;
  suggested_code?: string;
  original_code?: string;
  updated_source_code?: string;
  status: FindingStatus;
  created_at: string;
}

export interface FindingSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
  resolved: number;
  dismissed: number;
}

export interface ReviewMetrics {
  loc: number;
  code_lines?: number;
  blank_lines: number;
  comment_lines: number;
  cyclomatic_complexity: number;
  maintainability_index: number;
}

export interface Review {
  id: string;
  user_id: string;
  title: string;
  language: string;
  source_code: string;
  status: ReviewStatus;
  analysis_summary?: string;
  quality_score: number;
  metrics: ReviewMetrics;
  ai_used: boolean;
  ai_status: string;
  ai_notes?: string;
  created_at: string;
  completed_at?: string;
  findings: Finding[];
  finding_summary?: FindingSummary;
}

export interface ReviewListItem {
  id: string;
  title: string;
  language: string;
  status: ReviewStatus;
  quality_score: number;
  total_findings: number;
  critical_findings: number;
  high_findings: number;
  ai_used: boolean;
  created_at: string;
  completed_at?: string;
}

export interface ReviewListResponse {
  items: ReviewListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AnalyticsOverview {
  total_reviews: number;
  total_findings: number;
  critical_high_count: number;
  resolved_count: number;
  dismissed_count: number;
  average_quality_score: number;
  severities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  categories: {
    security: number;
    bug: number;
    performance: number;
    style: number;
    maintainability: number;
    best_practice: number;
  };
  languages: {
    language: string;
    count: number;
    percentage: number;
  }[];
  recent_activity: {
    id: string;
    type: string;
    title: string;
    language: string;
    quality_score: number;
    findings_count: number;
    created_at: string;
  }[];
}

export interface TrendItem {
  date: string;
  reviews_count: number;
  average_quality_score: number;
  issues_found: number;
}

export interface AnalyticsTrends {
  trends: TrendItem[];
}

export interface SupportedLanguage {
  id: string;
  name: string;
  extension: string;
  monaco_lang: string;
  ast_analysis: boolean;
  security_scanning: boolean;
  style_linting: boolean;
  ai_remediation: boolean;
  sample_snippet: string;
}

export interface SystemHealth {
  status: string;
  version: string;
  database_connected: boolean;
  ai_status: {
    configured: boolean;
    provider: string;
    fallback_enabled: boolean;
  };
}
