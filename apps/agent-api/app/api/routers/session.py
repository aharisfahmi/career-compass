from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter(prefix="/api/v1")


class SessionResponse(BaseModel):
    session_id: str
    blueprint: Dict[str, Any]


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    from app.core.session_db import async_session
    from sqlmodel import select
    from app.models import Session

    async with async_session() as session:
        result = await session.execute(select(Session).where(Session.id == session_id))
        db_session = result.scalar_one_or_none()
        if not db_session:
            raise HTTPException(status_code=404, detail="Session not found")
        return SessionResponse(session_id=db_session.id, blueprint=db_session.blueprint)
