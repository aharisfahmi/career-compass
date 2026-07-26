import pandas as pd
from app.services.vector_store import get_chroma_client


def ingest_jobs(csv_path: str, recreate: bool = False) -> dict:
    df = pd.read_csv(csv_path)
    chroma = get_chroma_client()

    if recreate:
        try:
            chroma.delete_collection("job_postings")
        except Exception:
            pass

    collection = chroma.get_or_create_collection(
        name="job_postings",
        metadata={"hnsw:space": "cosine"},
    )

    existing_count = collection.count()
    if existing_count >= len(df) and not recreate:
        return {"documents_ingested": existing_count, "status": "skipped"}

    if recreate:
        existing_count = 0

    ids, documents, metadatas = [], [], []
    for _, row in df.iterrows():
        ids.append(str(row["id"]))
        documents.append(f"{row['title']} | {row['description']}")
        meta = row.to_dict()
        meta["required_skills"] = str(meta.get("required_skills", ""))
        meta["preferred_skills"] = str(meta.get("preferred_skills", ""))
        metadatas.append(meta)

    collection.add(ids=ids, documents=documents, metadatas=metadatas)
    return {"documents_ingested": collection.count()}


def ingest_learning_resources(json_path: str, recreate: bool = False) -> dict:
    import json
    with open(json_path) as f:
        resources = json.load(f)

    chroma = get_chroma_client()

    if recreate:
        try:
            chroma.delete_collection("learning_resources")
        except Exception:
            pass

    collection = chroma.get_or_create_collection(
        name="learning_resources",
        metadata={"hnsw:space": "cosine"},
    )

    existing_count = collection.count()
    if existing_count >= len(resources) and not recreate:
        return {"documents_ingested": existing_count, "status": "skipped"}

    if recreate:
        existing_count = 0

    ids, documents, metadatas = [], [], []
    for r in resources:
        ids.append(str(r["id"]))
        documents.append(f"{r['title']} | {' '.join(r['skills'])}")
        meta = {k: v for k, v in r.items() if k != "id"}
        meta["skills"] = "|".join(r["skills"])
        metadatas.append(meta)

    collection.add(ids=ids, documents=documents, metadatas=metadatas)
    return {"documents_ingested": collection.count()}
