import chromadb
from app.core.config import settings


def get_chroma_client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)


def get_job_collection() -> chromadb.Collection:
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="job_postings",
        metadata={"hnsw:space": "cosine"},
    )


def get_learning_collection() -> chromadb.Collection:
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="learning_resources",
        metadata={"hnsw:space": "cosine"},
    )


def _keyword_score(text: str, query_terms: list[str]) -> int:
    text_lower = text.lower()
    return sum(1 for t in query_terms if t in text_lower)


def search_jobs(
    query: str,
    role: str | None = None,
    seniority: str | None = None,
    location: str | None = None,
    top_k: int = 10,
) -> list[dict]:
    collection = get_job_collection()
    where_filters = {}
    if role:
        where_filters["normalized_role"] = role
    if seniority:
        where_filters["seniority"] = seniority
    if location:
        where_filters["location"] = location

    if where_filters:
        results = collection.get(where=where_filters)
        docs = _format_results(results)
        if docs:
            return docs[:top_k]

    results = collection.get()
    docs = _format_results(results)
    query_terms = query.lower().split()
    scored = []
    for d in docs:
        text = " ".join(str(v) for v in [d.get("title", ""), d.get("description", ""), d.get("document", "")])
        score = _keyword_score(text, query_terms)
        if score > 0:
            scored.append((score, d))
    scored.sort(key=lambda x: -x[0])
    return [d for _, d in scored[:top_k]]


def search_learning_chroma(
    skills: list[str],
    language: str = "id",
    top_k: int = 5,
) -> list[dict]:
    collection = get_learning_collection()
    where_filters = {}
    if language and language != "both":
        where_filters["language"] = language

    results = collection.get(where=where_filters if where_filters else None)

    items = []
    query_terms = [s.lower() for s in skills]
    for i, doc in enumerate(results["documents"]):
        metadata = results["metadatas"][i] if results["metadatas"] else {}
        text = doc + " " + " ".join(str(v) for v in metadata.values())
        score = _keyword_score(text, query_terms)
        if score == 0:
            continue
        items.append({
            "title": metadata.get("title", ""),
            "provider": metadata.get("provider", ""),
            "url": metadata.get("url", ""),
            "cost_idr": float(metadata.get("cost_idr", 0)),
            "duration_hours": int(metadata.get("duration_hours", 0)),
            "language": metadata.get("language", "id"),
            "source": "chromadb",
            "last_verified_at": metadata.get("last_verified_at", ""),
            "_keyword_score": score,
        })
    items.sort(key=lambda x: -x["_keyword_score"])
    for item in items:
        item.pop("_keyword_score", None)
    return items[:top_k]


def _format_results(results: dict) -> list[dict]:
    docs = []
    for i, doc in enumerate(results["documents"]):
        metadata = results["metadatas"][i] if results["metadatas"] else {}
        docs.append({
            "id": results["ids"][i],
            "document": doc,
            "distance": 0.0,
            **metadata,
        })
    return docs


def get_role_skill_stats(role: str) -> dict:
    collection = get_job_collection()
    results = collection.get(where={"normalized_role": role})
    all_required = []
    for meta in results["metadatas"]:
        if meta and meta.get("required_skills"):
            raw = meta["required_skills"]
            all_required.extend(raw.split("|") if isinstance(raw, str) else raw)
    from collections import Counter
    freq = Counter(s.strip() for s in all_required)
    return {
        "role": role,
        "total_jobs": len(results["ids"]),
        "skill_frequency": dict(freq.most_common(20)),
    }


def get_salary_benchmark(role: str) -> dict:
    collection = get_job_collection()
    results = collection.get(where={"normalized_role": role})
    salaries = []
    for meta in results["metadatas"]:
        if meta and meta.get("salary_min") and meta.get("salary_max"):
            try:
                salaries.append({
                    "min": float(meta["salary_min"]),
                    "max": float(meta["salary_max"]),
                    "currency": meta.get("currency", "IDR"),
                })
            except (ValueError, TypeError):
                continue

    if not salaries:
        return {"role": role, "sample_size": 0}

    mins = [s["min"] for s in salaries]
    maxs = [s["max"] for s in salaries]
    return {
        "role": role,
        "sample_size": len(salaries),
        "salary_min": min(mins),
        "salary_max": max(maxs),
        "salary_median_min": sorted(mins)[len(mins) // 2],
        "salary_median_max": sorted(maxs)[len(maxs) // 2],
        "currency": salaries[0]["currency"],
    }
