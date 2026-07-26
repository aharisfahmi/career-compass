import json
import logging
from typing import Callable, Awaitable

from app.workflow.state import CareerOptimizerState
from app.agents.profile_agent import build_profile_agent
from app.agents.market_agent import build_market_agent
from app.agents.match_agent import build_match_agent
from app.agents.roadmap_agent import build_roadmap_agent
from app.agents.quality_agent import build_quality_agent
from app.services.vector_store import search_jobs, get_role_skill_stats

logger = logging.getLogger(__name__)

MAX_REVISIONS = 1


async def run_workflow(
    initial_state: CareerOptimizerState,
    on_event: Callable[[dict], Awaitable[None]] | None = None,
) -> CareerOptimizerState:
    state: CareerOptimizerState = {**initial_state}
    state.setdefault("execution_logs", [])
    state.setdefault("error_messages", [])
    state.setdefault("quality_approved", False)
    state.setdefault("revision_count", 0)

    async def _emit(event: dict):
        if on_event:
            await on_event(event)

    await _emit({"type": "start", "step": "workflow"})

    state = await _run_profile_step(state, _emit)
    state = await _run_market_step(state, _emit)
    state = await _run_match_step(state, _emit)
    state = await _run_roadmap_step(state, _emit)
    state = await _run_quality_step(state, _emit)

    revision = 0
    while not state["quality_approved"] and revision < MAX_REVISIONS:
        revision += 1
        state["revision_count"] = revision
        await _emit({"type": "revision", "revision": revision})
        state = await _run_roadmap_step(state, _emit)
        state = await _run_quality_step(state, _emit)

    await _emit({"type": "finish", "status": "completed" if state["quality_approved"] else "completed_with_warnings", "blueprint": state.get("career_blueprint", {})})
    return state


async def _run_profile_step(state: CareerOptimizerState, emit) -> CareerOptimizerState:
    await emit({"type": "start_step", "step": "profile", "label": "Menganalisis Profil"})
    try:
        agent = build_profile_agent()
        raw_cv = state.get("raw_cv_text", "")
        raw_form = state.get("user_input_form", {})
        if raw_cv and raw_form:
            raw = f"{raw_cv}\n\n--- Data Form ---\n{json.dumps(raw_form)}"
        elif raw_cv:
            raw = raw_cv
        else:
            raw = json.dumps(raw_form)
        result = await agent.arun(raw)
        content = result.content if hasattr(result, "content") else result
        if hasattr(content, "model_dump"):
            state["confirmed_profile"] = content.model_dump()
        elif isinstance(content, dict):
            state["confirmed_profile"] = content
        else:
            state["confirmed_profile"] = json.loads(content) if isinstance(content, (str, bytes, bytearray)) else content
        form_targets = state.get("user_input_form", {}).get("target_roles")
        if form_targets is not None:
            state["confirmed_profile"]["target_roles"] = form_targets
        state["execution_logs"].append({"step": "profile", "status": "ok"})
    except Exception as e:
        logger.error(f"Profile step error: {e}")
        state["error_messages"].append(f"Profile step: {str(e)}")
        state["execution_logs"].append({"step": "profile", "status": "error"})
    await emit({"type": "finish_step", "step": "profile", "status": "ok"})
    return state


async def _run_market_step(state: CareerOptimizerState, emit) -> CareerOptimizerState:
    await emit({"type": "start_step", "step": "market", "label": "Mengumpulkan Data Pasar"})
    try:
        profile = state.get("confirmed_profile", {})
        target_roles = profile.get("target_roles", [])
        if not target_roles:
            current_role = profile.get("current_role", "")
            target_roles = [current_role] if current_role else ["Software Engineer"]
        all_jobs = []
        all_stats = {}
        for role in target_roles:
            jobs = search_jobs(query=role, role=role, top_k=10)
            all_jobs.extend(jobs)
            stats = get_role_skill_stats(role)
            all_stats[role] = stats

        state["retrieved_jobs"] = all_jobs
        state["market_stats"] = all_stats

        if len(all_jobs) < 5:
            state["execution_logs"].append({"step": "market", "status": "low_confidence"})
        else:
            state["execution_logs"].append({"step": "market", "status": "ok"})
    except Exception as e:
        logger.error(f"Market step error: {e}")
        state["error_messages"].append(f"Market step: {str(e)}")
        state["execution_logs"].append({"step": "market", "status": "error"})
    await emit({"type": "finish_step", "step": "market", "status": "ok"})
    return state


