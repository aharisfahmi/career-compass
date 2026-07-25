import json
import base64
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Dict, Any, Optional

router = APIRouter()


class ProfileInput(BaseModel):
    form_data: Dict[str, Any]
    cv_text: Optional[str] = None


@router.post("/profile/extract")
async def extract_profile(payload: ProfileInput):
    from app.agents.profile_agent import build_profile_agent
    agent = build_profile_agent()
    input_text = payload.cv_text or json.dumps(payload.form_data)
    result = await agent.arun(input_text)
    if hasattr(result, "content"):
        return {"profile": result.content}
    return {"profile": result}


@router.post("/profile/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    from app.utils.cv_parser import parse_cv_pdf
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    try:
        contents = await file.read()
        text = await parse_cv_pdf(contents)
        return {"cv_text": text, "page_count": 1}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")
