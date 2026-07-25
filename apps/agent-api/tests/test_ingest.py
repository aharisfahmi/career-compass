import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.vector_store import get_job_collection, get_learning_collection


def test_ingest_jobs():
    collection = get_job_collection()
    count = collection.count()
    assert count >= 120, f"Expected >= 120 jobs, got {count}"


def test_ingest_learning():
    collection = get_learning_collection()
    count = collection.count()
    assert count >= 30, f"Expected >= 30 learning resources, got {count}"
