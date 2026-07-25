from app.mcp.server import mcp
from app.services.vector_store import search_jobs, get_role_skill_stats, get_salary_benchmark, search_learning_chroma
from app.services.web_search import tavily_search, duckduckgo_fallback
from app.utils.scoring import calculate_role_fit_score
from app.utils.skill_taxonomy import normalize_skills
from app.utils.chunker import clean_snippet

LEARNING_DOMAINS = [
    "coursera.org", "udemy.com", "freecodecamp.org",
    "youtube.com", "edx.org", "scrimba.com", "kode.id",
]


@mcp.tool()
def search_job_market(
    query: str,
    role: str | None = None,
    seniority: str | None = None,
    location: str | None = None,
    top_k: int = 10,
) -> dict:
    """
    When to use: Panggil oleh Market Agent untuk mencari lowongan kerja relevan dari database.
    Filter: role (normalized_role), seniority, location.
    """
    results = search_jobs(query, role=role, seniority=seniority, location=location, top_k=top_k)
    return {
        "query": query,
        "total_results": len(results),
        "results": [
            {
                "id": r.get("id", ""),
                "title": r.get("title", ""),
                "company": r.get("company", ""),
                "location": r.get("location", ""),
                "seniority": r.get("seniority", ""),
                "required_skills": r.get("required_skills", ""),
                "salary_range": f"{r.get('salary_min', '')} - {r.get('salary_max', '')} {r.get('currency', 'IDR')}",
                "source_url": r.get("source_url", ""),
            }
            for r in results
        ],
    }


@mcp.tool()
def get_role_skill_stats_tool(role: str) -> dict:
    """
    When to use: Panggil untuk mendapatkan statistik frekuensi skill yang diminta untuk suatu role.
    """
    return get_role_skill_stats(role)


@mcp.tool()
def normalize_skills_tool(skills: list[str]) -> list[dict]:
    """
    When to use: Panggil untuk menormalisasi varian nama skill ke taxonomy standar.
    """
    return normalize_skills(skills)


@mcp.tool()
def calculate_role_fit(
    user_skills: list[str],
    required_skills: list[str],
    user_exp_years: float,
    required_exp_years: float,
    user_interests: list[str],
    target_role: str,
    retrieved_jobs_count: int,
) -> dict:
    """
    When to use: Panggil oleh Match Agent untuk menghitung Role Fit Score secara deterministik.
    """
    return calculate_role_fit_score(
        user_skills=user_skills,
        required_skills=required_skills,
        user_exp_years=user_exp_years,
        required_exp_years=required_exp_years,
        user_interests=user_interests,
        target_role=target_role,
        retrieved_jobs_count=retrieved_jobs_count,
    )


@mcp.tool()
def get_salary_benchmark_tool(role: str) -> dict:
    """
    When to use: Panggil untuk mendapatkan benchmark gaji untuk suatu role berdasarkan data pasar.
    """
    return get_salary_benchmark(role)


@mcp.tool()
def search_learning_resources(
    skills: list[str],
    budget_idr: float = 0.0,
    language: str = "id",
    duration_hours: int | None = None,
    top_k: int = 5,
    fresh: bool = False,
) -> dict:
    """
    When to use: Dipanggil oleh Roadmap Planner Agent untuk mencari materi belajar konkret.
    Filter: skills (required), budget_idr, language, duration_hours.
    """
    results = search_learning_chroma(skills, language=language, top_k=top_k)

    needs_enrichment = fresh or len(results) < top_k
    if not needs_enrichment:
        return {
            "query_skills": skills,
            "results": results,
            "source_breakdown": {"chromadb": len(results)},
        }

    query = " ".join(skills) + " tutorial course " + ("Indonesia" if language == "id" else "")
    try:
        web_results = tavily_search(query, include_domains=LEARNING_DOMAINS, max_results=top_k * 2)
        source = "tavily"
    except Exception:
        web_results = duckduckgo_fallback(query, max_results=top_k * 2)
        source = "ddgs"

    existing_titles = {r["title"] for r in results}
    for wr in web_results:
        if wr["title"] not in existing_titles:
            results.append({
                "title": wr["title"],
                "provider": clean_snippet(wr.get("snippet", ""), 80),
                "url": wr["url"],
                "cost_idr": 0,
                "duration_hours": 0,
                "language": language,
                "source": wr["source"],
                "last_verified_at": "",
            })

    if budget_idr > 0:
        results = [r for r in results if r.get("cost_idr", 0) <= budget_idr]

    if duration_hours:
        results = [r for r in results if r.get("duration_hours", 0) <= duration_hours or r.get("duration_hours", 0) == 0]

    return {
        "query_skills": skills,
        "results": results[:top_k],
        "source_breakdown": {"chromadb": len(results), source: len(web_results)},
    }