async def _run_match_step(state: CareerOptimizerState, emit) -> CareerOptimizerState:
    await emit({"type": "start_step", "step": "match", "label": "Menghitung Kecocokan"})
    try:
        profile = state.get("confirmed_profile", {})
        target_roles = profile.get("target_roles", [])
        if not target_roles:
            current_role = profile.get("current_role", "")
            target_roles = [current_role] if current_role else ["Software Engineer"]
        all_evaluations = []
        for role in target_roles:
            role_jobs = [j for j in state.get("retrieved_jobs", []) if j.get("normalized_role", "").lower() == role.lower()]
            required_skills_raw = "|".join([j.get("required_skills", "") for j in role_jobs])
            required_skills_raw_list = [s.strip() for s in required_skills_raw.split("|") if s.strip()] if required_skills_raw else []
            user_skills_raw = profile.get("hard_skills", []) + profile.get("soft_skills", [])

            from app.utils.skill_taxonomy import normalize_skills
            user_skills = [ns["canonical"] for ns in normalize_skills(user_skills_raw)]
            required_skills = [ns["canonical"] for ns in normalize_skills(required_skills_raw_list)]

            from app.utils.scoring import calculate_role_fit_score
            required_experiences = []
            for j in role_jobs:
                exp_val = j.get("minimum_experience")
                if exp_val is not None:
                    try:
                        required_experiences.append(float(exp_val))
                    except (ValueError, TypeError):
                        pass
            avg_required_exp = (sum(required_experiences) / max(len(required_experiences), 1)) if required_experiences else 2.0
            primary_interest = [target_roles[0]] if target_roles else []
            result = calculate_role_fit_score(
                user_skills=user_skills,
                required_skills=list(set(required_skills)),
                user_exp_years=profile.get("years_of_experience", 0),
                required_exp_years=avg_required_exp,
                user_interests=primary_interest,
                target_role=role,
                retrieved_jobs_count=len(role_jobs),
            )
            all_evaluations.append({
                "role_name": role,
                **result,
                "matching_skills": list(set(s.lower() for s in user_skills).intersection(set(s.lower() for s in required_skills))),
                "missing_critical_skills": list(set(s.lower() for s in required_skills) - set(s.lower() for s in user_skills))[:5],
                "evidence_job_ids": [j.get("id", "") for j in role_jobs[:3]],
                "reasoning_summary": f"Skor {result['total_score']} - {result['confidence_level']}",
            })

        state["evaluated_roles"] = all_evaluations
        state["execution_logs"].append({"step": "match", "status": "ok"})
    except Exception as e:
        logger.error(f"Match step error: {e}")
        state["error_messages"].append(f"Match step: {str(e)}")
        state["execution_logs"].append({"step": "match", "status": "error"})
    await emit({"type": "finish_step", "step": "match", "status": "ok"})
    return state


