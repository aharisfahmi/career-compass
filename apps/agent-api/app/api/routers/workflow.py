import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()


class WorkflowSubmit(BaseModel):
    initial_state: dict


@router.post("/workflow/submit")
async def submit_workflow(payload: WorkflowSubmit):
    from app.workflow.tasks import run_career_blueprint_task
    task = run_career_blueprint_task.delay(payload.initial_state)
    return {"job_id": task.id, "status": "queued"}


@router.get("/workflow/{job_id}/stream")
async def stream_workflow(job_id: str):
    from app.core.config import settings
    import redis.asyncio as aioredis

    async def event_generator():
        try:
            r = aioredis.from_url(settings.REDIS_URL)
            pubsub = r.pubsub()
            await pubsub.subscribe(f"workflow:{job_id}")
            async for msg in pubsub.listen():
                if msg["type"] == "message":
                    data = msg["data"]
                    if isinstance(data, bytes):
                        data = data.decode()
                    yield f"data: {data}\n\n"
                    parsed = json.loads(data)
                    if parsed.get("type") in ("finish", "error"):
                        break
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            try:
                await pubsub.unsubscribe(f"workflow:{job_id}")
                await pubsub.close()
            except Exception:
                pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")
