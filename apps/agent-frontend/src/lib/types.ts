export interface ExtractedProfile {
  full_name: string;
  current_role?: string;
  years_of_experience: number;
  hard_skills: string[];
  soft_skills: string[];
  education?: string;
  target_roles: string[];
  learning_hours_per_week: number;
  budget_idr: number;
}

export interface RoleFitResult {
  role_name: string;
  total_score: number;
  confidence_level: string;
  score_breakdown: Record<string, number>;
  matching_skills: string[];
  missing_critical_skills: string[];
  evidence_job_ids: string[];
  reasoning_summary: string;
}

export interface LearningResource {
  title: string;
  provider: string;
  url: string;
  cost_idr: number;
  duration_hours: number;
  language: string;
  source: string;
  last_verified_at: string;
}

export interface CareerBlueprint {
  profile_summary: ExtractedProfile;
  top_paths: RoleFitResult[];
  skill_gap_matrix: Array<{ role: string; score: number; missing: string[] }>;
  roadmap_30_60_90: Record<string, any>;
  market_evidence: Record<string, any>;
  limitations: string[];
  confidence_level: string;
  sources: Array<{ id: string; title: string; url: string }>;
}

export interface WorkflowEvent {
  type: string;
  step?: string;
  label?: string;
  status?: string;
  revision?: number;
  message?: string;
}
