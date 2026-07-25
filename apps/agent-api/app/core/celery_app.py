import json
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "career_compass",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Jakarta",
    enable_utc=True,
)

celery_app.autodiscover_tasks(["app.workflow.tasks"])


class RedisPubSub:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.channel = f"workflow:{job_id}"

    def publish(self, event: dict):
        from celery import current_app
        r = current_app.broker_connection().channel().client
        r.publish(self.channel, json.dumps(event))
