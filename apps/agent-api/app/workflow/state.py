from typing import TypedDict, List, Dict, Any, Optional


class CareerOptimizerState(TypedDict):
    raw_cv_text: Optional[str]
    user_input_form: Dict[str, Any]

    confirmed_profile: Dict[str, Any]

    retrieved_jobs: List[Dict[str, Any]]
    market_stats: Dict[str, Any]

    evaluated_roles: List[Dict[str, Any]]
    skill_gaps: Dict[str, Any]

    roadmap_plan: Dict[str, Any]
    career_blueprint: Dict[str, Any]

    quality_approved: bool
    revision_count: int
    error_messages: List[str]
    execution_logs: List[Dict[str, Any]]
