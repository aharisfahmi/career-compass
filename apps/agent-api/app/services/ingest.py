import pandas as pd
from openai import OpenAI
from app.core.config import settings
from app.services.vector_store import get_chroma_client, get_embedding_client


def ingest_jobs(csv_path: str, recreate: bool = False) -> dict:
    df = pd.read_csv(csv_path)
    embed_client = get_embedding_client()
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

    texts = []
    for _, row in df.iterrows():
        texts.append(f"{row['title']} | {row['description']}")

    import time

    batch_size = 5
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        for attempt in range(5):
            try:
                resp = embed_client.embeddings.create(
                    input=batch,
                    model=settings.EMBEDDING_MODEL,
                )
                all_embeddings.extend([d.embedding for d in resp.data])
                break
            except Exception as ex:
                if "429" in str(ex) or "quota" in str(ex).lower() or "rate" in str(ex).lower():
                    wait = 2 ** attempt * 5
                    print(f"  Rate limited, waiting {wait}s (attempt {attempt+1})...")
                    time.sleep(wait)
                else:
                    raise
        if i + batch_size < len(texts):
            time.sleep(2)

    ids, embeddings, documents, metadatas = [], [], [], []
    for idx, (_, row) in enumerate(df.iterrows()):
        text = texts[idx]
        emb = all_embeddings[idx]

        meta = row.to_dict()
        meta["required_skills"] = str(meta.get("required_skills", ""))
        meta["preferred_skills"] = str(meta.get("preferred_skills", ""))

        ids.append(str(row["id"]))
        embeddings.append(emb)
        documents.append(text)
        metadatas.append(meta)

    collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
    return {"documents_ingested": collection.count()}


def ingest_learning_resources(json_path: str, recreate: bool = False) -> dict:
    import json
    with open(json_path) as f:
        resources = json.load(f)

    embed_client = get_embedding_client()
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

    ids, embeddings, documents, metadatas = [], [], [], []
    for r in resources:
        text = f"{r['title']} | {' '.join(r['skills'])}"
        emb = embed_client.embeddings.create(
            input=text,
            model=settings.EMBEDDING_MODEL,
        ).data[0].embedding

        meta = {k: v for k, v in r.items() if k != "id"}
        meta["skills"] = "|".join(r["skills"])

        ids.append(str(r["id"]))
        embeddings.append(emb)
        documents.append(text)
        metadatas.append(meta)

    collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
    return {"documents_ingested": collection.count()}