async def _run_roadmap_step(state: CareerOptimizerState, emit) -> CareerOptimizerState:
    await emit({"type": "start_step", "step": "roadmap", "label": "Menyusun Roadmap Belajar"})
    try:
        profile = state.get("confirmed_profile", {})
        evaluated = state.get("evaluated_roles", [])
        top_role = max(evaluated, key=lambda r: r.get("total_score", 0)) if evaluated else {"role_name": "Data Analyst"}
        target_role = top_role.get("role_name", "Data Analyst")

        raw_missing = top_role.get("missing_critical_skills", [])
        missing: list[str] = raw_missing if isinstance(raw_missing, list) else []

        from app.services.vector_store import search_learning_chroma
        resources = search_learning_chroma(missing if missing else ["Python"], language="id", top_k=5)
        if len(resources) < 3:
            from app.services.web_search import tavily_search
            try:
                web_resources = tavily_search(f"{' '.join(missing if missing else ['Python'])} tutorial course Indonesia", max_results=5)
                existing_titles = {r["title"] for r in resources}
                for wr in web_resources:
                    if wr["title"] not in existing_titles:
                        resources.append({
                            "title": wr["title"],
                            "provider": wr.get("snippet", "")[:80],
                            "url": wr["url"],
                            "cost_idr": 0,
                            "duration_hours": 0,
                            "language": "id",
                            "source": wr["source"],
                            "last_verified_at": "",
                        })
                        existing_titles.add(wr["title"])
            except Exception as e:
                logger.warning(f"Tavily learning search failed: {e}")

        if len(missing) >= 3:
            phase_30 = missing[::3]
            phase_60 = missing[1::3]
            phase_90 = missing[2::3]
        elif len(missing) == 2:
            phase_30 = missing[:1]
            phase_60 = missing[1:]
            phase_90 = []
        elif len(missing) == 1:
            phase_30 = missing[:]
            phase_60 = missing[:]
            phase_90 = []
        else:
            phase_30 = []
            phase_60 = []
            phase_90 = []

        def _alloc(skills_subset, start, count):
            return [{"skill": s, "action": f"Pelajari dasar-dasar {s}", "resources": [r.get("title", "") for r in resources[start:start+count]]} for s in skills_subset]

        roadmap = {
            "target_role": target_role,
            "phase_30_days": _alloc(phase_30, 0, 2),
            "phase_60_days": _alloc(phase_60, 2, 2),
            "phase_90_days": _alloc(phase_90, 4, 2),
            "priority_skills": missing[:5] if missing else ["Python", "SQL"],
            "resources": resources,
        }
        state["roadmap_plan"] = roadmap
        state["execution_logs"].append({"step": "roadmap", "status": "ok"})
    except Exception as e:
        logger.error(f"Roadmap step error: {e}")
        state["error_messages"].append(f"Roadmap step: {str(e)}")
        state["execution_logs"].append({"step": "roadmap", "status": "error"})
    await emit({"type": "finish_step", "step": "roadmap", "status": "ok"})
    return state


async def _run_quality_step(state: CareerOptimizerState, emit) -> CareerOptimizerState:
    await emit({"type": "start_step", "step": "quality", "label": "Validasi Kualitas"})
    try:
        errors = state.get("error_messages", [])
        retrieved = state.get("retrieved_jobs", [])
        evaluated = state.get("evaluated_roles", [])

        limitations = []
        if len(retrieved) < 5:
            limitations.append("Data pasar terbatas (< 5 lowongan). Hasil mungkin kurang akurat.")
        if errors:
            limitations.extend(errors)
        if not evaluated:
            limitations.append("Tidak ada role yang dievaluasi.")

        confidence = "HIGH"
        if len(retrieved) < 5:
            confidence = "LOW"
        elif len(retrieved) < 10:
            confidence = "MEDIUM"

        state["career_blueprint"] = {
            "profile_summary": state.get("confirmed_profile", {}),
            "top_paths": state.get("evaluated_roles", []),
            "skill_gap_matrix": [{"role": e.get("role_name", ""), "score": e.get("total_score", 0), "missing": e.get("missing_critical_skills", [])} for e in (evaluated or [])],
            "roadmap_30_60_90": state.get("roadmap_plan", {}),
            "market_evidence": {"retrieved_jobs": len(retrieved), "stats": state.get("market_stats", {})},
            "limitations": limitations,
            "confidence_level": confidence,
            "sources": [{"id": j.get("id", ""), "title": j.get("title", ""), "url": j.get("source_url", "")} for j in retrieved[:10]],
        }

        state["quality_approved"] = len(limitations) == 0 or (len(limitations) < 3 and confidence != "LOW")
        state["execution_logs"].append({"step": "quality", "status": "ok", "approved": state["quality_approved"]})
    except Exception as e:
        logger.error(f"Quality step error: {e}")
        state["error_messages"].append(f"Quality step: {str(e)}")
        state["execution_logs"].append({"step": "quality", "status": "error"})
    await emit({"type": "finish_step", "step": "quality", "status": "ok"})
    return state
