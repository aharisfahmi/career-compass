import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.workflow.state import CareerOptimizerState


def test_state_defaults():
    state: CareerOptimizerState = {
        "raw_cv_text": None,
        "user_input_form": {},
        "confirmed_profile": {},
        "retrieved_jobs": [],
        "market_stats": {},
        "evaluated_roles": [],
        "skill_gaps": {},
        "roadmap_plan": {},
        "career_blueprint": {},
        "quality_approved": False,
        "revision_count": 0,
        "error_messages": [],
        "execution_logs": [],
    }
    assert state["quality_approved"] is False
    assert state["revision_count"] == 0
    assert state["error_messages"] == []


def test_state_with_data():
    state: CareerOptimizerState = {
        "raw_cv_text": "Sample CV text",
        "user_input_form": {"name": "Test User"},
        "confirmed_profile": {"full_name": "Test User", "hard_skills": ["Python"]},
        "retrieved_jobs": [{"id": "JOB-001", "title": "Data Analyst"}],
        "market_stats": {},
        "evaluated_roles": [],
        "skill_gaps": {},
        "roadmap_plan": {},
        "career_blueprint": {},
        "quality_approved": False,
        "revision_count": 0,
        "error_messages": [],
        "execution_logs": [],
    }
    assert state["raw_cv_text"] == "Sample CV text"
    assert len(state["retrieved_jobs"]) == 1
