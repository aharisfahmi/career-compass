import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import asyncio
from app.workflow.orchestrator import run_workflow
from app.workflow.state import CareerOptimizerState


async def _dummy_on_event(event: dict):
    print(f"  EVENT: {event.get('type')} | step={event.get('step','')} label={event.get('label','')}")


async def main():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
    raw_cv = open(os.path.join(repo_root, "cv.txt")).read()

    state: CareerOptimizerState = {
        "raw_cv_text": raw_cv,
        "user_input_form": {
            "full_name": "Ahmad Haris Fahmi",
            "current_role": "Backend Developer",
            "years_of_experience": 6,
            "hard_skills": ["Golang", "PHP", "PostgreSQL", "Docker", "Redis"],
            "soft_skills": ["Komunikasi", "Teamwork"],
            "education": "S1 Informatika",
            "target_roles": ["Golang Developer", "PHP Developer", "Senior Backend Developer"],
            "learning_hours_per_week": 20,
            "budget_idr": 5000000,
        },
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

    final_state = await run_workflow(state, on_event=_dummy_on_event)

    print("\n=== ERROR MESSAGES ===")
    for msg in final_state.get("error_messages", []):
        print(f"  ERROR: {msg}")

    print("\n=== EXECUTION LOGS ===")
    for log in final_state.get("execution_logs", []):
        print(f"  {log}")

    print(f"\n=== FINAL: quality_approved={final_state.get('quality_approved')} ===")
    print(f"  confirmed_profile keys: {list(final_state.get('confirmed_profile', {}).keys())}")
    print(f"  retrieved_jobs count: {len(final_state.get('retrieved_jobs', []))}")
    print(f"  evaluated_roles count: {len(final_state.get('evaluated_roles', []))}")
    bp = final_state.get("career_blueprint", {})
    print(f"  career_blueprint keys: {list(bp.keys())}")
    print(f"  limitations: {bp.get('limitations', [])}")
    print(f"  confidence_level: {bp.get('confidence_level', 'N/A')}")

    out_path = os.path.join(repo_root, "test_e2e_output.json")
    with open(out_path, "w") as f:
        json.dump(final_state, f, indent=2, default=str)
    print(f"\nOutput saved to {out_path}")

    if final_state.get("error_messages"):
        print("\n\u274c WORKFLOW COMPLETED WITH ERRORS")
        sys.exit(1)
    elif not bp.get("top_paths"):
        print("\n\u26a0\ufe0f  WORKFLOW OK but no evaluated roles")
        sys.exit(0)
    else:
        print("\n\u2705 WORKFLOW SUCCESS")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
