from openai import OpenAI
import chromadb

from app.core.config import settings


def get_embedding_client() -> OpenAI:
    return OpenAI(
        api_key=settings.effective_embedding_api_key,
        base_url=settings.effective_embedding_base_url,
    )


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


def embed_text(text: str) -> list[float]:
    client = get_embedding_client()
    resp = client.embeddings.create(
        input=text,
        model=settings.EMBEDDING_MODEL,
    )
    return resp.data[0].embedding


def search_jobs(
    query: str,
    role: str | None = None,
    seniority: str | None = None,
    location: str | None = None,
    top_k: int = 10,
    distance_threshold: float = 1.2,
) -> list[dict]:
    collection = get_job_collection()
    query_emb = embed_text(query)
    where_filters = {}
    if role:
        where_filters["normalized_role"] = role
    if seniority:
        where_filters["seniority"] = seniority
    if location:
        where_filters["location"] = location

    results = collection.query(
        query_embeddings=[query_emb],
        n_results=top_k,
        where=where_filters if where_filters else None,
    )

    docs = []
    for i, doc in enumerate(results["documents"][0]):
        distance = results["distances"][0][i] if results["distances"] else 0
        if distance > distance_threshold:
            continue
        metadata = results["metadatas"][0][i] if results["metadatas"] else {}
        docs.append({
            "id": results["ids"][0][i],
            "document": doc,
            "distance": distance,
            **metadata,
        })

    if not docs and role:
        # Fallback: no results with role filter, retry semantic-only
        results = collection.query(
            query_embeddings=[query_emb],
            n_results=top_k,
        )
        for i, doc in enumerate(results["documents"][0]):
            distance = results["distances"][0][i] if results["distances"] else 0
            if distance > distance_threshold:
                continue
            metadata = results["metadatas"][0][i] if results["metadatas"] else {}
            docs.append({
                "id": results["ids"][0][i],
                "document": doc,
                "distance": distance,
                **metadata,
            })

    return docs


def search_learning_chroma(
    skills: list[str],
    language: str = "id",
    top_k: int = 5,
) -> list[dict]:
    collection = get_learning_collection()
    query_text = " ".join(skills)
    query_emb = embed_text(query_text)

    where_filters = {}
    if language and language != "both":
        where_filters["language"] = language

    results = collection.query(
        query_embeddings=[query_emb],
        n_results=top_k,
        where=where_filters if where_filters else None,
    )

    items = []
    for i, doc in enumerate(results["documents"][0]):
        metadata = results["metadatas"][0][i] if results["metadatas"] else {}
        items.append({
            "title": metadata.get("title", ""),
            "provider": metadata.get("provider", ""),
            "url": metadata.get("url", ""),
            "cost_idr": float(metadata.get("cost_idr", 0)),
            "duration_hours": int(metadata.get("duration_hours", 0)),
            "language": metadata.get("language", "id"),
            "source": "chromadb",
            "last_verified_at": metadata.get("last_verified_at", ""),
        })
    return items


def get_role_skill_stats(role: str) -> dict:
    collection = get_job_collection()
    results = collection.get(where={"normalized_role": role})
    all_required = []
    for meta in results["metadatas"]:
        if meta and meta.get("required_skills"):
            all_required.extend(meta["required_skills"].split("|") if isinstance(meta["required_skills"], str) else meta["required_skills"])
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
