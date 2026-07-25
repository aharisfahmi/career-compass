def calculate_role_fit_score(
    user_skills: list[str],
    required_skills: list[str],
    user_exp_years: float,
    required_exp_years: float,
    user_interests: list[str],
    target_role: str,
    retrieved_jobs_count: int,
) -> dict:
    matched_skills = set(s.lower() for s in user_skills).intersection(
        set(s.lower() for s in required_skills)
    )
    skill_score = (len(matched_skills) / max(len(required_skills), 1)) * 40.0

    exp_ratio = min(user_exp_years / max(required_exp_years, 1.0), 1.0)
    exp_score = exp_ratio * 20.0

    interest_score = 15.0 if target_role.lower() in [i.lower() for i in user_interests] else 5.0

    constraint_score = 10.0

    evidence_score = min((retrieved_jobs_count / 10.0), 1.0) * 15.0

    total = round(skill_score + exp_score + interest_score + constraint_score + evidence_score, 2)

    if total >= 80:
        confidence = "HIGH"
    elif total >= 65:
        confidence = "MEDIUM"
    elif total >= 50:
        confidence = "LOW"
    else:
        confidence = "LOW"

    return {
        "total_score": total,
        "confidence_level": confidence,
        "score_breakdown": {
            "skill_match": round(skill_score, 2),
            "experience": round(exp_score, 2),
            "interest": round(interest_score, 2),
            "constraints": round(constraint_score, 2),
            "market_evidence": round(evidence_score, 2),
        },
    }
