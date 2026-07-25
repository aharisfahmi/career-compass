import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.utils.scoring import calculate_role_fit_score


def test_strong_fit():
    result = calculate_role_fit_score(
        user_skills=["Python", "SQL", "Tableau", "Statistics"],
        required_skills=["Python", "SQL", "Tableau", "Statistics"],
        user_exp_years=3.0,
        required_exp_years=2.0,
        user_interests=["Data Analyst"],
        target_role="Data Analyst",
        retrieved_jobs_count=10,
    )
    assert result["total_score"] >= 80
    assert result["confidence_level"] == "HIGH"


def test_low_fit():
    result = calculate_role_fit_score(
        user_skills=["HTML", "CSS"],
        required_skills=["Python", "SQL", "Docker", "Kubernetes"],
        user_exp_years=0.5,
        required_exp_years=3.0,
        user_interests=["Frontend Developer"],
        target_role="Python Backend Developer",
        retrieved_jobs_count=2,
    )
    assert result["total_score"] < 50
    assert result["confidence_level"] == "LOW"


def test_empty_skills():
    result = calculate_role_fit_score(
        user_skills=[],
        required_skills=["Python", "SQL"],
        user_exp_years=0,
        required_exp_years=2,
        user_interests=[],
        target_role="Data Analyst",
        retrieved_jobs_count=5,
    )
    assert result["total_score"] >= 0
    assert result["score_breakdown"]["skill_match"] == 0


def test_boundary_no_jobs():
    result = calculate_role_fit_score(
        user_skills=["Python", "SQL"],
        required_skills=["Python", "SQL"],
        user_exp_years=2,
        required_exp_years=2,
        user_interests=["Data Analyst"],
        target_role="Data Analyst",
        retrieved_jobs_count=0,
    )
    assert result["score_breakdown"]["market_evidence"] == 0


def test_boundary_exact_experience():
    result = calculate_role_fit_score(
        user_skills=["Python"],
        required_skills=["Python", "SQL"],
        user_exp_years=2.0,
        required_exp_years=2.0,
        user_interests=["Data Analyst"],
        target_role="Data Analyst",
        retrieved_jobs_count=5,
    )
    assert result["score_breakdown"]["experience"] == 20.0
