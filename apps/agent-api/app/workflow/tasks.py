import json
import asyncio
from celery import current_app
from app.core.celery_app import celery_app
from app.workflow.orchestrator import run_workflow
from app.workflow.state import CareerOptimizerState


@celery_app.task(bind=True, name="run_career_blueprint")
def run_career_blueprint_task(self, initial_state: dict) -> dict:
    async def _emit(event: dict):
        try:
            r = current_app.broker_connection().channel().client
            r.publish(f"workflow:{self.request.id}", json.dumps(event))
        except Exception:
            pass

    state = CareerOptimizerState(**initial_state)
    final_state = asyncio.run(run_workflow(state, on_event=_emit))
    return dict(final_state)
